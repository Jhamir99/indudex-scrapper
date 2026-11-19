# Plan: Advert facts

Implements `spec.md` (FR-1 to FR-8). Status: approved (2026-11-19). A port of the legacy `builder/contract.mjs` (259 lines), `builder/work-mode.mjs` (389), `builder/calm-titles.ts` (124), `builder/years.mjs` (220), `builder/screens.mjs` (777), their word lists (`builder/words/`, 21 languages, about 300 lines) and sentence splitter, and Argus's years reader (`server-bot/requirements.mjs` v1.11.0, MIT). Part A (T001-T006) covers what the source states; part B (T007-T010) covers what the advert asks for.

## 1. Layout

```
src/shared/schemas/advert.ts     # gains contract, hours, employmentType, years (FR-1)
src/features/public-feeds/adapters/<id>/   # the adapters that fill them (T002, T003)
src/features/advert-facts/
  index.ts              # public entry: createFactReader, AdvertFacts, the fact types
  words/                # the legacy's words per language (builder/words/*.mjs) and its anyOf/words helpers
  sentences.ts          # an advert's text cut into sentences and lines (legacy builder/sentences.mjs)
  contract.ts           # contract kind and working time from the source's fields (FR-2)
  work-mode.ts          # work mode (FR-3)
  calm-titles.ts        # titles in capitals (FR-4)
  argus/requirements.ts # Argus's extractRequiredYears and what it needs, copied (header: source, version, MIT)
  years.ts              # years asked, a sentence at a time (FR-5)
  screens.ts            # degrees demanded and languages required (FR-6, FR-7)
  facts.ts              # one advert's AdvertFacts
  *.test.ts
```

As places does, the feature exposes only `index.ts` to the publication (`AGENTS.md`, "Features").

## 2. The stored advert's new fields (FR-1)

```ts
// in Advert (src/shared/schemas/advert.ts), all optional, the source's own words:
contract?: string;              // "Contrato indefinido", "määräaikainen", "Interim met optie vast werk"
hours?: string;                 // "Jornada completa", "38,5 h/week", "Teilzeit"
employmentType?: string[];      // a JobPosting-like list: ["FULL_TIME", "TEMPORARY"]
years?: number;                 // the years of experience the source states in a field (VDAB)
```

- Additive and optional: an advert stored before them reads as before, so the store's format version stays 1 (`AGENTS.md`, "Contracts").
- Each value is trimmed, non-empty and capped (200 characters), so a broken field cannot fill the store.
- Adapters fill them only from a field the source has for that, as the legacy's adapters did. `sae` and `clm`, which the legacy read from lines its adapters wrote into the text («Contrato: …», «Jornada: …»), now fill the fields directly; `vdab`'s first text part and `forem`'s parts likewise. The text keeps its lines, since the requirement readers may read them.
- The adapter sweep is two tasks (T002, T003), each adapter's fixture test asserting the new fields.

## 3. Contract (FR-2) and work mode (FR-3)

- `contract.ts` ports `contractKind`, `workingTime`, the `POSTING` map for `employmentType` values, and `oneOf` (a list that names two kinds says neither; one kind with and without its months is that kind with them). The legacy's per-source `fromText` is not ported: its sources now fill the fields (section 2).
- Codes as readable values: `contract: { kind: "permanent" | "temporary" | "agency" | "agency-to-permanent" | "temporary-to-permanent" | "training" | "freelance", months? }`, `workingTime: { kind: "full" | "part", hours? }`. The publication (010) may write them as the legacy's short codes (`i`, `t6`, `e`, `eo`, `to`, `p`, `a`; `c`, `p20`).
- `work-mode.ts` ports `workModeOf`: the source's field (the advert's `workMode`, which some adapters already fill), `tagMode`, `placeMode`, `labelledMode`, `titleMode`, `modeInSentences`, with their word lists. The result is `"onsite" | "hybrid" | "remote" | null`.

## 4. Titles (FR-4)

`calm-titles.ts` ports `shouting`, `spellingsOf` and `calmTitle`. Spellings are learnt from every title of the build that is not in capitals, so the reader is built with the build's titles: `createFactReader({ catalogues, titles })`. The legacy also learnt from the translated titles (`TITLES`); that comes with title translation (011). `SMALL` (the small words kept small inside a title) is copied from the legacy web's `app/lib/i18n.ts`. The existing `sentenceCase` in `src/shared/kit/text.ts`, which adapters use, stays as it is.

## 5. Requirements (FR-5 to FR-7)

- **Argus.** `argus/requirements.ts` copies `extractRequiredYears` and only the helpers it calls from Argus's `server-bot/requirements.mjs` at v1.11.0, with a header naming the repository, version and MIT licence. When `indudex-matching` (pending in `MEMORY.md`) exists, the copy is replaced by it. Its YAML profile and `html-to-text` parts are not needed and not copied, so no new dependency comes in.
- **Years.** `years.ts` ports `yearsRange` and `yearsAsked`: one sentence at a time, the languages Argus does not read put into English for it, ranges with «et», «e», «și», ceilings, and sentences that open with the years. A source's `years` field is believed (FR-1).
- **Degrees and languages.** `screens.ts` ports `compileScreens` over the `degrees` and `languages` catalogues (`words`, `stems`, `names`, `required`, `softened`), `requiredDegrees` and `requiredLanguages`. The catalogues are read through `readCatalogue`, so their wording stays in one place.
- **Text.** Read as the legacy did: the description as lines (`asLines`), without contacts. The contact stripping (`withoutContacts`) is ported in `sentences.ts` if the readers need it; the store's descriptions already pass the crawl-core contract test (no e-mail outside the description).

## 6. Public entry and measurement

```ts
createFactReader({ degrees, languages, titles }): {
  facts(advert: StoredAdvert): AdvertFacts;   // pure (FR-8)
}

AdvertFacts = {
  workMode: "onsite" | "hybrid" | "remote" | null,
  contract: { kind, months? } | null,
  workingTime: { kind, hours? } | null,
  years: { most, least } | null, // the largest figure asked and the smallest (the filter reads it)
  degrees: string[],     // degree ids of the catalogue, in its order
  languages: string[],   // language codes of the catalogue, in its order
  title: string,         // the title, calmed when in capitals
}
```

The measurement (T010) is a scratchpad script over the stores of the public-feeds live runs, as places' was. They were stored before FR-1, so the contract and hours shares are measured after a live pass of the swept adapters into a temporary store (network: the polite client, one pass per adapter). It reports per source the share of each fact and the time, and goes into `tasks.md`.

## 7. Decisions (2026-11-19, operator)

- **One feature in two parts.** Why: no renumbering of 006-017; the tasks stay small.
- **Contract and hours from source fields added to the stored advert.** Why: the legacy read them only from source fields, and reading them from words was wrong too often (`docs/research/contract-type.md`). The fields are additive, so the store's format stays at version 1.
- **`years` added with them** (VDAB states the years in a field). Why: the same pattern; the legacy believed it.
