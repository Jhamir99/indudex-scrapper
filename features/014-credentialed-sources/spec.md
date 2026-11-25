# Spec: Credentialed sources

Status: approved (2026-11-25). Split on 2026-11-15 from spec 001 ("Legacy sources scraper", wave 3); requirements rewritten with the operator's answers of 2026-11-25: Adzuna is ported but flagged off (its terms ask a licence agreement for a site with ads, and its API host's robots.txt closes it to every bot), so a key alone does not switch it on; France Travail moves to `015-job-portals`, since the legacy reads its public site without a key; the partner programmes' XML feeds (Talent.com, WhatJobs, Jobtome) come here, one source each, their addresses kept as secrets.

## 1. Context and goal

Some legacy sources need something only the operator can obtain: a token, a key, or the address a partner programme gives once signed up. The legacy read four of them: NAV's job feed for Norway (`NAV_TOKEN`), Jooble's partner API (`JOOBLE_KEY` or one key per country), Adzuna's API (`ADZUNA_APP_ID`, `ADZUNA_APP_KEY`), and the partner programmes' XML feeds (`VIA_FEEDS`). None of those values exists for this rewrite yet. `crawl-core` FR-9 already defines how a source with missing credentials behaves: disabled, no request made, the status naming the missing variable.

Jooble, Adzuna and the partner feeds are intermediaries: the site shows their adverts in a section of their own, after the employers' own, each linking to the intermediary's page as its programme asks (source kind `via`). NAV is a public employment service (kind `feed`).

**Goal:** port every legacy source that needs credentials, delivered disabled until its value exists, so that setting it in `.env` is the only step left (for Adzuna, also an agreement and removing its flag).

**Why:** NAV gives every job ad in Norway, which no other source covers; the intermediaries add adverts from employers no other source reaches. Porting them now keeps the parsing ready for when the keys arrive.

## 2. Users

- **Operator**: asks for the tokens and keys, sets them in `.env`, reads in the status which sources wait for one.

## 3. User stories

- As the operator, I want a keyed source to switch on as soon as I set its value, with no code change.
- As the operator, I want the status to say which variable a source waits for, never its value.
- As the operator, I want Adzuna to stay off even if a key is set, until its agreement exists.

## 4. Functional requirements

**FR-1 — Coverage.**
The scraper shall carry these sources: `nav`, `jooble`, `adzuna`, `talentcom`, `whatjobs`, `jobtome`, plus any other keyed source found while porting 015 and 016.
_Acceptance:_ Each one's parser is checked against a saved answer built from the provider's documented response (no real key is ever used in tests), and each is registered.

**FR-2 — Disabled until keyed.**
While a source's variables are missing or blank, the source shall be disabled, make no request, and the status shall name the missing variables, never a value.
_Acceptance:_ With no variable set, every source of this feature shows as disabled with its variables; with a stand-in value, it runs against its saved answer; no value appears in a log line, a failure reason or the store.

**FR-3 — NAV.**
`nav` shall read NAV's job feed (a log of changes, the last six months of it, about 380 pages, `NAV_TOKEN` as a bearer token) and keep the last state of each ad, publishing only the active ones, every hour, as NAV's terms ask that an ad marked inactive leave at once.
_Acceptance:_ The legacy's examples: the last item of an ad decides; an inactive ad is left out; the town is written in title case.

**FR-4 — Jooble.**
`jooble` shall ask Jooble's partner API, once a day, for the newest adverts of a few searches per country (engineer, technician and developer in the country's language, two pages each) within 200 calls a pass, stop at its first "too many requests", and keep an advert seen earlier for thirty days from its day, as the legacy did; one key for all countries (`JOOBLE_KEY`), or one per country (`JOOBLE_KEYS="es=…,de=…"`).
_Acceptance:_ The legacy's mapping and search plan on saved answers; the budget and the 429 stop on a stand-in server.

**FR-5 — Partner programmes' feeds.**
`talentcom`, `whatjobs` and `jobtome` shall each read the XML feed whose address its own variable holds (`TALENTCOM_FEED_URL`, `WHATJOBS_FEED_URL`, `JOBTOME_FEED_URL`), the usual `<job>` schema in whichever names the feed uses, at most 50,000 adverts a feed, once a day, each advert linking to the programme's page.
_Acceptance:_ The legacy's parser cases on a saved feed in each naming; the feed's address never appears in a log line.

**FR-6 — Adzuna, ported but flagged.**
`adzuna` shall be ported as the legacy read it (the newest adverts per European country and category once a day, Spain read deeper, 200 calls a day and 2,400 a month counted in its memory, its own pay only when not estimated, links to Adzuna's details page, "Jobs by Adzuna" as its credit), and shall stay disabled with its reason whatever keys are set, until the operator removes the flag.
_Acceptance:_ The legacy's mapping, plan and budget on saved answers with the flag lifted in the test; registered, it shows as flagged.

**FR-7 — Core rules.**
Every source shall run through `crawl-core` and meet its FR-1 (common format), FR-2 (licence and attribution: "Jobs by Adzuna", "via Jooble", "Kilde: NAV, arbeidsplassen.no", "via Talent.com", …), FR-5 (robots.txt obeyed, no exception), FR-9 (credentials) and FR-11 (cadence).
_Acceptance:_ The shared contract test passes with every source registered; `.env.example` lists every variable.

## 5. Non-functional requirements

- **Security:** tokens, keys and feed addresses only in `.env` (never committed), listed empty in `.env.example`, cut out of every log line and failure reason.
- **Testability:** parser tests run offline against saved answers made from each provider's documentation; no request leaves a test.
- **Politeness:** the legacy's pace per host (NAV 100 ms, Jooble 1.2 s, Adzuna 2.5 s) and robots.txt obeyed. On 2026-11-25 NAV's feed host has none (404), Jooble's leaves `/api/` open, Adzuna's closes everything.

## 6. Edge cases

- A key revoked or expired: the source fails (not silently disabled) and keeps its previous adverts (`crawl-core`).
- Jooble with one key per country and no general one: only the countries with a key are asked.
- A partner feed that answers but holds no `<job>`: the pass fails, as an empty feed does (002).
- NAV's feed that ends before six months: what it gave is read.

## 7. Out of scope

- Obtaining keys, tokens or partner agreements.
- France Travail: `015-job-portals` (read from its public site, no key).
- Reed and other keyed APIs the legacy only listed as pending (`docs/PENDIENTE.md`), never read.

## 8. Completion criteria

- FR-1 to FR-7 pass their acceptance tests; with no keys set, `pnpm crawl:status` shows every source of this feature as disabled with its variables (Adzuna flagged); `.env.example` is complete; `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:run && pnpm build` is green.

## 9. Open questions

- None. (2026-11-25: Adzuna ported and flagged; France Travail to 015; one source per partner programme.)
