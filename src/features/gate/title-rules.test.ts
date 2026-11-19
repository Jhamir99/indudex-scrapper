import { describe, expect, it } from "vitest";
import { readCatalogue } from "../../shared/catalogues/read-catalogue.js";
import { fold } from "../../shared/kit/fold.js";
import { TITLES as T } from "./title-rules.js";

type Lists = Record<string, string[]>;

// For each list: what its own alternation finds, and what the one-pass index finds.
function both(lists: Lists, text: string) {
  const found = T.find(T.index(lists), text);
  return Object.keys(lists).map((id) => [
    T.matches(T.alternation(lists[id]), text),
    found.get(id) ?? [],
  ]);
}

function expectSame(lists: Lists, text: string) {
  const results = both(lists, text);
  expect(results.map((r) => r[1])).toEqual(results.map((r) => r[0]));
}

// The legacy test's generator, from a fixed seed.
function generator(seed: number) {
  let state = seed;
  const rand = (n: number) => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state % n;
  };
  const pick = <V>(values: readonly V[]): V => values[rand(values.length)] as V;
  return { rand, pick };
}

describe("title rules (gate FR-2)", () => {
  it("finds the longest title of each list, each list on its own", () => {
    expectSame(
      { a: ["naval architect", "architect"], b: ["architect"] },
      "senior naval architect",
    );
    expectSame(
      { a: ["project engineer"], b: ["engineer manager"] },
      "project engineer manager",
    );
    expectSame({ a: ["engineer", "test"] }, "test engineer test");
    expect(
      T.find(
        T.index({ a: ["naval architect", "architect"] }),
        "senior naval architect",
      ).get("a"),
    ).toEqual(["naval architect"]);
  });

  it("reads symbols, runs of spaces, whole words, digits and the ends of a text as the regular expressions do", () => {
    expectSame(
      { a: ["c++ developer", "developer"] },
      "senior c++ developer (m/w/d)",
    );
    expectSame({ a: ["r&d engineer"] }, "r&d engineer");
    expectSame({ a: ["site engineer"] }, "site   engineer\tlead");
    expectSame({ a: ["engineer"] }, "engineering manager");
    expectSame({ a: ["engineer"] }, "engineer");
    expectSame({ a: ["engineer"] }, "");
    expectSame({ a: ["2d designer"] }, "x2d designer 2d designer");
    expectSame({ a: ["aa", "aa aa"] }, "aa aa aa");
    expectSame({ a: ["ab"] }, "ab-ab");
    expectSame({ a: ["c++"] }, "c++c++ c++");
    expectSame({ a: ["Ingénieur Méthodes"] }, fold("Ingénieur méthodes H/F"));
    expect(T.find(T.index({}), "anything").size).toBe(0);
  });

  it("keeps the longest hit, and a named title over an alternative", () => {
    const hits = [
      { id: "2144", text: "naval architect", named: true },
      { id: "2161", text: "architect", named: true },
      { id: "2142", text: "engineer", named: false },
      { id: "2149", text: "engineer", named: true },
    ];
    expect(T.winners(hits).map((h) => h.id)).toEqual(["2144", "2149"]);
    expect(
      T.winners(hits.slice(1), ["naval architect"]).map((h) => h.id),
    ).toEqual(["2149"]);
    expect(T.clean("  Ingénieur d’études  ")).toBe("ingenieur d etudes");
  });

  it("finds in generated texts of ESCO's titles what one regular expression per list finds", async () => {
    const isco = await readCatalogue("isco");
    const { rand, pick } = generator(20260923);
    const units = Object.values(isco.units);
    const lists: Lists = {};
    for (let i = 0; i < 12; i++)
      lists[`L${i}`] = [
        ...new Set(
          units
            .flatMap(
              (unit) => unit.labels[pick(["en", "es", "de", "fr"])] ?? [],
            )
            .filter(() => rand(40) === 0),
        ),
      ].slice(0, 300);
    const pool = Object.values(lists).flat();
    const glue = [
      " ",
      " - ",
      ", ",
      " / ",
      "  ",
      "\t",
      "(",
      ") ",
      " & ",
      "-",
      "",
      " senior ",
      " (m/w/d) ",
      " | ",
      "+",
    ];
    const index = T.index(lists);
    const alternations = Object.fromEntries(
      Object.entries(lists).map(([id, list]) => [id, T.alternation(list)]),
    );
    let matched = 0;
    const differ: string[] = [];
    for (let n = 0; n < 4000; n++) {
      const parts = Array.from({ length: 1 + rand(4) }, () =>
        T.clean(pick(pool)),
      );
      let text =
        parts.map((part) => pick(glue) + part).join(pick(glue)) + pick(glue);
      if (rand(5) === 0) text = text.slice(rand(4));
      const found = T.find(index, text);
      for (const id of Object.keys(lists)) {
        const want = T.matches(alternations[id] ?? null, text);
        matched += want.length;
        if (JSON.stringify(want) !== JSON.stringify(found.get(id) ?? []))
          differ.push(`${JSON.stringify(text)} ${id}`);
      }
    }
    expect(matched).toBeGreaterThan(5000);
    expect(differ).toEqual([]);
  });
});
