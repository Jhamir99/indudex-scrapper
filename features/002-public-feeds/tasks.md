# Tasks: Public feeds

Generated from `spec.md` and `plan.md` (as tasks 001, T025-T026 and wave 2). Tasks are ordered by dependency and have a verifiable "Done when". "Standard adapter check" is defined in `plan.md` section 2. Each adapter batch takes about 75 minutes; split one if it does not fit in one sitting.

**Depends:** `crawl-core` closed (its T025).

## Tasks

- [x] **T001 — Family `public-feed` extracted from the reference feed** · FR: FR-2 · Depends: crawl-core T025
      Done when: the family offers robots check, fetch, empty-feed failure and field mapping once, and a source using it only provides its url, licence and field mapping.
- [x] **T002 — Reference adapter: brz (open-data feed)** · FR: FR-1, FR-3, FR-5 · Depends: T001
      Done when: the standard adapter check passes for it.
- [x] **T003 — Port adapters: nav, jobindex, island** · FR: FR-1, FR-4, FR-5 · Depends: T002
      Done when: the standard adapter check passes for each adapter. NAV cadence is 1 h in its config entry (its terms retire inactive ads at once). `jobindex` cadence is 1 h.
      2026-11-16: `nav` needs a token (`NAV_TOKEN`), so it moved to `credentialed-sources` (its T003), as FR-1 says.
- [x] **T004 — Port adapters: kuntarekry, valtiolle, jobtech** · FR: FR-1, FR-4, FR-5, FR-7 · Depends: T002, T019, T020, T022
      Done when: the standard adapter check passes for each adapter.
- [ ] **T005 — Port adapters: infopraca, solidjobs, mpsv** · FR: FR-1, FR-5 · Depends: T002
      Done when: the standard adapter check passes for each adapter.
- [ ] **T006 — Port adapters: nva, upsvr, hungary** · FR: FR-1, FR-4, FR-5 · Depends: T002
      Done when: the standard adapter check passes for each adapter. `hungary` reads one category per pass, about a dozen requests.
- [ ] **T007 — Port adapters: hzz, anofm, cyprus** · FR: FR-1, FR-5 · Depends: T002
      Done when: the standard adapter check passes for each adapter.
- [ ] **T008 — Port adapters: iefp, netempregos, sef** · FR: FR-1, FR-5, FR-6 · Depends: T002, T021
      Done when: the standard adapter check passes for each adapter; `netempregos` is disabled and flagged (FR-6).
- [ ] **T009 — Port adapters: sne, spin, ttvic** · FR: FR-1, FR-5, FR-6 · Depends: T002, T021
      Done when: the standard adapter check passes for each adapter; `ttvic` is disabled and flagged (FR-6).
- [ ] **T010 — Port adapters: brandenburg, bund, karrierenrw** · FR: FR-1, FR-4, FR-5 · Depends: T002
      Done when: the standard adapter check passes for each adapter. `bund` waits 30 s between pages (its robots.txt asks for it).
- [ ] **T011 — Port adapters: linz, ooe, ifgat** · FR: FR-1, FR-5 · Depends: T002
      Done when: the standard adapter check passes for each adapter.
- [ ] **T012 — Port adapters: actiris, forem, vdab** · FR: FR-1, FR-5 · Depends: T002
      Done when: the standard adapter check passes for each adapter.
- [ ] **T013 — Port adapters: emilia, trento, brescia** · FR: FR-1, FR-5 · Depends: T002
      Done when: the standard adapter check passes for each adapter.
- [ ] **T014 — Port adapters: bolzano, uzt, lanbide** · FR: FR-1, FR-5 · Depends: T002
      Done when: the standard adapter check passes for each adapter.
- [ ] **T015 — Port adapters: sae, madrid, jcyl** · FR: FR-1, FR-5 · Depends: T002
      Done when: the standard adapter check passes for each adapter.
- [ ] **T016 — Port adapters: clm, emcan, gencat** · FR: FR-1, FR-5 · Depends: T002
      Done when: the standard adapter check passes for each adapter.
- [ ] **T017 — Port adapters: feinaactiva, escoladeltreball** · FR: FR-1, FR-5 · Depends: T002
      Done when: the standard adapter check passes for each adapter.
- [ ] **T018 — Close public-feeds** · FR: FR-1 to FR-5 · Depends: T003-T017
      Done when: every feed passes the contract test and `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:run && pnpm build` is green; the list of ported sources in `MEMORY.md` is up to date; `features/README.md` marks this feature done.

## Amendment 2026-11-16 (plan section 5)

- [x] **T019 — Per-host pace in `crawl.yml`** · FR: FR-4 · Depends: crawl-core T013
      Done when: tests with a fake clock pass: a host listed in `pace.hosts` is paced by its own gap, other hosts by `pace.perHost`, and a shared server still paces its hosts together; the config schema rejects a negative gap.
- [x] **T020 — Shared `JobPosting` mapping** · FR: FR-1 · Depends: crawl-core T005
      Done when: tests pass on saved pages: one or several JSON-LD blocks (an `@graph`, a list) give their postings as plain fields; a block with broken JSON that the legacy repaired is still read; a page without one gives none.
- [x] **T021 — Disabled and flagged sources** · FR: FR-6 · Depends: crawl-core T020
      Done when: tests pass: a source whose definition has `disabledReason` is recorded as disabled with `flagged: <reason>` and makes zero requests; without it, it runs.
- [x] **T022 — `config/ssyk-groups.yml` for jobtech** · FR: FR-7 · Depends: T001
      Done when: the file exists with its header (source, licence, date, how it was built), loads through `loadConfig` with a schema, and a test checks it is not empty and every entry is a JobTech concept id.
