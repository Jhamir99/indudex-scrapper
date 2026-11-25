# Plan: Credentialed sources

Implements `spec.md` (FR-1 to FR-7) on top of `features/001-crawl-core/plan.md`. Status: approved (2026-11-25). Ports of the legacy's `builder/adapters/nav.ts`, `jooble.ts`, `adzuna.ts` and `jobfeed.ts`.

## 1. Layout

```
src/features/crawl-core/feed-family.ts   # publicFeed, stillOpen, withDetailPages, checkWholePass: moved from public-feeds
src/features/credentialed-sources/
  partner-feed.ts          # the partner programmes' <job> XML parser and their source, shared by the three
  adapters/nav/            # nav.ts + nav.test.ts
  adapters/jooble/
  adapters/adzuna/
  adapters/talentcom/ adapters/whatjobs/ adapters/jobtome/
test/fixtures/<id>/        # answers made from each provider's documentation, mapped in routes.json
```

- **The family moves to crawl-core.** A source feature imports only crawl-core's ports and registry (`AGENTS.md`), so the second feature that needs `publicFeed` cannot import it from public-feeds; and `src/shared/` must not import crawl-core's ports, which the family uses. So `family.ts` becomes `crawl-core/feed-family.ts` and public-feeds' adapters import it from there (a move, no change of behaviour).
- **No `credentialed` family.** crawl-core's FR-9 already does what the old plan gave it: a source declares `credentialVariables`, the runner disables it without them (no request), names the variables, hands the values to the adapter in `context.credentials`, and cuts them out of failure reasons. Each source here is a `publicFeed` with its variables.
- **Memory instead of the legacy's state files.** Jooble's and Adzuna's day of calls and Adzuna's month and the categories read whole go to the source's memory (`context.remember`); the adverts seen earlier come back through `context.previous` with `keepUnlisted` (thirty days from their day, the legacy's `KEEP_DAYS`). The legacy's "once every 20 hours" becomes the source's cadence of 24 h.
- **Adzuna flagged** with `disabledReason` (as netempregos and ttvic), naming both its terms and its robots.txt.
- **The contract test** gives each source stand-in values for its variables (never real ones) and serves its saved answers; Adzuna's flag is lifted only in its own test.

## 2. Per-source values (from the legacy)

| Source      | Kind | Variables                                   | Cadence | Host pace                         |
| ----------- | ---- | ------------------------------------------- | ------- | --------------------------------- |
| `nav`       | feed | `NAV_TOKEN`                                 | 1 h     | `pam-stilling-feed.nav.no` 100 ms |
| `jooble`    | via  | one of `JOOBLE_KEY`, `JOOBLE_KEYS`          | 24 h    | `jooble.org` 1,200 ms             |
| `adzuna`    | via  | `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` (flagged) | 24 h    | `api.adzuna.com` 2,500 ms         |
| `talentcom` | via  | `TALENTCOM_FEED_URL`                        | 24 h    | the default                       |
| `whatjobs`  | via  | `WHATJOBS_FEED_URL`                         | 24 h    | the default                       |
| `jobtome`   | via  | `JOBTOME_FEED_URL`                          | 24 h    | the default                       |

## 3. Adapter task

The standard adapter check of `features/002-public-feeds/plan.md` section 2, with fixtures made from the provider's documented answer (none of these can be read live without a key), adapters under `src/features/credentialed-sources/adapters/<id>/`. The legacy's own functions (`activeAds`, `toRaw`, `keys`, `planOf`, `detailsUrl`, `parseJobFeed`) are ported with their behaviour and tested on the legacy's examples.

## 4. Decisions (2026-11-25, operator)

- **Adzuna ported and flagged.** Why: its free tier is for evaluation and a site with ads needs a licence; its API host's robots.txt closes it to every bot. The code stays ready for an agreement that includes leave to read.
- **France Travail to 015.** Why: the legacy reads its public site without a key, with a backlog of offers' pages between passes, the portals' pattern.
- **One source per partner programme.** Why: each has its own credit and terms, its status shows on its own, and a feed's failure does not hide the others'.
