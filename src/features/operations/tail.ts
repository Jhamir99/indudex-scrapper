import { open } from "node:fs/promises";

// The last `bytes` of a file as text ("" when it is not there): a job's log may be 20 MB, and only its end matters.
export async function tailOf(path: string, bytes: number): Promise<string> {
  try {
    const file = await open(path, "r");
    try {
      const { size } = await file.stat();
      const length = Math.min(size, bytes);
      const buffer = Buffer.alloc(length);
      await file.read(buffer, 0, length, size - length);
      return buffer.toString("utf8");
    } finally {
      await file.close();
    }
  } catch {
    return "";
  }
}
