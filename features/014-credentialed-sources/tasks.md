# Tasks: Credentialed sources

Generated from `spec.md` and `plan.md`. Tasks are ordered by dependency and have a verifiable "Done when". "Standard adapter check": see `features/002-public-feeds/plan.md` section 2. Every task ends with `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:run && pnpm build` green.

**Depends:** `closed-adverts` closed (its T003).

- [ ] **T001 — The feed family into crawl-core, and keyed sources in the contract** · FR: FR-2, FR-7 · Depends: closed-adverts T003
      Done when: `family.ts` lives in `crawl-core/feed-family.ts` (public-feeds' adapters import it there, their tests unchanged and green); the contract test gives a source's declared variables stand-in values and checks no value reaches a log line or a stored advert; a crawl-core test shows a keyed source with a blank variable is disabled, makes zero requests and is named in the status.
- [ ] **T002 — nav** · FR: FR-1, FR-3, FR-7 · Depends: T001
      Done when: the standard adapter check passes (the feed's pages followed by `next_url`, the token as a bearer header, the last item of each ad decides, inactive left out, towns in title case), cadence 1 h and NAV's host pace are in `crawl.yml`, and with no `NAV_TOKEN` the source is disabled.
- [ ] **T003 — jooble** · FR: FR-1, FR-4, FR-7 · Depends: T001
      Done when: the standard adapter check passes (the legacy's countries, words and two pages, one key or one per country, 200 calls a pass counted in memory, the first 429 stops the asking, earlier adverts kept thirty days), cadence 24 h and the host pace in `crawl.yml`.
- [ ] **T004 — The partner programmes' feeds** · FR: FR-1, FR-5, FR-7 · Depends: T001
      Done when: `partner-feed.ts` holds the legacy's `parseJobFeed` (its cases pass in each naming) and `talentcom`, `whatjobs`, `jobtome` each pass the standard adapter check with their own variable, credit and cadence; a failing feed's reason does not carry its address.
- [ ] **T005 — adzuna, flagged** · FR: FR-1, FR-6, FR-7 · Depends: T001
      Done when: the standard adapter check passes with the flag lifted in its own test (the countries and categories, `planOf`, the day's and month's budgets in memory, the 429 stop, `detailsUrl`, its pay only when not estimated, contract and hours), and registered it shows as flagged with its reason (terms and robots.txt).
- [ ] **T006 — Close** · FR: FR-1 to FR-7 · Depends: T002 to T005
      Done when: with no keys set, `pnpm crawl:status` lists every source of this feature disabled with its variables (Adzuna flagged), recorded here; `.env.example` lists every variable with where to get it; 015's spec takes France Travail; `CLAUDE.md` and `MEMORY.md` updated; `features/README.md` marks 014 done.
