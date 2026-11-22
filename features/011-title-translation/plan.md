# Plan: Title translation

Implements `spec.md` (FR-1 to FR-9). Status: approved (2026-11-22). A port of the legacy's `builder/translate.mjs`, `builder/latest.mjs`, `builder/mt/` (the method s139: `patterns.ts`, `marks.ts`, `places.ts`, `catalan-spelling.ts`, `companies.ts`, `genders.ts`, `language-of.ts`, `trades-data.mjs`, `trades.mjs`, `method-tables.mjs`, `jobdash.mjs`, `jobdash-fr.ts`, `english-tidy.ts`, `before.mjs`, `checks.mjs`, `levels.mjs`, `after.mjs`, `corrections.mjs`, `method.mjs`, `legs.mjs`, `aina.mjs`, `aina_worker.py`, `engine.mjs`, `fetch.mjs`, `queue.mjs`, `merge-titles.mjs`, `translate-titles.mjs`), Argus v1.11.0's `languageOfPlace` (`server-bot/notify.mjs`), with their tests (`test/mt-*.test.mjs`, `test/translate*.test.mjs`, the latest picks of `test/builder.test.mjs`).

## 1. Layout

```
catalogues/translation/        # the method's data, byte for byte from the legacy: dict/vocab-<lang>.json, case-en.json, spellings.json
vendor/bergamot/               # Firefox's engine loader (bergamot-translator.js) and its MPL 2.0 LICENSE, as the legacy kept them
vendor/aina/aina_worker.py     # Aina's worker (Python, CTranslate2), as the legacy's
src/shared/storage/title-caches.ts   # state/titles-<lang>.json, mt-wanted.json, mt-redo.json, mt-current.json, mt-stuck.json (the legacy's formats)
src/features/title-translation/      # processor
  index.ts            # public entry: titleLanguage, readsAs, applyTitles, wantedTitles, latestPicks, translateTitles, runTranslator
  data.ts             # the data files of catalogues/translation/, read once through the path guard
  language-of.ts      # language-of.ts and Argus's languageOfPlace
  translate.ts        # languageOf, applyTitles, wantedTitles (builder/translate.mjs)
  latest.ts           # latestPicks (builder/latest.mjs)
  method/             # patterns, marks, places, catalan-spelling, companies, genders, trades-data, trades, method-tables, jobdash, jobdash-fr, english-tidy, before, checks, levels, after, corrections, method
  legs.ts             # translateTitles: every direction through English, Aina for Catalan from Spanish
  aina.ts             # the Aina worker's wiring
  engine.ts           # Bergamot in worker threads
  queue.ts            # groupQueue, nextChunk, inHalves, answersOf, afterUnended
  merge.ts            # a cache merged by a process of its own
  run.ts              # the translator's run (translate-titles.mjs)
src/bin/translate.ts           # `pnpm translate [-- --minutes 45] [-- --workers 2] [-- --group 400]`
src/bin/translate-fetch.ts     # `pnpm translate:fetch [pair …]`: the engine and models into MT_DIR (operator, network)
```

- **Data outside `src/`**, as the catalogues are: `tsc` does not copy JSON or JS into `dist/`, and the server reads them from the repo. The Dockerfile copies `catalogues/` and `vendor/` (noted for 012).
- **Trade tables** (`trades-data.mjs`, 9,000 lines) become a JSON file under `catalogues/translation/` extracted by script, read by `trades.ts`; the other tables stay in code, extracted, never retyped.
- **Processor features never import one another**: the publication imports this feature's `index.ts` (it runs every step); this feature needs the gate's `languagesFor` of a country, which comes to it as an input.
- **State**: the caches and the queue live in the processor's state folder (`PROCESSOR_STATE_DIR`), the engine and models in `MT_DIR` (default `state/mt/`), Aina in `AINA_DIR` (default `~/mt-aina`).

## 2. In the publication (FR-1 to FR-4)

- In `build()`, after dedupe and the campaigns' towns: `applyTitles` for each language from the caches, then entities written out (`unescaped`), then the titles in capitals brought down counting every title field (the legacy's `calmTitles` over `TITLES`).
- `runPublication` reads the six caches (a cache that cannot be read is logged as an alert and its language's titles stay as written, as the legacy), writes `mt-wanted.json` with `wantedTitles`, and `today.json`'s `latest` with `latestPicks`.
- The offer's `te`, `ts`, `tc`, `tf`, `tn`, `td` and `nt` come in the legacy's order of keys (after `m`), so its bytes stay the legacy's.

## 3. Porting rules and equivalence

- **Behaviour, not code**, as in 004 to 010; every table and pattern extracted by a scratchpad script, never retyped; `Object.hasOwn` for every table looked up by a word; the legacy's regex quirks kept and commented.
- **Golden sets**: the legacy's `languageOf` of the store's titles; the legacy's `translateTitles` of the store's titles with a stand-in engine (a deterministic function of its input, the same on both sides), so the whole method is checked without the models; no person's data (titles and employers from the earlier golden sets and the store's titles filtered as before).
- **Measured (T015)**: the real engine with the models fetched, on this Mac and, when the operator can, on the server, against the legacy's output for a sample.

## 4. Decisions (2026-11-22, operator)

- **Aina's Python worker kept, optional.** Why: its Catalan from Spanish is much better (blind test 89 to 29, wrong 0 to 31), and the route through English stands where it is missing.
- **The six languages.** Why: the published offer and the web carry a field for each.
- **The whole method.** Why: Firefox's raw output is not usable for job titles; the method is what made it so.
- **The legacy's cache format.** Why: the legacy server's caches hold weeks of engine time; the operator copies them in once.
