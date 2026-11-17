# Tasks: Public feeds

Generated from `spec.md` and `plan.md` (as tasks 001, T025-T026 and wave 2). Tasks are ordered by dependency and have a verifiable "Done when". "Standard adapter check" is defined in `plan.md` section 2. Each adapter batch takes about 75 minutes; split one if it does not fit in one sitting.

**Depends:** `crawl-core` closed (its T025).

## Tasks

- [x] **T001 — Family `public-feed` extracted from the reference feed** · FR: FR-2 · Depends: crawl-core T025
      Done when: the family offers robots check, fetch, empty-feed failure and field mapping once, and a source using it only provides its url, licence and field mapping.
- [x] **T002 — Reference adapter: brz (open-data feed)** · FR: FR-1, FR-3, FR-5 · Depends: T001
      Done when: the standard adapter check passes for it.
- [x] **T003 — Port adapters: nav, jobindex, island** · FR: FR-1, FR-4, FR-5 · Depends: T002
      Done when: the standard adapter check passes for each adapter. NAV cadence is 1 h in its config entry (its terms retire inactive ads at once). `jobindex` cadence is 1 h.
      2026-11-16: `nav` needs a token (`NAV_TOKEN`), so it moved to `credentialed-sources` (its T003), as FR-1 says.
- [x] **T004 — Port adapters: kuntarekry, valtiolle, jobtech** · FR: FR-1, FR-4, FR-5, FR-7 · Depends: T002, T019, T020, T022
      Done when: the standard adapter check passes for each adapter.
- [x] **T005 — Port adapters: infopraca, solidjobs, mpsv** · FR: FR-1, FR-5, FR-7 · Depends: T002
      Done when: the standard adapter check passes for each adapter.
- [x] **T006 — Port adapters: nva, upsvr, hungary** · FR: FR-1, FR-4, FR-5 · Depends: T002, T023
      Done when: the standard adapter check passes for each adapter. `hungary` reads one category per pass, about a dozen requests.
      2026-11-16: `hungary` keeps its turn and each category's adverts in the per-source memory (T023).
- [x] **T007 — Port adapters: hzz, anofm, cyprus** · FR: FR-1, FR-5, FR-7 · Depends: T002, T023, T024
      Done when: the standard adapter check passes for each adapter.
- [x] **T008 — Port adapters: iefp, netempregos, sef** · FR: FR-1, FR-5, FR-6 · Depends: T002, T021
      Done when: the standard adapter check passes for each adapter; `netempregos` is disabled and flagged (FR-6).
- [x] **T009 — Port adapters: sne, spin, ttvic** · FR: FR-1, FR-5, FR-6 · Depends: T002, T021
      Done when: the standard adapter check passes for each adapter; `ttvic` is disabled and flagged (FR-6).
      2026-11-16: `spin` and `ttvic` done; `sne` waits for a decision (it reads PDFs: a new dependency and binary bodies).
      2026-11-17 (operator): add `pdfjs-dist` (after checking its version and TypeScript 7) and binary bodies in the HTTP client, then port `sne` in full.
      2026-11-17: `sne` done: `pdfjs-dist` 6.5.438 (its own types, one copy of TypeScript in the tree; its only extra is the optional `@napi-rs/canvas`), `HttpRequestOptions.binary` and `HttpResponse.bytes`; the contract serves `.pdf` fixtures (and `{file, binary, contentType}` entries) as bytes and runs every adapter on a fixed day (`CONTRACT_DAY`). The fixture PDF is made up in the layout of the real ones, which name people. A live pass stored 3,288 offers from 12 regions.
- [x] **T010 — Port adapters: brandenburg, bund, karrierenrw** · FR: FR-1, FR-4, FR-5 · Depends: T002
      Done when: the standard adapter check passes for each adapter. `bund` waits 30 s between pages (its robots.txt asks for it).
      2026-11-16: `bund` is ported disabled and flagged (FR-6): its imprint asks prior consent, as the legacy found on 15 November 2026.
- [x] **T011 — Port adapters: linz, ooe, ifgat** · FR: FR-1, FR-5 · Depends: T002
      Done when: the standard adapter check passes for each adapter.
