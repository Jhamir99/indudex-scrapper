import type { CompiledFamilies, FamilyTitles } from "./compile.js";
import {
  germanReading,
  lemmaWords,
  secondReading,
  spanishReading,
} from "./matchable-title.js";
import { type Hit, TITLES as T, type TitleNode } from "./title-rules.js";
import { BLOCKERS } from "./words.js";

// What a cleaned title names, by the index's titles (legacy titleFamilies).

export interface TitleHit extends Hit {
  readonly lang: string;
}

export interface TitleReading {
  // The families that stand by the rule.
  readonly families: string[];
  // An outside occupation matched with nothing of ours over it.
  readonly blocked: boolean;
  readonly texts: string[];
  readonly hits: TitleHit[];
}

const EMPTY = T.index({});

function read(
  indexes: ReadonlyMap<string, TitleNode>,
  titles: readonly FamilyTitles[],
  text: string,
  languages: readonly string[],
): { hits: TitleHit[]; blocks: string[] } {
  const found = languages.map((language) =>
    indexes.has(language)
      ? T.find(indexes.get(language) ?? EMPTY, text)
      : new Map<string, string[]>(),
  );
  const hits: TitleHit[] = [];
  for (const family of titles)
    languages.forEach((language, at) => {
      for (const hit of found[at]?.get(family.id) ?? [])
        hits.push({
          id: family.id,
          text: hit,
          named: family.preferred.has(hit),
          lang: language,
        });
    });
  return {
    hits,
    blocks: found.flatMap((byList) => byList.get(BLOCKERS) ?? []),
  };
}

// A title the first reading finds nothing in is read a second time, and a German one the German
// way when the gate is asked for it (`german`, the classifier's last pass), and a Spanish one the
// Spanish way. The gate asks this twice for each advert (its families, then its occupations): the
// last answer is kept.
export function titleFamilies(
  title: string,
  languages: readonly string[],
  gate: CompiledFamilies,
  german = false,
): TitleReading {
  const key = `${title}\n${languages.join(",")}\n${german}`;
  if (gate.last?.key === key) return gate.last.value as TitleReading;
  let { hits, blocks } = read(gate.index, gate.titles, title, languages);
  // What may shut the title out of the routes that follow: only what the first reading found. A
  // title outside the vertical that only the second reading finds still stands over our titles
  // inside it, but ESCO's odd alternative titles ("help-desk technician" among sales jobs) never
  // close the routes to a title the first reading found nothing in.
  let blocking = blocks;
  if (hits.length === 0 && blocks.length === 0) {
    const second = secondReading(title).map((piece) =>
      read(gate.reduced, gate.reducedTitles, piece, languages),
    );
    hits = second.flatMap((found) => found.hits);
    blocks = second.flatMap((found) => found.blocks);
    blocking = [];
    if (
      german &&
      hits.length === 0 &&
      gate.reducedDe &&
      languages.includes("de")
    ) {
      const indexes = new Map([["de", gate.reducedDe]]);
      const de = germanReading(title).map((piece) =>
        read(indexes, gate.reducedTitlesDe, piece, ["de"]),
      );
      hits = de.flatMap((found) => found.hits);
      blocks = [...blocks, ...de.flatMap((found) => found.blocks)];
    }
    if (hits.length === 0 && gate.reducedEs && languages.includes("es")) {
      const indexes = new Map([["es", gate.reducedEs]]);
      const es = spanishReading(title).map((piece) =>
        read(indexes, gate.reducedTitlesEs, piece, ["es"]),
      );
      hits = es.flatMap((found) => found.hits);
      blocks = [...blocks, ...es.flatMap((found) => found.blocks)];
    }
  }
  if (hits.length > 0 && gate.contexts.size > 0) {
    const words = new Set(lemmaWords(title));
    hits = hits.filter(
      (hit) =>
        ![...(gate.contexts.get(hit.text) ?? [])].some((word) =>
          words.has(word),
        ),
    );
  }
  const kept = T.winners(hits, blocks);
  const all = [...hits.map((hit) => hit.text), ...blocks];
  const blocked =
    kept.length === 0 &&
    blocking.some((block) => !all.some((other) => T.inside(block, other)));
  const value: TitleReading = {
    families: [...new Set(kept.map((hit) => hit.id))],
    blocked,
    texts: [...new Set(kept.map((hit) => hit.text))],
    hits,
  };
  gate.last = { key, value };
  return value;
}

// In a last German reading (titles no other reading took), a designer, electrician or planner
// written in one word with his task ("Entwicklungskonstrukteur", "Instandhaltungselektriker",
// "Projektplaner Elektrotechnik") and a hardware or firmware developer have the word before set
// apart, its joining "s" off too, so the readings of the bare word take them. A kitchen, bathroom,
// garden, event or fashion one is left whole, and out.
const ROLE_PARTS =
  /([a-z])(konstrukteur(?:in)?|elektriker(?:in)?|planer(?:in)?)(?![a-z])/g;
const DEVELOPER_PARTS =
  /(hardware|firmware|elektronik|schaltungs|leiterplatten|fpga|embedded)(entwickler(?:in)?)(?![a-z])/g;
const ROLE_WHOLE =
  /(?:kuchen|bad|garten|event|reise|finanz|hochzeit|tour|termin|media|medien|personal|mode|schnitt|bekleidungs|werbe|messe)(?:konstrukteur|planer)/;
export const HARDWARE_DEVELOPER =
  /(?:^|[^a-z])(?:hardware|elektronik|schaltungs|leiterplatten|fpga) entwickler/;

export function splitRoles(title: string): string {
  if (ROLE_WHOLE.test(title)) return title;
  const apart = title
    .replace(ROLE_PARTS, "$1 $2")
    .replace(DEVELOPER_PARTS, "$1 $2");
  return apart === title
    ? title
    : `${apart} ${apart.replace(/([a-z]{3,})s (konstrukteur|elektriker|planer|entwickler)/g, "$1 $2")}`;
}
