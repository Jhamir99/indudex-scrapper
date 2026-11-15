# Tasks: Crawl core

Generated from `spec.md` and `plan.md` (as tasks 001, wave 1; split on 2026-11-15: the old T025-T026, the `public-feed` family and the `brz` reference adapter, moved to `features/002-public-feeds/`). Tasks are ordered by dependency, name the functional requirements (FR) they cover and have a verifiable "Done when". Tick the box only when the "Done when" is true. Small steps were merged to keep the list short, so some tasks take 40-60 minutes; split a task if it does not fit in one sitting.

Paths are relative to the repo root; feature code lives in `src/features/crawl-core/`, shared code in `src/shared/` (plan section 4).

## Tasks

- [x] **T001 — Choose and install the YAML and HTML/XML libraries** · FR: — (enabler)
      Done when: the libraries (`yaml`, `cheerio`, `fast-xml-parser`) are named in `MEMORY.md` with the reason for each, you approved them, and `pnpm install && pnpm build` and `pnpm why typescript` (one version) are still green.
- [x] **T002 — Schemas: advert, source definition and source state** · FR: FR-1, FR-2, FR-9, FR-10 · Depends: T001
      Done when: `src/shared/schemas/*.test.ts` pass: a complete advert is accepted; missing title, non-HTTPS url, bad date and missing licence/credit are rejected with a reason; the advert has no field for a contact person or e-mail; a source definition without licence data or credentials flag is rejected; the state accepts enabled, disabled, failed, disallowed and parked with last-run time, advert count, consecutive failures, next-due time and a reason.
- [ ] **T003 — Ports: SourceAdapter, AdvertStore, HttpClient, Clock, StopSwitch** · FR: FR-12 · Depends: T002
      Done when: `src/features/crawl-core/ports.ts` compiles under `pnpm typecheck`, and an in-memory fake of each port exists under `test/fakes/` and type-checks.
- [ ] **T004 — Domain rules: due, unchanged wait, backoff and parking** · FR: FR-3, FR-6 · Depends: T002
      Done when: pure-function tests with a fake clock pass for: never run or older than cadence → due, newer → not due; each unchanged pass lengthens the wait up to the limit and a change resets it; waits of 24, 72 and 168 h after consecutive failures; parked for about a month after 6 failures; a success resets the count.
- [ ] **T005 — Kit: text cleanup, date parsing and XML/JSON picking** · FR: FR-12 · Depends: T001
      Done when: `src/shared/kit/*.test.ts` pass: entities decoded, tags stripped, text capped at the description limit; the legacy date formats (ISO, `dd.mm.yyyy`, with time) parse and invalid input returns nothing; repeated elements and fields are picked from sample XML (with CDATA) and JSON, with missing fields handled.
- [ ] **T006 — Config loader: YAML read and validated with Zod** · FR: FR-5, FR-6 · Depends: T001
      Done when: tests pass: a valid file loads; an unknown key or wrong type fails with the path of the error; no file is read outside `config/`.
- [ ] **T007 — Config: default cadence, backoff and limits from the legacy values** · FR: FR-3, FR-5, FR-6 · Depends: T006
      Done when: `config/crawl.yml` holds the legacy defaults (daily cadence, 24/72/168 h backoff, park after 6, 5 s per server, 3 s per provider, 16 connections, 2 new a second) with a header crediting the legacy project, and a test loads it successfully. Per-source cadences are added by the source features.
- [ ] **T008 — Config: takedowns loader** · FR: FR-8 · Depends: T006
      Done when: tests pass: takedowns for a source, a company and an advert are loaded and matched against sample adverts.
- [ ] **T009 — Storage: atomic file writer** · FR: FR-4
      Done when: `src/shared/storage/atomic.test.ts` passes on a temporary folder: a write either completes or leaves the old file intact (simulated failure between temp write and rename).
- [ ] **T010 — Storage: AdvertStore and source state persistence** · FR: FR-4, FR-10, FR-11 · Depends: T003, T009
      Done when: tests pass: saving replaces that source's set; an empty or failed read leaves it unchanged; other sources are untouched; an advert without expiry date is kept until 2 years after its posted date (first-seen date if none) and then dropped; an advert with an expiry date is dropped after it; a failed or empty read deletes nothing; state is written and read back for several sources; a corrupt file is reported, not silently reset.
