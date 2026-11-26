# Tasks: Legacy resync

Generated from `spec.md` and `plan.md`. Every task ends with `pnpm lint && pnpm format:check && pnpm typecheck &&
pnpm test:run && pnpm build` green; "carried" means the legacy's tests at the target commit, in `test/legacy/`.

**Depends:** `job-portals` closed (its T010).

- [ ] **T001 — Inventory** · FR-1 · Depends: job-portals T010
      Done when: the map of our modules to the legacy's files and the list of their behavioural changes since
      `b0cd182` are recorded here.
- [ ] **T002 — Words, sentences, stance** · FR-2, FR-3 · Depends: T001
      Done when: `shared/words`, `shared/kit/sentences.ts` and the legacy's `stance.ts` (where its users need it) match
      the target; its `words`, `sentences`, `readers-languages` tests carried and passing.
- [ ] **T003 — Advert facts** · FR-2, FR-3 · Depends: T002
      Done when: contract, working time, work mode, years, screens and the written and page facts match the target;
      its tests carried (the two cases skipped in `page-labels.test.mjs` back on); the golden sets made again.
- [ ] **T004 — Pay** · FR-2, FR-3 · Depends: T002
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