- [x] **T012 — Port adapters: actiris, forem, vdab** · FR: FR-1, FR-5 · Depends: T002
      Done when: the standard adapter check passes for each adapter.
      2026-11-16: `actiris` done; `forem` (its export sits under /api/, closed by robots.txt) and `vdab` (a whole pass takes most of an hour) wait for decisions.
      2026-11-17 (operator): `forem` is ported disabled and flagged (robots.txt is obeyed, no exception); `vdab` waits for sources to run in parallel (a crawl-core change, per-site pacing kept); done the same day (`run.concurrency`, 4).
      2026-11-17: `vdab` done: the whole search once a day (first pass of the day, kept in the source's memory), every pass asks the records of up to 3,000 vacancies; `withDetailPages` gains `address` and `request` for records that are JSON at another address. `forem` done the same day, disabled and flagged (FR-6): ODWB's robots.txt closes `/api/` and every download route of the dataset (read 17 November 2026); its fixture is built from the format the legacy documents.
- [x] **T013 — Port adapters: emilia, trento, brescia** · FR: FR-1, FR-5 · Depends: T002
      Done when: the standard adapter check passes for each adapter.
      2026-11-17: `emilia` and `trento` share `myportal.ts` (MyPortal's search in a server session; the cookies its search page sets are sent back, so `HttpResponse` gains `cookies`); `brescia` reads both its day forms.
- [x] **T014 — Port adapters: bolzano, uzt, lanbide** · FR: FR-1, FR-5 · Depends: T002
      Done when: the standard adapter check passes for each adapter.
      2026-11-17: `lanbide` is ported disabled and flagged (FR-6): its host's robots.txt is `Disallow: /` (the legacy switched it off); its fixture is built from the format the legacy documents. `bolzano` and `uzt` done (live passes: 967 offers and 5).
- [x] **T015 — Port adapters: sae, madrid, jcyl** · FR: FR-1, FR-5 · Depends: T002
      Done when: the standard adapter check passes for each adapter.
      2026-11-17: `jcyl` is ported disabled and flagged (FR-6): the dataset's address redirects to the Junta's analysis portal, whose robots.txt closes `/api/` where the export now sits, in a different, flat format (the adapter keeps the legacy's attribute-list format and must be updated before it is enabled). `sae` and `madrid` done (live passes: 569 and 208 offers).
- [x] **T016 — Port adapters: clm, emcan, gencat** · FR: FR-1, FR-5 · Depends: T002
      Done when: the standard adapter check passes for each adapter.
      2026-11-17: live passes stored 323 (`clm`), 345 (`gencat`) and 88 (`emcan`, 60 offer pages read in the pass) offers. `emcan` reads each new offer's own page without the legacy's gate (the processor's), 60 a pass at the 10 s its robots.txt asks.
- [x] **T017 — Port adapters: feinaactiva, escoladeltreball** · FR: FR-1, FR-5 · Depends: T002
      Done when: the standard adapter check passes for each adapter.
      2026-11-17: live passes stored 4,171 (`feinaactiva`) and 45 (`escoladeltreball`) offers. The offers of `escoladeltreball` marked restricted (they ask for an ID number and a birth date) are left out; an offer read before is not asked for again while open.
- [x] **T018 — Close public-feeds** · FR: FR-1 to FR-5 · Depends: T003-T017
      Done when: every feed passes the contract test and `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:run && pnpm build` is green; the list of ported sources in `MEMORY.md` is up to date; `features/README.md` marks this feature done.
      2026-11-17: 44 adapters registered (38 enabled, 6 disabled and flagged), every one through the contract test and a live run; `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:run && pnpm build` green (527 tests).

## Amendment 2026-11-16 (plan section 5)

- [x] **T019 — Per-host pace in `crawl.yml`** · FR: FR-4 · Depends: crawl-core T013
      Done when: tests with a fake clock pass: a host listed in `pace.hosts` is paced by its own gap, other hosts by `pace.perHost`, and a shared server still paces its hosts together; the config schema rejects a negative gap.
- [x] **T020 — Shared `JobPosting` mapping** · FR: FR-1 · Depends: crawl-core T005
      Done when: tests pass on saved pages: one or several JSON-LD blocks (an `@graph`, a list) give their postings as plain fields; a block with broken JSON that the legacy repaired is still read; a page without one gives none.
- [x] **T021 — Disabled and flagged sources** · FR: FR-6 · Depends: crawl-core T020
      Done when: tests pass: a source whose definition has `disabledReason` is recorded as disabled with `flagged: <reason>` and makes zero requests; without it, it runs.
- [x] **T022 — `config/ssyk-groups.yml` for jobtech** · FR: FR-7 · Depends: T001
      Done when: the file exists with its header (source, licence, date, how it was built), loads through `loadConfig` with a schema, and a test checks it is not empty and every entry is a JobTech concept id.
- [x] **T023 — Per-source memory between passes** · FR: FR-4 · Depends: crawl-core T017, T010
      Done when: tests pass: the file store writes and reads a source's memory atomically and refuses a corrupt one; the runner hands the adapter the memory of the last good pass and saves what it remembers only after a stored or empty pass, never after a failed or stopped one.
- [x] **T024 — Charset decoding in the HTTP client** · FR: FR-1 · Depends: crawl-core T011
      Done when: tests with a fake `fetch` pass: an ISO-8859-2 body named by its `Content-Type`, one named only by its XML declaration, and one with neither (UTF-8) each come out as the right text.
