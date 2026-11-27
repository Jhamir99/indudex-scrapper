import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readShownOffers } from "./shown-offers.js";

describe("what the published version shows (career sites FR-8, FR-6)", () => {
  let directory: string;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "shown-"));
  });
  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it("is nothing before the first publication", async () => {
    expect(await readShownOffers(directory)).toBeNull();
  });

  it("gives the offers' ids, and per source its offers, those in Spain and those in Catalonia", async () => {
    const version = "20261127T120000Z";
    await mkdir(join(directory, version, "offers"), { recursive: true });
    await writeFile(
      join(directory, version, "offers", "a.json"),
      JSON.stringify({
        v: 1,
        shard: "a",
        offers: [
          { id: "aaaa1111", s: "careers.acme.es", cc: "es", n: "ES511" },
          { id: "bbbb2222", s: "careers.acme.es", cc: "es", n: "ES300" },
          { id: "cccc3333", s: "greenhouse.acme", cc: "de", n: "DE300" },
        ],
      }),
    );
    await writeFile(
      join(directory, "current.json"),
      JSON.stringify({ v: 1, version }),
    );
    const shown = await readShownOffers(directory);
    expect([...(shown?.ids ?? [])]).toEqual([
      "aaaa1111",
      "bbbb2222",
      "cccc3333",
    ]);
    expect(Object.fromEntries(shown?.bySource ?? [])).toEqual({
      "careers.acme.es": [2, 2, 1],
      "greenhouse.acme": [1, 0, 0],
    });
  });
});
