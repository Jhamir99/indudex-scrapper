# Spec: Career sites and ATS platforms

Status: draft, written 2026-11-27 with the operator's answers (it replaces the outline split from spec 001 on
2026-11-15).

## 1. Context and goal

Most of the legacy's pile comes from employers themselves: their careers sites, whose sitemap or vacancy list names
the vacancy pages and whose pages carry the schema.org `JobPosting` block they publish for search engines, and the
public boards of applicant-tracking systems (ATS), which serve each employer's vacancies through a public API. The
legacy reads them from lists kept as data, about 26,000 entries:

- careers sites listed by hand (504) and found by its scouts (8,047);
- careers sites hosted on platforms that give each vacancy its page (6,401: JOIN, softgarden, coveto, HR4YOU, onlyfy,
  Factorial and about twenty more);
- company boards on 28 ATS platforms with a public API (Greenhouse, Ashby, Lever, SmartRecruiters, Recruitee,
  Workable, Teamtailor, Personio, BambooHR, Breezy, HOMERUN, Varbi, Traffit, HireHive, Prospective, Flatchr, Zoho,
  HiBob, Emply, Pinpoint, d.vinci, Manatal, HRmanager, Cornerstone, Talentadore, EasyCruit, Workday, Oracle), listed by
  hand (84) and found by its scouts (11,770);
- the vendors drawn by JavaScript whose page asks an address for its list (Workday, Oracle, Softy), each switched on or
  off by the operator.

This feature reads them all as the legacy does at its current version, on `crawl-core`, with the page readers 015
brought and 018 brought up to date.

**Goal:** read every careers site and ATS board of the legacy's lists, at the legacy's pace, so the pile keeps its
largest share of adverts.

**Why:** this is where most adverts come from, and the employer's own page is the copy the employer keeps up to date.

## 2. Users

- **Operator**: keeps the lists; sees in the status which sites are barren, which fail and why, and what each platform
  allows.
- **Visitor** (through the processor and the web): finds the employers' own adverts, each linking to the employer's
  page.

## 3. User stories

- As the operator, I want employers and platforms listed as data, so that thousands of sites need no code each.
- As the operator, I want every list the legacy reads read here from the start, so that the pile does not shrink when
  the server moves to this code.
- As the operator, I want the crawl to run at the legacy's pace, so that the sources are read as often as they are now.
- As the operator, I want a flood of new sources and a site with a huge queue not to starve the others, so that the
  daily reading goes on whatever the lists hold.
- As the operator, I want the crawl to spend its pages on vacancies the site can show, so that it does not read again
  pages that never reach a visitor.
- As the operator, I want sources that fail to be retried and parked by the crawl's own rules, so that I do not
  switch thousands of them off by hand.

## 4. Functional requirements

**FR-1 — The lists as data.**
The scraper shall load every entry of the legacy's lists of careers sites, platform sites and company boards (those
kept by hand and those its scouts wrote) as data, each with its name, its address or platform and slug, and optionally
its country, its language and a pause.
_Acceptance:_ When the lists are loaded, the scraper shall hold as many sources of each list as the legacy's lists at
its current version hold, less the entries named in two lists, which are read once (the hand-kept list's entry
first). If an entry is paused, then the scraper shall not read it and the status shall show it paused.

**FR-2 — Careers sites.**
When a careers site is due, the scraper shall find its vacancy pages from its sitemaps or its vacancy list, honouring
`robots.txt`, and read each page's `JobPosting` blocks, else the page as a person reads it (the layout reader), as the
legacy does.
_Acceptance:_ On saved sitemaps and pages, the vacancy pages are found, those `robots.txt` closes are not asked, pages
with one and with several blocks give valid adverts, and the adverts are those the legacy's reader gives for the same
pages.

**FR-3 — Company boards.**
When a company board is due, the scraper shall read its vacancies through its platform's public API, as the legacy
does for each of the 28 platforms.
_Acceptance:_ On saved answers of each platform, the adverts are those the legacy's reader gives. If a platform's terms
or its `robots.txt` close its API (SmartRecruiters, JOIN today), then its boards shall stay listed and switched off,
with the reason in the status.

**FR-4 — Vendors drawn by JavaScript.**
When a vendor switched on is due (Workday, Oracle and Cornerstone today), the scraper shall ask the address its page
asks for its list, as the legacy does; a vendor the operator switched off (Softy today, whose terms ask leave) shall
not be read.
_Acceptance:_ On saved answers, Workday's and Oracle's lists give the legacy's adverts; switching a vendor off in the
data stops it with no code change.

**FR-5 — Barren sites.**
If a careers site's vacancy pages give no advert, then the scraper shall read it at the barren cadence (a week, as the
legacy).
_Acceptance:_ A site whose saved pages carry no advert is due again a week after its pass.

**FR-6 — The run's pace.**
The scraper shall run at the legacy's values, each kept in the configuration: 32 lanes in parallel; in a run, at most
40,000 vacancy pages of careers sites, 200 a site and pass; a site with 500 vacancy pages or more left, while a fifth of
the pages it read show an offer, read at the portals' pace (a page a second, its `Crawl-delay` first), up to 1,500 pages
a pass and 60,000 for all such sites in a run; at most 300 sources never read before; and one place in five of the
queue for the sources that show no offer.
_Acceptance:_ On fakes, each ceiling stops the run where it should, a flood of new sources leaves the others their
turn, and a site with a long queue comes back the next run while pages are left.

