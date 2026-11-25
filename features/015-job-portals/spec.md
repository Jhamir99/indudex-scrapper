# Spec: Job portals

Status: approved (2026-11-25). Split on 2026-11-15 from spec 001 ("Legacy sources scraper", wave 4); requirements rewritten with the operator's answers of 2026-11-25: portals are read under the legacy owner's rule of 9 October 2026 (robots.txt lets us in, no bot wall, no clause against robots, scraping or automated extraction), and `AGENTS.md` says so; the applicant-tracking boards (`boards`) go to `016-career-sites`; a vacancy page is read only when its address names a job of the vertical, decided by the gate's title reading handed to the scrapper through `crawl-core`; the family is tested on saved pages of a few portals of each shape, the whole list is validated as data, and every enabled portal gets one polite live pass, those that fail switched off with their reason.

## 1. Context and goal

Since October 2026 the legacy reads job portals and recruitment agencies' sites as search engines read them (`builder/config/portals.yml`, `builder/adapters/portals.ts`, research in `docs/research/job-portals.md`): the sitemap names the vacancy pages, each page carries the schema.org `JobPosting` block it publishes for search engines (or, for a few, is read from its own layout). Its list holds 865 portals, 227 enabled (most in the Netherlands, Germany, Austria and Switzerland), the others switched off each with its reason. A portal has more vacancy pages than one pass can read, so it keeps a backlog and comes back sooner. Two keyless sources of the same kind come with it: three job boards with a public API and written leave to share their adverts (`remote`: Jobicy, Remotive, Arbeitnow), and France Travail's public site (moved from 014).

**Goal:** port the portal reading and the portal list onto `crawl-core`, plus `remote` and `francetravail`, with the list as data and a backlog that carries over between runs.

**Why:** portals and agencies add many adverts the public feeds do not carry, mostly in countries the feeds cover thinly.

## 2. Users

- **Operator**: adds, removes or switches off portals by editing the list, and sees each portal's backlog and failures in the status.

## 3. User stories

- As the operator, I want portals listed as data so that adding one needs no code.
- As the operator, I want a big portal read whole over a few runs, coming back sooner while it has pages left.
- As the operator, I want a portal of 30,000 vacancies to cost only the pages of the jobs we publish.

## 4. Functional requirements

**FR-1 — The rule for portals.**
A portal shall be read only while its robots.txt lets the crawler in, no bot wall stands in front of it, and its terms hold no clause against robots, scraping, crawling, data mining or automated extraction; personal-use, non-commercial or no-copying clauses are no reason to leave it out. A portal that breaks the rule stays in the list switched off with its reason.
_Acceptance:_ `AGENTS.md` states the rule; every switched-off entry of the list carries a reason.

**FR-2 — The list as data.**
Portals shall be described in a list (data), the legacy's fields kept: the sitemap or index and the children that hold vacancies, the shape of a vacancy's address, `read_all`, the country or the locale in the address, a part's own name, list pages with their paging, `keep_days`, `stale_days`, a portal's own gap, `layout`, the employer fixes (`employer`, `not_employer`, `town_in_employer`, `agency`), `place_in_title`, the language.
_Acceptance:_ The list loads and validates, credits the legacy in its header, holds the legacy's 865 entries with their enabled state, and each enabled entry becomes a registered source.

**FR-3 — Reading a portal.**
A pass shall list the portal's vacancy addresses (its sitemaps, at most three levels of index, each once; or its list pages, walked once a day), forget the pages no longer listed (or, with `keep_days`, those not listed for that long), read each listed vacancy page not read yet, changed since (its sitemap's day), or failed fewer than three times, and only when its address names a job of the vertical (or the portal is `read_all`), the never-read first then the newest, at most 1,500 pages a pass; a vacancy listed under several of the portal's languages or countries is read once. A page gives its `JobPosting` block completed from the page, else the portal's own layout reader, else (for a `layout` portal) what its HTML says, then its labelled facts. A 429 or a wall stops the pass; ten pages without an answer stop it too.
_Acceptance:_ The legacy's behaviour on saved sitemaps and pages of at least six portals of different shapes (plain sitemap, index with children, `read_all`, list pages, a layout reader, a `layout` portal), and the legacy's own tests of these parts.

