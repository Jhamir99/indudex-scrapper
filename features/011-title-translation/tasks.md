# Tasks: Title translation

Generated from `spec.md` and `plan.md`. Tasks are ordered by dependency and have a verifiable "Done when". Every task ends with `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:run && pnpm build` green. "Legacy example" means the example the legacy's comment or test for that rule gives.

**Depends:** `publication` closed (its T018).

## Part A — The data and the shared pieces

- [ ] **T001 — The method's data** · FR: FR-6 · Depends: publication T018
      Done when: `catalogues/translation/` holds the legacy's `dict/vocab-<lang>.json`, `case-en.json` and `spellings.json` byte for byte (their SHA-256 recorded here), `vendor/bergamot/` the loader and its LICENSE, `vendor/aina/aina_worker.py`; `data.ts` reads them once through the path guard, and tests read each.
- [ ] **T002 — Patterns, marks, places, Catalan spelling, companies, genders** · FR: FR-2, FR-6 · Depends: T001
      Done when: `method/patterns.ts`, `marks.ts`, `places.ts`, `catalan-spelling.ts`, `companies.ts`, `genders.ts` are extracted from the legacy, and its tests pass (`test/mt-marks`, `mt-places`, `mt-catalan`, `mt-companies`).
- [ ] **T003 — The language a title is written in** · FR: FR-1 · Depends: T002
      Done when: `language-of.ts` holds the legacy's `language-of.ts` and Argus's `languageOfPlace`, the legacy's tests pass (`test/mt-language-of`), and a golden set of the legacy's `languageOf` over the store's published offers matches.

## Part B — In the publication

- [ ] **T004 — The caches, applied, and the titles wanted** · FR: FR-2, FR-3, FR-8 · Depends: T003
      Done when: `src/shared/storage/title-caches.ts` reads and writes the legacy's files (a cache that cannot be read is an error, never empty); `translate.ts` holds `languageOf`, `applyTitles` and `wantedTitles`; the legacy's tests pass (`test/translate.test.mjs`, `translate-audit`).
- [ ] **T005 — Wired into the publication, and each language's ten** · FR: FR-2 to FR-4 · Depends: T004
      Done when: `latest.ts` holds `latestPicks` (its tests pass); the build applies the caches before the entities and the calm (which counts every title field), `runPublication` reads the caches, writes `mt-wanted.json` and `today.json`'s `latest`; a test runs the publication with a small cache and finds the titles applied, the wanted list and the ten.

## Part C — The method

- [ ] **T006 — The trades and the method's tables** · FR: FR-6 · Depends: T002
      Done when: the trade tables are extracted to `catalogues/translation/trades.json`, `method/trades.ts`, `method-tables.ts`, `jobdash.ts`, `jobdash-fr.ts`, `english-tidy.ts` are extracted, and the legacy's tests pass (`test/mt-trades`, `mt-english-tidy`).
- [ ] **T007 — Before the engine** · FR: FR-6 · Depends: T006
      Done when: `method/before.ts`, `checks.ts`, `levels.ts` are extracted and the legacy's tests pass (`test/mt-before`, `mt-ukrainian`, `mt-tidy-and-names`).
- [ ] **T008 — After the engine** · FR: FR-6 · Depends: T007
      Done when: `method/after.ts` and `corrections.ts` are extracted and the legacy's tests pass (`test/mt-corrections`, `mt-corrections-rules`).
- [ ] **T009 — The method and its legs** · FR: FR-6 · Depends: T008
      Done when: `method/method.ts` and `legs.ts` (`translateTitles` with an engine given) are extracted and the legacy's tests pass (`test/mt-legs`).
- [ ] **T010 — The method's golden set** · FR: FR-6 · Depends: T009
      Done when: `test/fixtures/title-translation/method.json` holds the legacy's `translateTitles` of a sample of the store's titles in each language with a stand-in engine (made in the scratchpad), and ours gives the same; the whole store's titles compared in the scratchpad, the differences recorded here.
- [ ] **T011 — Catalan from Spanish** · FR: FR-7 · Depends: T009
      Done when: `aina.ts` is extracted, `legs.ts` uses it where Aina is installed, and the legacy's tests pass with a stand-in worker (`test/mt-aina`); with no Aina nothing changes.

## Part D — The translator

- [ ] **T012 — The engine and its models** · FR: FR-5 · Depends: T009
      Done when: `engine.ts` runs the vendored loader in worker threads as the legacy (tested with a stand-in loader), and `src/bin/translate-fetch.ts` (`pnpm translate:fetch`) fetches the engine and models with their SHA-256 checked (tested on saved answers of Remote Settings).
- [ ] **T013 — The queue and the caches' merge** · FR: FR-8 · Depends: T004
      Done when: `queue.ts` and `merge.ts` are extracted and the legacy's tests pass (`test/mt-queue`); a cache is merged by a child process.
- [ ] **T014 — The translator's run** · FR: FR-8, FR-9 · Depends: T011, T012, T013
      Done when: `run.ts` and `src/bin/translate.ts` (`pnpm translate`) work through the queue as the legacy did, tested on temporary state with a stand-in engine (minutes, halves, unended chunk, stuck title, flush, failure exit, no models, no queue).

## Part E — Measured and closed

- [ ] **T015 — Measured with the real engine** · NFR: Measured, Memory · Depends: T014
      Done when: the models are fetched and the translator runs on a real queue on this Mac (and on the server when the operator can), and recorded here: titles a minute, memory, titles without an answer, and a sample read against the legacy's method on the same engine.
- [ ] **T016 — Close** · Depends: T015
      Done when: `CLAUDE.md` names the commands, the data folders, `MT_DIR` and `AINA_DIR` and the feature's modules, `features/README.md` marks 011 done, and `MEMORY.md` records what 012 needs (the cron, the lock against a publication, the Dockerfile's `catalogues/` and `vendor/`).
