# Features

One folder per feature, `NNN-<feature>/`, numbered in the order the features must be built: `spec.md` (what and why), `plan.md` (how, generated from the spec) and `tasks.md` (generated from the plan). A feature's code lives in `src/features/<feature>/` (no number); what two or more features use lives in `src/shared/`.

Status: **outline** (context and legacy references only; requirements still to write with `/spec`), **draft** (spec written), **planned** (plan and tasks approved), **in progress**, **done**.

The legacy project (`JustJans/indudex`) was split into these features on 2026-11-15. The old spec 001 ("Legacy sources scraper") became `001-crawl-core`, `002-public-feeds`, `014-credentialed-sources`, `015-job-portals` and `016-career-sites`.

## Order

018 (legacy resync) is done out of order, right after 015 and before 016, at the operator's request of 2026-11-26: 016 reuses the readers it brings up to date.

A feature starts when the ones before it are closed. The order reaches a first published pile as early as possible: the core and the public feeds (002) are enough for the processor (003-010) to publish something the API and the web can use, and the cron (012) runs it unattended. The remaining sources (014-016) and discovery (017) then add coverage to a pipeline that already works.

| #   | Feature                                           | Process   | Status      | What it covers                                                                                                   |
| --- | ------------------------------------------------- | --------- | ----------- | ---------------------------------------------------------------------------------------------------------------- |
| 001 | [crawl-core](001-crawl-core/)                     | scrapper  | done        | Runner, cadence, backoff and parking, polite HTTP, store, status, stop switch, takedowns                         |
| 002 | [public-feeds](002-public-feeds/)                 | scrapper  | done        | Public employment services and open-data feeds (44), `brz` first as reference                                    |
| 003 | [catalogues](003-catalogues/)                     | processor | done        | ISCO/ESCO families and titles, countries, towns, NUTS, languages, degrees, vetoes                                |
| 004 | [places](004-places/)                             | processor | done        | Country, town with coordinates, and region of each advert                                                        |
| 005 | [advert-facts](005-advert-facts/)                 | processor | done        | Work mode, contract, working time, years, degrees and languages asked, title tidying                             |
| 006 | [pay](006-pay/)                                   | processor | done        | Stated pay, period and currency, converted with ECB rates                                                        |
| 007 | [gate](007-gate/)                                 | processor | done        | In-scope occupations, skilled trades, Europe only, hygiene, `--explain`                                          |
| 008 | [companies](008-companies/)                       | both      | done        | Employer names and keys, agencies, company directory and cards                                                   |
| 009 | [dedupe](009-dedupe/)                             | processor | done        | One copy of each advert across sources                                                                           |
| 010 | [publication](010-publication/)                   | processor | done        | Processor entry, shards, indexes, metadata, versioned dataset, shrink guard                                      |
| 011 | [title-translation](011-title-translation/)       | processor | done        | Titles into every locale on our own server, cached per title                                                     |
| 012 | [operations](012-operations/)                     | both      | in progress | Cron, locks, alerts, backups, stop file                                                                          |
| 013 | [closed-adverts](013-closed-adverts/)             | processor | done        | Adverts whose page or title says the job is filled                                                               |
| 014 | [credentialed-sources](014-credentialed-sources/) | scrapper  | done        | Sources behind a key (NAV, Jooble, partner feeds; Adzuna flagged), delivered disabled                            |
| 015 | [job-portals](015-job-portals/)                   | scrapper  | done        | Portals and agencies under the legacy's rule (211 of 865), remote boards, France Travail; a backlog between runs |
| 016 | [career-sites](016-career-sites/)                 | scrapper  | spec        | Employers' careers sites, platform sites, 28 ATS boards and JS vendors as data (~26,000), at the legacy's pace   |
| 017 | [source-discovery](017-source-discovery/)         | scrapper  | outline     | Hunter and scouts that find new careers sites and boards                                                         |
| 018 | [legacy-resync](018-legacy-resync/)               | both      | done        | Every ported module brought up to the legacy's current behaviour (done before 016)                               |
| 019 | catalogue-tools                                   | processor | planned     | The legacy's tools that rebuild the catalogues (isco-esco, places, NUTS, occupations, families, title indexes)   |

Later, not numbered yet (from 010's decisions of 2026-11-22): **incremental builds** (the legacy's `builder/pile-cache.mjs`), only if the measured whole build calls for it (48 s on the Mac for the store of 2026-11-19). The tools an advert names (`tk`) came with 018. After 016 (the operator, 2026-11-27): 019 catalogue-tools, until then the catalogues are imported from the legacy as in 018; and **indudex-matching**, the matching rules in a shared versioned package that replaces their copies here and in the web.

Why this order inside the processor: the catalogues come first because most steps read them; `gate` needs places and facts; `companies` needs the gate's occupation groups; `dedupe` needs places and companies; `publication` runs every step; translations are applied by a publication that already works. `source-discovery` is last because it fills the lists `career-sites` reads and keeps only boards the gate accepts.
