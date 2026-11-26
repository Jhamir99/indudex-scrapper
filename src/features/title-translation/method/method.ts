// The method that translates job titles with Firefox's own models (Bergamot): version s139 of the work in
// docs/research/translation-between-languages.md. Before Firefox: the title tidied, and the trades of the table
// written already translated (Firefox copies words of another language as they are). After Firefox: what it adds
// removed and its known slips corrected. Only a title whose product name got lost is translated again, with that
// name behind a name Firefox never translates. builder/mt/legs.ts runs the steps at the end around Firefox's passes.
// ➤ Its parts: patterns.ts, method-tables.ts, before.ts, checks.ts, levels.ts, after.ts.
// The legacy's builder/mt/method.ts (JustJans/indudex@ec79858), copied (legacy resync T009): only its imports and data reads
// changed. Its own comments keep their marks.
import { townsBack } from "./places.js";
import { companyBack } from "./companies.js";
import { before, type Before } from "./before.js";
import type { Info } from "./info.js";
import { after, copy, copyAgain, letters, polish, putBack } from "./after.js";
import {
  BROKEN,
  chooseDash,
  hasTrade,
  lostNames,
  oddWords,
  withPlural,
  type Again,
} from "./checks.js";
import { escape, word } from "./patterns.js";
import { decode } from "./method-tables.js";

export { NAMES, wordsAfter, apartGlued } from "./method-tables.js";
export { before } from "./before.js";
export {
  chooseDash,
  tradeWritten,
  hasTrade,
  oddWords,
  writtenInEnglish,
  lostNames,
} from "./checks.js";
export { ukrainianOrder } from "./levels.js";
export { polish, after, putBack, copyAgain } from "./after.js";

// ➤ Before Firefox: each title tidied, with the dash, bare and bare-dash versions beside it, and what the later
// ➤ steps need to know (info). Beside each title: its offer's town, the levels the first leg took out (said at the
// ➤ end), the title it came from (second leg, for its towns) and its company with how many other companies' titles
// ➤ hold its words ("company<TAB>count").
// ➤ A title to translate again, by its place in the list.
export type AgainAt = Again & { i: number };
type Beside = {
  cities?: string[];
  levels?: string[];
  sources?: string[];
  firms?: string[];
};

