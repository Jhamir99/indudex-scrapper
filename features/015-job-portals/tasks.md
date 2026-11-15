# Tasks: Job portals

Generated from `spec.md` and `plan.md` (as tasks 001, wave 4). "Standard adapter check": see `features/002-public-feeds/plan.md` section 2.

**Depends:** `credentialed-sources` closed (its T004).

## Tasks

- [ ] **T001 — Family `portal`: many pages per run, backlog, per-page pacing** · FR: FR-3, FR-4 · Depends: credentialed-sources T004
      Done when: tests pass: a portal with pages left to read is due again in the next run; the page budget per run and per site is respected; pacing is a page a second per host.
- [ ] **T002 — Import the legacy portal list as data** · FR: FR-1, FR-2 · Depends: T001
      Done when: `config/portals.yml` loads and validates; its header credits the legacy project; each entry runs through the family against a fixture in a test.
- [ ] **T003 — Port adapters: boards, jobfeed, remote (classify first)** · FR: FR-1, FR-5 · Depends: T001
      Done when: each legacy file was read and the task notes whether it belongs to this feature or another; the standard adapter check passes for each adapter.
- [ ] **T004 — Close job-portals** · FR: FR-1 to FR-5 · Depends: T002, T003
      Done when: every portal source passes the contract test and the CI command is green; `features/README.md` marks this feature done.
