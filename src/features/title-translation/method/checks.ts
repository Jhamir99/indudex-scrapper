// ➤ What tells a translation that lost or misread something: the dash chosen, a trade written, odd or English words,
// ➤ names lost (builder/mt/method.ts).
// The legacy's builder/mt/checks.ts (JustJans/indudex@ec79858), copied (legacy resync T009): only its imports and data reads
// changed. Its own comments keep their marks.
import { isTown } from "./places.js";
import {
  ADJ_EN,
  ADJ_PLAIN,
  LINK_EN,
  NOT_A_BUILDING_SITE,
  PERSON,
  STACK_EN,
  STACK_OUT,
  STANDS,
  STANDS_UK,
  TERMS,
  vocabOf,
  wordsAfter,
} from "./method-tables.js";
import { escape, termWord, word } from "./patterns.js";
import type { Info } from "./info.js";

// ➤ A stand-in and the name behind it, or the trade's name to write there.
export type Put = [string, string, "trade"?];
// ➤ A title to give Firefox again: its text with the stand-ins, and whether a name was lost.
export type Again = {
  text: string;
  put: Put[];
  names: boolean;
  copy?: boolean;
};

// ➤ The dash version is kept when the English without it starts with the job and goes on: "Development
// ➤ Engineer Machine Safety", which the next translation would read with "Safety" as the head. Where the
// ➤ English already puts the job last ("Data Director"), the plain version stays.
export function chooseDash(
  plainOut: string | undefined,
  dashOut: string | undefined,
): boolean {
  const parts = String(dashOut || "").split(/\s[–-]\s|:\s/);
  if (parts.length < 2) return false;
  // ➤ The job's head noun: the last word before the dash in the dashed English ("Engineer").
  const head = (parts[0]
    .trim()
    .toLowerCase()
    .match(/[\p{L}]+$/u) || [""])[0];
  if (head.length < 3) return false;
  // ➤ The plain English keeps it last in its first part ("Data Director", "Full Stack Developer – Lyon"): no dash.
  const first = String(plainOut || "")
    .split(/\s[–|-]\s|[,([|:]/)[0]
    .trim()
    .toLowerCase();
  const last = (first.match(/[\p{L}]+$/u) || [""])[0];
  return !(last === head || last === head + "s" || last + "s" === head);
}
// ➤ A trade counts as written when each of its words of three letters or more is there as a word, a
// ➤ plural ending allowed ("ingénieur conception" in "Ingénieur de conception", "montador" in
// ➤ "Montadores"), but not inside another word ("Polier" in "Polieren", to polish). A word of five letters or more
// ➤ may close a German or Dutch compound ("Schweißer" in "Wartungsschweißer", "lasser" in "Onderhoudslasser"): the
// ➤ written-in "Wartung Schweißer" won over Firefox's own compound.
// ➤ The name the table writes for a title of the pair, the longest found first, read as the method reads it: what the
// ➤ table's tests ask, so they test production's own reading and not a copy of it (TB1-04).
export const tradeWritten = (pair: string, title: string): string | null =>
  (TERMS[pair] || []).find(
    ([re]) =>
      !(/^site/.test(re) && NOT_A_BUILDING_SITE.test(title)) &&
      termWord(re).test(title),
  )?.[1] ?? null;
// ➤ A word of a trade with its plural endings: «s», «es», «e», and the Catalan «-a» → «-es» («lampistes»).
export const withPlural = (w: string): string =>
  w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/a$/u, "(?:a|e)") +
  "(?:s|es|e)?";
export const hasTrade = (out: string | undefined, w: string): boolean => {
  // ➤ A name opening with "de" needs it ("de habla alemana": "(habla alemana)" says "speaks German").
  if (
    /^de\s/i.test(w) &&
    !new RegExp("(?:^|[^\\p{L}])" + escape(w) + "(?![\\p{L}])", "iu").test(
      String(out || ""),
    )
  )
    return false;
  const words = w
    .toLowerCase()
    .split(/[\s'’/-]+/)
    .filter(
      (c) =>
        c.length > 2 &&
        !/^(?:del|des|les|und|van|for|and|the|voor|für)$/.test(c),
    );
  if (!words.length) return true;
  const text = String(out || "");
  // ➤ Every place each word is at: a word said twice ("Técnico electrónico / Técnico de mecatrónica") is looked for beside
  // ➤ the others, not only where it first comes.
  const at = words.map((c) =>
    [
      ...text.matchAll(
        new RegExp(
          (c.length >= 5
            ? "(?:^|[^\\p{L}]|(?<=\\p{L}{3}))"
            : "(?:^|[^\\p{L}])") +
            withPlural(c) +
            "(?![\\p{L}])",
          "giu",
        ),
      ),
    ].map((m) => m.index),
  );
  if (at.some((a) => !a.length)) return false;
  // ➤ Together: "mécanicien … maintenance" across the title is not "mécanicien de maintenance".
  return at[0].some((start) => {
    const near = at.map((a) =>
      a.reduce((best, i) =>
        Math.abs(i - start) < Math.abs(best - start) ? i : best,
      ),
    );
    return (
      text.slice(Math.min(...near), Math.max(...near)).split(/\s+/).length <=
      words.length + 3
    );
  });
};
// ➤ Each word a language's titles write with accents, under its letters without them: where they write it so 20
// ➤ times or more and twenty times more often than without them; not a place ("Berlín", "Zúrich"; before, for a title
// ➤ written with no accent at all).
const ACCENTED: Record<string, Map<string, string>> = {};
export function accentedOf(l: string): Map<string, string> {
  if (ACCENTED[l]) return ACCENTED[l];
  const V = vocabOf(l) || {},
    best = new Map<string, string>();
  for (const [w, n] of Object.entries(V)) {
    const bare = w.normalize("NFD").replace(/\p{M}/gu, "");
    if (
      n < 20 ||
      bare === w ||
      (V[bare] || 0) * 20 >= n ||
      (best.has(bare) && V[best.get(bare) ?? ""] >= n) ||
      isTown(bare)
    )
      continue;
    best.set(bare, w);
  }
  return (ACCENTED[l] = best);
}
const titleWords = (s: string | undefined): string[] =>
  String(s || "")
    .toLowerCase()
    .match(/\p{L}[\p{L}'’·-]*/gu) || [];
// ➤ The jobs a product or code may be left in front of, by language (after).
export const JOB_AFTER: Record<string, string> = {
  es: "Desarrollador(?:a|es)?|Ingeniero(?:s)?|Consultor(?:es)?|Arquitecto(?:s)?|Administrador(?:es)?|Programador(?:es)?",
  ca: "Desenvolupador(?:a|s)?|Enginyer(?:s)?|Consultor(?:s)?|Arquitecte(?:s)?|Administrador(?:s)?|Programador(?:s)?",
  fr: "Développeur(?:se|s)?|Ingénieur(?:s)?|Consultant(?:e|s)?|Architecte(?:s)?|Administrateur(?:s)?|Programmeur(?:s)?",
  pl: "Programista|Programiści|Inżynier(?:owie)?|Konsultant(?:ka|ci)?|Architekt(?:ka|ci)?|Administrator(?:ka|zy)?|Kierownik|Specjalista|Technik",
  it: "Sviluppatore|Sviluppatori|Ingegnere|Ingegneri|Consulente|Consulenti|Architetto|Architetti|Amministratore|Programmatore|Programmatori|Responsabile|Tecnico|Specialista",
};
// ➤ "Backend", "Frontend" or "Full Stack" Firefox left in front of the job, with the tech names after it (after).
export const STACK_BEFORE_JOB = Object.fromEntries(
  Object.entries(JOB_AFTER).map(([l, job]) => [
    l,
    new RegExp(
      "(^|[–|(/:]\\s*)((?:" +
        STACK_EN +
        ")(?:\\s+(?:[.\\p{Lu}][\\p{L}\\d.#+]*|\\p{L}*[#+][\\p{L}\\d.#+]*)){0,2})\\s+(" +
        job +
        ")(?![\\p{L}])",
      "iu",
    ),
  ]),
);
// ➤ A word of a product's name: digits, a slash or a hyphen inside it too ("SAP S/4HANA", "SAP IS-U", "FI/CO"), a dot
// ➤ before it (".NET"); not a level after the slash ("Systemheld/Sénior Ingeniero de Sistemas").
export const NAME_WORD =
  "\\.?\\p{Lu}[\\p{L}\\d.#+]*(?:[/-](?![Ss][eéè]ni[oò]r|[Jj][uú]ni[oò]r)[\\p{L}\\d.#+]+)*";
// ➤ A word of the target language: its job titles use it (three times or more) and those of another Romance language
// ➤ next to never ("instalaciones", "analyste"); a product's name is in both ("Laravel", "Genesys", "SAP"). English
// ➤ titles use some French and Spanish words ("analyste") and lack some products.
export function known(t: string, w: string): boolean {
  const o = t === "fr" ? "es" : "fr";
  const V = vocabOf(t),
    O = vocabOf(o);
  const x = w.toLowerCase();
  return (
    Boolean(V && O) && (V?.[x] || 0) >= 3 && (O?.[x] || 0) * 20 < (V?.[x] ?? 0)
  );
}
// ➤ How many of the site's English titles use a word (builder/mt/dict/vocab-en.json).
export function englishUses(w: string): number {
  const V = vocabOf("en");
  return (V && V[String(w).toLowerCase()]) || 0;
}
export function oddWords(
  pair: string,
  out: string | undefined,
  input: string | undefined,
): number {
  const V = vocabOf(pair.split("-")[1]);
  if (!V) return 0;
  const seen = new Set(titleWords(input));
  return titleWords(out).filter(
    (w) => w.length > 3 && !seen.has(w) && (V[w] || 0) < 3,
  ).length;
}
// ➤ A title of the first leg written in English (411 of the third mining set's 1,714 German, French and Dutch titles):
// ➤ every word one the site's English titles use 20 times or more, 25 for words of two letters (they have next to none
// ➤ of the other languages' words: "monteur", "für", "voor" 0, Dutch "en" 12). The first leg broke some ("Customer –
// ➤ Support Engineer", "Power – BI", "AI Data Specialist - French" → "… - English").
export function writtenInEnglish(title: string): boolean {
  const V = vocabOf("en");
  const w =
    String(title)
      .toLowerCase()
      .match(/\p{L}{2,}/gu) || [];
  return (
    Boolean(V) &&
    w.filter((x) => x.length > 2).length >= 2 &&
    w.every((x) => (V?.[x] || 0) >= (x.length > 2 ? 20 : 25))
  );
}
// ➤ A letter Firefox broke: its model wrote part of a letter's bytes, which the engine reads as «�» (U+FFFD): «BFÚ»
// ➤ came back «BF�ú». Each of the title's words it broke, as the title writes it; none where the title had «�» itself.
export const BROKEN = "�";
export function brokenWords(text: string, raw: string): string[] {
  if (!raw.includes(BROKEN) || text.includes(BROKEN)) return [];
  const found = new Set<string>();
  for (const piece of raw.match(/[^\s�]*�[^\s]*/gu) || []) {
    const bare = piece.replace(/^[^\p{L}\p{N}�]+|[^\p{L}\p{N}�]+$/gu, "");
    if ((bare.match(/[\p{L}\p{N}]/gu) || []).length < 2) continue;
    // ➤ Each «�» stands for up to two letters of the title, or none: the broken byte of «Ú» came before a whole «ú».
    const pattern = bare.split(/�+/u).map(escape).join("[\\p{L}\\p{M}]{0,2}");
    const m = text.match(word(pattern));
    if (m?.[2]) found.add(m[2]);
  }
  return [...found];
}

// ➤ The titles to translate again: those whose output lost a product name or broke a letter, with that word behind a
// ➤ stand-in; and those where neither version wrote a trade right (checked in the trades mode), the trade behind a
// ➤ stand-in and the table's name put back.
export function lostNames(
  text: string,
  raw: string,
  info: Info,
  suspect = false,
  pair = "",
): Again | null {
  const lost = [
    ...info.names.filter((n) => !word(escape(n)).test(raw)),
    ...brokenWords(text, raw).filter((w) => !info.names.includes(w)),
  ];
  // ➤ Only a trade that opens the title or a part of it, or follows a link word: one with a word in front
  // ➤ ("Industrial electronics technician") would lose it ("Industrial Kafka" → "Industria técnico electrónico"),
  // ➤ unless Firefox's own output has a word no job title uses ("metalégraba"), a sign it went wrong.
  const alone = (term: string): boolean =>
    text
      .split(term)
      .slice(0, -1)
      .every((before) =>
        /(?:^|[–|/(,:;&+-]|\s(?:or|and|of|for|as|with|in|at|to|y|o|e|i|de|del|en|para|et|ou|pour|und|oder|als|für|mit|im|van|voor|met|senior|junior))\s*$/iu.test(
          before,
        ),
      );
  const spans = (info.spans || []).filter(
    ([term], k, all) =>
      text.includes(term) && all.findIndex((s) => s[0] === term) === k,
  );
  // ➤ Into Spanish, Catalan and French a trade with English words in front goes too: those words go after it
  // ➤ (wordsAfter, below), so the stand-in cannot lose them ("Production Shift Manager" came back "Responsable de canvi
  // ➤ de producció": Firefox read the Catalan "cap de torn" written in as the English "cap" and "torn").
  // ➤ Only nouns in front, three at most: an adjective moved after came back in front again ("Regional de responsable
  // ➤ de prevenció…", "Electrònica tècnic d'assajos"), and "Land & Development" lost its order.
  const movesAfter = (term: string): boolean => {
    if (
      !/^en-(?:es|ca|fr)$/.test(pair) ||
      !PERSON.test(term.split(/\s+/).pop() ?? "")
    )
      return false;
    const head = (
      text
        .split(term)[0]
        .split(/[–|/(,:;+]|\s-\s/)
        .pop() ?? ""
    )
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    return (
      head.length > 0 &&
      head.length <= 3 &&
      head.every(
        (v) => /^\p{L}[\p{L}\p{N}'-]*$/u.test(v) && !LINK_EN.test(v),
      ) &&
      !ADJ_EN.test(head[head.length - 1]) &&
      !ADJ_PLAIN.test(head[head.length - 1])
    );
  };
  const trades = spans.filter(
    ([term, tr]) =>
      !hasTrade(raw, tr) && (suspect || alone(term) || movesAfter(term)),
  );
  if (!lost.length && !trades.length) return null;
  let t = text;
  const free = (pair.endsWith("-uk") ? STANDS_UK : STANDS).filter(
      (x) => !t.includes(x),
    ),
    put: Put[] = [];
  // ➤ The company goes behind a stand-in in the second pass even where the first kept it: Firefox reads the
  // ➤ title anew and can translate it then ("Smals" → "Narrow" when ".NET" was what got lost). So do "Backend",
  // ➤ "Frontend" and "Full Stack", which French and Dutch garbled read anew ("Full-stack Kafka Developer" came back
  // ➤ "Full-stake", "Fullstack AI Engineer … Kafka" "Fullstak").
  const kept = info.names.filter(
    (n) => n !== info.firm && !lost.includes(n) && STACK_OUT.test(n),
  );
  const behind = [
    ...(info.firm && !lost.includes(info.firm) ? [info.firm] : []),
    ...lost,
    ...kept,
  ];
  for (const n of behind.slice(0, free.length)) {
    if (!word(escape(n)).test(t)) continue;
    const stand = free[put.length];
    t = t.replace(
      word(escape(n), "giu"),
      (all, before: string) => before + stand,
    );
    put.push([stand, n]);
  }
  const names = put.some(([, n]) => lost.includes(n));
  // ➤ The other trades that open a part of the title behind stand-ins too, while some are left: written in,
  // ➤ Firefox can break them with nothing to check it ("metàl·liques" → "·marques"). In a second pass for a lost
  // ➤ name too, so the new reading cannot undo a trade the first got right ("Tècnic d'avaries" came back
  // ➤ "Tècnic de reparació d'acusacions" with the company behind a stand-in).
  const others = spans.filter((s) => !trades.includes(s) && alone(s[0]));
  const movable: string[] = [];
  for (const [term, tr] of trades.length || put.length
    ? [...trades, ...others]
    : []) {
    if (put.length >= free.length) break;
    if (PERSON.test(term.split(/\s+/).pop() ?? ""))
      movable.push(free[put.length]);
    t = t.split(term).join(free[put.length]);
    put.push([free[put.length], tr, "trade"]);
  }
  // ➤ Into Spanish, Catalan and French the English words in front of a trade behind a stand-in go after it, as in
  // ➤ the first pass ("Offshore Kafka / Zalando" came back "Offshore mécanicien / électronicien").
  if (/^en-(?:es|ca|fr)$/.test(pair) && movable.length)
    t = wordsAfter(
      t,
      movable,
      put.map(([stand]) => stand),
    );
  return put.length ? { text: t, put, names } : null;
}
