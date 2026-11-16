# Features

One folder per feature, `NNN-<feature>/`, numbered in the order the features must be built: `spec.md` (what and why), `plan.md` (how, generated from the spec) and `tasks.md` (generated from the plan). A feature's code lives in `src/features/<feature>/` (no number); what two or more features use lives in `src/shared/`.

Status: **outline** (context and legacy references only; requirements still to write with `/spec`), **draft** (spec written), **planned** (plan and tasks approved), **in progress**, **done**.

The legacy project (`JustJans/indudex`) was split into these features on 2026-11-15. The old spec 001 ("Legacy sources scraper") became `001-crawl-core`, `002-public-feeds`, `014-credentialed-sources`, `015-job-portals` and `016-career-sites`.

## Order

A feature starts when the ones before it are closed. The order reaches a first published pile as early as possible: the core and the public feeds (002) are enough for the processor (003-010) to publish something the API and the web can use, and the cron (012) runs it unattended. The remaining sources (014-016) and discovery (017) then add coverage to a pipeline that already works.

| #   | Feature                                           | Process   | Status      | What it covers                                                                           |
| --- | ------------------------------------------------- | --------- | ----------- | ---------------------------------------------------------------------------------------- |
| 001 | [crawl-core](001-crawl-core/)                     | scrapper  | in progress | Runner, cadence, backoff and parking, polite HTTP, store, status, stop switch, takedowns |
| 002 | [public-feeds](002-public-feeds/)                 | scrapper  | planned     | Public employment services and open-data feeds (about 45), `brz` first as reference      |
| 003 | [catalogues](003-catalogues/)                     | processor | outline     | ISCO/ESCO families and titles, countries, towns, NUTS, languages, degrees, vetoes        |
| 004 | [places](004-places/)                             | processor | outline     | Country, town with coordinates, and region of each advert                                |
| 005 | [advert-facts](005-advert-facts/)                 | processor | outline     | Work mode, contract, working time, years, degrees and languages asked, title tidying     |
| 006 | [pay](006-pay/)                                   | processor | outline     | Stated pay, period and currency, converted with ECB rates                                |
| 007 | [gate](007-gate/)                                 | processor | outline     | In-scope occupations, skilled trades, Europe only, hygiene, `--explain`                  |
| 008 | [companies](008-companies/)                       | processor | outline     | Employer names and keys, agencies, company directory and cards                           |
| 009 | [dedupe](009-dedupe/)                             | processor | outline     | One copy of each advert across sources                                                   |
| 010 | [publication](010-publication/)                   | processor | outline     | Processor entry, shards, indexes, metadata, versioned dataset, shrink guard              |
| 011 | [title-translation](011-title-translation/)       | processor | outline     | Titles into every locale on our own server, cached per title                             |
| 012 | [operations](012-operations/)                     | both      | outline     | Cron, locks, alerts, backups, stop file                                                  |
| 013 | [closed-adverts](013-closed-adverts/)             | scrapper  | outline     | Adverts whose page or title says the job is filled                                       |
| 014 | [credentialed-sources](014-credentialed-sources/) | scrapper  | planned     | Sources behind a key (Adzuna, Jooble, France Travail), delivered disabled                |
| 015 | [job-portals](015-job-portals/)                   | scrapper  | planned     | Commercial portals whose terms allow it, with a backlog between runs                     |
| 016 | [career-sites](016-career-sites/)                 | scrapper  | planned     | Employers' careers sites (sitemap + `JobPosting`) and ATS platforms, as data             |
| 017 | [source-discovery](017-source-discovery/)         | scrapper  | outline     | Hunter and scouts that find new careers sites and boards                                 |

Why this order inside the processor: the catalogues come first because most steps read them; `gate` needs places and facts; `companies` needs the gate's occupation groups; `dedupe` needs places and companies; `publication` runs every step; translations are applied by a publication that already works. `source-discovery` is last because it fills the lists `career-sites` reads and keeps only boards the gate accepts.
