# Plan: Crawl core

Implements `spec.md` (FR-1 to FR-12). Status: approved, decisions confirmed (as plan 001). Amended on 2026-11-15: split into this feature and the four source features, and the layout moved to feature-first (section 4). Nothing here is implemented yet.

## 1. Constitution and spec check

- The spec rules: every item below maps to an FR; anything not in the spec is listed in "Decisions".
- Tests as a gate: Vitest, offline, run with `pnpm test:run`; no feature is closed with a red test.

## 2. What the legacy project does (reference, not code to copy)

- Each source is one module that exports its `id`, its `kind` (feed, careers, portal…), its `licence` (name, short name, url, licence text, credit line, whether it needs a key) and `fetchAll(ctx)`, an async generator that yields adverts. Parsing is split into pure functions that tests feed with saved responses.
- An advert carries: source, source id, title, company, location, country, city, remote flag and mode, url, description (length-capped), posted and expiry dates, occupation codes and language.
- Shared pieces live next to the sources (HTTP with pacing, `robots.txt`, entity decoding, page text cleanup), but each adapter still repeats its own XML/JSON picking, date parsing, "robots check then fetch then throw if empty" sequence and field mapping.
- The scheduler (`crawl.mjs`) decides which sources are due, with cadences, backoff, parking and budgets from `crawl.yml`, and pacing per server and per hosting provider.
- Person data in feeds (a named contact with an e-mail) is dropped on purpose.

## 3. Architecture: ports and adapters

Dependencies point inward only: infrastructure → application → domain. The domain imports nothing from the other layers, and nothing outside `shared/storage/` touches files.

| Layer          | Holds                                                                                                                                      | Knows about      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| Domain         | Advert, source definition, source state, the rules of "is due", backoff and parking (pure functions)                                       | nothing else     |
| Ports          | `SourceAdapter` (what a source must offer), `AdvertStore` (save, read, drop adverts and source state), `HttpClient`, `Clock`, `StopSwitch` | domain           |
| Application    | The runner: pick due sources, pace and budget requests, call adapters, validate, store, isolate failures, record status                    | domain, ports    |
| Infrastructure | Source adapters (in the source features), the polite HTTP client, file storage, config loading, the entry point                            | everything above |

The runner never knows a source's site; an adapter never decides when it runs or how fast. That is what removes the repetition (FR-12).

## 4. Layout (feature-first)

```
src/
  shared/                  # used by two or more features (the processor included)
    schemas/
      advert.ts            # Zod: the common advert (FR-1), licence and credit (FR-2)
      source.ts            # Zod: source definition, state (FR-10)
    storage/               # the only module that touches files: AdvertStore implementation
    http/                  # polite client: robots, per-host/server/provider pacing, retries, timeouts, error budget
    kit/                   # text cleanup, date parsing, feed/XML/JSON picking
  features/
    crawl-core/
      domain/              # due, backoff and parking rules, pure
      ports.ts             # SourceAdapter, HttpClient, Clock, StopSwitch
      runner.ts            # application: one run over the due sources
      run.ts               # process entry: wires everything and calls the runner
      status.ts            # prints the status of every source (FR-10)
      registry.ts          # the list of registered adapters, filled by the source features
    public-feeds/          # family + adapters/<id>/ (see that feature's plan)
    credentialed-sources/
    job-portals/
    career-sites/
config/                    # sources, cadences, limits, takedowns (data, not code)
test/
  fakes/                   # in-memory fakes of the ports
  fixtures/<source>/       # saved responses
```

Rules: a feature imports from `shared/` and from `features/001-crawl-core/ports.ts`, never from another feature's internals. Code moves to `shared/` only when a second feature needs it.

## 5. Contracts

**SourceAdapter** (port). Each source provides: an id; its kind; its licence data (name, short name, url, licence text, credit line); whether it needs credentials and which; and a way to produce adverts from its site through the injected `HttpClient`. Parsing is a pure function from a saved response to raw adverts, so tests need no network.

**Advert** (Zod, the single source of truth): source id, stable advert id derived from source and source-specific id, title, company, location, country, city, remote flag and mode, url, description (length-capped), posted date, expiry date (optional; when absent, 2 years after posted date applies), occupation codes, original language, and the licence and credit of its source. No person data. The schemas and the stored JSON layout are the contract with the processor and the future `indudex-api` (completion criteria); there is no OpenAPI here.

