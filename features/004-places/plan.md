# Plan: Places

Implements `spec.md` (FR-1 to FR-9). Status: approved (2026-11-19). A port of the legacy `builder/towns.mjs` (756 lines) and `builder/place-names.ts` (171 lines), split by what each part does, with each rule tested on the example its legacy comment gives. The legacy's country guessing (`builder/normalise.mjs`) stays out (spec section 7).

## 1. Layout

```
src/features/places/
  index.ts              # the feature's public entry for the processor: createPlacer, the lists, the types
  gazetteer.ts          # the towns and areas compiled from the catalogues, once per run (legacy compileTowns)
  areas.ts              # the NUTS code of a region or province a place names (areaCode, areaOf)
  pieces.ts             # a place cut into the pieces a town may be (postcodes, codes, words around a town)
  town-of.ts            # the town a place names (townOf), with its spelling and same-name rules
  shown-name.ts         # how the town is shown (spelled)
  text-towns.ts         # towns from the text: postcodes, labelled lines, phrases (FR-6)
  place-advert.ts       # one advert's Placement (legacy locate, per advert)
  in-use.ts             # towns and regions that hold offers (legacy locate's list, regionsInUse)
  ambiguous-names.ts    # town names that are words in titles and employers (legacy place-names.ts)
  *.test.ts
src/shared/kit/fold.ts  # fold, unaccent, nameKey, nameKeys (Argus's text helpers and the legacy web's name keys)
```

**Processor features expose an `index.ts`.** The publication (010) runs every step, so it imports each processor feature's `index.ts`, and only that. This is the processor's version of the rule that source features import only crawl-core's ports. The rule goes into `AGENTS.md` ("Features") with T001.

## 2. Contract

```ts
// What places reads of an advert (FR-9): the stored advert's fields, and the agency flag from companies.
interface PlaceInput {
  country: string;
  location: string;
  city: string;
  title: string;
  description: string;
  agency: boolean;
}

// What it gives (Zod schema `Placement` in index.ts).
interface Placement {
  town: {
    geonameId: number;
    name: string; // shown as the advert wrote it (FR-7)
    latitude: number; // two decimals
    longitude: number;
  } | null;
  nuts: string | null; // the town's NUTS 3 code, or the area the place names (FR-5)
  from: "location" | "text" | "area" | null; // what placed it, for the measurement and --explain
}

createPlacer(catalogues): {
  place(input: PlaceInput): Placement;
  townsInUse(placed: readonly Placement[]): TownInUse[];
  regionsInUse(placed: readonly (Placement & { country: string })[]): RegionsInUse;
  ambiguousNames(offers: readonly { title: string; company: string; placement: Placement }[]): string[];
}
```

- `createPlacer` takes the catalogues it needs (`readPlaces`, `nuts`, `elsewhere` is not needed: country guessing is out) and compiles the gazetteer once. `place` is synchronous and pure (FR-9).
- `agency` is an input, so places does not depend on `008-companies`. The publication runs companies' agency check before places. Until 008 exists, the processor passes `false`.
- `location` and `title` are read up to 2,000 and 500 characters and `city` up to 300, cut at a word, as the legacy's `FIELD_MAX` did (spec section 6). The description is read up to the store's own cap.
- FR-1: the country is the input's. A place is looked up only among that country's towns and areas.
- The legacy's record fields map like this: `g` → `town.latitude/longitude`, `n` → `nuts`, the shown `ci` → `town.name`, `hint` → the text towns, which `place` reads itself.

## 3. Porting rules

- **Behaviour, not code.** The legacy is read rule by rule. Each rule becomes a small named function, or a branch with a comment carrying its _why_ and the dated measure the legacy recorded ("2,187 published offers, 1 November 2026"), so the reason survives.
- **One test per rule**, on the example its comment names, against the real catalogues (`readPlaces`, `nuts`). The gazetteer is built once per test file, in about 0.3 s.
- **Folded comparison**: `fold` (accents off, lower case) from Argus's `server-bot/text.mjs` v1.11.0, in `src/shared/kit/fold.ts` with `unaccent` and the legacy web's `nameKey` and `nameKeys`. Plus the legacy's "spelt-out letters" forms (ae, oe, ue, aa), kept apart (FR-2).
- **Regular expressions** follow the legacy's guard against slow patterns (NOB-11): fields are capped before matching, and no pattern has a nested optional repetition.

## 4. Text towns (FR-6)

- `postalTowns(text, country)`: each country's postcode form, then the capitalised words after it up to the line's next mark, and the first word alone. Three at most, in the order written.
- `labelledTowns(text, { agency })`: the labels per language («Arbeitsort», «Einsatzort», «Standort» (not for an agency), «Job location», «Lieu de travail», «Lugar de trabajo», «Lokalita» …), then the label's first words.
- `phraseTowns(title, text, { agency, country })`: the German, Dutch, French and English phrases, read in the languages of the advert's country. Up to four capitalised words, then each shorter run; for Dutch, French and English, a name is cut only of a closing site word or a word in capitals. An agency's text is never read; its title is.
- Each candidate is tried with `townOf` in the advert's country. When the location names an area, the town must lie inside it, as the legacy's `locate` did (206 of 1,632 hints otherwise fell on a head office).

## 5. Lists for the publication (FR-8)

- `townsInUse`: the legacy's `locate` list, one row per town: shown name (the one its offers use most), GeoNames' name when it differs, region, country, latitude, longitude, offers, and names in the visitors' languages. The fullest first, ties by GeoNames id, so the output is stable.
- `regionsInUse`: the legacy's `regionsInUse`, regions and provinces per country with their names, the other names people search them by, and their offer count.
- `ambiguousNames`: the legacy's `place-names.ts`, with its constants (`NEAR_KM` 30, `WORD_SHARE` 0.25, the place and region words). The legacy took `nameKey` and `distanceKm` from the old web's `app/lib`; they are ported into `ambiguous-names.ts`, since this repo cannot read the web's code.
- The published shape of these lists is `010-publication`'s to fix; here they are typed results.

## 6. Measurement (spec section 5)

A scratchpad script, not committed, runs `createPlacer` over every advert of a store (`STORE_DIR`: the operator's store, or one filled with `pnpm crawl` into a temporary folder, as each port was checked). It prints, per source, the share placed from the location, from the text, by area only and not at all, the time taken, and 20 unplaced locations of the worst sources for a look. The numbers go into `tasks.md`. A source with a low share is a finding for its adapter (its `city` or `location` mapping), not a reason to change a rule without a test.

## 7. Decisions (2026-11-19, operator)

- **Country from the adapter.** Why: every adapter today knows its country, and the schema requires it. The legacy's guessing served company boards that hire worldwide, which arrive with `016-career-sites`.
- **Towns from the text included.** Why: the legacy's phrases alone placed about 8,000 more offers (3,970 of 44,830 German-speaking offers with no town, 4,087 of 34,076 Dutch, French and English ones, 7 November 2026), besides the postcodes and labelled lines.
- **Campaign towns go to `009-dedupe`**, since they exist only once a campaign is kept once per country. **Agency detection stays in `008-companies`**: places takes it as an input.
