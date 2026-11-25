# Spec: Closed adverts

Status: approved (2026-11-25). Requirements written from the outline with the operator's answers of 2026-11-25: the notice is read by the processor, as one more reason in the gate's decision in the legacy's order (no new state, no new crawl); nothing is remembered between builds (the legacy's "closed register", `docs/CERRADAS.md`, turned out to be the list of sources we do not read, not of adverts: it goes to source discovery); the legacy's notices are ported as they are and measured again when the sources that carry them arrive.

## 1. Context and goal

Some sites keep an advert online after the job is filled and only say so on the page («Ovaj oglas nije aktivan», «Deze vacature is niet meer actief», "This position is no longer available") or in its title («Technische/r Zeichner/in – bereits besetzt»). Google asks that a job filled before its end date be removed from job listings (`docs/research/closed-offers.md` in the legacy). The expiry rules (an end date past, a year old, the page gone) do not catch them: the page stays up and the date is still ahead.

The legacy read the notice near the top of each advert's text and in its title (`builder/closed.ts`) while building the pile, between hygiene and the Europe check, and counted the advert as `closed` (2,382 of 694,308 offers, 0.34 %, on 30 October 2026, 80 of 80 in a read sample truly closed). Nearly all came from employers' sites and portals (mojposao.hr 1,368, Dutch municipal job sites, Comarch). On our store of 2026-11-19 (191,466 adverts of the public feeds, which take filled jobs down themselves) the same rule finds none.

**Goal:** an advert whose own text or title says the job is closed is left out of the published dataset, counted and explained like the gate's other reasons.

**Why:** a visitor must not apply to a job that is gone; the published dataset should follow Google's rule for filled jobs.

## 2. Users

- **Visitors** (through the API and the web): see no closed adverts.
- **The operator**: reads how many were left out (`status.json`'s `closed`) and which (`--explain`).

## 3. User stories

- As a visitor, I do not want to open an advert that says "This vacancy is no longer available".
- As the operator, I want to see in `--explain` which adverts were left out as closed, to check the rule does not take open ones.

## 4. Functional requirements

**FR-1 — The notice in the text.**
When an advert's description, in its first 2,000 characters, folded (no accents, lower case), contains one of the legacy's closed notices (Polish, Dutch, German, English, Spanish, Catalan, French, Italian, Portuguese, Croatian, Czech, Swedish, Norwegian, Danish), the advert shall be read as closed. A notice further down shall not count (a page may list other, closed adverts).
_Acceptance:_ The legacy's tests (`test/closed.test.mjs`) pass: the nine notices read on the legacy's pile, the French one with a plain apostrophe, three open adverts, a notice past the top.

**FR-2 — The notice in the title.**
When an advert's folded title contains one of the legacy's closed notices for titles («niet meer beschikbaar», «bereits besetzt», "position filled", «offre pourvue» and the others), the advert shall be read as closed.
_Acceptance:_ The legacy's title cases pass (two closed, one open).

**FR-3 — Left out by the gate, in the legacy's order.**
The gate shall leave a closed advert out with the reason `closed`, after the families and hygiene and before the Europe check, so an advert outside the vertical or failing hygiene keeps that reason, and a closed advert outside Europe is counted closed.
_Acceptance:_ Gate tests for each order; the gate's golden set of the legacy's readings still matches.

**FR-4 — Counted and explained.**
The publication shall count the adverts left out as closed in its counts (`status.json`'s `dropped.closed`), and the gate's `--explain` report shall list each with the reason `closed`.
_Acceptance:_ A publication test with one closed advert finds it out of the offers and counted; an explain test finds its line.

## 5. Non-functional requirements

- **Equivalence:** the rule reads as the legacy's on the same text (its notices byte for byte, the same fold, the same 2,000 characters).
- **Cost:** the check runs only on adverts that passed the families and hygiene, and reads at most 2,000 characters each; the measured gate time on the store does not grow noticeably.
- **Measured:** before the feature closes, the rule is run over the store and the number left out recorded (expected 0 on the public feeds); it is measured again, with a read sample, when 015 or 016 bring the sources that carry such notices.

## 6. Edge cases

- An advert with no description: only its title is read.
- A notice inside a longer sentence that does not close the job («we are no longer accepting applications by post»): the legacy's exception for English («… by / via / through …») is kept.
- An advert closed today and open tomorrow (a site that reopens it): read again at every build; nothing is remembered.
- A title the hygiene already rejects for saying the position is filled («position filled», «stelle besetzt»): it keeps its hygiene reason (hygiene comes first).

## 7. Out of scope

- Remembering closed adverts between builds.
- The legacy's register of sources we do not read (`docs/CERRADAS.md`, `builder/tools/closed-register.ts`): with `017-source-discovery`.
- Notices in further languages (Finnish, Hungarian, Romanian, the Baltic languages, Slovenian, Greek): added with a read sample when the sources that write them arrive.
- Reading the advert's page again to see if it closed: the crawl's passes already drop an advert its source no longer lists.

## 8. Completion criteria

- FR-1 to FR-4 pass their acceptance tests, and `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:run && pnpm build` is green.
- The measurement of section 5 is recorded in `tasks.md`.

## 9. Open questions

- None. (2026-11-25: in the gate; no register; the legacy's notices.)
