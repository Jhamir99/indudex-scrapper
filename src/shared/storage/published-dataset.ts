import {
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { CurrentVersion } from "../schemas/published/dataset.js";
import { writeFileAtomic } from "./atomic.js";

// The published dataset (AGENTS.md, "Processor → API"): whole versions in `published/<version>/`,
// and `current.json`, the one the API serves. A build writes its version into `<version>.partial/`,
// renames it whole, and only then moves the pointer, so the API never reads half a build (FR-10).

export const POINTER = "current.json";
const PARTIAL = ".partial";
const VERSION = /^\d{8}T\d{6}Z$/;
// The versions kept: the current one always, and the newest others up to this many in all.
export const VERSIONS_KEPT = 3;

export class DatasetError extends Error {
  constructor(
    readonly path: string,
    message: string,
  ) {
    super(`${path}: ${message}`);
    this.name = "DatasetError";
  }
}

// PUBLISHED_DIR when set, else `published/` at the repo root (git ignores it). The same from src
// (tsx) and dist (node).
export function publishedDirectory(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const configured = environment["PUBLISHED_DIR"]?.trim();
  if (configured) return resolve(configured);
  return fileURLToPath(new URL("../../../published", import.meta.url));
}

// A build's version: its UTC time to the second ("20261122T101500Z").
export const versionOf = (at: Date): string =>
  at
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z")
    .replace(/[-:]/g, "");

const exists = (path: string) =>
  stat(path).then(
    () => true,
    () => false,
  );

// One version being written: its files go under `<version>.partial/`; `finish` makes it whole.
export class VersionWriter {
  constructor(
    private readonly dataset: PublishedDataset,
    readonly version: string,
    readonly folder: string,
  ) {}

  // A file of the version, by its path inside it ("offers/2144-es.json"); never outside it.
  async write(path: string, content: string | Uint8Array): Promise<void> {
    const target = resolve(this.folder, path);
    if (
      relative(this.folder, target).startsWith("..") ||
      !target.startsWith(this.folder + sep)
    )
      throw new DatasetError(
        path,
        "a published file must stay inside its version",
      );
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  }

  // The version made whole and current, the oldest beyond VERSIONS_KEPT removed.
  async finish(): Promise<void> {
    const whole = join(this.dataset.directory, this.version);
    await rename(this.folder, whole);
    await writeFileAtomic(
      join(this.dataset.directory, POINTER),
      `${JSON.stringify(CurrentVersion.parse({ v: 1, version: this.version }))}\n`,
    );
    await this.dataset.prune();
  }

  // A build that stops: its unfinished folder goes.
  async abandon(): Promise<void> {
    await rm(this.folder, { recursive: true, force: true });
  }
}

export class PublishedDataset {
  constructor(readonly directory: string) {}

  // The version the pointer names, or null before the first publication. A pointer that cannot be
  // read, or names a version that is not there, is an error naming it: never a silent reset.
  async current(): Promise<string | null> {
    const path = join(this.directory, POINTER);
    let text: string;
    try {
      text = await readFile(path, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
    let parsed;
    try {
      parsed = CurrentVersion.safeParse(JSON.parse(text));
    } catch {
      throw new DatasetError(path, "not JSON");
    }
    if (!parsed.success) throw new DatasetError(path, "not a version pointer");
    const { version } = parsed.data;
    if (!(await exists(join(this.directory, version))))
      throw new DatasetError(
        path,
        `names version ${version}, which is not there`,
      );
    return version;
  }

  // The versions on disk, oldest first.
  async versions(): Promise<string[]> {
    if (!(await exists(this.directory))) return [];
    return (await readdir(this.directory))
      .filter((name) => VERSION.test(name))
      .toSorted();
  }

  // A new version to write; what an earlier build left unfinished is removed first.
  async start(version: string): Promise<VersionWriter> {
    if (!VERSION.test(version))
      throw new DatasetError(version, "not a version name (YYYYMMDDTHHMMSSZ)");
    await mkdir(this.directory, { recursive: true });
    for (const name of await readdir(this.directory))
      if (name.endsWith(PARTIAL))
        await rm(join(this.directory, name), { recursive: true, force: true });
    if (await exists(join(this.directory, version)))
      throw new DatasetError(
        join(this.directory, version),
        "this version is published already",
      );
    const folder = join(this.directory, `${version}${PARTIAL}`);
    await mkdir(folder);
    return new VersionWriter(this, version, folder);
  }

  // Keeps the current version and the newest others, VERSIONS_KEPT in all.
  async prune(): Promise<void> {
    const current = await this.current();
    const versions = await this.versions();
    const others = versions.filter((version) => version !== current);
    const room = VERSIONS_KEPT - (current ? 1 : 0);
    for (const version of others.slice(0, Math.max(0, others.length - room)))
      await rm(join(this.directory, version), { recursive: true, force: true });
  }
}
