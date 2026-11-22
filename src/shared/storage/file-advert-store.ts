import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "@hono/zod-openapi";
import { type Advert, isExpired, StoredAdvert } from "../schemas/advert.js";
import { SourceId, SourceMemory, SourceState } from "../schemas/source.js";
import { writeFileAtomic } from "./atomic.js";

// The store's layout, the contract with the processor (FR-11):
//   <directory>/adverts/<source>.json   { version, source, savedAt, adverts: StoredAdvert[] }
//   <directory>/state/<source>.json     { version, source, state: SourceState }
//   <directory>/memory/<source>.json    { version, source, memory: JSON }  (the source's own, between passes)
//   <directory>/rates/ecb.xml           the ECB's daily rates file as fetched (kept-rates.ts, pay FR-2)
//   <directory>/registers/<register>.json  { version, register, savedAt, licence, credit, companies }  (registers-file.ts, companies FR-6)
// A change to any of these shapes needs a new FORMAT_VERSION.
export const FORMAT_VERSION = 1;

const AdvertsFile = z.strictObject({
  version: z.literal(FORMAT_VERSION),
  source: SourceId,
  savedAt: z.iso.datetime(),
  adverts: z.array(StoredAdvert),
});

const StateFile = z.strictObject({
  version: z.literal(FORMAT_VERSION),
  source: SourceId,
  state: SourceState,
});

const MemoryFile = z.strictObject({
  version: z.literal(FORMAT_VERSION),
  source: SourceId,
  memory: SourceMemory,
});

// A stored file that cannot be read as the store wrote it. It is reported, never reset:
// starting over would lose the adverts and the backoff of a source.
export class StoreError extends Error {
  override name = "StoreError";
}

interface Clock {
  now(): Date;
}

// Implements the crawl-core `AdvertStore` port (structurally: shared code does not import features).
export class FileAdvertStore {
  constructor(
    private readonly directory: string,
    private readonly clock: Clock,
  ) {}

  async readAdverts(source: string): Promise<StoredAdvert[]> {
    const file = await this.readAdvertsFile(source);
    const today = this.today();
    return file.adverts.filter((advert) => !isExpired(advert, today));
  }

  async replaceAdverts(
    source: string,
    adverts: readonly Advert[],
  ): Promise<void> {
    if (adverts.length === 0) return;
    const previous = await this.readAdvertsFile(source);
    const firstSeen = new Map(previous.adverts.map((a) => [a.id, a.firstSeen]));
    const today = this.today();
    const stored = adverts
      .map((advert) => ({
        ...advert,
        firstSeen: firstSeen.get(advert.id) ?? today,
      }))
      .filter((advert) => !isExpired(advert, today));
    await this.writeAdvertsFile(source, stored);
  }

  async dropAdverts(
    source: string,
    advertIds: readonly string[],
  ): Promise<void> {
    const dropped = new Set(advertIds);
    const { adverts } = await this.readAdvertsFile(source);
    const kept = adverts.filter((advert) => !dropped.has(advert.id));
    if (kept.length !== adverts.length)
      await this.writeAdvertsFile(source, kept);
  }

  async readState(source: string): Promise<SourceState | undefined> {
    const path = this.path("state", source);
    const file = await this.readJson(path, StateFile);
    if (file && file.source !== source)
      throw new StoreError(`${path}: holds the state of ${file.source}`);
    return file?.state;
  }

  async writeState(source: string, state: SourceState): Promise<void> {
    const file = StateFile.parse({ version: FORMAT_VERSION, source, state });
    await writeFileAtomic(
      this.path("state", source),
      `${JSON.stringify(file, null, 2)}\n`,
    );
  }