**FR-7 — Platforms on one host.**
While several sources share one platform's host, the scraper shall share among them that platform's limit of
requests in flight and its gap between requests, and any limit its terms set, at the legacy's values (HRmanager at
most eight calls an hour, JOIN two in flight, Manatal one).
_Acceptance:_ On fakes, a platform's boards never exceed its limits together.

**FR-8 — Vacancies the site shows.**
When a careers site's vacancy page is due to be read again, the scraper shall ask it only if the published version in
place shows its advert; with no published version, it shall ask them all.
_Acceptance:_ With a published version that shows one of two stored vacancies, only that one is asked again; with
none, both are.

**FR-9 — Reading again what the reader now reads better.**
When the careers reader changes in a way that reads more of a page (the legacy numbers its versions), the scraper shall
read again, within each site's pages a pass, the stored vacancies the new version would read differently, only those
the published version shows.
_Acceptance:_ A vacancy stored by an older reader version and shown is read again; one not shown, or read by the
current version, is not.

**FR-10 — A company board's advert with no place.**
If a company board's advert names no place that can be read, then the processor shall leave it out as the legacy does
(boards are read the world over, and such an advert is more often outside Europe than in it), unless its title is
written for the German- or French-speaking market («(m/w/d)», «(H/F)»), which stays with its country not stated.
_Acceptance:_ The legacy's cases of this rule read the same: a board's advert with no place is left out, one marked
«(m/w/d)» stays.

**FR-11 — Failing sources.**
If a source fails, then the scraper shall retry, back off and park it by `crawl-core`'s rules, keeping its adverts, as
the legacy does; no source is switched off by hand for failing.
_Acceptance:_ A source that fails on saved answers is retried, then parked, and the status names its last failure.

**FR-12 — Core rules.**
Every careers site, board and vendor shall run through `crawl-core` and meet its rules: the common advert format, the
source's attribution (the employer's page, read as search engines read it, under `AGENTS.md`'s rule for pages published
for search engines), `robots.txt` with no exception, the stop switch and the takedowns.
_Acceptance:_ The shared contract test passes for every family.

**FR-13 — Checked live.**
Before it is closed, the feature shall be checked live from the operator's machine on every platform and vendor
switched on and on a sample of each list (about 300 careers sites); the rest is left to the crawl's own rules on the
server.
_Acceptance:_ The live pass is recorded in the tasks: for each platform and list, how many sources gave adverts, how
many failed and why.

## 5. Non-functional requirements

- **Politeness:** platforms are big shared hosts, paced per server and per platform, never per employer; the pace of
  `crawl-core` (per host, per server, per provider, the error budget, the 429 holds) applies to every source.
- **Scale:** the store, the status and a run hold about 26,000 sources without a run's time or memory growing with the
  sources not due.
- **Testability:** offline tests on saved sitemaps, pages and API answers, compared with the legacy's readings where
  the legacy has them.

## 6. Edge cases

- A sitemap index of thousands of sitemaps, gzipped sitemaps, a sitemap that lists every page of the site.
- A job feed bigger than a sitemap's 50 MB (the legacy streams it, up to 512 MB).
- A vacancy page in another language than the site's, or with several `JobPosting` blocks.
- A board whose ATS redirects to the employer's own site, which answers a bot check: the hold falls on the employer's
  server, not the platform's.
- A tenant that moved to another platform or host, a front page that sends its careers elsewhere.
- One employer in two lists (by hand and found): read once, the hand-kept entry first.
- A site whose `robots.txt` closes the vacancy pages after it was listed.
- A listed site that has closed or answers 404 for good: parked by the crawl, its adverts left to the publication's
  rules.

## 7. Out of scope

- Finding new careers sites and boards: 017 (source-discovery), which writes to the same lists.
- Sites that need a real browser to draw their vacancies (the legacy measured a headless browser would add vacancies
  on about 4 % of silent sites).
- Sources behind credentials: 014.
- Splitting the crawl across machines (the legacy's list of sources another machine reads).

## 8. Completion criteria

- Every list of the legacy loaded (FR-1 counts), every platform and vendor read or switched off with its reason.
- An end-to-end run on fixtures with a careers site, a platform site, a board of each platform, a vendor, a barren
  site, a failing source, a takedown and the stop switch finishes with the expected states and adverts.
- The live pass of FR-13 recorded.
- Every completion criterion of `crawl-core` and the other source features still holds: offline tests green, no
  credential in the repo, `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:run && pnpm build` green.

## 9. Open questions

- [NEEDS CLARIFICATION] Part of the found boards' slugs came from open lists under CC BY-NC 4.0 (job-board-aggregator,
  JobSeek, as the legacy's list credits them): fine while Indudex earns nothing, to revisit with GISCO's NUTS licence if
  it ever does.
- [NEEDS CLARIFICATION] Workday's, Oracle's and Cornerstone's list addresses are not documented APIs; the legacy's owner
  keeps them read (15 November 2026). Kept so here unless the operator says otherwise.
