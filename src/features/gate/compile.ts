import type {
  ConfirmedTitles,
  Families,
  IscoTable,
  NationalTitles,
  SsykIsco,
} from "../../shared/catalogues/schemas.js";
import { deWords, esWords, lemma, lemmaWords } from "./matchable-title.js";
import { TITLES as T, type TitleNode } from "./title-rules.js";
import {
  BLOCKERS,
  ENGINEER_WORDS,
  GENERIC_FAMILY,
  GENERIC_WORDS,
  ICT_FAMILY,
  usableTitle,
} from "./words.js";

// The gate compiled from the catalogues, once per run (legacy compileFamilies, compileGate).

export interface GateCatalogues {
  readonly families: Families;
  readonly isco: IscoTable;
  readonly ssykIsco: SsykIsco;
  readonly titles: NationalTitles;
  readonly confirmedTitles: ConfirmedTitles;
}

type Family = Families["families"][number];
type ByLanguage = Readonly<Record<string, readonly string[]>>;

// A family's titles that name it (ESCO's preferred labels and the catalogue's extra terms), as one
// reading writes them.
export interface FamilyTitles {
  readonly id: string;
  readonly preferred: ReadonlySet<string>;
}

// One compiled set of families: the main occupations, or the optional trades.
export interface CompiledFamilies {
  readonly ids: ReadonlySet<string>;
  readonly byIsco: ReadonlyMap<string, string>;
  readonly bySsyk: ReadonlyMap<string, readonly string[]>;
  readonly titles: readonly FamilyTitles[];
  readonly index: ReadonlyMap<string, TitleNode>;
  readonly reduced: ReadonlyMap<string, TitleNode>;
  readonly reducedTitles: readonly FamilyTitles[];
  readonly reducedDe: TitleNode | null;
  readonly reducedTitlesDe: readonly FamilyTitles[];
  readonly reducedEs: TitleNode | null;
  readonly reducedTitlesEs: readonly FamilyTitles[];
  readonly contexts: ReadonlyMap<string, ReadonlySet<string>>;
  // ESCO's occupations each title names, per family and language.
  readonly occupations: ReadonlyMap<
    string,
    ReadonlyMap<string, ReadonlyMap<string, readonly string[]>>
  >;
  readonly generic: RegExp | null;
  readonly genericFamily: string | null;
  readonly ictFamily: string | null;
  // The last title worked out, as the legacy kept it (`gate.last`).
  last?: { readonly key: string; readonly value: unknown };
}

export interface CompiledGate {
  readonly main: CompiledFamilies;
  readonly optional: CompiledFamilies | null;
  // Titles the registers confirmed in a unit group (codes/confirmed-titles), by matchable title.
  readonly confirmed: ReadonlyMap<string, string>;
}

const entries = (byLanguage: ByLanguage | undefined) =>
  Object.entries(byLanguage ?? {});

// ESCO's titles, but for the bare role words and those a national index files outside the
// vertical (codes/titles.json, not_ours): the national statistics office decides.
function escoTitles(titles: NationalTitles) {
  const notOurs = new Map(
    entries(titles.not_ours).map(([language, list]) => [
      language,
      new Set(list.map(T.clean)),
    ]),
  );
  return (language: string) => (label: string) =>
    usableTitle(label) && !notOurs.get(language)?.has(T.clean(label));
}

// Whether a title is one of a family's ESCO titles it must not take (not_terms in families.json).
const notTaken = (family: Family, language: string) => (label: string) =>
  !(family.not_terms?.[language] ?? []).some(
    (term) => T.clean(term) === T.clean(label),
  );

// The job titles of every family, per language, and the names among them (ESCO's preferred labels
// and the catalogue's own extra terms). ESCO's titles come first; the official coding indexes add
// theirs (codes/titles.json: the British and Dutch statistics offices').
export function familyTerms(
  families: readonly Family[],
  { isco, titles }: Pick<GateCatalogues, "isco" | "titles">,
): Map<string, { labels: Record<string, string[]>; preferred: string[] }> {
  const out = new Map<
    string,
    { labels: Record<string, string[]>; preferred: string[] }
  >();
  const escoKept = escoTitles(titles);
  for (const family of families) {
    const labels: Record<string, string[]> = {};
    const preferred = new Set<string>();
    for (const code of family.isco) {
      const unit = Object.hasOwn(isco.units, code)
        ? isco.units[code]
        : undefined;
      for (const [language, list] of entries(unit?.labels))
        (labels[language] ??= []).push(
          ...list.filter(escoKept(language)).filter(notTaken(family, language)),
        );
      for (const list of Object.values(unit?.preferred ?? {}))
        for (const label of list) preferred.add(T.clean(label));
      const national = Object.hasOwn(titles.units, code)
        ? titles.units[code]
        : undefined;
      for (const [language, list] of entries(national))
        (labels[language] ??= []).push(...list.filter(usableTitle));
    }
    for (const [language, list] of entries(family.extra_terms)) {
      (labels[language] ??= []).push(...list);
      for (const label of list) preferred.add(T.clean(label));
    }
    out.set(family.id, { labels, preferred: [...preferred] });
  }
  return out;
}

