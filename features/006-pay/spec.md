# Spec: Pay

Status: outline. Context, scope and legacy references only; the requirements are written with `/spec` before planning.

## Context and goal

Visitors can filter by pay, but only pay the advert actually states may be shown: never an estimate.

**Goal:** read the pay an advert states (from the source's fields or its text), with its period and currency, and convert it with the ECB's reference rates so adverts can be compared.

## Scope (from the legacy)

- Pay from structured fields (e.g. `JobPosting.baseSalary`) and from the text.
- Period (hour, month, year) and currency.
- ECB exchange rates, fetched by the processor's own run, never per advert.

## Depends on

- `crawl-core` (stored adverts with their capped description).

## Legacy reference

- `builder/pay.mjs`, `builder/text-pay.mjs`, `builder/exchange-rates.mjs`, `docs/research/salary.md`.

## Open questions

- [NEEDS CLARIFICATION] The processor reads only the store, never the network (`AGENTS.md`). Where the ECB rates are fetched: a small step of the scrapper, or a catalogue refreshed separately.
