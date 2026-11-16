# Plan: Public feeds

Implements `spec.md` (FR-1 to FR-5) on top of `features/001-crawl-core/plan.md` (architecture, contracts, runner, storage, decisions). Status: approved as part of plan 001 (wave 2, plus the reference feed of wave 1); split on 2026-11-15. T001-T003 implemented; amended on 2026-11-16 (section 5, tasks T019-T022).

## 1. Layout

```
src/features/public-feeds/
  family.ts              # the public-feed family: robots check, fetch, empty-feed failure, field mapping (FR-2)
  adapters/<id>/         # one folder per feed: its adapter and its fixture-based test
test/fixtures/<id>/      # saved responses
config/crawl.yml         # per-source cadence and pace entries (FR-4)
```

Each adapter registers itself in `src/features/crawl-core/registry.ts`.

## 2. Adapter task

Porting one legacy source means: read its legacy module for behaviour, save real responses under `test/fixtures/<id>/`, write the adapter under `src/features/public-feeds/adapters/<id>/` on the family, and register it with its cadence in `config/`.

The **standard adapter check** is: (A) `pnpm vitest run src/features/public-feeds/adapters/<id>` passes: the fixture parses into valid adverts and an empty or changed response is reported as a failure; (B) the shared contract test passes with it registered; (C) `pnpm lint && pnpm typecheck` is clean.

## 3. Batches

The batches are grouped by region as a starting point. When reading the legacy modules, regroup them by response format (XML, JSON, paged HTML) and move any source that needs a key to `credentialed-sources` or is a portal to `job-portals`.

## 4. Per-source values (from the legacy `crawl.yml`)

NAV 1 h (its terms retire inactive ads at once); Jobindex 1 h (only each category's first page is allowed); `bund` 6 h with 30 s between pages (its robots.txt); `hungary` 2 h, one category a pass; the rest between 6 and 24 h as in the legacy file.

## 5. Amendment 2026-11-16 (operator's answers)

- **Two forms of the family (T001-T003, done).** A feed is `pages` + `parse` (with `skipFailedPages`) or `read(context)` for feeds whose reading depends on their answers; both share one draft per source id, `keepUnlisted` and the empty-feed failure. The adapter context carries the stored adverts (`previous`) and the run's day (`today`).
- **Per-host pace (FR-4, T019).** `crawl.yml` gains `pace.hosts`: a host's own gap between requests, overriding `pace.perHost` for that host (Kuntarekry and Valtiolle 500 ms, as the legacy). The per-server and per-provider lanes still apply. Lives in crawl-core's config and `PacedClient`.
- **`JobPosting` mapping (T020).** `src/shared/kit/job-posting.ts`: the schema.org `JobPosting` blocks of a page (JSON-LD, read with cheerio, lenient on broken JSON as the legacy `repairJson`), as plain fields: title, description, posted, valid through, employment type, employer, locality, region, country. In `shared/` because `career-sites` will use it too.
- **Disabled and flagged (FR-6, T021).** `SourceDefinition` gains `disabledReason` (optional): a source with one is recorded as disabled with `flagged: <reason>` and makes no request, like a missing key. Removing the field enables it.
- **SSYK groups (FR-7, T022).** `config/ssyk-groups.yml`: the SSYK-2012 occupation groups `jobtech` asks for, generated once from the legacy catalogue (`catalogues/codes/ssyk-isco.json`, JobTech's SSYK→ISCO-08 correspondence) and the legacy gate's scope, with a header naming source, licence and date. Loaded with `loadConfig` and handed to the adapter at registration.
- **ISCO units (FR-7, with T005).** `config/isco-units.yml`: the 71 ISCO-08 unit groups of the legacy `families.json` (trades marked optional), for `mpsv` (filters the national file) and `cyprus` (one search per unit group). Loaded by `src/features/public-feeds/isco-units.ts`. `loadConfig` moved to `src/shared/config/` so source features can load their own config files.
- **Own pages without the gate (T005).** `infopraca`'s list has no text; the legacy read the own page only of offers its gate took (up to 1,500 a pass). The gate does not exist here yet, so every new offer's page is read, at most 300 a pass, once, through the family's `withDetailPages` (also used by the Kuntarekry platform). Revisit when the gate (007) exists.
