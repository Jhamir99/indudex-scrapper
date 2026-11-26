# Tasks: Legacy resync

Generated from `spec.md` and `plan.md`. Every task ends with `pnpm lint && pnpm format:check && pnpm typecheck &&
pnpm test:run && pnpm build` green; "carried" means the legacy's tests at the target commit, in `test/legacy/`.

**Depends:** `job-portals` closed (its T010).

- [x] **T001 — Inventory** · FR-1 · Depends: job-portals T010
      Done when: the map of our modules to the legacy's files and the list of their behavioural changes since
      `b0cd182` are recorded here.
      2026-11-26: done. Snapshot `b0cd182` (#840, 2026-11-15), target `ec79858` (#1220, 2026-11-25): 379 commits, 313 files of `builder/`, `app/lib/`, `catalogues/` (the legacy's full history fetched into the scratchpad's clone). Lines changed by area, renames followed at 50 % (a file both moved to TypeScript and much changed counts twice, so these overstate): words, sentences and stance 5,000 (47 files; every language's table, `stance.ts` new); advert facts 4,199 (`screens`, `labels`, `work-mode`, `contract`, `years`); pay 1,159 (`text-pay`, `pay`); gate 371 (`gate`, `isco-esco`); places 998 (`normalise`, `towns`); companies 368 (`company-cards`, `companies`, `names`, `agencies`); dedupe 144; publication 1,179 (`build-pile`, `work-out`, `work-out-pool`, `translate`, `latest`, `tidy-titles`, `shard`, `word-index`); title translation 5,179 (37 files: `trades-data`, `corrections`, `levels`, `before`, `method-tables`, `after`, `level-words`); crawl and public feeds 3,242 (54 files: `http`, `crawl`, `servers`, adapters such as `sne`, `vdab`, `bund`); catalogues 1,384 (`occupations.json` 1,290, `degrees`, `families`, `titles`). Not ported yet, so not this feature's: 6,221 (`boards`, `careers`, `sources`, the discovery tools). Already current: what 012 to 015 ported this week came from the target. The legacy's tests that changed most: `every-language.json` (3,692), `sentences` (625 + 325), `builder.test.mjs` (502), the method's reviews (`mt-languages-review`, `mt-rule-review`, `mt-root-causes`), `words`, `readers-languages`, `labels`, `tidy-titles`. The scratchpad's `legacy-numstat.tsv` holds the list.
- [x] **T002 — Words, sentences, stance** · FR-2, FR-3 · Depends: T001
      Done when: `shared/words`, `shared/kit/sentences.ts` and the legacy's `stance.ts` (where its users need it) match
      the target; its `words`, `sentences`, `readers-languages` tests carried and passing.
- [x] **T003 — Advert facts** · FR-2, FR-3 · Depends: T002
      Done when: contract, working time, work mode, years, screens and the written and page facts match the target;
      its tests carried (the two cases skipped in `page-labels.test.mjs` back on); the golden sets made again.
- [x] **T004 — Pay** · FR-2, FR-3 · Depends: T002
      Done when: the text pay, currencies and periods match the target; its tests carried; golden sets made again.
- [ ] **T005 — Gate and catalogues** · FR-2, FR-3 · Depends: T002
      Done when: the title rules, routes, hygiene and gate match the target, the catalogues brought up to it; tests
      carried; golden sets made again.
- [ ] **T006 — Places** · FR-2, FR-3 · Depends: T005
- [ ] **T007 — Companies and dedupe** · FR-2, FR-3 · Depends: T006
- [ ] **T008 — Publication** · FR-2, FR-3 · Depends: T003 to T007
- [ ] **T009 — Title translation** · FR-2, FR-3 · Depends: T008
- [ ] **T010 — Crawl-core, public feeds, text helpers** · FR-2 · Depends: T001
      Done when: the HTTP client, robots, pacing, the public feeds' adapters and the text helpers match the target where
      ported; tests carried.
- [ ] **T011 — Over the store, and close** · FR-4 · Depends: T008, T009, T010
      Done when: the processor's steps compared with the target's on a store copy, the differences recorded; `CLAUDE.md`,
      `MEMORY.md` and `features/README.md` updated.

Notes on T002 to T004 (2026-11-26). The legacy's modules were copied whole, their imports pointed here, rather than
our ports edited: `shared/words` (its tables and index, with its option names `langs` and `READ_BY_BOT`),
`shared/words/stance.ts`, `shared/kit/sentences.ts`, advert-facts' contract, work mode, years, screens and labels, pay's
`pay.ts` and `text-pay.ts`. Our typed shapes sit over them (advert-facts' `codes.ts`, pay's `advert-pay.ts`). The
degrees and languages catalogues were brought to the target with them (the screens read them; the languages'
`required` and `softened` lists moved into the word tables). The golden sets of advert facts, labels and pay were made
again from the target over the same texts, and the legacy's tests carried whole into `test/legacy/`: words, sentences,
readers-languages, contract (without the site's cases), labels (its `withLabels` through `src/bin/page-facts.ts`),
years, screens, text-pay and text-pay-currencies; `page-labels.test.mjs` gave way to the whole labels test, its two
skipped cases now passing. The legacy's work-mode and pay tests call its adapters and normalise: their calls are in
the golden sets.
