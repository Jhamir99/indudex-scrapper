# Tasks: Career sites and ATS platforms

Generated from `spec.md` and `plan.md` (2026-11-27). Each task ends with the CI's checks green and a commit.

**Depends:** 015 job-portals and 018 legacy-resync closed.

## Tasks

- [x] **T001 — The lists as data** · FR-1 · Depends: —
      Done when: the six legacy lists are in `config/` with a header crediting the legacy, loaded and validated
      synchronously; the counts per list match the legacy's, entries in two lists read once (the hand-kept first),
      paused entries shown paused; a test checks the counts.
- [ ] **T002 — The board platforms** · FR-3, FR-4 · Depends: T001
      Done when: `boards.ts` and Argus's parsers are copied, each platform's saved answer gives the legacy's adverts,
      SmartRecruiters and JOIN listed and switched off with their reason, the vendors' switches read from
      `vendors.yml`.
- [ ] **T003 — The careers reader** · FR-2, FR-4, FR-5, FR-9 · Depends: T001
      Done when: `careers.ts` and the streamed feed items are copied; saved sitemaps, listings, feeds and pages of each
      shape give the legacy's adverts; a barren site's cadence is a week; a vacancy is read again by the reader's
      version rules.
- [ ] **T004 — One source per entry** · FR-1, FR-12 · Depends: T002, T003
      Done when: the registry holds a source for every enabled entry with its kind, group, licence and credit; the
      shared contract test passes for a site, a platform site, a board of each platform and a vendor.
- [ ] **T005 — What the site shows** · FR-8 · Depends: T004
      Done when: the crawl reads the published version in place once a run; a shown vacancy is asked again and one not
      shown is not; with no version everything is asked.
- [ ] **T006 — The legacy's queue** · FR-6 · Depends: T005
      Done when: selection follows the legacy's `due` (worth, one in five for sources that show nothing, never-read
      sources capped a run by group in turn, reading-on last), compared with the legacy's function on the same inputs;
      the run's lanes, minutes and page budgets at the legacy's values in `crawl.yml`.
- [ ] **T007 — Long queues and platform limits** · FR-6, FR-7 · Depends: T006
      Done when: a site with a long queue runs in the queues' lanes at a page a second within its ceilings; a group's
      in-flight limit and sources a run (hrmanager 8 an hour) hold on fakes; a source's deadline is sized by its
      adverts.
- [ ] **T008 — A board's advert with no place** · FR-10 · Depends: T004
      Done when: the processor leaves out a board's advert with no readable place unless its title is marked «(m/w/d)»
      or «(H/F)», with the legacy's cases.
- [ ] **T009 — End to end on fixtures** · FR-11, FR-12 · Depends: T007, T008
      Done when: one run on fakes with a careers site, a platform site, a board of each platform, a vendor, a barren
      site, a failing source, a takedown and the stop switch ends with the expected states and adverts.
- [ ] **T010 — Live pass** · FR-13 · Depends: T009
      Done when: every platform and vendor switched on and about 300 careers sites read live into a temporary store; the
      result per platform and list recorded below.
- [ ] **T011 — Close** · FR-1 to FR-13 · Depends: T010
      Done when: the completion criteria hold; `CLAUDE.md`, `MEMORY.md` and `features/README.md` updated.

## Notes

T001 (2026-11-27). The seven lists the legacy reads (careers.yml, hunted.yml, careers-found.yml, platform-sites.yml,
companies.yml, companies-found.yml, vendors.yml) are in `config/` byte for byte under a credit header, left out of
Prettier. `readCareerLists` gathers them as the legacy's `loadSites` and `loadCompanies` do: 14,961 sites (504 by hand),
11,006 read; 11,273 boards (84 by hand), 10,700 read; 17 sites and 18 boards paused. The legacy's job-board filter
(`isBoardHost`, two more sites out: 11,004) is a parameter until T003 brings the careers reader's helpers. The legacy
also reads lists its server writes on its own (`state/found`, `triaged.yml`): not in its repository, not here.
