# Plan: Publication

Implements `spec.md` (FR-1 to FR-12). Status: approved (2026-11-22). A port of the legacy's `builder/build-pile.mjs` (without the translations, the tools, the closed adverts, the pile cache, the careers pages and the crawler's feedback), `toRecord`'s assembly and `mendedText` in `builder/normalise.mjs`, `builder/lib/labels.mjs` (the days, the labelled contract and working time), `builder/shard.mjs`, `builder/word-index.mjs` with `app/lib/word-index.ts`'s `bucketOf` and `piecesOf` and `app/lib/offer-text.ts`'s `companyToken`, `builder/backdrop.ts`, `builder/towns.mjs`'s `campaignPlaces`, `builder/lib/entities.ts`'s `unescapeRecords`, `builder/company-cards.mjs`'s card files, `builder/lib/shrink-guard.ts`, and `packages/published-data/index.d.ts` as Zod schemas, with their tests.

## 1. Layout

```
src/shared/schemas/published/     # the contract with the API: one Zod schema per published file
  offer.ts          # Offer, OffersPart (the legacy's short keys; strict)
  dataset.ts        # Index, Status, Places, Regions, Today, Companies, RegisterCompanies, CompanyCards, the pointer
src/shared/storage/published-dataset.ts   # published/<version>/ and current.json: write a version, move the pointer, keep three
src/shared/config/takedowns.ts    # moved from crawl-core (the scrapper and the processor read it)
src/shared/kit/mended-text.ts     # mendedText and the field limits (atMost)
src/features/publication/         # processor: the only feature that imports the others' index.ts
  index.ts          # runPublication(dependencies) → the version written, or why none was
  read-store.ts     # FR-2: the sources listed, takedowns, stale sources, expired, old, no link; mended and cut
  labels/           # FR-3, FR-4: days.ts (posted, last day), written-facts.ts (contract, working time), agency-work.ts
  offer.ts          # FR-5: the offer from each step's output; offerId; campaignPlaces; entities unescaped
  build.ts          # the steps in order over the store, the stages timed, the counts
  shards.ts         # FR-6: buildShards, latestOf, occupationCounts
  word-index.ts     # FR-7: buildWordIndex, encodeNumbers, pairsOf, haystack, bucketOf, piecesOf, companyToken
  backdrop.ts       # today.json's rows
  files.ts          # FR-8: index.json, status.json, places.json, regions.json, companies, cards' files
  shrink-guard.ts   # FR-11: pileCounts, falls, remember; state/pile-history.json
  *.test.ts
src/bin/process.ts                # `pnpm process [-- --force] [-- --explain]`
```

- `runPublication` takes its dependencies (store reader, catalogues, rates, takedowns, untranslated sources, registry definitions, state folder, dataset writer, clock, log) so tests run it on temporary folders and a fixed day.
- The takedowns' loader moves to `src/shared/config/` (MEMORY.md foresaw it: "moves to shared when the processor applies takedowns"); crawl-core imports it from there.
- `pnpm gate:explain` stays; `--explain` of the entry writes the same report into the version.

## 2. The steps, in the legacy's order

For each source file of the store (sources the registry lists; a source's whole list left out when taken down or nine days stale): each advert mended and cut, then (as `toRecord` and `workOut` did) placed (`places`), gated (`gate`, the place's languages given for a source that names none), its employer read (`companies`, per source), its facts (`advert-facts`), its pay (`pay`, with the store's rates), its days and labelled facts (`labels/`), its title as published (`shownTitle`). Then, over every source: expired and year-old offers out, `withoutTaken`, `dedupe` (009), the campaigns' other towns, the shrink guard, the directory (`updateCompanies` with its state, `withRegisters`, `companyCards`), the places and regions in use (`places`), and the files.

- The offer's day (`d`) is FR-3's; dedupe reads it. Its place for dedupe is `placeKey` (the GeoNames town, else the town as the advert wrote it).
- `main` (an offer in one main family at least) and the skilled trades' offers apart, as the legacy's `inMain`.

## 3. The dataset (FR-8 to FR-10)

- **Folder:** `published/` at the repo root, or `PUBLISHED_DIR`; ignored by git. A version is `published/<YYYYMMDDTHHMMSSZ>/`, written as `<version>.partial/` and renamed when whole; `current.json` `{ v: 1, version }` is written atomically after the rename. Three versions kept (the current one always); a `.partial` folder left by a stopped build is removed by the next.
- **Files:** as the legacy's `builder/out/` (the README of `packages/published-data`): `index.json`, `offers/`, `words/` (no timestamp in its name: the version folder already sets builds apart), `today.json`, `places.json`, `regions.json`, `status.json`, `companies.json`, `companies/<cc>.json`, `cards/<n>.json`, `catalogues/` (`publishedCatalogues`), `explain.txt.gz` with `--explain`.
- **Schemas:** `src/shared/schemas/published/` from `index.d.ts`, strict, each `.openapi("<Name>")`; the files are validated before the pointer moves (offers by a sample of each shard and every rare field, as the legacy's `check.mjs`, measured; every file when cheap).
- `today.json`'s `latest` is `{}` until 011; the offer's title fields of other locales are absent until 011.

## 4. Porting rules and equivalence

- **Behaviour, not code**, as in 004 to 009; long legacy lists and patterns (labels.mjs's) are extracted by a scratchpad script, never retyped; `Object.hasOwn` for every table looked up by a word.
- **Golden sets**: the legacy's readings of the store's texts through `postedInText`, `deadlineInText` and `writtenFacts` (`test/fixtures/publication/`), no person's data in them (only the matched labels and days, never whole texts).
- **Equivalence (T017)**: over the fresh store, the legacy's `toRecord` and its pile's steps run in the scratchpad on the same adverts, compared field by field with the offers, and the shards, word index and other files compared byte for byte where the inputs agree.

## 5. Decisions (2026-11-22, operator)

- **The legacy's shape.** Why: its short keys keep every download small, and AGENTS.md starts the schemas from it.
- **One shard with every locale's title.** Why: one file per family and country, one cache entry; 011 adds the title fields.
- **Labels now, tools later.** Why: the days decide expiry, the year's cut and which copy dedupe keeps; the tools are a search feature of their own.
- **Incremental builds later.** Why: measure a whole build first.