- [ ] **T011 — HTTP client: timeout, retries, error classification** · FR: FR-3 · Depends: T003
      Done when: tests with a fake server pass: a slow response times out, a 5xx is retried a limited number of times, a 4xx is not retried, each ends as a typed failure.
- [ ] **T012 — HTTP client: robots.txt check with cache** · FR: FR-5 · Depends: T011
      Done when: tests pass: a disallowed path is never requested and is reported as disallowed; robots.txt is fetched once per host per run.
- [ ] **T013 — HTTP client: per-host, per-server and per-provider pacing** · FR: FR-5 · Depends: T011
      Done when: tests with a fake clock pass: consecutive requests to one host are at least the configured gap apart; different hosts do not wait for each other; hosts on one server share one gap and one request at a time; providers on the configured list are paced together.
- [ ] **T014 — HTTP client: connection caps and error budget** · FR: FR-5 · Depends: T013
      Done when: tests pass: never more than the configured simultaneous and new-per-second connections; a server that answers more 4xx than its budget in the window is asked nothing more until the window passes.
- [ ] **T015 — Stop switch: file flag** · FR: FR-7 · Depends: T003
      Done when: tests pass on a temporary folder: creating the flag file makes the switch read as active, removing it releases; the flag is read without restarting anything.
- [ ] **T016 — Credentials from the environment; disabled state; .env.example** · FR: FR-9 · Depends: T002
      Done when: tests pass: a source with a missing variable reports disabled with the variable's name (never its value); `.env.example` lists every credentialed source's variable; a grep for key-like strings in the repo finds none.
- [ ] **T017 — Runner: run one source, validate, store** · FR: FR-1, FR-11 · Depends: T003, T002, T010
      Done when: tests with fakes pass: valid adverts are stored; an invalid one is counted with its reason and not stored; the runner calls nothing beyond store.
- [ ] **T018 — Runner: failure isolation and keeping previous adverts** · FR: FR-3, FR-4 · Depends: T017
      Done when: tests pass: a throwing source is marked failed with its reason; the next source still runs; previous adverts remain unchanged; a read of zero adverts is reported and deletes nothing.
- [ ] **T019 — Runner: scheduling (due sources, backoff and parking)** · FR: FR-3, FR-6 · Depends: T018, T004
      Done when: tests with a fake clock pass: only due sources run, in a stable order, the others without a request; a failed source gets the next wait; a parked source makes no request until its period ends.
- [ ] **T020 — Runner: gates (takedowns, stop switch, disabled and disallowed sources)** · FR: FR-5, FR-7, FR-8, FR-9 · Depends: T017, T008, T015, T012, T016
      Done when: tests pass: adverts covered by a takedown are neither collected nor kept, including stored ones; after the flag appears no new request or source run starts and stored data is unchanged; a disabled source makes zero requests; a source blocked by robots.txt ends as disallowed.
- [ ] **T021 — Runner: a run always finishes** · FR: FR-3 · Depends: T019, T020
      Done when: a test where every source fails ends with all of them marked failed and the run returning normally.
- [ ] **T022 — Status command** · FR: FR-10 · Depends: T010, T019
      Done when: `pnpm crawl:status` prints, for each source, state, last run, advert count and reason, and a test covers the formatter with a mix of states.
- [ ] **T023 — Entry point `crawl` with single-source option** · FR: FR-6 · Depends: T021, T022
      Done when: `pnpm crawl -- --source <id>` runs only that source on fakes in an integration test, and `pnpm crawl` is wired in `package.json` (documented in `CLAUDE.md`).
- [ ] **T024 — Adapter registry and shared contract test** · FR: FR-1, FR-2, FR-12 · Depends: T002, T003
      Done when: `src/features/crawl-core/registry.ts` exists, and a test iterates over every registered adapter and checks valid licence data, valid adverts from its fixture and no e-mail or contact field in any advert (no adapter is registered yet; the test's own fake adapter proves it fails on a bad one).
- [ ] **T025 — Close crawl-core** · FR: FR-1 to FR-12 · Depends: T023, T024
      Done when: `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:run && pnpm build` is green; each of FR-1 to FR-12 has a test that names it; `MEMORY.md`, `CLAUDE.md` (commands, layout) and `.env.example` are updated; `features/README.md` marks this feature done.
