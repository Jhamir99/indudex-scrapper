import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import lockfile from "proper-lockfile";

// A process's hold on its folder, so a run started by hand and the cron's run of the same job never overlap (the cron's
// own `flock` locks do not see a hand's run): the crawl holds the store, the publication and the translator one lock in
// the processor's state, as the cron's `heavy` lock holds them apart. A `<name>.lock` folder inside the folder, its time
// renewed while the run lasts; one left by a run that died is taken over after a minute.
export class FolderLocked extends Error {
  override name = "FolderLocked";
}

const STALE_MS = 60_000;

export async function lockFolder(
  folder: string,
  name: string,
): Promise<() => Promise<void>> {
  await mkdir(folder, { recursive: true });
  try {
    // The path locked is the job's own (`<folder>/<name>`, never written): proper-lockfile keys its locks by path.
    return await lockfile.lock(join(folder, name), {
      stale: STALE_MS,
      realpath: false,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ELOCKED")
      throw new FolderLocked(
        `another ${name} run holds ${folder}: this one does not start`,
      );
    throw error;
  }
}
