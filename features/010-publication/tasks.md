# Tasks: Publication

Generated from `spec.md` and `plan.md`. Tasks are ordered by dependency and have a verifiable "Done when". Every task ends with `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:run && pnpm build` green. "Legacy example" means the example the legacy's comment or test for that rule gives.

**Depends:** `dedupe` closed (its T012).

## Part A — The contract and the shared pieces

- [x] **T001 — The published schemas** · FR: FR-9 · Depends: dedupe T012
      Done when: `src/shared/schemas/published/` declares every file of `packages/published-data/index.d.ts` as strict Zod schemas named with `.openapi()` (Offer, OffersPart, Index, Status, Places, Regions, Today, Companies, RegisterCompanies, CompanyCards, the pointer), each field's comment carried over; tests accept the legacy's own examples and refuse an unknown offer field.
      2026-11-22: done. `offer.ts` (Offer, OffersPart and the day, country, language and period types) and `dataset.ts` (index, sources, families, word index, today, places, regions, status, companies, register companies, cards, `current.json`), from the legacy's `index.d.ts` fetched with `gh api` (the clone lacks it). Tighter than the legacy's types where its code never wrote otherwise: `ct`, `wt` and the period by their codes, `f` four digits; `latest.optional` optional, as the legacy wrote it only when there were trades' offers. The first commit of this task held only this note: `.gitignore`'s `published/` matched `src/shared/schemas/published/` too; the data folders (`/store/`, `/published/`, `/state/`) are now anchored at the repo's root, and the schemas went in the next commit.
- [x] **T002 — Versions and the pointer** · FR: FR-10 · Depends: T001
      Done when: `src/shared/storage/published-dataset.ts` writes a version into `<version>.partial/`, renames it whole, then writes `current.json` atomically, keeps three versions (never the current), removes a `.partial` left behind, and refuses a pointer that names a missing version with its path; tests on temporary folders for each case; `published/` is ignored by git and `PUBLISHED_DIR` documented.
      2026-11-22: done. `PublishedDataset` (`current`, `versions`, `start`, `prune`) and `VersionWriter` (`write`, kept inside its version; `finish`; `abandon`); `publishedDirectory` reads `PUBLISHED_DIR`; `versionOf` names a version by its UTC second, and a version published already is refused. `.env.example` documents `PUBLISHED_DIR` and `PROCESSOR_STATE_DIR` (missing since 008). A held build writes no version at all: the guard runs before the files.
- [x] **T003 — Takedowns, shared** · FR: FR-2 · Depends: T001
      Done when: the takedowns' loader lives in `src/shared/config/takedowns.ts`, crawl-core imports it from there, and every test passes unchanged.
      2026-11-22: done. Moved with `git mv` with its tests; its imports, crawl-core's runner and `src/bin/crawl.ts` point to `src/shared/config/takedowns.ts`. `CLAUDE.md` is updated at the close.
- [ ] **T004 — Mended and cut** · FR: FR-2 · Depends: T001
      Done when: `src/shared/kit/mended-text.ts` holds `mendedText` (patterns extracted) and the field limits (`atMost`), and tests pass on legacy examples («München» from a JSON escape, «SetÃºbal», «â€“», «"Erlangen"», «Famalicãƒo», «CAFÉ’S» kept, «DIRECCIÓ TÈCNICA» not made Cyrillic; a field cut at a word).

## Part B — What the text states

- [ ] **T005 — The days** · FR: FR-3 · Depends: T004
      Done when: `labels/days.ts` holds the legacy's `postedInText`, `deadlineInText` and the day rules of `toRecord` (a past day only; the earlier of the text's and the first seen; `fs`; the last day's limits), patterns extracted, and tests pass on legacy examples.
- [ ] **T006 — The labelled contract and working time** · FR: FR-4 · Depends: T004
      Done when: `labels/written-facts.ts` and `labels/agency-work.ts` hold `writtenFacts` (labelled lines, inline labels, the title's contract and hours) and the agency-work rule, extracted, and tests pass on legacy examples (each label in each language the legacy reads; «Arbeitnehmerüberlassung» as a field; «keine Zeitarbeit»; «mit der Chance auf Übernahme»).
- [ ] **T007 — The labels' golden set** · FR: FR-3, FR-4 · Depends: T005, T006
      Done when: `test/fixtures/publication/labels.json` holds the legacy's readings of the store's texts (the label or day matched and the reading, never the whole text; a sample spread over the sources), and every reading matches.

## Part C — The offers

- [ ] **T008 — Reading the store** · FR: FR-2 · Depends: T003, T004
      Done when: `read-store.ts` gives each listed source's adverts mended and cut, and leaves out (counted as the legacy's status counts them) a source taken down or stale (last stored pass over nine days old), an advert taken down by address or employer, one with no `http(s)` address; tests on a temporary store for each rule.
