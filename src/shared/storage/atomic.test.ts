import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writeFileAtomic } from "./atomic.js";

// Lets a test make the rename fail, after the temporary file is written.
const failure = vi.hoisted(() => ({ onRename: false }));
vi.mock("node:fs/promises", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...original,
    rename: async (from: string, to: string) => {
      if (failure.onRename) throw new Error("simulated crash before rename");
      return original.rename(from, to);
    },
  };
});

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "indudex-atomic-"));
  failure.onRename = false;
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe("writeFileAtomic (FR-4)", () => {
  it("writes a new file, creating its folder", async () => {
    const path = join(directory, "store", "brz.json");
    await writeFileAtomic(path, '{"adverts":[]}');
    expect(await readFile(path, "utf8")).toBe('{"adverts":[]}');
  });

  it("replaces an existing file whole", async () => {
    const path = join(directory, "brz.json");
    await writeFile(path, "old content that is longer than the new one");
    await writeFileAtomic(path, "new");
    expect(await readFile(path, "utf8")).toBe("new");
  });

  it("leaves the old file intact when it fails between writing and renaming", async () => {
    const path = join(directory, "brz.json");
    await writeFile(path, "old");
    failure.onRename = true;

    await expect(writeFileAtomic(path, "new")).rejects.toThrow(
      "simulated crash before rename",
    );

    expect(await readFile(path, "utf8")).toBe("old");
    expect(await readdir(directory)).toEqual(["brz.json"]);
  });

  it("leaves no file when a first write fails", async () => {
    failure.onRename = true;
    await expect(
      writeFileAtomic(join(directory, "brz.json"), "new"),
    ).rejects.toThrow("simulated crash before rename");
    expect(await readdir(directory)).toEqual([]);
  });

  it("ends with one complete content when writes overlap", async () => {
    const path = join(directory, "brz.json");
    const contents = ["a".repeat(100_000), "b".repeat(100_000), "c".repeat(10)];
    await Promise.all(
      contents.map((content) => writeFileAtomic(path, content)),
    );

    expect(contents).toContain(await readFile(path, "utf8"));
    expect(await readdir(directory)).toEqual(["brz.json"]);
  });
});
