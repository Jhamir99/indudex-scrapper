# Plan: Job portals

Implements `spec.md` (FR-1 to FR-5) on top of `features/001-crawl-core/plan.md`. Status: approved as part of plan 001 (wave 4); split on 2026-11-15. Nothing here is implemented yet.

## 1. Layout

```
src/features/job-portals/
  family.ts              # many pages per run, backlog, page budget, per-page pacing
  adapters/<id>/         # the board-like sources that need their own code (boards, jobfeed, remote)
config/portals.yml       # the portal list, as data (FR-2)
test/fixtures/<id>/
```

The backlog is part of each portal's source state in `shared/storage/`, so it survives between runs.

## 2. Adapter task

Same as `features/002-public-feeds/plan.md` section 2, with adapters under `src/features/job-portals/adapters/<id>/`.
