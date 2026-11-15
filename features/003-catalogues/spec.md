# Spec: Catalogues

Status: outline. Context, scope and legacy references only; the requirements are written with `/spec` before planning.

## Context and goal

Matching and filtering need reference data: occupation families (ISCO-08 unit groups by minor group) with their ESCO occupations and job titles, countries, towns, regions, languages, degrees and vetoes, each named in the site's languages. The processor owns them and publishes a copy that the API serves.

**Goal:** build, version and publish the catalogues from their open sources, each file crediting its source and licence.

## Scope (from the legacy)

- Occupation families and their ESCO occupations, activities and seniority; ESCO job titles per group in 23 languages.
- JobTech's SSYK → ISCO-08 correspondence.
- Countries (Wikidata), towns (GeoNames), NUTS regions, languages, degrees, vetoes.
- The Public Suffix List (if not replaced by a library, see `MEMORY.md`).
- Tools that rebuild each catalogue from its source.

## Depends on

- Nothing. `gate`, `places`, `advert-facts` and `publication` depend on it.

## Legacy reference

- `catalogues/`, `catalogues/codes/`, `builder/isco-esco.mjs`, `builder/tools/{places,nuts,occupations,make-families}.mjs`.

## Open questions

- [NEEDS CLARIFICATION] Which of the legacy's six site languages the catalogues keep names for (the new web has `en`, `es`, `ca`).
