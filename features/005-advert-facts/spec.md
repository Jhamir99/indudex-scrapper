# Spec: Advert facts

Status: outline. Context, scope and legacy references only; the requirements are written with `/spec` before planning.

## Context and goal

The visitor's browser applies the profile's rules (work mode, contract, years of experience, degrees, languages) without the advert's text, which is never published. So the processor reads those facts from the text once and publishes them as fields.

**Goal:** read from each advert the facts the filters and the matching rules need, leaning to reading less: a demand read where there is none leaves a good offer out.

## Scope (from the legacy)

- Work mode (on site, hybrid, remote).
- Contract type and working time.
- Years of experience asked (the largest named, read one sentence at a time).
- Degree families the advert demands and languages it requires (a "plus" does not count; only a demand does), by Argus's rules.
- Title tidying: all-caps titles to sentence case.

## Depends on

- `catalogues` (degrees, languages), the matching rules (Argus copy, see `AGENTS.md`).

## Legacy reference

- `builder/work-mode.mjs`, `builder/contract.mjs`, `builder/years.mjs`, `builder/screens.mjs`, `builder/normalise.mjs`, `builder/lib/sentence-case.ts`, `docs/research/{contract-type,degree-words,languages-asked,title-case}.md`.

## Open questions

- [NEEDS CLARIFICATION] Split into smaller features (e.g. `requirements` for years, degrees and languages) once the requirements are written.