export function beforeStep(
  pair: string,
  titles: string[],
  { cities = [], levels = [], sources = [], firms = [] }: Beside = {},
) {
  const companyOf = (l: string | undefined): [string, number] => {
    const [c = "", n = "0"] = String(l || "").split("\t");
    return [c, Number(n) || 0];
  };
  const done = titles.map(
    (x, i): Omit<Before, "info"> & { info: Info | null } =>
      x
        ? before(
            pair,
            x,
            cities[i],
            levels[i] || "",
            sources[i] || "",
            ...companyOf(firms[i]),
          )
        : { text: ".", dash: "", bare: "", bareDash: "", info: null },
  );
  return {
    text: done.map((d) => d.text),
    dash: done.map((d) => d.dash || d.text),
    bare: done.map((d) => d.bare || d.text),
    bareDash: done.map((d) => (d.dash ? d.bareDash : d.bare) || d.text),
    info: copy(done.map((d) => d.info)),
  };
}
// ➤ The dash version where Firefox kept its head noun apart (chooseDash): the chosen input and output.
export function chooseStep(
  text: string[],
  dash: string[],
  raw: string[],
  rawDash: string[],
) {
  const pick = text.map(
    (x, i) => dash[i] !== x && chooseDash(raw[i], rawDash[i]),
  );
  return {
    text: text.map((x, i) => (pick[i] ? dash[i] : x)),
    raw: raw.map((x, i) => (pick[i] ? rawDash[i] : x)),
  };
}
// ➤ Where Firefox alone wrote every trade under its right name, its version replaces the one with the trades
// ➤ written in. `bareRaw` and `bareDashRaw` are Firefox's own outputs (the bare-dash one only where it was asked).
type Versions = {
  dash: string[];
  bare: string[];
  bareDash: string[];
  bareRaw: string[];
  bareDashRaw: string[] | null;
};
export function tradesStep(
  text: string[],
  raw: string[],
  info: (Info | null)[],
  { dash, bare, bareDash, bareRaw, bareDashRaw }: Versions,
) {
  const inT = text.slice(),
    out = raw.slice(),
    rawBare = bareRaw,
    rawBareDash = bareDashRaw || bareRaw;
  inT.forEach((x0, i) => {
    const it = info[i];
    if (!it?.expect.length) return;
    const want = it.expect;
    const dashChosen = bare[i] !== bareDash[i] && x0 === dash[i];
    const alone = dashChosen ? rawBareDash[i] : rawBare[i];
    // ➤ A trade counts as written when each of its words of three letters or more is there as a word, a
    // ➤ plural ending allowed ("ingénieur conception" in "Ingénieur de conception", "montador" in
    // ➤ "Montadores"), but not inside another word ("Polier" in "Polieren", to polish).
    const has = hasTrade;
    // ➤ The trades version must give each trade back whole and in its order ("técnico electrónico", not
    // ➤ "Industrial electrónico técnico"); Firefox alone may word it its own way.
    // ➤ As many times as it was written in ("técnico electrónico" three times in, once out: mangled twice).
    // ➤ A hyphen given back as a space counts ("CNC Turner Miller" for "turner-miller").
    const times = (t: string | undefined, w: string): number =>
      (
        String(t || "").match(
          new RegExp(
            "(?:^|[^\\p{L}])" +
              withPlural(w).replace(/-/g, "[-\\s]") +
              "(?![\\p{L}])",
            "giu",
          ),
        ) || []
      ).length;
    // ➤ A trade said twice must come back twice from Firefox alone too ("Tekenaar / Designer … Tekla Tekenaar":
    // ➤ "Artist / Designer … Tekla Draughtsman").
    // ➤ A word two trades share must be there as often as they ask for it ("Mechatronics technician/electronics" does
    // ➤ not write both "mechatronics technician" and "electronics technician").
    const demand: Record<string, number> = {};
    for (const w of want)
      for (const c of w
        .toLowerCase()
        .split(/[\s'’/-]+/)
        .filter((c) => c.length > 2))
        demand[c] = (demand[c] || 0) + 1;
    const shared = Object.entries(demand).every(
      ([c, k]) => k < 2 || times(alone, c) >= k,
    );
    const aloneOk =
        shared &&
        want.every(
          (w) =>
            has(alone, w) &&
            (/\s/.test(w) ||
              times(x0, w) < 2 ||
              times(alone, w) >= times(x0, w)),
        ),
      tradesOk = want.every(
        (w) => times(out[i], w) >= Math.max(1, times(x0, w)),
      );
    // ➤ Firefox alone where it writes every trade; the trades version where it kept them intact; else
    // ➤ Firefox alone again, whose words are at least whole ("montador" can come back as "montor").
    if (it.whole) {
      out[i] = it.whole;
      return;
    }
    if (aloneOk || !tradesOk) {
      inT[i] = dashChosen ? bareDash[i] : bare[i];
      out[i] = alone;
    }
    // ➤ Both wrong, and the title opens with the trade before a separator: that opening of Firefox's own
    // ➤ version takes the table's name.
    if (!aloneOk && !tradesOk && it.head) {
      const m = String(alone || "").match(
        /^(.*?)(\s+[–-]\s+|\s*\|\s*|\s*\/\s*|\s*\(|$)/u,
      );
      if (m && m[1]) out[i] = it.head + alone.slice(m[1].length);
    }
  });
  return { text: inT, raw: out };
}
// ➤ A town only renamed, or the company in other capitals, written back in Firefox's own output; and the titles
// ➤ that lost a name, each with the text to give Firefox again (names behind stand-ins). Not a title written
// ➤ whole: it is in the target language already.
export function namesStep(
  pair: string,
  text: string[],
  raw: string[],
  infos: (Info | null)[],
) {
  const out = raw.slice(),
    again: AgainAt[] = [];
  infos.forEach((info, i) => {
    if (info && info.alts) out[i] = townsBack(out[i] || "", info.alts);
    if (info && info.firm) out[i] = companyBack(out[i] || "", info.firm);
  });
  infos.forEach((info, i) => {
    if (!info || info.whole) return;
    const a =
      lostNames(
        text[i],
        out[i] || "",
        info,
        oddWords(pair, out[i], text[i]) > 0,
        pair,
      ) || copyAgain(pair, text[i], out[i], info);
    if (a) again.push({ i, ...a });
  });
  return { raw: out, again: copy(again) };
}
// ➤ After Firefox: the titles translated again put back, then each output corrected (after); a title whose
// ➤ names could not be put back, or with a letter Firefox broke, is shown as written. Answers the translations and the levels each said.
export function afterStep(
  pair: string,
  src: string[],
  raw: string[],
  infos: (Info | null)[],
  raw2: string[] = [],
  again: AgainAt[] = [],
) {
  const fixed: (string | null)[] = raw.slice();
  again.forEach((a, k) => {
    if (
      a.copy &&
      (letters(raw2[k]) === letters(a.text) ||
        (infos[a.i]?.names || []).some(
          (n) => !word(escape(n)).test(raw2[k] || ""),
        ))
    )
      return;
    const back = putBack(raw2[k], a);
    if (back !== null) fixed[a.i] = townsBack(back, infos[a.i]?.alts);
    else if (a.names !== false) fixed[a.i] = null;
  });
  // ➤ A letter still broken, where no word of the title could be found behind it: shown as written.
  fixed.forEach((f, i) => {
    if (f !== null && f.includes(BROKEN) && !src[i].includes(BROKEN))
      fixed[i] = null;
  });
  const out = src.map((s, i) =>
    !infos[i]
      ? ""
      : fixed[i] === null
        ? decode(s).replace(/\s+/g, " ").trim()
        : after(pair, s, fixed[i], infos[i]),
  );
  return { out, levels: infos.map((x) => (x && x.level) || "") };
}
// ➤ The English shown on the site, from the first leg's output.
export const polishStep = (pair: string, outs: string[]): string[] =>
  outs.map((o) => polish(pair, o));
