# MEMORY

Working memory of indudex-scrapper. Rules for keeping it: see "Memory" in `AGENTS.md`. Last updated: 2026-11-15.

## Current state

**Built**

- Hono 4 starter on Node (to move to `indudex-api`) (`src/app.ts`, entry `src/index.ts`, port `PORT` or 4000) as an `OpenAPIHono`; CORS limited to `GET` and the origins in `CORS_ORIGIN`.
- Starter routes: `GET /health` and `GET /openapi.json`.
- Shared Zod schemas (T002): `src/shared/schemas/advert.ts` (`Advert`, `Attribution`, `advertId`, `DESCRIPTION_LIMIT`) and `source.ts` (`SourceId`, `Licence`, `SourceKind`, `SourceDefinition`, `SourceState`).
- Crawl-core ports (T003): `src/features/crawl-core/ports.ts` (`SourceAdapter`, `AdvertDraft`, `AdapterContext`, `HttpClient`, `AdvertStore`, `Clock`, `StopSwitch`) and their fakes in `test/fakes/` (`FakeClock`, `FakeStopSwitch`, `InMemoryAdvertStore`, `FakeHttpClient`, `FakeSourceAdapter` with `fakeDefinition`/`fakeDraft`).
- Scheduling rules (T004): `src/features/crawl-core/domain/schedule.ts` (`isDue`, `afterSuccess`, `afterFailure`, `waitAfterSuccessHours`, `ScheduleRules`), pure.
- Tooling: Vitest (`src/app.test.ts`), oxlint, Prettier, husky + lint-staged, GitHub Actions CI, Dependabot, Dockerfile and `docker-compose.yml` (API + web), licence, README.

**Not built yet**

- Everything: scrapper (crawler, adapters, schemas, storage), processor (normalise, gate, dedupe, title translation, published dataset), catalogues, entry points. The API lives in its own future repo.

**Pending (later)**

- Move the matching rules (legacy Argus title rules) into a versioned shared package (`indudex-matching`, installed by git tag in the processor and the web, compiled JS + `.d.ts` so TS 5.9 and 7 both read it), replacing the copies.

**Next**

