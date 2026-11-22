import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FIXTURES_DIRECTORY } from "../../../test/contract/adapter-contract.js";
import type { Offer } from "../../shared/schemas/published/offer.js";
import {
  bucketOf,
  buildWordIndex,
  companyToken,
  encodeNumbers,
  haystack,
  pairsOf,
  piecesOf,
} from "./word-index.js";

// The web's reading of encodeNumbers (legacy app/lib/word-index.ts decodeNumbers).
function decodeNumbers(text: string): number[] {
  const out: number[] = [];
  let previous = -1;
  let gap = 0;
  let shift = 1;
  for (const byte of Buffer.from(text, "base64")) {
    gap += (byte & 127) * shift;
    if (byte & 128) shift *= 128;
    else {
      previous += gap;
      out.push(previous);
      gap = 0;
      shift = 1;
    }
  }
  return out;
}

const offer = (id: string, fields: Partial<Offer> = {}): Offer => ({
  id,
  t: "Process Engineer",
  c: "Siemens AG",
  l: "",
  cc: "de",
  ci: "",
  d: "2026-11-01",
  u: `https://a.example/${id}`,
  s: "brz",
  f: ["2144"],
  ...fields,
});

describe("the word index (publication FR-7)", () => {
  it("indexes two-letter words whole, «c#», «f#» and «a+» too (PUB-09)", () => {
    expect(pairsOf("c#/.net")).toEqual(["c#"]);
    expect([
      pairsOf("a+"),
      pairsOf("ab-cd"),
      pairsOf("(m/w/d)"),
      pairsOf("abc"),
    ]).toEqual([["a+"], ["ab", "cd"], [], []]);
  });

  it("files a word by its three-letter pieces, FNV-1a over code points", () => {
    expect(piecesOf("łódź")).toEqual(["łód", "ódź"]);
    expect(bucketOf("abc", 1024)).toBe(bucketOf("abc", 1024));
    expect(bucketOf("abc", 1024)).toBeLessThan(1024);
  });

  it("writes ascending numbers as gaps the web reads back", () => {
    const list = [0, 1, 5, 200, 20_000, 2_000_000];
    expect(decodeNumbers(encodeNumbers(list))).toEqual(list);
  });

  it("looks in the title, its translations, the employer, its key as one word and the places", () => {
    expect(companyToken("Siemens Energy AG")).toBe("@siemens_energy");
    expect(companyToken("X")).toBe("");
    expect(
      haystack(
        offer("1", {
          ci: "München",
          l: "München, DE",
          m: [["Graz", 47.07, 15.44], ["Linz"]],
        }),
      ),
    ).toBe(
      "process engineer siemens ag munchen graz linz munchen, de @siemens",
    );
  });

  it("numbers the offers newest first, the intermediaries' last", () => {
    const files = new Map<string, string>();
    const { manifest, offers } = buildWordIndex(
      [
        offer("a", { d: "2026-11-01" }),
        offer("b", { d: "2026-11-03", s: "jooble" }),
        offer("c", { d: "2026-11-02" }),
        offer("a"),
      ],
      (source) => source === "jooble",
      "words",
      (path, content) => files.set(path, content),
    );
    expect(offers.map((o) => o.id)).toEqual(["c", "a", "b"]);
    expect(manifest).toMatchObject({
      dir: "words",
      n: 3,
      block: 250,
      buckets: 1024,
      pairs: 256,
      countries: ["de"],
      via: 2,
    });
    expect(files.size).toBe(1024 + 256 + 1 + 1);
  });

  it("writes every file as the legacy did, byte for byte", async () => {
    const golden = JSON.parse(
      await readFile(
        join(FIXTURES_DIRECTORY, "publication", "word-index.json"),
        "utf8",
      ),
    ) as {
      manifest: unknown;
      digests: Record<string, string>;
    };
    // The made-up offers of the scratchpad's golden-words.mts, rebuilt the same way.
    const titles = (
      JSON.parse(
        await readFile(
          join(FIXTURES_DIRECTORY, "dedupe", "titles.json"),
          "utf8",
        ),
      ) as { cases: { t: string }[] }
    ).cases.map((c) => c.t);
    const names = (
      JSON.parse(
        await readFile(
          join(FIXTURES_DIRECTORY, "companies", "names.json"),
          "utf8",
        ),
      ) as { cases: { name: string }[] }
    ).cases
      .map((c) => c.name)
      .filter(Boolean);
    const towns = [
      ["Barcelona", "es"],
      ["München", "de"],
      ["Göteborg", "se"],
      ["Łódź", "pl"],
      ["", "zz"],
      ["Wien", "at"],
      ["Liège", "be"],
      ["", "xx"],
    ];
    const offers = Array.from({ length: 600 }, (_, i): Offer => {
      const [ci = "", cc = ""] = towns[i % towns.length] ?? [];
      return {
        id: `o${String(i).padStart(4, "0")}`,
        t: titles[(i * 7) % titles.length] ?? "",
        c: names[(i * 13) % names.length] ?? "",
        l: ci ? `${ci}, ${cc.toUpperCase()}` : "",
        cc,
        ci,
        d:
          i % 17 === 0
            ? ""
            : `2026-11-${String(1 + (i % 20)).padStart(2, "0")}`,
        u: `https://a.example/${i}`,
        s: i % 9 === 0 ? "via" : "brz",
        f: ["2144"],
        ...(i % 31 === 0
          ? { m: [["Girona", 41.98, 2.82], ["Lleida"]] as Offer["m"] }
          : {}),
      };
    });
    const digests: Record<string, string> = {};
    const { manifest } = buildWordIndex(
      offers,
      (s) => s === "via",
      "words",
      (path, content) => {
        digests[path] = createHash("sha256").update(content).digest("hex");
      },
    );
    expect(manifest).toEqual(golden.manifest);
    expect(digests).toEqual(golden.digests);
  });
});
