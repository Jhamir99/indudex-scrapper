# Tasks: Career sites and ATS platforms

Generated from `spec.md` and `plan.md` (2026-11-27). Each task ends with the CI's checks green and a commit.

**Depends:** 015 job-portals and 018 legacy-resync closed.

## Tasks

- [x] **T001 — The lists as data** · FR-1 · Depends: —
      Done when: the six legacy lists are in `config/` with a header crediting the legacy, loaded and validated
      synchronously; the counts per list match the legacy's, entries in two lists read once (the hand-kept first),
      paused entries shown paused; a test checks the counts.
- [x] **T002 — The board platforms** · FR-3, FR-4 · Depends: T001
      Done when: `boards.ts` and Argus's parsers are copied, each platform's saved answer gives the legacy's adverts,
      SmartRecruiters and JOIN listed and switched off with their reason, the vendors' switches read from
      `vendors.yml`.
- [x] **T003 — The careers reader** · FR-2, FR-4, FR-5, FR-9 · Depends: T001
      Done when: `careers.ts` and the streamed feed items are copied; saved sitemaps, listings, feeds and pages of each
      shape give the legacy's adverts; a barren site's cadence is a week; a vacancy is read again by the reader's
      version rules.
- [x] **T004 — One source per entry** · FR-1, FR-12 · Depends: T002, T003
      Done when: the registry holds a source for every enabled entry with its kind, group, licence and credit; the
      shared contract test passes for a site, a platform site, a board of each platform and a vendor.
- [x] **T005 — What the site shows** · FR-8 · Depends: T004
      Done when: the crawl reads the published version in place once a run; a shown vacancy is asked again and one not
      shown is not; with no version everything is asked.
- [x] **T006 — The legacy's queue** · FR-6 · Depends: T005
      Done when: selection follows the legacy's `due` (worth, one in five for sources that show nothing, never-read
      sources capped a run by group in turn, reading-on last), compared with the legacy's function on the same inputs;
      the run's lanes, minutes and page budgets at the legacy's values in `crawl.yml`.
- [x] **T007 — Long queues and platform limits** · FR-6, FR-7 · Depends: T006
      Done when: a site with a long queue runs in the queues' lanes at a page a second within its ceilings; a group's
      in-flight limit and sources a run (hrmanager 8 an hour) hold on fakes; a source's deadline is sized by its
      adverts.
- [ ] **T008 — A board's advert with no place** · FR-10 · Depends: T004
      Done when: the processor leaves out a board's advert with no readable place unless its title is marked «(m/w/d)»
      or «(H/F)», with the legacy's cases.
- [ ] **T009 — End to end on fixtures** · FR-11, FR-12 · Depends: T007, T008
      Done when: one run on fakes with a careers site, a platform site, a board of each platform, a vendor, a barren
      site, a failing source, a takedown and the stop switch ends with the expected states and adverts.
- [ ] **T010 — Live pass** · FR-13 · Depends: T009
      Done when: every platform and vendor switched on and about 300 careers sites read live into a temporary store; the
      result per platform and list recorded below.
- [ ] **T011 — Close** · FR-1 to FR-13 · Depends: T010
      Done when: the completion criteria hold; `CLAUDE.md`, `MEMORY.md` and `features/README.md` updated.

## Notes

T001 (2026-11-27). The seven lists the legacy reads (careers.yml, hunted.yml, careers-found.yml, platform-sites.yml,
companies.yml, companies-found.yml, vendors.yml) are in `config/` byte for byte under a credit header, left out of
Prettier. `readCareerLists` gathers them as the legacy's `loadSites` and `loadCompanies` do: 14,961 sites (504 by hand),
11,006 read; 11,273 boards (84 by hand), 10,700 read; 17 sites and 18 boards paused. The legacy's job-board filter
(`isBoardHost`, two more sites out: 11,004) is a parameter until T003 brings the careers reader's helpers. The legacy
also reads lists its server writes on its own (`state/found`, `triaged.yml`): not in its repository, not here.

