# Spec: Dedupe

Status: approved (2026-11-22). Requirements written from the outline with the operator's answers of 2026-11-22: the title as published (the legacy's tidying) is ported now, shared, so dedupe and the publication read the same title; the takedowns' copies are dropped by a function of this feature, which `010-publication` calls with the list it reads; one address rule, the legacy's, is shared by dedupe and the scrapper's takedowns.

## 1. Context and goal

The same advert reaches the store more than once: two sources carry it, a board and a feed both list it, an aggregator re-posts it under its own address, a Catalan board writes in Catalan what a Spanish one writes in Spanish. The legacy kept one copy of each (`builder/dedupe.mjs`): first by address (`normUrl` in `builder/normalise.mjs`), then by the role (company and title) in the same place, preferring the page the employer maintains. It compared the title as it published it (`toRecord` in `builder/normalise.mjs`: Argus's `cleanTitle`, `withoutBoardTail`, `withoutCodes`, `withoutClutter`, cut at 250 letters), and the same module dropped every copy of an advert taken down (`withoutTaken`).

**Goal:** keep one copy of each advert across sources, the employer's own page first, with what the other copies say and it does not; give the publication the title it shows; and drop every copy of an advert taken down.

**Why:** a visitor sees a job once, linked to the page the employer keeps, and a takedown removes the advert wherever it was copied.

## 2. Users

- **Processor's steps** (downstream): the publication writes the copies kept, their titles, and the copies a campaign stands for.
- **Visitors** (through the API and the web): see each job once.
- **Operator**: a takedown of one address removes its copies from other sources too.

## 3. User stories

- As a visitor, I want a job an employer's careers site and a public feed both list to appear once, linked to the careers site.
- As a visitor, I want «Tècnic/a de manteniment» and «Técnico/a de mantenimiento» of the same company in the same town to be one offer.
- As a visitor, I want an agency's campaign "in any of our locations" to appear once per country, found in each of its towns.
- As the operator, I want a takedown of an advert to remove the copy Adzuna or Jooble carries too.

## 4. Functional requirements

### Part A — The title as published

**FR-1 — The title tidied.**
An advert's title shall be published as the legacy published it: in composed letters, without characters that show nothing, its spaces collapsed; without the gender marks and dangling dashes Argus's `cleanTitle` takes off, a board's text around it (LilyLifestyle's "Job in …", «Architektur Stellen», «Obserwuj ofertę», a board's label before a colon or bar, Talent Partners' list, a UK place repeated in brackets), the advert's own codes (a list's number, a «#» code, a reference at its end; a German rank, a year and «C#» kept), and clutter (pictures, markup, labelled phones); a title over 250 letters cut at its last word.
_Acceptance:_ Tests on the legacy's examples (`test/tidy-names.test.mjs`, `test/builder.test.mjs`) and a golden set of the legacy's readings of real titles.

### Part B — One copy of each advert

**FR-2 — The same address.**
Two adverts at the same address shall be one: the address without its tracking parameters (`utm_*`, `gclid`, `fbclid`, `msclkid`, `clickid`, `click_id`, `campaign_id`, `source`, `ref`), its fragment (a `#/` route kept) and its trailing slash. The scrapper's takedowns read addresses by the same rule.
_Acceptance:_ Tests on the legacy's examples (a `utm_source` and a `#top` dropped, Lanbide's `IDRG` kept, Latvia's `#/pub/vakances/…` kept); the takedowns' tests pass with the shared rule.

**FR-3 — The same role in the same place.**
Two adverts shall be one when their company and title are the same role in the same place: the company read as one name (an ATS's code before it, a legal form, the country, «Group», a careers page's word or a web ending after it, «The» or «Grupo» before it, never cut to a word that names no one), the title without gender marks, percentages of time, odd dashes and trailing signs, a Catalan title read in Spanish; the place the GeoNames town, else the country and the town as written. An advert whose company names no one (none, «(m/w/d)», Adzuna, LinkedIn) is never joined by its role.
_Acceptance:_ Tests on the legacy's examples (Munich and München one place; Madrid and München two offers; «3530 Kyndryl España, S.A.U.» is kyndryl; «The Company» stays).