// A piece of a list ESCO split ("Klima-" of "Heizungs-/Klima-/Sanitärtechnik"): without its hyphen
// it would read as a title.
const isPiece = (label: string) => /^\s*-|-\s*$/.test(label);

export function compileFamilies(
  families: readonly Family[],
  catalogues: Pick<GateCatalogues, "isco" | "ssykIsco" | "titles">,
): CompiledFamilies {
  const { isco, ssykIsco, titles: national } = catalogues;
  const byIsco = new Map<string, string>();
  for (const family of families)
    for (const code of family.isco) byIsco.set(code, family.id);
  const bySsyk = new Map<string, string[]>();
  for (const [id, concept] of Object.entries(ssykIsco.concepts)) {
    const ids = [
      ...new Set(
        concept.isco.flatMap((code) => {
          const family = byIsco.get(code);
          return family ? [family] : [];
        }),
      ),
    ];
    if (ids.length > 0) bySsyk.set(id, ids);
  }
  const terms = familyTerms(families, catalogues);
  const termsOf = (family: Family) =>
    terms.get(family.id) ?? { labels: {}, preferred: [] };
  const titles = families.map((family) => ({
    id: family.id,
    preferred: new Set(termsOf(family).preferred),
  }));
  const blockers: Record<string, string[]> = {};
  for (const blocker of Object.values(isco.blockers))
    for (const [language, labels] of entries(blocker.labels))
      (blockers[language] ??= []).push(...labels.filter(usableTitle));
  // Per language, one index of every family's titles and of the titles outside the vertical (the
  // blockers), read in one pass per title.
  const index = new Map<string, TitleNode>();
  const languages = new Set([
    ...families.flatMap((family) => Object.keys(termsOf(family).labels)),
    ...Object.keys(blockers),
  ]);
  for (const language of languages) {
    const lists: Record<string, readonly string[]> = {};
    for (const family of families) {
      const labels = termsOf(family).labels[language];
      if (labels?.length) lists[family.id] = labels;
    }
    if (blockers[language]?.length) lists[BLOCKERS] = blockers[language];
    index.set(language, T.index(lists));
  }
  // The same titles as the second reading takes them, per language, but for the pieces of a list
  // ESCO split.
  const reduced = new Map<string, TitleNode>();
  for (const language of index.keys()) {
    const lists: Record<string, string[]> = {};
    for (const family of families)
      for (const label of termsOf(family).labels[language] ?? [])
        if (!isPiece(label))
          (lists[family.id] ??= []).push(lemmaWords(label).join(" "));
    for (const label of blockers[language] ?? [])
      if (!isPiece(label))
        (lists[BLOCKERS] ??= []).push(lemmaWords(label).join(" "));
    reduced.set(language, T.index(lists));
  }
  const reducedTitles = families.map((family) => ({
    id: family.id,
    preferred: new Set(
      termsOf(family).preferred.map((label) => lemmaWords(label).join(" ")),
    ),
  }));
  // The German titles once more, read the German way. A title the German reading leaves as one
  // word stands only if that word is a title of the index already: the female "Operatorin" must
  // not become the bare "Operator" the gate leaves out on purpose, nor a broken "in Chemie" the
  // bare "Chemie". The BA's search words join here only (codes/titles.json, last_pass): read last,
  // they leave every title the first readings name where it is.
  let reducedDe: TitleNode | null = null;
  if (index.has("de")) {
    const lists: Record<string, string[]> = {};
    const lastPass = (family: Family) =>
      family.isco
        .flatMap((code) =>
          Object.hasOwn(national.last_pass, code)
            ? (national.last_pass[code]?.["de"] ?? [])
            : [],
        )
        .filter(usableTitle);
    const usable = new Set(
      [
        ...families.flatMap((family) => [
          ...(termsOf(family).labels["de"] ?? []),
          ...lastPass(family),
        ]),
        ...(blockers["de"] ?? []),
      ].map(T.clean),
    );
    const add = (id: string, label: string) => {
      const read = deWords(label).join(" ");
      if (
        read &&
        !GENERIC_WORDS.has(read) &&
        (read.includes(" ") || usable.has(read))
      )
        (lists[id] ??= []).push(read);
    };
    for (const family of families)
      for (const label of [
        ...(termsOf(family).labels["de"] ?? []),
        ...lastPass(family),
      ])
        if (!isPiece(label)) add(family.id, label);
    for (const label of blockers["de"] ?? [])
      if (!isPiece(label)) add(BLOCKERS, label);
    reducedDe = T.index(lists);
  }
  const reducedTitlesDe = families.map((family) => ({
    id: family.id,
    preferred: new Set(
      termsOf(family).preferred.map((label) => deWords(label).join(" ")),
    ),
  }));
  // The Spanish titles once more, read the Spanish way, with the German reading's guard: a title
  // left as one word stands only if it was a title already.
  let reducedEs: TitleNode | null = null;
  if (index.has("es")) {
    const lists: Record<string, string[]> = {};
    const usable = new Set(
      [
        ...families.flatMap((family) => termsOf(family).labels["es"] ?? []),
        ...(blockers["es"] ?? []),
      ].map(T.clean),
    );
    const add = (id: string, label: string) => {
      const read = esWords(label).join(" ");
      if (
        read &&
        !GENERIC_WORDS.has(read) &&
        (read.includes(" ") || usable.has(read))
      )
        (lists[id] ??= []).push(read);
    };
    for (const family of families)
      for (const label of termsOf(family).labels["es"] ?? [])
        if (!isPiece(label)) add(family.id, label);
    for (const label of blockers["es"] ?? [])
      if (!isPiece(label)) add(BLOCKERS, label);
    reducedEs = T.index(lists);
  }
  const reducedTitlesEs = families.map((family) => ({
    id: family.id,
    preferred: new Set(
      termsOf(family).preferred.map((label) => esWords(label).join(" ")),
    ),
  }));
  // Titles that stop being ours in an industry the advert's title names (codes/titles.json), under
  // every reading's spelling of the title.
  const contexts = new Map<string, Set<string>>();
  for (const [title, words] of Object.entries(national.contexts)) {
    const lemmas = new Set(words.map(lemma));
    contexts.set(T.clean(title), lemmas);
    contexts.set(lemmaWords(title).join(" "), lemmas);
    contexts.set(deWords(title).join(" "), lemmas);
    contexts.set(esWords(title).join(" "), lemmas);
  }
  // Which ESCO occupation each title names, per family and language: a title's match says which
  // occupation it is, not only which family.
  const escoKept = escoTitles(national);
  const occupations = new Map<string, Map<string, Map<string, string[]>>>();
  for (const family of families)
    for (const code of family.isco) {
      const unit = Object.hasOwn(isco.units, code)
        ? isco.units[code]
        : undefined;
      for (const occupation of unit?.occupations ?? [])
        for (const [language, list] of entries(occupation.labels)) {
          let byLanguage = occupations.get(family.id);
          if (!byLanguage) occupations.set(family.id, (byLanguage = new Map()));
          let byTitle = byLanguage.get(language);
          if (!byTitle) byLanguage.set(language, (byTitle = new Map()));
          for (const label of list
            .filter(escoKept(language))
            .filter(notTaken(family, language))) {
            const key = T.clean(label);
            byTitle.set(key, [
              ...new Set([...(byTitle.get(key) ?? []), occupation.code]),
            ]);
          }
        }
    }
  return {
    ids: new Set(families.map((family) => family.id)),
    byIsco,
    bySsyk,
    titles,
    index,
    reduced,
    reducedTitles,
    reducedDe,
    reducedTitlesDe,
    reducedEs,
    reducedTitlesEs,
    contexts,
    occupations,
    generic: T.alternation(ENGINEER_WORDS),
    genericFamily: byIsco.get(GENERIC_FAMILY) ?? null,
    ictFamily: byIsco.get(ICT_FAMILY) ?? null,
  };
}

// The gate with its optional groups apart (the skilled trades, "optional" in families.json):
// { main, optional }. An advert is read against the main occupations first, exactly as before the
// trades came, and only one they leave out is read against the optional ones: a trade never takes
// an advert from the main occupations (the legacy's docs/research/skilled-trades.md).
export function compileGate(catalogues: GateCatalogues): CompiledGate {
  const { groups, families } = catalogues.families;
  const optionalGroups = new Set(
    groups.filter((group) => group.optional).map((group) => group.id),
  );
  const part = (optional: boolean) =>
    families.filter((family) => optionalGroups.has(family.group) === optional);
  return {
    main: compileFamilies(part(false), catalogues),
    optional:
      optionalGroups.size > 0 ? compileFamilies(part(true), catalogues) : null,
    confirmed: new Map(Object.entries(catalogues.confirmedTitles.titles)),
  };
}
