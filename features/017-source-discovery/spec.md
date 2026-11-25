# Spec: Source discovery

Status: outline. Context, scope and legacy references only; the requirements are written with `/spec` before planning.

## Context and goal

The legacy finds sources by the thousand instead of by name: scouts read public indexes of the web for ATS boards and `JobPosting` markup, and a hunter finds one company's careers pages from its home page. What they find becomes data for `career-sites`.

**Goal:** separate CLI tools that find new employers' careers sites and ATS boards and write them to lists the scrapper reads, never touching the store.

## Scope (from the legacy)

- Scout over Common Crawl's index for addresses on known ATS hosts; probe each board's public API and keep those with adverts the gate keeps in Europe.
- Scout over Web Data Commons' `JobPosting` extraction for employers with adverts in Europe.
- Slow walk of a domain list (robots.txt, sitemaps, a few pages).
- Hunter: one company's domain → its careers pages, the platform behind them and its adverts, with no API key; `--write` adds what it found to a list.
- Domain lists from Wikidata and other open registers.
- Weekly run inside the daily jobs.

## Depends on

- `crawl-core` (polite HTTP client), `career-sites` (the lists it writes and the `JobPosting` extraction), `gate` (to keep only boards with in-scope adverts in Europe).

## Legacy reference

- `builder/tools/{scout,scout-wdc,scout-careers,hunt,discover,domains-wdc,domains-wikidata,platforms,providers}.mjs`, `builder/config/*-found.yml`, `builder/config/hunted.yml`, `ops/server-discover.sh`.
- `docs/CERRADAS.md` and `builder/tools/closed-register.ts` (with `test/closed-register.test.mjs`): the register of sources we do not read and exactly why (terms, robots.txt, walls), each row with its quotation, address and day; moved here from 013 on 2026-11-25 (it lists sources, not adverts).

## Open questions

- [NEEDS CLARIFICATION] Which tools to port first, and whether the scouts' bulk downloads (Common Crawl, Web Data Commons) run on the home server as in the legacy.
