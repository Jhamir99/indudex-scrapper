# Plan: Career sites and ATS platforms

Implements `spec.md` (FR-1 to FR-13) on top of `features/001-crawl-core/plan.md` and 015's page readers. Status: draft
(2026-11-27). Ports of the legacy's `builder/adapters/careers.ts` (the careers reader: sites, platform sites, vendors),
`builder/adapters/boards.ts` (the 28 board platforms), Argus v1.11.0's `server-bot/scan.mjs` parsers they call
(`parseGreenhouse`, `parseAshby`, `parseLever`, `parseSmartRecruiters`, `parseSuccessFactors`), `builder/lib/feed-items.ts`,
the queue rules of `builder/crawl.ts` (`due`, `longQueue`, `sizedDeadline`, `worthOf`, the barren cadence) and the
lists `builder/config/careers.yml`, `careers-found.yml`, `platform-sites.yml`, `companies.yml`, `companies-found.yml`,
`vendors.yml`, all at JustJans/indudex@ec79858.

## 1. Approach

As in 018: the legacy's readers are copied whole (`careers.ts`, `boards.ts`, Argus's parsers), only their imports
changed, and wrapped in the source family of a feature; our typed shapes sit over them. What is crawl-core's (the queue,
the lanes, the budgets) is ported into crawl-core as rules of the runner, with the legacy's values in `crawl.yml`.

## 2. Layout

```
config/
  careers.yml, careers-found.yml, platform-sites.yml      # the legacy's lists, byte for byte, credited in their header
  companies.yml, companies-found.yml, vendors.yml
  crawl.yml                                               # + the legacy's run values (lanes, budgets, in-flight per group)
src/features/career-sites/
  lists.ts            # the six lists read and validated (Zod), synchronously, for the registry; one entry per host or
                      # slug (a hand-kept entry before a found one)
  careers.ts          # the legacy's careers reader, copied (readSite, listed, resolve, platformPosting, toRaw, ...)
  boards.ts           # the legacy's board reader, copied (ATS, readBoard, wrapBoardAdvert, the vendors' switches)
  argus/scan.ts       # Argus's four board parsers and SuccessFactors' feed parser, copied (MIT)
  feed-items.ts       # the legacy's streamed feed items
  family.ts           # careerSource(site), boardSource(company): a SourceAdapter per entry, its kind, group, licence
  index.ts            # careerAdapters(), careerHostGaps(), the groups' limits for the registry and the polite client
src/features/crawl-core/
  queue.ts            # the legacy's `due`: worth first (Catalonia, Spain, the rest), one place in five for sources that
                      # show nothing, never-read sources capped a run (round robin by group), sources reading on last
  runner.ts           # lanes (run.lanes), in flight per group, sources a run per group (hrmanager 8), the run's minutes;
                      # a long queue's own lanes and budget; a source's deadline sized by its adverts
  ports.ts            # + AdapterContext.shown: which vacancies the published version shows; `isShown(url)`
  domain/schedule.ts  # + the barren cadence (a site whose pages give no advert)
src/bin/crawl.ts      # builds `shown` from the published version in place (publication's index), and the groups
src/features/gate/ or publication   # FR-10: a board's advert with no place, as the legacy's work-out reads it
test/fixtures/<platform>/, test/fixtures/careers-<sample>/   # saved answers, people's data removed
```

- **One source per entry.** Each careers site, platform site and company board is a `SourceAdapter` of its own, built
  from the lists when the registry loads (as 015's portals), with its own state, memory and adverts in the store. Its
  id is the legacy's key under its group (`careers.<host>`, `<platform>.<slug>`): dots, as SourceId allows.
- **Kinds and groups.** Careers and platform sites are kind `careers`; boards `careers` too, with their platform as
  group. The groups' in-flight limits and gaps (careers 12, queues 16, join 2, manatal 1, a board platform's shared
  host) and the per-group sources a run (hrmanager 8) come from `crawl.yml` and are applied by the runner and the polite
  client.
- **The page cache.** A read vacancy is the stored advert (`context.previous`, by address); what is not an advert (a
  page with nothing, its reader version, a failure count, the sitemap's day, the site resolved) lives in the source's
  memory, as 015's portals. The legacy's reader versions (`READER`, now 9) and `worthReadingAgain` decide what is read
  again (FR-9).
- **What the site shows (FR-8, FR-6).** `src/bin/crawl.ts` reads the published version in place (`PublishedDataset`)
  once a run: the offer ids, and per source its offers, those in Spain and those in Catalonia. The careers reader asks
  `isShown(url)` with the offer id the publication would give the address (publication's `offerId`, through the port);
  the queue ranks the sources by it. No published version: everything counts as shown, as the legacy.
- **The queue (FR-6).** `selectDue` becomes the legacy's `due` with its tie rules; `run.concurrency` becomes
  `run.lanes` (32); the page budgets (`pagesARun` 40,000, `pagesASite` 200, `queuePagesARun` 60,000, `queuePagesASite`
  1,500, `queueAtLeast` 500, `queueShownAtLeast` 0.2, `newARun` 300, `noneEvery` 5, `minutes` 55) join the portals'
  30,000. A long queue (`longQueue`) runs in the queues' lanes at a page a second for up to 25 minutes.
- **robots.txt.** Every request goes through the robots client (no `robots: false`): a vendor or site the legacy reads
  with robots.txt off stays off here, with its reason. Redirects are checked hop by hop.

## 3. Verification

- **Offline:** saved answers of every board platform and vendor switched on, sitemaps and pages of careers and platform
  sites of each shape (plain sitemap, index, listing, SuccessFactors feed, a platform posting), compared with the
  legacy's readers on them (its modules run in the scratchpad, as in 004–011 and 018).
- **The queue:** fakes with thousands of sources check each ceiling and the order of `due` against the legacy's
  function on the same inputs.
- **Live (FR-13):** every platform and vendor switched on, and about 300 careers sites drawn across the lists, read
  once into a temporary store; the result recorded per platform and list.

## 4. Decisions (2026-11-27, operator)

- **Every list, as the legacy reads them.** Why: the pile should not shrink when the server moves to this code.
- **The legacy's pace.** Why: the sources are read as often as they are now; every value stays configurable.
- **The published version steers the crawl.** Why: the legacy's measure (1.7 M pages due to be read again, most of them
  never shown) is what keeps the employers' sites within a day.
- **A sample live and the server for the rest.** Why: 26,000 sources cannot be passed live from the Mac; the crawl's own
  backoff and parking handle the ones that fail.
