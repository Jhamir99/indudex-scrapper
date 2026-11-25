# Spec: Career sites and ATS platforms

Status: draft. Split on 2026-11-15 from spec 001 ("Legacy sources scraper", wave 5).

## 1. Context and goal

Most of the legacy pile comes from employers' own careers sites (their sitemap names the vacancy pages, and each page carries the schema.org `JobPosting` block it publishes for search engines) and from the public listings of applicant-tracking systems (Workday, Greenhouse, Teamtailor, Lever, Ashby, Recruitee, Personio, Workable and more). The legacy reads thousands of them from lists (`builder/config/careers.yml`, `companies.yml`, `platform-sites.yml`, `vendors.yml`, plus the `*-found.yml` lists the discovery tools write) through one adapter (`builder/adapters/careers.mjs`, `builder/lib/crawl.mjs`). It also takes the legacy's applicant-tracking boards (`builder/adapters/boards.ts`: 28 platforms with a public API, one entry per company in `companies.yml`), moved from 015 on 2026-11-25; the page readers 015 ports into `src/shared/kit/` (sitemaps, the completed `JobPosting`, labels, the layout reader, `oneLanguage`, `platformPosting`) are reused here.

**Goal:** port the career-site and ATS reading onto `crawl-core`, with the employers and platforms as data, so the pile keeps its largest share of adverts.

**Why:** this is where most adverts come from, and the employer's own page is the most trustworthy copy of an advert.

## 2. Users

- **Operator**: maintains the lists; sees barren sites and platform limits in the status.

## 3. User stories

- As the operator, I want employers and platforms listed as data so that thousands of sites need no code each.
- As the operator, I want a flood of newly found sites not to starve the regular ones so that a big discovery does not stop the daily reading.

## 4. Functional requirements

**FR-1 — Coverage.**
The scraper shall read every site and board of the legacy lists, and every platform and vendor of the legacy platform and vendor lists shall have an adapter or an explicit "disabled and flagged" status.
_Acceptance:_ The number of loaded entries matches the legacy lists; a test checks the platform list.

**FR-2 — Sitemap discovery.**
For a careers site, the scraper shall discover vacancy pages from its sitemaps, honouring `robots.txt`, up to a page cap per site and pass.
_Acceptance:_ On a sample sitemap, URLs are discovered, disallowed ones are skipped and the cap is respected.

**FR-3 — `JobPosting` extraction.**
The scraper shall read adverts from the schema.org `JobPosting` blocks of each vacancy page.
_Acceptance:_ Pages with one and several blocks produce valid adverts. A site whose pages carry none is counted as barren and read at the barren cadence (weekly in the legacy).

**FR-4 — First reads capped.**
The scraper shall read at most a configured number of never-read sources per run.
_Acceptance:_ Starting from the legacy value of 300 a run.

**FR-5 — Platforms sharing one host.**
Sources of one ATS platform shall share that platform's in-flight limit, per-server gap and any group limit its terms set.
_Acceptance:_ Starting from the legacy values: hrmanager at most eight calls an hour.

**FR-6 — Broken legacy sources.**
Where a legacy source no longer works, it shall be registered disabled and flagged.
_Acceptance:_ The flag shows in `crawl:status`.

**FR-7 — Core rules.**
Every site and platform shall run through `crawl-core` and meet its FR-1 (common format) and FR-2 (licence and attribution).
_Acceptance:_ The shared contract test passes.

## 5. Non-functional requirements

- **Politeness:** platforms are big shared hosts; their pace is per server, not per employer.
- **Testability:** offline tests against saved sitemaps, pages and API answers.

## 6. Out of scope

- Finding new employers and boards: `source-discovery`.
- Sites drawn by JavaScript that need a real browser (see `MEMORY.md`: `PlaywrightCrawler` is to be reconsidered here only if needed).

## 7. Completion criteria

- An end-to-end run on fixtures with sources of every family, a broken source, a takedown and the stop flag finishes with the expected states and stored adverts.
- Every completion criterion of `crawl-core` and the four source features holds: every legacy source present, offline tests green, no credential in the repo.

## 8. Open questions

- None at the moment.
