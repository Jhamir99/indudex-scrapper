# Spec: Job portals

Status: draft. Split on 2026-11-15 from spec 001 ("Legacy sources scraper", wave 4).

## 1. Context and goal

Since October 2026 the legacy project also reads the commercial job portals whose terms allow it (`builder/config/portals.yml`, `builder/adapters/portals.mjs`), plus a few board-like sources (`boards.mjs`, `jobfeed.mjs`, `remote.mjs`). A portal has many vacancy pages, more than one pass can read, so it keeps a backlog between runs.

**Goal:** port the legacy portals and board-like sources onto `crawl-core`, with the portal list as data and a backlog that carries over between runs.

**Why:** portals add many adverts the public feeds do not carry.

## 2. Users

- **Operator**: adds or removes portals by editing a list, and sees each portal's backlog in the status.

## 3. User stories

- As the operator, I want portals listed as data so that adding one does not need code.
- As the operator, I want a portal with pages left to read to continue in the next run so that big portals are read whole over a few runs.

## 4. Functional requirements

**FR-1 — Coverage.**
The scraper shall support every portal in the legacy portal list and the legacy `boards`, `jobfeed` and `remote` sources, each classified first (a source that turns out to be a feed or a keyed API moves to that feature). It also takes `francetravail` (moved from 014 on 2026-11-25): the legacy reads France Travail's public site without a key, its listings per occupation and département named by its sitemaps, a seventh of them each hour, and each offer's own data through the API its robots.txt leaves open (`builder/adapters/francetravail.ts`).
_Acceptance:_ Each one is verified against a saved sample of its real response.

**FR-2 — Portals as data.**
Portals shall be described in a list (data), not one module per portal.
_Acceptance:_ The list loads and validates, credits the legacy project in its header, and each entry runs through the family against a fixture.

**FR-3 — Backlog between runs.**
While a portal has vacancy pages left to read, it shall be due again in the next run.
_Acceptance:_ Starting from the legacy values: portals every 6 h, and every hour while they have a backlog.

**FR-4 — Page budget and pace.**
The scraper shall respect a page budget per run and per site, and a page a second per host for portals.
_Acceptance:_ Starting from the legacy values: 30,000 portal pages a run, 200 pages a site and pass.

**FR-5 — Core rules.**
Every portal shall run through `crawl-core` and meet its FR-1 (common format) and FR-2 (licence and attribution).
_Acceptance:_ The shared contract test passes with every portal registered.

## 5. Non-functional requirements

- **Legality:** only portals whose terms allow robots and republishing; the ones whose terms forbid it stay off (legacy `docs/CERRADAS.md`).
- **Testability:** offline tests against saved pages.

## 6. Out of scope

- LinkedIn, and any portal whose terms forbid robots or ask for permission.

## 7. Completion criteria

- Every portal source passes the contract test; the CI command is green.

## 8. Open questions

- None at the moment.