**Source state**: enabled, disabled (missing credentials or flagged as broken), failed (with reason), disallowed (by `robots.txt`), parked (until a date); time of last run; adverts obtained; consecutive failures; next due time.

**Run result**: per source, the outcome, the counts, the rejected adverts with their reasons.

## 6. Behaviour of the runner

- **Due selection (FR-6):** a source is due when its last pass is older than its cadence; unchanged sources wait longer, up to a limit, and go back to normal when they change. Cadence per source starts from the legacy `crawl.yml` values.
- **Politeness (FR-5):** `robots.txt` is checked before the first request to a host and cached; pacing per host, per server and per hosting provider; caps on simultaneous and new connections; a small budget of error answers per server in a time window. Defaults and per-source overrides come from `config/`.
- **Failure isolation (FR-3, FR-4):** every source runs inside its own failure boundary; a failure records the reason, schedules the next try with growing waits and parks the source after repeated failures. Stored adverts are only replaced after a source finished a valid read, so a failed or empty read never deletes anything.
- **Validation (FR-1):** every raw advert is parsed with the Zod schema; invalid ones are counted with a reason and not stored.
- **Stop switch (FR-7):** checked between requests and between sources; activating it stops new work and leaves stored data untouched (file flag, see section 10).
- **Takedowns (FR-8):** loaded from `config/`; applied when collecting and when keeping, so a takedown also removes what is already stored on the next run.
- **Credentials (FR-9):** read from environment variables only; a source with missing keys is disabled and reported; keys are listed in `.env.example` and never logged.
- **Status (FR-10):** a command prints state, last run and counts for every source.
- **Boundary (FR-11):** the runner ends at "validated adverts stored"; no gate, dedupe, translation or publication.

## 7. Storage

Behind `AdvertStore`: adverts and source state kept as files, one set per source, written atomically (write to a temporary file, then rename). An advert without an expiry date expires 2 years after its posted date (first-seen date if there is no posted date); the store drops expired adverts when it saves a source's set, never on a failed or empty read, and it removes a source's adverts by takedown. A database can replace the implementation later without touching the runner.

## 8. Order of the source features

This feature is the old wave 1 without its reference feed. The sources follow as their own features, in the build order of `features/README.md`:

- `002-public-feeds` (starts with the `public-feed` family and `brz` as the reference source, the old T025-T026), right after this feature.
- `014-credentialed-sources`, `015-job-portals` and `016-career-sites`, after the processor (003-011), operations (012) and closed adverts (013), so a first pile is published from the public feeds before the rest.

The core is verified with fake adapters, so it can be closed before any real source exists.

## 9. Test strategy

- One shared contract test that every registered adapter must pass: valid licence data, valid adverts, no person data. It runs over the registry, so each source feature is covered as soon as it registers an adapter.
- Runner tests with a fake clock and a fake `HttpClient`: due selection, backoff and parking, failure isolation, keeping previous adverts, stop switch, takedowns, disabled sources, `robots.txt`, pacing.
- Storage tests on a temporary folder: atomic writes and replacement rules.
- No test touches the network.

## 10. Decisions (confirmed)

- **Config format:** YAML for the lists ported from the legacy repo (source lists, cadences, limits, takedowns), validated with Zod on load. Library: `yaml` (T001).
- **Parsing approach:** well-known parsing libraries instead of hand-written extraction, to avoid the repetition of the legacy adapters: `cheerio` for HTML (and JSON-LD inside it), `fast-xml-parser` for XML feeds and sitemaps (T001, 2026-11-15: two instead of one, because feed fields are simpler to pick from plain objects than from a DOM).
- **Stop switch:** a file flag next to the stored state, so it works across processes without a restart.
- **Entry points:** `pnpm crawl` (a run), `pnpm crawl:status`, and a way to run a single source for debugging.
- **Scheduling:** same as the legacy: the process is started every hour by an external scheduler (host cron) and decides what is due.
- **Career sites:** the thousands of employers' sites are ported as data (lists), not as one module per employer.
- **Layout (2026-11-15):** feature-first, with `src/shared/` for what two or more features use (section 4).

## 11. Documentation updates when implemented

- `AGENTS.md`: nothing permanent changes except, if approved, a short rule that adapters only fetch and parse and that all shared behaviour lives in the runner and `shared/`.
- `CLAUDE.md`: new commands (`crawl`, `crawl:status`), the real layout and the new dependencies.
- `MEMORY.md`: state, the decisions of section 10 with their why, mistakes found.
- `.env.example`: one entry per credentialed source.
