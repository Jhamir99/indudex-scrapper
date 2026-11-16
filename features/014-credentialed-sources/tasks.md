# Tasks: Credentialed sources

Generated from `spec.md` and `plan.md` (as tasks 001, wave 3). "Standard adapter check": see `features/002-public-feeds/plan.md` section 2.

**Depends:** every feature before it in `features/README.md` closed (the last one is `013-closed-adverts`); its family builds on `002-public-feeds`.

## Tasks

- [ ] **T001 — Family `credentialed`: key check and disabled reporting** · FR: FR-2 · Depends: public-feeds T018, crawl-core T016
      Done when: a source on this family with a missing variable reports disabled and makes zero requests (fake HttpClient counts calls); with a fake value set in the test, it runs.
- [ ] **T002 — Port adapters: adzuna, jooble, francetravail (disabled until keyed)** · FR: FR-1, FR-2, FR-3, FR-4 · Depends: T001
      Done when: the standard adapter check passes for each adapter, and with no key each source is reported disabled. `francetravail` cadence is 1 h, a seventh of its listings per pass. (`adzuna`: see the spec's open question.)
- [ ] **T003 — Move any other keyed legacy source found while porting into this feature** · FR: FR-1, FR-2 · Depends: T001
      Done when: every adapter that turned out to need a key is on the `credentialed` family and covered by the disabled-without-key test (or the task is closed with "none found"). Found so far: `nav` (Norway's NAV feed, `NAV_TOKEN`, a free token by e-mail; cadence 1 h, its terms retire inactive ads at once), moved from public-feeds T003 on 2026-11-16.
- [ ] **T004 — Close credentialed-sources** · FR: FR-1 to FR-4 · Depends: T002, T003
      Done when: status shows every credentialed source as disabled when no key is set; the CI command is green; `.env.example` is complete; `features/README.md` marks this feature done.
