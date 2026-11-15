# Spec: Publication

Status: outline. Context, scope and legacy references only; the requirements are written with `/spec` before planning.

## Context and goal

The browser downloads only the parts of the pile a profile names and filters them locally. The API serves what the processor publishes, read-only, under versioned paths with immutable caching.

**Goal:** run the processor's steps over the store and write a whole versioned dataset (`published/<version>/`), then move the `current` pointer, unless the build looks wrong.

## Scope (from the legacy)

- The processor's entry: normalise and enrich (`places`, `pay`, `advert-facts`, `companies`), `gate`, `dedupe`, apply title translations.
- Shards by locale, occupation family and country (split when too big), an index (what exists, size, source, licence), a word index, occupation counts per family, the newest offers, the latest offers for each language's first page, company directory and cards, exported catalogues, metadata (build time, counts, sources and licences).
- Incremental builds.
- Shrink guard: a pile a third smaller than in the last days (overall, or for a country) does not move the pointer.
- The published files declared as Zod schemas; a format version bump on breaking changes.

## Depends on

- Every processor feature.

## Legacy reference

- `builder/build-pile.mjs`, `builder/shard.mjs`, `builder/word-index.mjs`, `builder/latest.mjs`, `builder/pile-cache.mjs`, `builder/lib/shrink-guard.ts`, `packages/published-data/` (the old contract), `docs/research/{incremental-publication,pile-memory}.md`.

## Open questions

- [NEEDS CLARIFICATION] Shards per locale (adverts come already translated) or one shard with every locale's title, as the legacy did.
