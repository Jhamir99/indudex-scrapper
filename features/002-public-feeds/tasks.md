# Tasks: Public feeds

Generated from `spec.md` and `plan.md` (as tasks 001, T025-T026 and wave 2). Tasks are ordered by dependency and have a verifiable "Done when". "Standard adapter check" is defined in `plan.md` section 2. Each adapter batch takes about 75 minutes; split one if it does not fit in one sitting.

**Depends:** `crawl-core` closed (its T025).

## Tasks

- [x] **T001 — Family `public-feed` extracted from the reference feed** · FR: FR-2 · Depends: crawl-core T025
      Done when: the family offers robots check, fetch, empty-feed failure and field mapping once, and a source using it only provides its url, licence and field mapping.
- [ ] **T002 — Reference adapter: brz (open-data feed)** · FR: FR-1, FR-3, FR-5 · Depends: T001
      Done when: the standard adapter check passes for it.
- [ ] **T003 — Port adapters: nav, jobindex, island** · FR: FR-1, FR-4, FR-5 · Depends: T002
      Done when: the standard adapter check passes for each adapter. NAV cadence is 1 h in its config entry (its terms retire inactive ads at once). `jobindex` cadence is 1 h.
- [ ] **T004 — Port adapters: kuntarekry, valtiolle, jobtech** · FR: FR-1, FR-5 · Depends: T002
      Done when: the standard adapter check passes for each adapter.
- [ ] **T005 — Port adapters: infopraca, solidjobs, mpsv** · FR: FR-1, FR-5 · Depends: T002
      Done when: the standard adapter check passes for each adapter.
- [ ] **T006 — Port adapters: nva, upsvr, hungary** · FR: FR-1, FR-4, FR-5 · Depends: T002
      Done when: the standard adapter check passes for each adapter. `hungary` reads one category per pass, about a dozen requests.
- [ ] **T007 — Port adapters: hzz, anofm, cyprus** · FR: FR-1, FR-5 · Depends: T002
      Done when: the standard adapter check passes for each adapter.
- [ ] **T008 — Port adapters: iefp, netempregos, sef** · FR: FR-1, FR-5 · Depends: T002
      Done when: the standard adapter check passes for each adapter (`netempregos`: see the spec's open question).
- [ ] **T009 — Port adapters: sne, spin, ttvic** · FR: FR-1, FR-5 · Depends: T002
      Done when: the standard adapter check passes for each adapter (`ttvic`: see the spec's open question).
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
