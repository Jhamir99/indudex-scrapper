# Tasks: Career sites and ATS platforms

Generated from `spec.md` and `plan.md` (as tasks 001, wave 5). "Standard adapter check": see `features/002-public-feeds/plan.md` section 2.

**Depends:** `job-portals` closed (its T004).

## Tasks

- [ ] **T001 — Family `career-site`: sitemap discovery honouring robots.txt** · FR: FR-2 · Depends: job-portals T004
      Done when: tests pass on a sample sitemap: URLs are discovered, disallowed ones are skipped, and a per-site page cap per pass is respected.
- [ ] **T002 — Career-site extraction of schema.org JobPosting** · FR: FR-3 · Depends: T001
      Done when: fixture pages with one and several JobPosting blocks produce valid adverts; a page without one is counted as barren and the site's cadence becomes the barren one (weekly).
- [ ] **T003 — Import employers' source lists as data** · FR: FR-1 · Depends: T002
      Done when: `config/careers.yml` and `config/companies.yml` load and validate; headers credit the legacy project; a test covers a sample of entries; the number of loaded entries matches the legacy lists.
- [ ] **T004 — Cap on never-read sources per run** · FR: FR-4 · Depends: T003
      Done when: a test with many new sources shows only the configured number are first-read in one run.
- [ ] **T005 — ATS platform groups sharing one host** · FR: FR-5 · Depends: T003
      Done when: tests pass: sources of one platform share the in-flight limit and the per-server gap; a group limit such as eight calls an hour is respected.
- [ ] **T006 — Port ATS platforms: hrmanager, join, manatal** · FR: FR-1, FR-5, FR-7 · Depends: T005
      Done when: the standard adapter check passes for each adapter, and each platform's group limit from `crawl.yml` is applied.
- [ ] **T007 — Port remaining platforms and vendors from the legacy lists** · FR: FR-1 · Depends: T005
      Done when: every platform in the legacy platform and vendor lists has an entry, an adapter or an explicit "disabled and flagged" status, and the list is checked in a test.
- [ ] **T008 — Flag broken legacy sources** · FR: FR-6 · Depends: T003
      Done when: every legacy source that no longer works is registered disabled with the flag shown in `crawl:status`.
- [ ] **T009 — End-to-end run on fixtures** · FR: FR-7 · Depends: T006, T007, T008
      Done when: one integration test runs sources of every family on fakes with a broken source, a takedown and the stop flag, and the run finishes with the expected states and stored adverts.
- [ ] **T010 — Close career-sites and verify the source features** · FR: FR-1 to FR-7 · Depends: T009, T004
      Done when: each completion criterion of this spec is checked (every legacy source present, offline tests green, broken-source run keeps adverts, no credential in the repo by grep); `AGENTS.md` (adapter rule), `CLAUDE.md` (commands, layout, dependencies) and `MEMORY.md` are updated; `features/README.md` marks this feature done.
