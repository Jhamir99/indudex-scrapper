import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { writeFileAtomic } from "./atomic.js";

// The last robots.txt each host answered, and since when a host's robots.txt has not answered (the legacy's
// builder/lib/robots-cache.ts, 4fbb1c49): `<store>/robots/<host>.txt` for each answer ("" when there is none, a 4xx),
// written only when it changed, and `<store>/robots/silent-since.json`. Fits the robots client's `RobotsMemory`
// structurally.
export const ROBOTS_FOLDER = "robots";

const isMissing = (error: unknown) =>
  (error as NodeJS.ErrnoException | undefined)?.code === "ENOENT";

export class FileRobotsMemory {
  private readonly folder: string;

  constructor(storeDirectory: string) {
    this.folder = join(storeDirectory, ROBOTS_FOLDER);
  }

  private fileOf(origin: string): string {
    return join(
      this.folder,
      `${origin.replace(/^https?:\/\//, "").replace(/[^a-z0-9.-]/gi, "_")}.txt`,
    );
  }

  private async readSilent(): Promise<Record<string, number>> {
    try {
      return JSON.parse(
        await readFile(join(this.folder, "silent-since.json"), "utf8"),
      ) as Record<string, number>;
    } catch (error) {
      if (isMissing(error)) return {};
      throw error;
    }
  }

  private writeSilent(silent: Record<string, number>): Promise<void> {
    return writeFileAtomic(
      join(this.folder, "silent-since.json"),
      JSON.stringify(silent),
    );
  }

  async heard(origin: string, text: string): Promise<void> {
    const file = this.fileOf(origin);
    let had: string | null = null;
    try {
      had = await readFile(file, "utf8");
    } catch (error) {
      if (!isMissing(error)) throw error;
    }
    if (had !== text) await writeFileAtomic(file, text);
    const silent = await this.readSilent();
    if (origin in silent) {
      delete silent[origin];
      await this.writeSilent(silent);
    }
  }

  async lastCopy(origin: string): Promise<string | undefined> {
    try {
      return await readFile(this.fileOf(origin), "utf8");
    } catch (error) {
      if (isMissing(error)) return undefined;
      throw error;
    }
  }

  async silentSince(origin: string, now: number): Promise<number> {
    const silent = await this.readSilent();
    const since = silent[origin];
    if (since !== undefined) return since;
    silent[origin] = now;
    await this.writeSilent(silent);
    return now;
  }
}
