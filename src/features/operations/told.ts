import { mkdir, readdir, rm, stat, utimes, writeFile } from "node:fs/promises";
import { join } from "node:path";

// What the alerts remember, one flag file each in `<ops>/told/`, as the legacy's builder/state/alerts: a problem told
// (`failed-<job>`, `late-<job>`, `disk`, `ssd`, `stop`), when a job last ended well (`ok-<job>`), when the SSD was
// last read (`ssd-read`). Files, not one JSON, so a job ending and the watch never write over each other; a file's
// time is when it was set.
export class Told {
  constructor(readonly directory: string) {}

  async since(name: string): Promise<Date | undefined> {
    try {
      return (await stat(join(this.directory, name))).mtime;
    } catch {
      return undefined;
    }
  }

  async has(name: string): Promise<boolean> {
    return (await this.since(name)) !== undefined;
  }

  // Set now (or at `at`), whether it was set before or not.
  async set(name: string, at: Date = new Date()): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const path = join(this.directory, name);
    await writeFile(path, "");
    await utimes(path, at, at);
  }

  async clear(name: string): Promise<void> {
    await rm(join(this.directory, name), { force: true });
  }

  async names(): Promise<string[]> {
    try {
      return (await readdir(this.directory)).toSorted();
    } catch {
      return [];
    }
  }
}
