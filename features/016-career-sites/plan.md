# Plan: Career sites and ATS platforms

Implements `spec.md` (FR-1 to FR-7) on top of `features/001-crawl-core/plan.md`. Status: approved as part of plan 001 (wave 5); split on 2026-11-15. Nothing here is implemented yet.

## 1. Layout

```
src/features/career-sites/
  family.ts              # sitemap discovery honouring robots.txt, page cap, barren cadence
  job-posting.ts         # schema.org JobPosting extraction (JSON-LD, microdata), pure
  platforms/<id>/        # one adapter per ATS platform (hrmanager, join, manatal, ...)
config/careers.yml       # employers' careers sites (data)
config/companies.yml     # employers' boards on ATS platforms (data)
test/fixtures/<id>/
```

The `JobPosting` extraction may move to `src/shared/` if `source-discovery` needs it too (the hunter reads the same blocks).

## 2. Adapter task

Same as `features/002-public-feeds/plan.md` section 2, with platform adapters under `src/features/career-sites/platforms/<id>/`. Employers are entries in the lists, never one module each.
