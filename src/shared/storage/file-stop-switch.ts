import { stat } from "node:fs/promises";
import { join } from "node:path";

// The flag's name inside the store folder, next to `adverts/` and `state/`.
export const STOP_FLAG = "STOP";

// The manual stop switch (FR-7): active while `<store directory>/STOP` exists. It is read on
// every call, so creating or removing the file takes effect without restarting anything.
// Implements the crawl-core `StopSwitch` port (structurally: shared code does not import features).
export class FileStopSwitch {
  readonly flagPath: string;

  constructor(storeDirectory: string) {
    this.flagPath = join(storeDirectory, STOP_FLAG);
  }

  async isActive(): Promise<boolean> {
    try {
      await stat(this.flagPath);
      return true;
    } catch (error) {
      if (isMissing(error)) return false;
      // A flag that cannot be checked (e.g. no permission) counts as set: stopping is the safe side.
      return true;
    }
  }
}

function isMissing(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return code === "ENOENT" || code === "ENOTDIR";
}
