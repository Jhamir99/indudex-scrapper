# Plan: Job portals

Implements `spec.md` (FR-1 to FR-9) on top of `features/001-crawl-core/plan.md`. Status: approved (2026-11-25). Ports of the legacy's `builder/adapters/portals.ts`, `remote.ts`, `francetravail.ts`, `builder/config/portals.yml`, and of the page-reading pieces they lean on: `builder/lib/crawl.ts` (`parseSitemap`, `looksLikeJob`, `wholeAdvert`, its `jobPostings` already in `shared/kit/job-posting.ts`), `builder/lib/sitemap-text.ts`, `builder/lib/labels.ts` (`withLabels`), `builder/lib/layout.ts` (`guessPosting`), `builder/lib/ours.ts` (`namesOurs`), and from `builder/adapters/careers.ts` `oneLanguage` and `platformPosting`.

## 1. Layout

```
src/features/crawl-core/
  ports.ts               # + AdapterContext.isOurs(words, country), .pageBudget, .backlog(n)
  runner.ts, schedule    # + a source with a backlog is due again after `backlogHours`; the run's page budget shared by its sources
src/bin/crawl.ts         # builds isOurs from the gate's index (an entry point may import any feature)
src/shared/kit/
  sitemap.ts             # parseSitemap, sitemapText (gzip), withScheme, looksLikeJob
  job-posting.ts         # + wholeAdvert (a block completed from its page)
  labels.ts              # withLabels: a page's labelled facts (contract, hours, pay, years) into the job
  layout.ts              # guessPosting: a vacancy read from a page with no JobPosting block
  vacancy-page.ts        # oneLanguage, platformPosting (the careers reader's, which 016 reuses)
src/features/job-portals/
  portal-list.ts         # config/portals.yml read and validated (Zod), synchronously, for the registry
  portal.ts              # listed, listPages, forgetUnlisted, portalPage, readPortal, toDraft, cutTown, countryOf
  page-layouts.ts        # PAGE_LAYOUTS and PAGE_FACTS: the portals with readers of their own
  family.ts              # portalSource(portal): a SourceAdapter per enabled entry
  adapters/remote/       # jobicy, remotive, arbeitnow
  adapters/francetravail/
config/portals.yml       # the legacy's list (865 entries, with enabled and reasons), credited in its header
test/fixtures/<id>/      # saved sitemaps and pages of the sample portals, answers of the boards
```

- **The gate in the scrapper, through a port.** `namesOurs` asks the gate whether the words of a vacancy's address name a job of ours. Source features import only crawl-core, and the gate is a processor feature, so crawl-core's `AdapterContext` gains `isOurs(words, country)` and `src/bin/crawl.ts` builds it from `createGate` (the catalogues load in about a second, once a run). Tests give a stand-in. The words of an address are the legacy's (`ours.ts`: its parts without numbers and codes, one line) and the languages of its country are read, as the legacy did.
- **Page-reading in `shared/kit`.** Sitemaps, the completed `JobPosting`, labels, the layout reader and the careers reader's helpers are what 016 needs too; they go to `shared/kit` now (pure functions of a page's text, no crawl-core import), ported with the legacy's tests.
- **The page cache is the store plus memory.** A read page's advert is the stored advert (`context.previous`, keyed by its address); what is not an advert (a page with nothing, a failure count, a sitemap day) lives in the source's memory, with the list pages' walk and its day. The legacy's reader versions (`r`) and `isShown` are not ported.
- **Backlog and budget in crawl-core.** An adapter reports the pages of ours left (`context.backlog(n)`); the runner sets the source due after `crawl.yml`'s `portalBacklogHours` (1) instead of its cadence (`portals` 6 h). The run's page budget (`run.portalPages`, 30,000) is one counter the run's sources draw from (`context.pageBudget`).
- **Pace.** Each enabled portal's host gets the legacy's 1 s gap (or its `gap_s`) in the polite client when the registry is wired; Crawl-delay already widens it (`RobotsClient`).
- **Kind** `portal`; credit `via <name>`; licence "Read as search engines read it: robots.txt obeyed, each advert linking to the portal". **Country and language**: the page's, else the portal's, else the locale in the address; the language the page's, else the country's first (`shared/words/country-languages.ts`); with no country the advert is left out and counted.

## 2. Verification

- **Samples (offline):** six portals of different shapes, chosen from the enabled list when T006 starts (a plain sitemap, an index with children, `read_all`, list pages, a portal with its own layout reader, a `layout` portal): their sitemap and a few pages fetched politely once, trimmed, people's data removed, saved under `test/fixtures/<id>/`, and the legacy's `readPortal` and ours compared on them (the legacy's modules run in the scratchpad, as for 004–011).
- **Live pass (FR-8):** every enabled portal read once with a small page budget into a temporary store (`pnpm crawl -- --source <id>`), in batches; the failures switched off in `config/portals.yml` with their reason and date.

## 3. Decisions (2026-11-25, operator)

- **The legacy's rule for portals, in `AGENTS.md`.** Why: the legacy's owner set it on 9 October 2026 after reading each portal's terms; `AGENTS.md`'s "no commercial job boards" predates the split and is replaced by it.
- **Boards to 016.** Why: they are one entry per employer on applicant-tracking platforms, 016's subject.
- **The gate injected through crawl-core.** Why: the legacy's behaviour (a portal of 30,000 vacancies costs the few thousand of ours) without one feature importing another.
- **Samples and a live pass.** Why: 227 portals cannot each have a saved answer; their shapes can.