**FR-4 — A campaign and a remote job.**
The same role in more than ten towns shall be one offer per country; a fully remote job (its work mode says remote, or its title: «100 % remote», «full remote», «télétravail complet») one offer wherever its copies are, and a copy that names no work mode in a place where a remote copy of the same job is filed is that job (one that says on site or hybrid is not). The copy kept lists the copies it stands for, so the place search finds it in each of their towns.
_Acceptance:_ Tests on the legacy's examples (twelve towns kept once per country with every town; three towns kept three times; EWOR's remote role kept once; an on-site copy kept apart).

**FR-5 — Which copy is kept.**
Of two copies, the employer's own page (a careers site or ATS board) shall beat a public feed's, and a feed's beats a portal's or an intermediary's; of the same kind, the one posted first, a copy naming no day losing to one that names one; on the same day, the lower address, so the copy kept does not hang on the order the sources are read in. The copy kept takes from the others what it does not say: the work mode, the pay with its yearly euros, the last day to apply, the years asked.
_Acceptance:_ Tests on the legacy's examples (a board's copy kept over a feed's; the earlier day kept; the same pair in either order keeps the same copy; the pay inherited).

**FR-6 — The copies of an advert taken down.**
Given the adverts taken down (read by the publication from the takedowns list), every copy of the same role in the same place shall be dropped, whatever source carries it.
_Acceptance:_ Tests on the legacy's example (Acme's Process Engineer in Madrid taken down from one source, its copy from another gone, Acme's Process Engineer in Bilbao kept).

**FR-7 — Counted, pure and offline.**
Dedupe shall report how many copies fell by address and by role, need only the adverts given as plain values (from places, companies, advert facts, pay and the gate), and give the same result for the same input. Of copies of one role, the one kept shall not hang on the order the sources are read in; of copies at one address from sources of the same kind, the first read is kept, as the legacy did.
_Acceptance:_ Tests run with no network; copies of one role shuffled keep the same copy.

## 5. Non-functional requirements

- **Testability:** every rule ported from the legacy comes with the example its test or comment names.
- **Equivalence:** over a real store, the titles published and the copies kept (and the counts by address and by role) are the legacy's, checked by running the legacy's functions on the same input.
- **Speed:** deduping every gated advert of the store takes under a minute on the server.
- **Measured:** before the feature closes, a pass over a real store reports the copies that fell by address and by role, and how many campaigns and remote jobs were joined.

## 6. Edge cases

- A title written with decomposed accents: the same title as its copies in composed letters (the legacy's NOA-22).
- A Catalan word that is a property of every object («constructor»): never read from the table (the legacy's NOB-15).
- A company and title with no place: compared by its country, or by nothing when it has none.
- An address that is not a URL: compared as written, trimmed.
- A long run of letters or of "(m m m …" in a title: the patterns do not backtrack on it (Argus's `titleKey` rule).

## 7. Out of scope

- Mending letters a source sent broken (`mendedText`) and cutting a field at 500 letters before reading it: `010-publication`, which reads every field first; dedupe and the title take the field as given.
- The day an advert was posted when its source names none (read from its text, or the day it was first seen): `010-publication` gives it as an input.
- Reading the takedowns list for the processor and the advert's published id: `010-publication`.
- A copy kept apart by a near-identical title (a word more or less): the legacy did not join them, and neither does this.

## 8. Completion criteria

- FR-1 to FR-7 pass their acceptance tests, and `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:run && pnpm build` is green.
- The measurement of section 5 is recorded in `tasks.md`.

## 9. Open questions

- None. (2026-11-22: the title tidied now, shared; `withoutTaken` here, called by 010; one address rule, the legacy's.)