- [ ] **T009 — The offer** · FR: FR-5 · Depends: T005, T006
      Done when: `offer.ts` builds an offer from the steps' outputs as `toRecord` did (`offerId` as the legacy's `idFor`; `nt` and the calm title; entities unescaped; each field only when said; `m` from a campaign's other copies, `campaignPlaces`), validated by the Offer schema, and tests pass on legacy examples for each field.
- [ ] **T010 — The build** · FR: FR-1, FR-2, FR-5, FR-12 · Depends: T008, T009
      Done when: `build.ts` runs every step in the legacy's order over a store (places, gate, employer, facts, pay, labels, title; expired and year-old out; `withoutTaken`; `dedupe`), gives the offers (main and skilled trades apart), the counts of what was left out and why, and each stage's time and memory; tests on a temporary store of saved adverts.

## Part D — The files

- [ ] **T011 — Shards and the newest** · FR: FR-6 · Depends: T010
      Done when: `shards.ts` holds `buildShards`, `latestOf` and `occupationCounts`, and tests pass on legacy examples (parts past four million characters; newest first, ties by id; three growing latest parts; the skilled trades apart; `xx` and `zz` kept); the same offers give the same bytes.
- [ ] **T012 — The word index** · FR: FR-7 · Depends: T010
      Done when: `word-index.ts` holds `buildWordIndex` with `encodeNumbers`, `pairsOf`, `haystack`, `bucketOf`, `piecesOf` and `companyToken` (extracted), and tests pass on legacy examples («c#», «ab/cd», the intermediaries last, blocks capped at 2,000); a golden set of the legacy's files for a sample of offers matches byte for byte.
- [ ] **T013 — The front page's rows** · FR: FR-8 · Depends: T010
      Done when: `backdrop.ts` holds `backdropOffers` and tests pass on legacy examples (one per company, the fullest country first, titles and lines that fit, no intermediary, no `xx`); `today.json` holds them with `latest` empty.
- [ ] **T014 — The index and the other files** · FR: FR-8 · Depends: T011, T012, T013
      Done when: `files.ts` writes `index.json` (families, newest, sources with licence and credit from the registry, counts, words, times), `status.json`, `places.json`, `regions.json`, `companies.json`, `companies/<cc>.json`, `cards/<n>.json` (512 files by `cardKey`), the catalogues and `explain.txt.gz`, each validated by its schema; tests on each file.
- [ ] **T015 — The shrink guard** · FR: FR-11 · Depends: T010
      Done when: `shrink-guard.ts` holds `pileCounts`, `falls` and `remember` and the hold rule (a day, `--force`), with the history in `state/pile-history.json`, and tests pass on legacy examples (832 to 63 in steps; Spain gone while the total held; a fall published after a day restarts the history; an empty build never publishes).

## Part E — The entry, measured and closed

- [ ] **T016 — The processor's entry** · FR: FR-1, FR-10, FR-12 · Depends: T002, T014, T015
      Done when: `index.ts` (`runPublication`) and `src/bin/process.ts` (`pnpm process [-- --force] [-- --explain]`) run the build, write the version, check it against the schemas, move the pointer and log each stage; a test runs it on a temporary store and finds a whole version and the pointer, and a held build leaves the pointer; nothing reads the network.
- [ ] **T017 — Measured on a real store, against the legacy** · NFR: Equivalence, Speed and memory · Depends: T016
      Done when: a scratchpad script runs the fresh store through `pnpm process` and through the legacy's `toRecord` and pile steps on the same adverts, and records here: the offers kept and the fields that differ (each explained), the files that differ, each stage's time, the whole build's time and peak memory.
- [ ] **T018 — Close** · Depends: T017
      Done when: `CLAUDE.md` names the entry, the published folder and the feature's modules, `features/README.md` marks 010 done and lists the tools and incremental builds as later features, and `MEMORY.md` records what 011 needs.
