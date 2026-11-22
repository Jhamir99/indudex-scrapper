import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  NOTHING,
  readCache,
  readTranslatorFile,
  TitleCacheError,
  writeCache,
  writeTranslatorFile,
} from "./title-caches.js";

let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "indudex-titles-"));
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe("the title translator's files (title translation FR-8)", () => {
  it("reads a cache written, an empty one before any, in the legacy's format", async () => {
    expect((await readCache(directory, "es")).size).toBe(0);
    await writeCache(
      directory,
      "es",
      new Map([
        ["Elektriker", "Electricista"],
        ["Electricista", NOTHING],
      ]),
    );
    expect([...(await readCache(directory, "es"))]).toEqual([
      ["Elektriker", "Electricista"],
      ["Electricista", ""],
    ]);
    await writeFile(
      join(directory, "titles-ca.json"),
      '{"Elektriker":"Electricista"}',
    );
    expect((await readCache(directory, "ca")).get("Elektriker")).toBe(
      "Electricista",
    );
  });

  it("refuses a cache it cannot read, naming it, never reading it as empty (TRA-05)", async () => {
    await writeFile(join(directory, "titles-de.json"), "{broken");
    await expect(readCache(directory, "de")).rejects.toThrow(TitleCacheError);
    await expect(readCache(directory, "de")).rejects.toThrow(/titles-de\.json/);
    await writeFile(join(directory, "titles-fr.json"), '{"a":1}');
    await expect(readCache(directory, "fr")).rejects.toThrow(/not a cache/);
    await expect(readCache(directory, "../x")).rejects.toThrow(
      /not a language/,
    );
  });

  it("reads and writes the queue and the other files, empty before them", async () => {
    expect(await readTranslatorFile(directory, "wanted", [])).toEqual([]);
    await writeTranslatorFile(directory, "wanted", [
      { t: "Elektriker", lang: "de" },
    ]);
    expect(await readTranslatorFile(directory, "wanted", [])).toEqual([
      { t: "Elektriker", lang: "de" },
    ]);
  });
});