**FR-4 — Only the vertical's pages.**
Whether a vacancy's address names a job of the vertical shall be decided by the gate's own title reading (the processor's catalogues and rules), handed to the scrapper through `crawl-core`, so the crawler reads as the gate would keep.
_Acceptance:_ Tests with a stand-in reading; one test with the real gate on addresses the legacy's `namesOurs` read.

**FR-5 — Backlog and budget.**
While a portal has pages of ours left to read, it shall be due again in an hour (else every six hours); a run shall read at most 30,000 portal pages in all, and a portal's pages a second apart at least (its robots.txt's Crawl-delay or its own gap when longer).
_Acceptance:_ crawl-core tests of the backlog and the run's budget.

**FR-6 — Remote boards.**
`jobicy`, `remotive` and `arbeitnow` shall be read through their public APIs as the legacy did, each with the credit its permission asks; a remote advert that names no European country is filed as remote.
_Acceptance:_ The legacy's tests and the standard adapter check on saved answers.

**FR-7 — France Travail.**
`francetravail` shall read France Travail's public site as the legacy did: the listings of the vertical's occupations per département and city named by its sitemaps, a seventh of them each hour, each offer's own data through the API its robots.txt leaves open, an offer gone from a listing with room taken as closed, one that slid off a full listing kept a month from its day.
_Acceptance:_ The legacy's tests and the standard adapter check on saved answers.

**FR-8 — Verified live.**
Every enabled portal shall be read once, politely, live (its listing and a few pages); one that fails, closes itself to us or no longer gives adverts shall be switched off in the list with its reason and date.
_Acceptance:_ The pass recorded in `tasks.md`: how many read, adverts per portal, those switched off and why.

**FR-9 — Core rules.**
Every portal and board shall run through `crawl-core` and meet its FR-1 (common format), FR-2 (licence and attribution: "via <portal>"), FR-5 (robots.txt) and FR-11 (cadence).
_Acceptance:_ The shared contract test passes for the registered sources with saved answers; the others are covered by the family's tests and the live pass.

## 5. Non-functional requirements

- **Legality:** only portals that meet FR-1; LinkedIn never.
- **Politeness:** a page a second per portal at most, longer when its robots.txt or the list asks; a run's 30,000 pages in all.
- **Testability:** offline tests against saved sitemaps and pages; no request leaves a test.
- **Equivalence:** the same addresses listed, the same pages chosen to read and the same adverts read as the legacy on the saved samples.

## 6. Edge cases

- A sitemap index that names itself: asked once.
- A sitemap that leaves the scheme out of its addresses: https.
- A list page that shows the first page again past its last: the walk stops at the first page with nothing new.
- A page read again that does not answer keeps its advert; one that answers 4xx (but 408) is taken as closed.
- An agency that names no employer on its pages: its own name, as an employer's careers site does.
- A portal whose pages name no country and whose list gives none: the advert is left out, counted (the store needs a country).

## 7. Out of scope

- The applicant-tracking boards (`boards`): `016-career-sites`.
- The partner programmes' feeds (`jobfeed`): done in `014-credentialed-sources`.
- Finding new portals: `017-source-discovery`.
- The legacy's re-reading of pages by reader version and by what the site shows (`isShown`): a fresh port has one reader.

## 8. Completion criteria

- FR-1 to FR-9 pass their acceptance tests; the live pass is recorded; `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:run && pnpm build` is green.

## 9. Open questions

- None. (2026-11-25: the legacy's rule for portals, in `AGENTS.md`; boards to 016; the gate's reading injected through crawl-core; samples plus a live pass.)