T002 (2026-11-27). The legacy's `boards.ts`, its `lib/crawl.ts`, `page-text.ts`, `adapter.ts`, `time.ts` and `RawOffer`
are copied into `career-sites/legacy/`, only their imports changed; Argus's board parsers into `career-sites/argus/`.
Shims stand in for what crawl-core does: `legacy/http.ts` runs the legacy's `get`, `getJson`, `getText` and `getItems`
on the source's polite client (bound for its pass with `withHttp`; a bot check answered as a page fails as the
legacy's did), `legacy/robots.ts` says yes (our robots client refuses what robots.txt closes, hop by hop),
`legacy/pace.ts` waits nothing (our client paces), `legacy/registrable.ts` asks `tldts` (approved) the Public Suffix List
the legacy read from a file. A request may set its own time limit (a whole list waits two minutes). `modeWord`,
`mostFlexible` and `tagMode` are copied into `shared/kit/mode-words.ts` for the scrapper's readers. Carried: the legacy's
ats-fields, teamtailor-pages, workday-countries, workday-refs and cornerstone tests (the scout's case left to 017), through
`test/legacy/boards-shim.mjs`. One saved answer per platform comes with T004's contract test.

T003 (2026-11-27). The legacy's `careers.ts` is copied into `career-sites/legacy/`, only its imports and paths changed,
with `hunterMemo` and SuccessFactors' feed parser (Argus's text stripper stood in by our `pageText`). The readers'
helpers are bound per pass (`legacy/pass.ts`: the polite client, the gate's `isOurs`, crawl-core's `pageFacts`):
`ours.ts` asks the gate (crawl-core's `isOurs` now reads a title in a given language too, for `advertIsOurs`),
`labels.ts` is crawl-core's page facts, `normalise.ts` gives the publication's offer id, `robots.ts` reads the real
robots.txt through the client (the reader skips a closed address and finds robots.txt's sitemaps), `sitemap-text.ts`
unpacks a gzipped sitemap. A failure with a status says «404 for <address>», as the legacy's readers read it. Our
`layout.ts` copy types a page's pay as the legacy's `Salary`. Found on the way: since `entities`, «&nbsp;» decoded to a
no-break space where the legacy wrote a plain space, which kept the space before a colon (`decodeEntities` writes it as
the legacy did again). Carried: site-reader, site-lists, readers-audit (the legacy client's own robots case left to
crawl-core) and hunt-platforms, through `test/legacy/careers-shim.mjs`. The barren cadence comes with the family (T004).

T004 (2026-11-27). `careerAdapters()` makes the legacy's sources as its builder/sources.ts does: 10,867 sites and
10,682 boards read, its counts; 4,545 more listed off with their reason (JOIN's 3,937 sites and SmartRecruiters' 573
boards switched off in vendors.yml, 33 paused, 2 job boards' hosts); a site the job portals' list names is read there.
`switched-off.ts` and the legacy's `withDetails` are copied, the portals read from config/portals.yml. Ids: a site
`careers.<its legacy key>`, a board `<platform>.<slug>`, as a source id may be written. A site's resolved way in and its
pages, and a board's vacancies asked for their page, live in the source's memory; the run's page budget is the
legacy's `budget.left`; a pass stops reading a minute before the legacy's deadline. crawl-core gains the barren
signal and cadence (`cadence.barrenHours`, a week) and `isOurs` in a language. The careers robots shim asks the robots
client's own copy (`robotsFor`): asked twice in one second, Workday's robots.txt answered 429. A board that lists one
vacancy once per place under one id (Workable) keeps each copy by its address. Saved answers for the contract test:
one board of each of the 12 platforms with boards in the lists (Manatal's only one is paused: its terms forbid robots),
and five sites of each shape (sitemap, SuccessFactors feed trimmed to 20 items, listing, host alone, softgarden), read
once through the polite client, e-mail addresses replaced. Twins (two entries sharing one address's pages) are not
ported: they only spare a page asked twice.

T005 (2026-11-27). `readShownOffers` (shared/storage) reads the published version in place once a run: its offers' ids
and, per source, its offers, those in Spain and those in Catalonia (the legacy's shown-ids.txt and shown-by-source.json,
here read from the version itself: 70,439 ids of 38 sources in 0.3 s). crawl-core hands the ids to every source
(`context.shown`, null before the first publication) and the careers family gives them to the legacy's reader
(`useShown`), whose own rules ask again only a vacancy the site shows; the counts per source are T006's queue's.

T006 (2026-11-27). crawl-core's `dueQueue` is the legacy's `due`: what the site shows first (Catalonia's, Spain's, the
rest's, from the published version's counts), the most overdue first, one place in five for the sources that show
nothing, never-read sources capped a run and taken a group at a time, a source reading on (well within its cadence)
last. Compared with the legacy's function on 3,000 random sources and states: the same 2,552 due, in the same order.
The runner takes them in lanes (`run.concurrency`, the legacy's 32) with a limit per group (`run.inFlight`: careers
12, portals 8, feeds 2, via 1, join 2, manatal 1, default 2), starts none in the run's last five minutes
(`run.minutes` 55), and gives a group its page budget (`run.pageBudgets`: portals 30,000, careers 40,000); never-read
sources 300 a run (`run.newARun`). A source's group: an employer's site `careers`, a board its platform, `portals`,
`via`, `feeds`. A live run of 90 s on an empty store: 300 due, 96 stored, 5 empty, 17 failed; every Workday board on
`wd3` failed at once because one robots.txt answered 429 and our hold refused the others, each counted a failure,
where the legacy postpones a source a held server cuts short (no failure, back after the hold): T007.

T007 (2026-11-27). A careers site with 500 vacancy pages or more left, while a fifth of the pages it read show an offer
(or before fifty answered), runs in the `queues` lane (`run.longQueues`, `inFlight.queues` 16, `pageBudgets.queues`
60,000): 1,500 pages a pass, a page a second (the reader asks its host's gap of the polite client, `gapMs`; a host the
settings pace and robots.txt's Crawl-delay still win), 25 minutes; only such a site is back in the next run for its pages
left (the legacy's `nextPass`; before, every site with pages left was), and a barren one waits its week first. A group
starts no more sources a run than `run.sourcesARun` gives (HR-Manager 8) and none once its pages are spent; no source
starts whose time would outlast the run. A board's time grows with the vacancies it held (the legacy's
`sizedDeadline`: its platform's own, two minutes for a found one, five for Workday's and SmartRecruiters', 0.35 s a
vacancy on top, at most 25 minutes). JOIN's companies are a group of their own and draw on the employers' sites' pages.
A source cut short by its server's hold (or a 429 that says when) is postponed, as the legacy did: no failure counted,
its adverts and memory kept, back after the hold and up to ten minutes more; one the run had no pages left for, in the
next run.
