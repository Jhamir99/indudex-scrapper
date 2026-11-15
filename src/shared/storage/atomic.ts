import { randomUUID } from "node:crypto";
import { mkdir, open, rename, rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

// Writes a whole file or nothing (FR-4): the content goes to a temporary file in the same folder,
// is flushed to disk, and only then replaces the old file with a rename, which is atomic on one
// file system. A reader sees the old file or the new one, never half of either.
export async function writeFileAtomic(
  path: string,
  content: string | Uint8Array,
): Promise<void> {
  const directory = dirname(path);
  await mkdir(directory, { recursive: true });
  const temporary = join(
    directory,
    `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`,
  );
  try {
    const file = await open(temporary, "wx");
    try {
      await file.writeFile(content);
      await file.sync();
    } finally {
      await file.close();
    }
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}