  async readStates(): Promise<Map<string, SourceState>> {
    let names: string[];
    try {
      names = await readdir(join(this.directory, "state"));
    } catch (error) {
      if (isMissing(error)) return new Map();
      throw error;
    }
    const states = new Map<string, SourceState>();
    for (const name of names.filter((n) => n.endsWith(".json")).toSorted()) {
      const source = name.slice(0, -".json".length);
      const state = await this.readState(source);
      if (state) states.set(source, state);
    }
    return states;
  }

  // The sources with an adverts file, for the processor.
  async storedSources(): Promise<string[]> {
    let names: string[];
    try {
      names = await readdir(join(this.directory, "adverts"));
    } catch (error) {
      if (isMissing(error)) return [];
      throw error;
    }
    return names
      .filter((name) => name.endsWith(".json"))
      .map((name) => name.slice(0, -".json".length))
      .filter((source) => SourceId.safeParse(source).success)
      .toSorted();
  }

  // A source's adverts not expired, with when its last pass was stored ("" for none): the
  // processor leaves a source out whose last pass is too old.
  async readPass(
    source: string,
  ): Promise<{ readonly savedAt: string; readonly adverts: StoredAdvert[] }> {
    const file = await this.readAdvertsFile(source);
    const today = this.today();
    return {
      savedAt: file.savedAt,
      adverts: file.adverts.filter((advert) => !isExpired(advert, today)),
    };
  }

  async readMemory(source: string): Promise<SourceMemory | undefined> {
    const path = this.path("memory", source);
    const file = await this.readJson(path, MemoryFile);
    if (file && file.source !== source)
      throw new StoreError(`${path}: holds the memory of ${file.source}`);
    return file?.memory;
  }

  async writeMemory(source: string, memory: SourceMemory): Promise<void> {
    const file = MemoryFile.parse({ version: FORMAT_VERSION, source, memory });
    await writeFileAtomic(
      this.path("memory", source),
      `${JSON.stringify(file, null, 2)}\n`,
    );
  }

  private today(): string {
    return this.clock.now().toISOString().slice(0, 10);
  }

  private path(kind: "adverts" | "state" | "memory", source: string): string {
    // The id names the file, so it must be a valid id, never a path.
    if (!SourceId.safeParse(source).success)
      throw new StoreError(`not a source id: ${JSON.stringify(source)}`);
    return join(this.directory, kind, `${source}.json`);
  }

  private async readAdvertsFile(
    source: string,
  ): Promise<z.infer<typeof AdvertsFile>> {
    const path = this.path("adverts", source);
    const file = await this.readJson(path, AdvertsFile);
    if (!file)
      return { version: FORMAT_VERSION, source, savedAt: "", adverts: [] };
    if (file.source !== source)
      throw new StoreError(`${path}: holds the adverts of ${file.source}`);
    return file;
  }

  private async writeAdvertsFile(
    source: string,
    adverts: readonly StoredAdvert[],
  ): Promise<void> {
    const file = AdvertsFile.parse({
      version: FORMAT_VERSION,
      source,
      savedAt: this.clock.now().toISOString(),
      adverts,
    });
    await writeFileAtomic(
      this.path("adverts", source),
      `${JSON.stringify(file, null, 2)}\n`,
    );
  }

  // undefined when the file does not exist yet; a StoreError when it exists but is not valid.
  private async readJson<Schema extends z.ZodType>(
    path: string,
    schema: Schema,
  ): Promise<z.output<Schema> | undefined> {
    let text: string;
    try {
      text = await readFile(path, "utf8");
    } catch (error) {
      if (isMissing(error)) return undefined;
      throw error;
    }
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new StoreError(`${path}: corrupt, not valid JSON`);
    }
    const result = schema.safeParse(data);
    if (!result.success) {
      const [issue] = result.error.issues;
      throw new StoreError(
        `${path}: corrupt, ${issue?.path.join(".") || "(top level)"}: ${issue?.message}`,
      );
    }
    return result.data;
  }
}

const isMissing = (error: unknown) =>
  (error as NodeJS.ErrnoException | undefined)?.code === "ENOENT";
