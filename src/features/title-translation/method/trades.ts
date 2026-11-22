// Legacy builder/mt/trades.mjs (JustJans/indudex@b0cd182), word for word but for types, lint and paths.
// The trades Firefox gets wrong, written by their names before it reads a title (the names: trades-data.mjs).
import { translationData } from "../data.js";

// A trade: its name in each language ("en", "es"…), the ways a title in a language is recognised to
// hold it ("also"), and whether, into a language it has no name for, it keeps the trades it holds
// from being written ("blocks"). The data: catalogues/translation/trades.json, the legacy's
// trades-data.mjs as it computed it.
export interface Trade {
  readonly [language: string]: unknown;
  readonly en: string;
  readonly also?: Readonly<Record<string, readonly string[]>>;
  readonly blocks?: boolean;
}
const DATA = translationData<{ SPOKEN: string[][]; TRADES: Trade[] }>(
  "trades.json",
);
export const SPOKEN: readonly (readonly string[])[] = DATA.SPOKEN;
export const TRADES: readonly Trade[] = DATA.TRADES;

// For one pair: each way the source may write a trade (longest first, English with its plural), and
// the name to write in the target.
// Into another language from English, a trade Firefox already translates right on its own is left to it
// (trades-check.mjs): a word of another language inside the English can unsettle the rest of the title.
const FIREFOX_RIGHT = (() => {
  try {
    return translationData<Record<string, string[]>>("trades-firefox.json");
  } catch {
    return {};
  }
})();
// A German name read with its feminine forms too ("Monteurin" came back "Fitterin"): on the word that names the person,
// the first of four letters or more that ends like one and is no adjective («Mechatronikerin Kältetechnik», «Leitender
// Monteur» is no «Leitenderin»); none for a plural, a «Fachkraft» or a «Kaufmann» (TB1-11).
const PERSON = /(?:er|eur|or|ist|(?<!m)ent|ant|är|ör|ar)$/,
  ADJECTIVE = /(?:ender|ischer|licher|iger|ierter|ener|eller|iver|fter)$/;
function femininesOf(name: string) {
  if (name[0] === "^") return [];
  const words = name.split(" ");
  const k = words.findIndex(
    (w: string) =>
      w.length >= 4 &&
      PERSON.test(w) &&
      (words.length === 1 || !ADJECTIVE.test(w)),
  );
  return k < 0
    ? []
    : ["in", "innen"].map((end) =>
        words.map((w: string, i: number) => (i === k ? w + end : w)).join(" "),
      );
}
export function tradesFor(pair: string) {
  const [s = "", t = ""] = pair.split("-"),
    out: [string, string][] = [];
  const right = new Set(s === "en" ? FIREFOX_RIGHT[pair] || [] : []);
  for (const e of TRADES) {
    if (!e[t] || right.has(e.en)) continue;
    // Recognised: the English name, and in other languages only the ways listed under "also"
    // (a name to write, like "preparador", may mean something else when read: "preparador de pedidos").
    const read: readonly string[] = (e.also || {})[s] || [];
    const feminine =
      s === "de"
        ? read.flatMap(femininesOf).filter((n) => !read.includes(n))
        : [];
    const names = [s === "en" ? e.en : null, ...read, ...feminine].filter(
      (n): n is string => Boolean(n),
    );
    for (const n of names) out.push([n, e[t] as string]);
  }
  out.sort((a, b) => b[0].length - a[0].length);
  const esc = (n: string) =>
    n.replace(/[.*+?^${}()|[\]\\/]/g, (c: string) => "\\" + c);
  // A name written with "^" counts only at the start of the title ("Oficial de electricidad", not
  // "Colegio Oficial de Ingenieros").
  // An English name with a hyphen read with a space too ("Welder Fabricator", "CNC Turner Miller" as Firefox gives
  // "turner-miller" back); not a language, which SPEAKING writes with one where it should ("Swiss German
  // speaking").
  return out.map(([n, tr]) => [
    (n[0] === "^"
      ? "^" + esc(n.slice(1))
      : s === "en" && !/-speaking$/.test(n)
        ? esc(n).replace(/-/g, "[-\\s]")
        : esc(n)) + (s === "en" && !/s$/.test(n) ? "s?" : ""),
    tr,
  ]);
}

// From English, the trades of several words not written for this pair (no name in the target, or
// Firefox already right): kept whole, so a shorter trade inside them is not written ("fitter" in
// "cable fitter" made "Cable montador" → "Cableador montado").
export function blockersFor(pair: string) {
  const [s = "", t = ""] = pair.split("-");
  if (s !== "en") return [];
  const right = new Set(FIREFOX_RIGHT[pair] || []);
  const esc = (n: string) =>
    n.replace(/[.*+?^${}()|[\]\\/]/g, (c: string) => "\\" + c);
  const written = TRADES.filter((e) => e[t] && !right.has(e.en)).map((e) =>
    e.en.toLowerCase(),
  );
  return TRADES.filter(
    (e) =>
      e.blocks !== false &&
      /\s/.test(e.en) &&
      (!e[t] || right.has(e.en)) &&
      !written.some((w) => w.includes(e.en.toLowerCase())),
  )
    .map((e) => e.en)
    .sort((a, b) => b.length - a.length)
    .map((n) => esc(n) + (/s$/.test(n) ? "" : "s?"));
}
