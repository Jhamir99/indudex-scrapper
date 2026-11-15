# Spec: Dedupe

Status: outline. Context, scope and legacy references only; the requirements are written with `/spec` before planning.

## Context and goal

The same advert reaches the store more than once: two sources carry it, or a board and a feed both list it.

**Goal:** keep one copy of each advert, preferring the page the employer maintains.

## Scope (from the legacy)

- First by address (without campaign tails, trailing slash or fragment), then by company plus title in the same place.
- A Catalan title compared in Spanish; a company's name without its legal form or country.
- The same job in two towns is two offers, up to a campaign in more than ten towns, kept once per country with every town it names.
- A board's copy beats a feed's copy.

## Depends on

- `places`, `companies` (names and keys), `gate` (runs on gated adverts).

## Legacy reference

- `builder/dedupe.mjs`, the address rule in `builder/normalise.mjs`.

## Open questions

- None yet.
