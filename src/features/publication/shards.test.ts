import { describe, expect, it } from "vitest";
import type { Offer } from "../../shared/schemas/published/offer.js";
import { buildShards, latestOf, occupationCounts } from "./shards.js";

// The legacy's examples (test/builder.test.mjs, "Shards").
const offer = (
  id: string,
  f: string[],
  cc: string,
  d: string,
  fields: Partial<Offer> = {},
): Offer => ({
  id,
  t: "Process Engineer",
  c: "Acme",
  l: "",
  cc,
  ci: "",
  d,
  u: `https://a.example/${id}`,
  s: "brz",
  f,
  ...fields,
});
const families = [
  { id: "2144", label: "Mechanical engineers", group: "engineers" },
  { id: "3151", label: "Ships' engineers", group: "technicians" },
  { id: "7212", label: "Welders", group: "trades" },
];
const NOW = Date.parse("2026-09-03T00:00:00Z");
const recs = [
  offer("a", ["2144"], "es", "2026-09-01"),
  offer("b", ["2144", "3151"], "es", "2026-09-02"),
  offer("c", ["2144"], "zz", "2026-09-03"),
];
const ids = (text: string | undefined) =>
  (JSON.parse(text ?? "{}") as { offers: Offer[] }).offers.map((o) => o.id);

describe("shards and the newest (publication FR-6)", () => {
  it("writes one file per family and country, and the newest of the lot, each offer once", () => {
    const { files, latest, families: index } = buildShards(recs, families, NOW);
    expect([...files.keys()].toSorted()).toEqual([
      "offers/2144-es.json",
      "offers/2144-zz.json",
      "offers/3151-es.json",
      "offers/latest.json",
    ]);
    expect(latest.files).toEqual(["offers/latest.json"]);
    expect(ids(files.get("offers/latest.json"))).toEqual(["c", "b", "a"]);
    expect(ids(files.get("offers/2144-es.json"))).toEqual(["b", "a"]);
    expect(index["2144"]?.countries["es"]).toEqual({
      files: ["offers/2144-es.json"],
      n: 2,
      bytes: files.get("offers/2144-es.json")?.length,
    });
  });

  it("gives no more than asked for, and nothing older than the days given", () => {
    expect(
      latestOf(recs, { max: 2, now: NOW }).offers.map((o) => o.id),
    ).toEqual(["c", "b"]);
    expect(
      latestOf(recs, { days: 0, now: NOW }).offers.map((o) => o.id),
    ).toEqual(["c"]);
  });

  it("gives the newest in three growing parts, newest first", () => {
    const many = Array.from({ length: 2600 }, (_, i) =>
      offer(
        `n${String(i).padStart(4, "0")}`,
        ["2144"],
        "es",
        `2026-09-${String(3 - Math.floor(i / 1000)).padStart(2, "0")}`,
      ),
    );
    const grown = buildShards(many, families, NOW);
    expect(grown.latest.files).toEqual([
      "offers/latest.json",
      "offers/latest-2.json",
      "offers/latest-3.json",
    ]);
    const parts = grown.latest.files.map((name) => ids(grown.files.get(name)));
    expect(parts.map((part) => part.length)).toEqual([500, 1500, 600]);
  });

  it("marks a skilled trade's family optional and keeps its offers out of the newest, in a part of their own", () => {
    const traded = buildShards(
      [...recs, offer("w", ["7212"], "es", "2026-09-03")],
      families,
      NOW,
      new Set(["7212"]),
    );
    expect([
      traded.families["7212"]?.optional,
      traded.families["2144"]?.optional,
    ]).toEqual([true, undefined]);
    expect(ids(traded.files.get("offers/latest.json"))).toEqual([
      "c",
      "b",
      "a",
    ]);
    expect(ids(traded.files.get("offers/latest-optional.json"))).toEqual(["w"]);
    expect(traded.latest.optional).toEqual({
      files: ["offers/latest-optional.json"],
      n: 1,
    });
  });

  it("splits a shard past four million characters into numbered parts", () => {
    const long = "x".repeat(200);
    const big = Array.from({ length: 22_000 }, (_, i) =>
      offer(`b${i}`, ["2144"], "de", "2026-09-01", { t: long }),
    );
    const { files, families: index } = buildShards(big, families, NOW);
    const names = index["2144"]?.countries["de"]?.files ?? [];
    expect(names).toEqual(["offers/2144-de-1.json", "offers/2144-de-2.json"]);
    expect(
      names.every(
        (name) => (files.get(name)?.length ?? 0) <= 4 * 1024 * 1024 + 64,
      ),
    ).toBe(true);
  });

  it("gives the same bytes for the same offers in any order", () => {
    const one = buildShards(recs, families, NOW).files;
    const other = buildShards(recs.toReversed(), families, NOW).files;
    expect([...other].toSorted()).toEqual([...one].toSorted());
  });

  it("counts the occupations per family, each under its own", () => {
    expect(
      occupationCounts([
        offer("1", ["2144"], "es", "", { e: ["2144.1.14"] }),
        offer("2", ["2144", "3151"], "es", "", {
          e: ["2144.1.14", "2144.1.10"],
        }),
        offer("3", ["2142"], "es", "", { e: ["2144.1.14"] }),
      ]),
    ).toEqual({ 2144: { "2144.1.14": 2, "2144.1.10": 1 } });
  });
});
