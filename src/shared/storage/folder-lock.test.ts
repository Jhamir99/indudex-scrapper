import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FolderLocked, lockFolder } from "./folder-lock.js";

describe("a folder's lock", () => {
  let folder: string;
  beforeEach(async () => {
    folder = await mkdtemp(join(tmpdir(), "folder-lock-"));
  });
  afterEach(async () => {
    await rm(folder, { recursive: true, force: true });
  });

  it("is held by one run at a time, and free again once released", async () => {
    const release = await lockFolder(folder, "crawl");
    await expect(lockFolder(folder, "crawl")).rejects.toBeInstanceOf(
      FolderLocked,
    );
    // Another job's lock in the same folder is its own.
    const other = await lockFolder(folder, "heavy");
    await other();
    await release();
    const again = await lockFolder(folder, "crawl");
    await again();
  });
});
