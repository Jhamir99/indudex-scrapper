import { describe, expect, it } from "vitest";
import { type TakenAdvert, withoutTaken } from "./taken.js";

// The legacy's example (test/builder.test.mjs, PUB-01).
const at = (url: string, town: string, company = "Acme") => ({
  url,
  company,
  title: "Process Engineer",
  place: `es|${town.toLowerCase()}`,
});
const taken = (town: string, company = "Acme"): TakenAdvert => ({
  company,
  title: "Process Engineer",
  place: `es|${town.toLowerCase()}`,
});

describe("the copies of an advert taken down (dedupe FR-6)", () => {
  const copies = [
    at("https://acme.example/1", "Madrid"),
    at("https://adzuna.example/9", "Madrid"),
    at("https://acme.example/2", "Bilbao"),
  ];

  it("takes every copy of the advert, an intermediary's too, and only it", () => {
    expect(
      withoutTaken(copies, [taken("Madrid")]).map(({ url }) => url),
    ).toEqual(["https://acme.example/2"]);
  });

  it("changes nothing when nothing is taken down", () => {
    expect(withoutTaken(copies, [])).toEqual(copies);
  });

  it("takes no advert with one taken down that names no employer", () => {
    const nameless = [
      at("https://a/1", "Madrid", ""),
      at("https://a/2", "Madrid", ""),
    ];
    expect(withoutTaken(nameless, [taken("Madrid", "")])).toEqual(nameless);
  });
});
