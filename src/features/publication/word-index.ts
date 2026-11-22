import { fold } from "../../shared/kit/fold.js";
import type { Offer } from "../../shared/schemas/published/offer.js";
import { cardKey } from "../companies/index.js";

// The index behind a search with words and nothing else (FR-7; legacy builder/word-index.mjs, with
// the web's app/lib/word-index.ts bucketOf and piecesOf and app/lib/offer-text.ts companyToken):
// every offer numbered, newest first and the intermediaries' after the rest; every word of its
// title, company and places with the numbers of the offers that hold it, in files by three-letter
// piece; each two-letter word with the offers that hold it whole; each country's offers; and the
// offers themselves in blocks of consecutive numbers.

const BUCKETS = 1024; // files of words, by three-letter piece
const PAIRS = 256; // files of two-letter pieces
const BLOCK = 250; // offers in a block, unless that makes more than MOST_BLOCKS blocks:
const MOST_BLOCKS = 2000; // a deployment took at most 20,000 files (Cloudflare Pages)

// Which file a piece of a word goes to (FNV-1a over its code points).
export function bucketOf(piece: string, buckets: number): number {
  let x = 2_166_136_261;
  for (const c of piece) {
    x ^= c.codePointAt(0) as number;
    x = Math.imul(x, 16_777_619) >>> 0;
  }
  return x % buckets;
}

// The three-letter pieces of a word, in order.
export function piecesOf(word: string): string[] {
  const chars = [...word];
  const out: string[] = [];
  for (let k = 0; k + 3 <= chars.length; k++)
    out.push(chars.slice(k, k + 3).join(""));
  return out;
}

// An employer's key as one word ("Siemens Energy AG" → "@siemens_energy"): the directory's "See
// its offers" searches for it, so a company called Alan does not bring Palantir. Empty for a key
// under two letters.
export function companyToken(name: string): string {
  const key = cardKey(name);
  return key.length >= 2 ? `@${key.replace(/ /g, "_")}` : "";
}

// The two-letter words a word holds whole, as the web's holdsWord finds them: "ab" in "ab/cd", and
// "c#", "f#", "a+" too (PUB-09).
const PAIR = /^[\p{L}\p{N}][\p{L}\p{N}#+]$/u;
const LETTER = /[\p{L}\p{N}]/u;
export function pairsOf(word: string): string[] {
  const chars = [...word];
  const out: string[] = [];
  for (let k = 0; k + 2 <= chars.length; k++) {
    const pair = (chars[k] ?? "") + (chars[k + 1] ?? "");
    if (
      PAIR.test(pair) &&
      !LETTER.test(chars[k - 1] ?? " ") &&
      !LETTER.test(chars[k + 2] ?? " ")
    )
      out.push(pair);
  }
  return out;
}

// The text the web's search looks in, but the country's name, which the page writes in its
// language, and the titles in French, Dutch and German; with the company's key as one word. The
// Catalan title is in, so "manteniment" and "mantenimiento" find the same offers.
export const haystack = (o: Offer): string =>
  fold(
    [
      o.t,
      o.te,
      o.ts,
      o.tc,
      o.c,
      o.ci,
      ...(o.m ?? []).map((place) => place[0]),
      o.l,
      companyToken(o.c),
    ]
      .filter(Boolean)
      .join(" "),
  );

// Ascending numbers as the gaps between them, each gap in 7-bit groups (the lowest first, the high
// bit saying another follows), in base64.
export function encodeNumbers(list: readonly number[]): string {
  const bytes: number[] = [];
  let previous = -1;
  for (const x of list) {
    let gap = x - previous;
    previous = x;
    while (gap > 127) {
      bytes.push((gap & 127) | 128);
      gap = Math.floor(gap / 128);
    }
    bytes.push(gap);
  }
  return Buffer.from(bytes).toString("base64");
}

// A number added to a key's list.
const add = (map: Map<string, number[]>, key: string, n: number) => {
  const list = map.get(key);
  if (list) list.push(n);
  else map.set(key, [n]);
};
export interface WordIndexManifest {
  dir: string;
  n: number;
  block: number;
  buckets: number;
  pairs: number;
  sizes: number[];
  countries: string[];
  via: number;
}

// The offers → the manifest, and the offers in the order they are numbered; each file goes to
// `write` as it is made, so the build does not hold them all.
export function buildWordIndex(
  records: readonly Offer[],
  isVia: (source: string) => boolean,
  dir: string,
  write: (path: string, content: string) => void,
): { manifest: WordIndexManifest; offers: Offer[] } {
  const seen = new Set<string>();
  const offers = records
    .filter((o) => !seen.has(o.id) && Boolean(seen.add(o.id)))
    .toSorted(
      (a, b) =>
        Number(isVia(a.s)) - Number(isVia(b.s)) ||
        String(b.d || "").localeCompare(String(a.d || "")) ||
        a.id.localeCompare(b.id),
    );
  const words = new Map<string, number[]>();
  const pairs = new Map<string, number[]>();
  const countries = new Map<string, number[]>();

  offers.forEach((o, n) => {
    const own = new Set(haystack(o).split(/\s+/).filter(Boolean));
    const ownPairs = new Set<string>();
    for (const word of own) {
      add(words, word, n);
      for (const pair of pairsOf(word)) ownPairs.add(pair);
    }
    for (const pair of ownPairs) add(pairs, pair, n);
    add(countries, o.cc || "zz", n);
  });
  const buckets = Array.from({ length: BUCKETS }, () => ({
    w: [] as string[],
    p: [] as string[],
  }));
  for (const [word, list] of words) {
    const code = encodeNumbers(list);
    for (const b of new Set(
      piecesOf(word).map((piece) => bucketOf(piece, BUCKETS)),
    )) {
      buckets[b]?.w.push(word);
      buckets[b]?.p.push(code);
    }
  }
  const sizes = buckets.map((bucket, i) => {
    const json = JSON.stringify(bucket);
    write(`${dir}/t-${i}.json`, json);
    return json.length;
  });
  const pairFiles = Array.from(
    { length: PAIRS },
    () => ({}) as Record<string, string>,
  );
  for (const [pair, list] of pairs) {
    const file = pairFiles[bucketOf(pair, PAIRS)];
    if (file) file[pair] = encodeNumbers(list);
  }
  pairFiles.forEach((p, i) =>
    write(`${dir}/b-${i}.json`, JSON.stringify({ p })),
  );
  for (const [country, list] of countries)
    write(
      `${dir}/c-${country}.json`,
      JSON.stringify({ p: encodeNumbers(list) }),
    );
  const block = Math.max(BLOCK, Math.ceil(offers.length / MOST_BLOCKS));
  for (let k = 0; k * block < offers.length; k++)
    write(
      `${dir}/o-${k}.json`,
      JSON.stringify({
        v: 1,
        offers: offers.slice(k * block, (k + 1) * block),
      }),
    );
  const firstVia = offers.findIndex((o) => isVia(o.s));
  return {
    offers,
    manifest: {
      dir,
      n: offers.length,
      block,
      buckets: BUCKETS,
      pairs: PAIRS,
      sizes,
      countries: [...countries.keys()].toSorted(),
      via: firstVia < 0 ? offers.length : firstVia,
    },
  };
}
