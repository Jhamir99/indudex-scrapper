import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { type DedupeAdvert, dedupe, placeKey } from "./index.js";

const job = (
  url: string,
  fields: Partial<DedupeAdvert> = {},
): DedupeAdvert => ({
  id: url,
  url,
  kind: "careers",
  company: "Acme GmbH",
  title: "Elektroniker (m/w/d)",
  country: "de",
  place: placeKey({ geonameId: 2_950_159, country: "de", town: "Berlin" }),
  posted: "2026-11-02",
  ...fields,
});

// Copies of one role from several sources, and other jobs around them.
const adverts: DedupeAdvert[] = [
  job("https://acme.example/jobs/1"),
  job("https://feed.example/42", { kind: "feed", company: "ACME" }),
  job("https://portal.example/7", { kind: "portal", posted: "2026-10-30" }),
  job("https://acme.example/jobs/2", { posted: "" }),
  job("https://acme.example/jobs/3", { title: "Mechatroniker (m/w/d)" }),
  job("https://other.example/1", { company: "Other AG" }),
  job("https://acme.example/jobs/4", { years: 2, workMode: "hybrid" }),
];

// A fixed shuffle of a list (a linear congruential generator), so the test is the same each run.
function shuffled<T>(list: readonly T[], seed: number): T[] {
  const out = [...list];
  let state = seed;
  for (let i = out.length - 1; i > 0; i--) {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    const j = state % (i + 1);
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

const keptIds = (list: readonly DedupeAdvert[]) =>
  dedupe(list)
    .kept.map(({ advert }) => advert.id)
    .toSorted();

describe("dedupe's public entry (dedupe FR-7)", () => {
  it("gives the same output twice", () => {
    expect(dedupe(adverts)).toEqual(dedupe(adverts));
  });

  it("keeps the same copy of a role whatever order the sources come in", () => {
    const expected = keptIds(adverts);
    expect(expected).toEqual([
      "https://acme.example/jobs/1",
      "https://acme.example/jobs/3",
      "https://other.example/1",
    ]);
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8])
      expect(keptIds(shuffled(adverts, seed))).toEqual(expected);
  });

  it("reads nothing but its own files and the shared ones: no other feature, no network", async () => {
    const folder = import.meta.dirname;
    const files = (await readdir(folder)).filter(
      (file) => file.endsWith(".ts") && !file.endsWith(".test.ts"),
    );
    for (const file of files) {
      const source = await readFile(join(folder, file), "utf8");
      for (const [, from] of source.matchAll(/from "([^"]+)"/g))
        expect(
          from?.startsWith("./") || from?.startsWith("../../shared/"),
          `${file} imports ${from}`,
        ).toBe(true);
    }
  });
});
