# Plan: Public feeds

Implements `spec.md` (FR-1 to FR-5) on top of `features/001-crawl-core/plan.md` (architecture, contracts, runner, storage, decisions). Status: approved as part of plan 001 (wave 2, plus the reference feed of wave 1); split on 2026-11-15. Nothing here is implemented yet.

## 1. Layout

```
src/features/public-feeds/
  family.ts              # the public-feed family: robots check, fetch, empty-feed failure, field mapping (FR-2)
  adapters/<id>/         # one folder per feed: its adapter and its fixture-based test
test/fixtures/<id>/      # saved responses
config/crawl.yml         # per-source cadence and pace entries (FR-4)
```

Each adapter registers itself in `src/features/crawl-core/registry.ts`.

## 2. Adapter task

Porting one legacy source means: read its legacy module for behaviour, save real responses under `test/fixtures/<id>/`, write the adapter under `src/features/public-feeds/adapters/<id>/` on the family, and register it with its cadence in `config/`.

The **standard adapter check** is: (A) `pnpm vitest run src/features/public-feeds/adapters/<id>` passes: the fixture parses into valid adverts and an empty or changed response is reported as a failure; (B) the shared contract test passes with it registered; (C) `pnpm lint && pnpm typecheck` is clean.

## 3. Batches

The batches are grouped by region as a starting point. When reading the legacy modules, regroup them by response format (XML, JSON, paged HTML) and move any source that needs a key to `credentialed-sources` or is a portal to `job-portals`.

## 4. Per-source values (from the legacy `crawl.yml`)

NAV 1 h (its terms retire inactive ads at once); Jobindex 1 h (only each category's first page is allowed); `bund` 6 h with 30 s between pages (its robots.txt); `hungary` 2 h, one category a pass; the rest between 6 and 24 h as in the legacy file.
