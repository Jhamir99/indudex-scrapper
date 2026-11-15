# Spec: Public feeds

Status: draft. Split on 2026-11-15 from spec 001 ("Legacy sources scraper", waves 1 and 2).

## 1. Context and goal

The legacy project reads about forty public employment services and open-data feeds across Europe, one module each (`builder/adapters/*.mjs`). They are the most reliable sources: documented, public and openly licensed. `crawl-core` provides the shared behaviour (politeness, cadence, failure isolation, validation, storage).

**Goal:** port every legacy public employment-service and open-data feed onto `crawl-core`, so the pile has the same public coverage as before, with each source described only by what is specific to it.

**Why:** these feeds are the base of the pile and the reference for every other source family.

## 2. Users

- **Operator**: enables, monitors and stops the feeds through `crawl-core`.
- **Processor** (downstream): reads their validated adverts from the store.

## 3. User stories

- As the operator, I want every public feed of the legacy project available so that the pile is as complete as it was before.
- As the operator, I want adding a new feed to mean describing only its address, licence and fields so that new feeds are cheap.

## 4. Functional requirements

**FR-1 — Coverage.**
The scraper shall support every public employment-service and open-data feed of the legacy project: brz, nav, jobindex, island, kuntarekry, valtiolle, jobtech, infopraca, solidjobs, mpsv, nva, upsvr, hungary, hzz, anofm, cyprus, iefp, netempregos, sef, sne, spin, ttvic, brandenburg, bund, karrierenrw, linz, ooe, ifgat, actiris, forem, vdab, emilia, trento, brescia, bolzano, uzt, lanbide, sae, madrid, jcyl, clm, emcan, gencat, feinaactiva and escoladeltreball.
_Acceptance:_ For each one there is a source here, verified against a saved sample of its real response. A source found to need a key moves to `credentialed-sources`; one found to be a portal moves to `job-portals`.

**FR-2 — One family for feeds.**
Feeds shall share one way of being read (robots check, fetch, empty-feed failure, field mapping).
_Acceptance:_ A feed on the family provides only its address, licence and field mapping.

**FR-3 — Reference source first.**
The first feed ported shall be `brz` (Austria's Bundesrechenzentrum, CC BY 4.0, one call), which proves the family and `crawl-core` end to end before the rest.
_Acceptance:_ `brz` passes its fixture test and the shared contract test before any other feed is ported.

**FR-4 — Per-source terms.**
Where a feed's terms or `robots.txt` ask for a cadence or pace different from the default, the source shall use it.
_Acceptance:_ Starting from the legacy values: NAV and Jobindex every hour; `bund` 30 s between pages; `hungary` one category per pass, about a dozen requests.

**FR-5 — Core rules.**
Every feed shall run through `crawl-core`, so its stored adverts meet `crawl-core` FR-1 (common format) and FR-2 (licence and attribution).
_Acceptance:_ The shared contract test passes with every feed registered.

## 5. Non-functional requirements

- **Testability:** every feed is covered by a parser test against a saved response; no test needs the network.
- **Legality:** only feeds whose terms allow republishing are enabled (see open questions).

## 6. Edge cases

- A feed's format changes: handled by `crawl-core` (failed, previous adverts kept).
- A legacy feed no longer works at all: it is ported anyway, disabled and flagged, so the operator can decide whether to drop it.

## 7. Out of scope

- The shared behaviour (`crawl-core`), sources behind a key (`credentialed-sources`), portals (`job-portals`), career sites and ATS platforms (`career-sites`).
- New feeds that do not exist in the legacy project.

## 8. Completion criteria

- Every feed of FR-1 exists here, enabled or disabled with a clear status, and passes its fixture test and the contract test.
- The list of ported sources in `MEMORY.md` is up to date.

## 9. Open questions

- [NEEDS CLARIFICATION] The legacy keeps `netempregos` and `ttvic` out of its source list (`builder/sources.mjs`): Net-Empregos' terms forbid commercial use and TT Vic's legal notice asks for express leave. Port them disabled and flagged until leave is given, or drop them?
