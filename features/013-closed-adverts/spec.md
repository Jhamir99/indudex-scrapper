# Spec: Closed adverts

Status: outline. Context, scope and legacy references only; the requirements are written with `/spec` before planning.

## Context and goal

Some sites keep an advert online after the job is filled and only say so on the page ("This vacancy is no longer available", «Deze vacature is niet meer actief») or in the title («– bereits besetzt»). Google asks that a filled job be removed before its end date. The product rule "expired adverts are hidden" needs these too.

**Goal:** detect adverts whose own page or title says they are closed, so they are not published.

## Scope (from the legacy)

- Closed notices in many languages, read near the top of the text, folded (no accents, lower case).
- Closed notices in the title.
- A register of closed adverts so they are not read back in.

## Depends on

- `crawl-core` (stored adverts with their capped description).

## Legacy reference

- `builder/closed.mjs`, `builder/tools/closed-register.mjs`, `docs/research/closed-offers.md`.

## Open questions

- [NEEDS CLARIFICATION] Where it runs: the scrapper (when storing) or the processor (when reading the store). `AGENTS.md` lists "closed-advert detection" in the scrapper and "closed notices" among what the processor reads from the description.
