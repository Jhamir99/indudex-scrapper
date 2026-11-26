// ➤ The trades Firefox gets wrong, written by their names before it reads a title (the names: trades-data.ts).
// The legacy's builder/mt/trades.ts (JustJans/indudex@ec79858), copied (legacy resync T009): only its imports and data reads
// changed. Its own comments keep their marks.
import { translationData } from "../data.js";

// The trades' names: catalogues/translation/trades.json, the legacy's trades-data.ts as it computed it.
export type TradeLang =
  "en" | "es" | "ca" | "fr" | "de" | "nl" | "pl" | "it" | "uk";
export type Trade = Partial<Record<TradeLang, string>> & {
  en: string;
  also?: Record<string, string[]>;
  blocks?: boolean;
};
const DATA = translationData<{ SPOKEN: string[][]; TRADES: Trade[] }>(
  "trades.json",
);
const SPOKEN = DATA.SPOKEN;
const TRADES = DATA.TRADES;

export { SPOKEN, TRADES };

// ➤ A German name read with its feminine forms too ("Monteurin" came back "Fitterin"): on the word that names the person,
// ➤ the first of four letters or more that ends like one and is no adjective («Mechatronikerin Kältetechnik», «Leitender
// ➤ Monteur» is no «Leitenderin»); none for a plural, a «Fachkraft» or a «Kaufmann» (TB1-11).
const PERSON = /(?:er|eur|or|ist|(?<!m)ent|ant|är|ör|ar)$/,
  ADJECTIVE = /(?:ender|ischer|licher|iger|ierter|ener|eller|iver|fter)$/;
function femininesOf(name: string): string[] {
  if (name[0] === "^") return [];
  const words = name.split(" ");
  const k = words.findIndex(
    (w) =>
      w.length >= 4 &&
      PERSON.test(w) &&
      (words.length === 1 || !ADJECTIVE.test(w)),
  );
  return k < 0
    ? []
    : ["in", "innen"].map((end) =>
        words.map((w, i) => (i === k ? w + end : w)).join(" "),
      );
}
// ➤ A pair names its languages; one with no trades' names (Czech, Danish) finds none.
const namesOf = (pair: string): [string, TradeLang] =>
  pair.split("-") as [string, TradeLang];
// ➤ For one pair: each way the source may write a trade (longest first, English with its plural), and
// ➤ the name to write in the target.
export function tradesFor(pair: string): [string, string][] {
  const [s, t] = namesOf(pair),
    out: [string, string][] = [];
  for (const e of TRADES) {
    if (!e[t]) continue;
    // ➤ Recognised: the English name, and in other languages only the ways listed under "also"
    // ➤ (a name to write, like "preparador", may mean something else when read: "preparador de pedidos").
    const read = (e.also || {})[s] || [];
    const feminine =
      s === "de"
        ? read.flatMap(femininesOf).filter((n) => !read.includes(n))
        : [];
    const names = [s === "en" ? e.en : "", ...read, ...feminine].filter(
      Boolean,
    );
    for (const n of names) out.push([n, e[t]]);
  }
  out.sort((a, b) => b[0].length - a[0].length);
  const esc = (n: string): string =>
    n.replace(/[.*+?^${}()|[\]\\/]/g, (c) => "\\" + c);
  // ➤ A name written with "^" counts only at the start of the title ("Oficial de electricidad", not
  // ➤ "Colegio Oficial de Ingenieros").
  // ➤ An English name with a hyphen read with a space too ("Welder Fabricator", "CNC Turner Miller" as Firefox gives
  // ➤ "turner-miller" back); not a language, which SPEAKING writes with one where it should ("Swiss German
  // ➤ speaking").
  // ➤ Its plural too, but not of a one-word name in «-ic»: «mechanics» alone is the field («electricity and mechanics»).
  return out.map(([n, tr]) => [
    (n[0] === "^"
      ? "^" + esc(n.slice(1))
      : s === "en" && !/-speaking$/.test(n)
        ? esc(n).replace(/-/g, "[-\\s]")
        : esc(n)) + (s === "en" && !/s$|^\p{L}+ic$/u.test(n) ? "s?" : ""),
    tr,
  ]);
}

// ➤ From English, the trades of several words not written for this pair (no name in the target): kept whole, so a shorter trade inside them is not written ("fitter" in
// ➤ "cable fitter" made "Cable montador" → "Cableador montado").
export function blockersFor(pair: string): string[] {
  const [s, t] = namesOf(pair);
  if (s !== "en") return [];
  const esc = (n: string): string =>
    n.replace(/[.*+?^${}()|[\]\\/]/g, (c) => "\\" + c);
  const written = TRADES.filter((e) => e[t]).map((e) => e.en.toLowerCase());
  return TRADES.filter(
    (e) =>
      e.blocks !== false &&
      /\s/.test(e.en) &&
      !e[t] &&
      !written.some((w) => w.includes(e.en.toLowerCase())),
  )
    .map((e) => e.en)
    .sort((a, b) => b.length - a.length)
    .map((n) => esc(n) + (/s$/.test(n) ? "" : "s?"));
}

// ➤ An English trade with its name in another language in brackets after it («Welder (Soldador) - Zaragoza»): the
// ➤ brackets go, or the other language stays in every target but its own («Soudeur (Soldador)»).
let namesOfTrade: Map<string, Set<string>> | null = null;
export function withoutGloss(title: string): string {
  if (!namesOfTrade) {
    namesOfTrade = new Map();
    for (const e of TRADES) {
      const all = new Set(
        Object.entries(e)
          .filter(([k, v]) => k !== "en" && typeof v === "string")
          .map(([, v]) => String(v).toLowerCase()),
      );
      namesOfTrade.set(e.en.toLowerCase(), all);
    }
  }
  // ➤ From a word's start only, as the leftmost match always is: from every letter, a long word was read again each time.
  return title.replace(
    /(?<!\p{L})(\p{L}[\p{L}\s-]*?)\s*\(([^()]+)\)/gu,
    (m, head: string, gloss: string) => {
      const words = head.toLowerCase().split(/\s+/);
      const glossed = words.some((_, i) =>
        namesOfTrade
          ?.get(words.slice(i).join(" "))
          ?.has(gloss.trim().toLowerCase()),
      );
      return glossed ? head : m;
    },
  );
}
