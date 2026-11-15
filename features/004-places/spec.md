# Spec: Places

Status: outline. Context, scope and legacy references only; the requirements are written with `/spec` before planning.

## Context and goal

A visitor filters by country, region, or a town and a radius. Sources write places in many ways («Aix en Provence», «Baerum», a postcode, a region only). Job sites locate each advert before anyone searches.

**Goal:** give every advert its country, town (with coordinates) and region, from what the source wrote, in the processor.

## Scope (from the legacy)

- Country from the location or the source.
- Town looked up by any of its names within the advert's country (GeoNames); with two towns of one name, the one in the region the advert names, else the bigger.
- Spelling variants: hyphens, apostrophes, dots, folded letters, postal towns.
- NUTS region of the town.

## Depends on

- `catalogues` (GeoNames towns, NUTS, countries).

## Legacy reference

- `builder/towns.mjs`, `builder/lib/place-names.ts`, `builder/tools/{advert-towns,postal-towns,county-towns,declared-country}.mjs`, `docs/research/advert-places.md`, `docs/research/locations.md`.

## Open questions

- None yet.
