# Plan: Legacy resync

Implements `spec.md` (FR-1 to FR-4). Status: approved (2026-11-26).

## Method

1. **Inventory (FR-1).** For each of our modules, its legacy source at `b0cd182` and at the target; `git diff` of the
   two (renames followed, the `.mjs`→`.ts` move ignored), read for behaviour; the legacy's commit messages of each
   change give its why.
2. **Test-first, by area (FR-2).** The legacy's test files of the area at the target commit carried into `test/legacy/`
   (its harness, imports pointed here, as 011 did); run against our code; each failure is a change to port. Port it as
   the earlier features did: tables and patterns extracted by script, never retyped; the legacy's comments carried.
3. **Golden sets (FR-3).** Made again in the scratchpad with the legacy's modules at the target commit (its packages
   linked, argus v1.11.0 there already), over the same inputs as before.
4. **Over the store (FR-4).** The comparison scripts of 004–011, run again with the target's modules on the store copy.

## Order of the areas

Shared words and sentences first (every reader uses them), then the readers that use them (advert facts, pay), the
gate and the catalogues, places, companies and dedupe, the publication, title translation, and last the scrapper's
side (crawl-core, the public feeds' adapters, the text helpers).

## Decisions

- **Out of order, before 016** (operator, 2026-11-26). Why: 016 reuses the readers this brings up to date.
- **The target is the legacy's main when each area starts**, recorded per area; the legacy keeps moving.
