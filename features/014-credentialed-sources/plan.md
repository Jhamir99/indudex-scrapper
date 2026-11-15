# Plan: Credentialed sources

Implements `spec.md` (FR-1 to FR-4) on top of `features/001-crawl-core/plan.md`. Status: approved as part of plan 001 (wave 3); split on 2026-11-15. Nothing here is implemented yet.

## 1. Layout

```
src/features/credentialed-sources/
  family.ts              # key check, disabled reporting, then the same reading as a feed
  adapters/<id>/         # adapter + fixture-based test
test/fixtures/<id>/      # responses built from the provider's documentation
```

The key check reuses `crawl-core`'s credentials handling (its T016); the family only declares which variables each source needs.

## 2. Adapter task

Same as `features/002-public-feeds/plan.md` section 2, with fixtures built from the provider's documented response and adapters under `src/features/credentialed-sources/adapters/<id>/`.
