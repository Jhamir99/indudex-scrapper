# Tasks: Job portals

Generated from `spec.md` and `plan.md`. Tasks are ordered by dependency and have a verifiable "Done when". "Standard adapter check": see `features/002-public-feeds/plan.md` section 2. "Legacy tests" means the legacy's own test cases of that part (`test/builder.test.mjs` and the others), carried. Every task ends with `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:run && pnpm build` green.

**Depends:** `credentialed-sources` closed (its T006).

## Part A — crawl-core and the rule

- [ ] **T001 — The rule, the backlog, the run's page budget, and the gate's reading as a port** · FR: FR-1, FR-4, FR-5 · Depends: credentialed-sources T006
      Done when: `AGENTS.md` states the portal rule; `AdapterContext` has `isOurs`, `pageBudget` and `backlog`; a source that reports a backlog is due again after `portalBacklogHours`; the run's sources share one page budget; `src/bin/crawl.ts` builds `isOurs` from the gate; tests with stand-ins for each, and one with the real gate on the legacy's `namesOurs` cases.

## Part B — Reading a vacancy page (shared with 016)

- [ ] **T002 — Sitemaps** · FR: FR-3 · Depends: T001
      Done when: `shared/kit/sitemap.ts` holds `parseSitemap`, `sitemapText` (gzip), `withScheme`, `looksLikeJob`, and the legacy tests pass.
- [ ] **T003 — The completed block and the labelled facts** · FR: FR-3 · Depends: T002
      Done when: `wholeAdvert` joins `shared/kit/job-posting.ts` and `labels.ts` holds `withLabels`, ported by script where they are tables, and the legacy tests pass.
- [ ] **T004 — The layout reader and the careers reader's helpers** · FR: FR-3 · Depends: T003
      Done when: `shared/kit/layout.ts` (`guessPosting`) and `vacancy-page.ts` (`oneLanguage`, `platformPosting`) are ported and the legacy tests pass.

## Part C — The portals

- [ ] **T005 — The portal list as data** · FR: FR-1, FR-2 · Depends: T001
      Done when: `config/portals.yml` holds the legacy's 865 entries (enabled state and reasons kept, header crediting the legacy), `portal-list.ts` validates it, and a test checks the counts and that every switched-off entry has a reason.
- [ ] **T006 — The portal family** · FR: FR-3, FR-4, FR-5, FR-9 · Depends: T004, T005
      Done when: `portal.ts`, `page-layouts.ts` and `family.ts` read a portal as plan section 1 says; every enabled entry is registered with its host's gap; saved samples of six portals of different shapes pass the standard adapter check and give the legacy's adverts (compared in the scratchpad); the legacy tests of the portal reader pass.
- [ ] **T007 — The live pass** · FR: FR-8 · Depends: T006
      Done when: every enabled portal was read once live with a small budget into a temporary store; the results are recorded here and the failures switched off in the list with reason and date.

## Part D — The keyless boards

- [ ] **T008 — remote: jobicy, remotive, arbeitnow** · FR: FR-6, FR-9 · Depends: T001
      Done when: the standard adapter check passes for each on saved answers, with the legacy tests.
- [ ] **T009 — francetravail** · FR: FR-7, FR-9 · Depends: T001
      Done when: the standard adapter check passes on saved listings and offers' data, with the legacy tests; cadence 1 h and a seventh of the listings an hour.

## Part E — Close

- [ ] **T010 — Close** · Depends: T007, T008, T009
      Done when: `CLAUDE.md` names the feature's folders, the shared page readers and the ports; 016's spec takes `boards`; `MEMORY.md` updated; `features/README.md` marks 015 done.