- Continue with T005 of `features/001-crawl-core/tasks.md` (T001-T004 done), then follow the numbered order of `features/README.md` (002 public feeds, 003-011 processor, 012 operations, 013-017 the rest of the sources and discovery).
- Open questions to answer before porting them: `netempregos`/`ttvic` (terms), Adzuna (switched off by the legacy on 2026-11-15), and the `[NEEDS CLARIFICATION]` items of the outline specs.
- Still proposed, not approved (decide in their own tasks; check versions and TS 7 then): `undici` (T011, Agent with connection cap, `retry`/`dns` interceptors, `MockAgent` for offline tests), `p-queue` (T013, pacing per host/server/group; hrmanager's 8 calls an hour as `intervalCap`), `robots-parser` (T012), later `entities`, `tldts`, `write-file-atomic`, `pino`, `proper-lockfile`. Stays ours: pacing by server and provider, the new-connection brake, 429 holds per server, wall detection, `JobPosting` mapping and `repairJson`, the store. No library for windows-1252 (`TextDecoder`), CLI args (`util.parseArgs`) or time zones (`Intl`).

## Decisions

- 2026-11-11: split into three components. This repo is now `indudex-scrapper` (was `indudex-api`): collects adverts and stores JSON (DB maybe later). `indudex-api` will be a new repo that reads that storage and serves `indudex-web`. The stored JSON, validated by Zod schemas, is the contract between them. Why: the scrapper is a scheduled process, not a server, and the API should not own crawling. The Hono starter here is a leftover to move to `indudex-api`.
- 2026-11-11: four components in three repos (diagram in `AGENTS.md`). Scrapper and processor are separate batch processes in this repo, talking only through files: store → processor → versioned published dataset + `current` pointer → read-only API → web. Why: collecting is slow and network-bound, preparing is CPU-only and repeatable, and the API should stay thin. Same repo because they share schemas, catalogues and storage. The processor owns the catalogues and translates titles only, on our own server. Advert text is never published or translated (as in the legacy). Cron on the host for now. Shards: served by the API under versioned paths with immutable caching, Cloudflare in front (hybrid; why: one domain for the web, the CDN takes the load off the home server). Matching rules: a copy in each repo for now (why: no extra repo before the gate exists).

- 2026-11-15: work organised by feature, like Session Recorder: `features/<feature>/{spec,plan,tasks}.md` with `features/README.md` as the index (folders `NNN-<feature>`, numbered in build order; the code folders have no number), and feature-first code in `src/features/<feature>/` with `src/shared/` for what two or more features use. The legacy was split into 17 features (7 scrapper, 10 processor); spec 001 became `crawl-core` plus the four source features (one per old wave). Why: smaller specs that can be closed one by one, and code grouped by what it does. Order: a first published pile from the core and the public feeds through the whole processor before the remaining sources, so the API and the web get real data early.
- Spec 001 (now `features/001-crawl-core/` and the four source features) is drafted, not approved: all legacy sources by waves, failures isolated with previous adverts kept, scraper stops at validated stored adverts, sources without credentials ported but disabled. Adverts without an expiry date last 2 years (from posted date, else first-seen date); broken legacy sources are ported disabled and flagged. Waves are by source type; cadence, rate limits and backoff start from the legacy `crawl.yml` values, configurable per source. Open questions were added on 2026-11-15 in `public-feeds` and `credentialed-sources`.
- Tests use Vitest; the `node --test` line in the constitution was a copy-paste slip and was removed.
- Plan 001 (now split across the same five features) approved: ports and adapters (MVVM rejected: no view in a backend), YAML config validated with Zod, parsing libraries instead of hand-written extraction, stop switch as a file flag, career sites as data lists, hourly external cron.
- 2026-11-15: Crawlee rejected as the scraper's framework. Why: it covers only retries, timeouts and `robots.txt`; no cadence, backoff or parking between runs, no pacing by server or provider, and its `Dataset` does not fit the atomic per-source store. It also takes the run loop away from our runner, is hard to fake in offline tests, and imitates browsers by default, against polite crawling. Reconsider `PlaywrightCrawler` only for JS-only sites in `career-sites` (wave 5).
- 2026-11-15 (T001): parsing libraries `yaml` (config files; no dependencies), `cheerio` (HTML pages and JSON-LD `JobPosting` of careers sites) and `fast-xml-parser` (feeds and sitemaps as plain objects, CDATA included). Why: they replace the legacy's regex XML/HTML parsing; two parsers instead of the plan's one because picking feed fields from plain objects is simpler than walking a DOM. None depends on `typescript` (still one copy, 7.0.2).
- 2026-11-15 (T002): schema choices. Advert and state objects are strict (an unknown key such as a contact e-mail is rejected). `credit: null` is the explicit "none required" of FR-2. `advertId` = `<source>-` + 16 hex of sha256(source, sourceId), stable across runs and locales. `SourceState` is a union on `status`; every status but `enabled` needs a `reason`, `parked` also `parkedUntil`. The source kinds are `feed`, `careers`, `portal` (legacy `board`) and `via`. Left for later: `firstSeen` (store, T010).
- 2026-11-15 (T003): adapters yield an `AdvertDraft` (no `id`, no `attribution`); the runner adds both from the definition and validates (FR-12). `HttpClient.request` resolves only on success and rejects with a typed failure (types come in T011). `Clock` has `sleep` so pacing is testable with the fake clock. The legacy `ctx.previous` (earlier adverts for incremental reads) is left out until a source feature needs it.
- 2026-11-15 (T004): scheduling follows the legacy `waitMs`/`nextPass`. Due = `nextDueAt` reached (never run = due). Each unchanged pass waits ×1.5 up to `unchangedMaxHours`, only for cadences of a day or more; a change resets it (`unchangedPasses` added to `SourceState`, default 0). Failures wait 24/72/168 h (last value repeats); the 6th parks for 720 h (`nextDueAt` = `parkedUntil`). A failure keeps the last advert count. No random spread (the legacy's `spread`/jitter): deterministic until bursts of sources failing together show it is needed.
- Linter is oxlint, not ESLint: typescript-eslint does not support TypeScript 7.
- Routes use `createRoute` + `app.openapi(...)`; plain `app.get` is invisible to the frontend's generated client.
- Package manager is pnpm only; `npm install` would create a stray `package-lock.json`.

## Mistakes to avoid

- Never bypass the pre-commit hook with `--no-verify`.
- `tsx` and Vitest do not type-check: run `pnpm typecheck` to verify a change.
