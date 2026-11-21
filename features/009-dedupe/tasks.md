# Tasks: Dedupe

Generated from `spec.md` and `plan.md`. Tasks are ordered by dependency and have a verifiable "Done when". Every task ends with `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:run && pnpm build` green. "Legacy example" means the example the legacy's comment or test for that rule gives.

**Depends:** `companies` closed (its T014).

## Part A — The title as published, and the shared pieces

- [ ] **T001 — One address rule** · FR: FR-2 · Depends: companies T014
      Done when: `src/shared/kit/advert-address.ts` holds `advertAddress` (the legacy's `normUrl`, its tracking list extracted), tests pass on legacy examples (a `utm_source` and a `#top` dropped, `id` kept, Lanbide's `IDRG` kept, Latvia's `#/pub/vakances/…` kept, a trailing slash and an empty query dropped, an address that is not a URL trimmed), and the scrapper's takedowns read addresses through it (their tests pass; a test shows a `ref` dropped).
- [ ] **T002 — Clutter, shared** · FR: FR-1 · Depends: T001
      Done when: `clutter.ts` lives in `src/shared/kit/`, companies imports it from there, and every test passes unchanged.
- [ ] **T003 — The title as published** · FR: FR-1 · Depends: T002
      Done when: `src/shared/kit/shown-title.ts` holds `shownTitle` and its steps (Argus's `cleanTitle`, `withoutBoardTail`, `withoutCodes`, the invisible characters, composed letters, 250 letters at a word; patterns extracted, not retyped), and tests pass on legacy examples (LilyLifestyle's tail, «Architektur Stellen», «Obserwuj ofertę», «Job | … | Bruxelles», Talent Partners, a UK place repeated; «169. ##6497 Electricista Industrial», «1. Offizier (m/w/d)» kept, «- ID:15080», «Ref: 2609», «DevOps_31001», «#2026-59», «Graduate Programme: 2026» and «C# Developer» kept; a zero-width space in «(d/m/f)»; decomposed accents).
- [ ] **T004 — The titles' golden set** · FR: FR-1 · Depends: T003
      Done when: `test/fixtures/dedupe/titles.json` holds the legacy's readings of the store's distinct titles (a sample of a few thousand, built in the scratchpad from the legacy's own steps) and of its tests' titles, and every reading of `shownTitle` matches.
- [ ] **T005 — Catalan, shared** · FR: FR-3 · Depends: T001
      Done when: `catalanToo` and its tables live in `src/shared/words/catalan.ts`, generic over `{ title, lang?, hintLangs? }`; the gate imports it from there, and every gate test and its golden set pass unchanged.

## Part B — One copy of each advert

- [ ] **T006 — The role** · FR: FR-3 · Depends: T003, T005
      Done when: `role.ts` holds `titleKey` and `roleKey` (Argus v1.11.0, entities decoded first), `NOT_AN_EMPLOYER`, `companyOf` (`CODE`, `GENERIC`, `HEAD`, `TAIL` extracted) and `jobKey` (a Catalan title read in Spanish), and tests pass on legacy examples («360 Consulting», «3530 Kyndryl España, S.A.U.», «Sopra Steria ES», «Roche Ext», «Back Market», «The Company», «The Group», «Grupo Planeta»; «(m/w/d)» and «£18000 per annum» no one; «(m/w/d)», «(All Genders)», «80-100%», a long dash; «Tècnic/a de manteniment» and «Técnico/a de mantenimiento» one role; «constructor» not read from the table); `test/fixtures/dedupe/roles.json` holds the legacy's `companyOf` and `jobKey` of the store's names and titles, and every reading matches.
- [ ] **T007 — The same address, the same role in a place** · FR: FR-2, FR-3, FR-5, FR-7 · Depends: T006
      Done when: `dedupe.ts` keeps one copy per address (a higher-ranked kind replacing it) and per role in a place, keeps the better copy (careers over feed over portal and via; posted first; a day over none; the lower address), the kept copy inherits the work mode, pay, last day and years it lacks without changing the input, counts `sameUrl` and `sameRole`, and tests pass on legacy examples (Madrid and München two offers; Munich and München one place with `placeKey`; the earlier day kept; the same pair in either order keeps the same copy; an employer that names no one never joined by role).
- [ ] **T008 — Campaigns and remote jobs** · FR: FR-4 · Depends: T007
      Done when: a role in more than ten towns is kept once per country with `alsoAt`, a fully remote job (its work mode or its title) once wherever it is, a copy naming no mode where a remote copy is filed joins it and an on-site or hybrid one does not, and tests pass on legacy examples (twelve towns; three towns kept three times; EWOR's «SaaS Co-Founder / CCO (100 % remote)»; Ashby's remote copy and the employer's Berlin copy; an on-site copy apart).
- [ ] **T009 — The copies of an advert taken down** · FR: FR-6 · Depends: T006
      Done when: `taken.ts` holds `withoutTaken` and tests pass on the legacy's example (Acme's Process Engineer in Madrid taken down, its copy from another source gone, the one in Bilbao kept; nothing taken changes nothing).
- [ ] **T010 — The public entry** · FR: FR-7 · Depends: T007, T008, T009
      Done when: `index.ts` exports `dedupe`, `withoutTaken`, `placeKey` and the types (`DedupeAdvert`, `KeptAdvert`, `TakenAdvert`), tests show the same output twice and copies of one role shuffled keeping the same copy, and nothing in the feature reads the network or another feature.

## Part C — Measured and closed

- [ ] **T011 — Measured on a real store, against the legacy** · NFR: Equivalence, Speed, Measured · Depends: T004, T010
      Done when: a scratchpad script runs the fresh store's gated adverts (mended and cut as the legacy's build did) through `shownTitle`, `jobKey` and `dedupe` and through the legacy's functions on the same records, and the result is recorded here: the titles and roles that differ, the copies kept that differ (none expected, each explained), `sameUrl` and `sameRole`, the campaigns and remote jobs joined, and the time taken.
- [ ] **T012 — Close** · Depends: T011
      Done when: `CLAUDE.md` names the shared kit's `advertAddress`, `clutter` and `shownTitle`, `shared/words/catalan.ts` and the dedupe feature, `features/README.md` marks 009 done, and `MEMORY.md` records what the next feature needs.
