# Spec: Advert facts

Status: approved (2026-11-19). Requirements written from the outline with the operator's answers of 2026-11-19: one feature in two parts (the facts the sources state, then the requirements read from the text), and the contract and working time read from fields the adapters fill, added to the stored advert.

## 1. Context and goal

The visitor's browser applies the profile's rules (work mode, contract, years of experience, degrees, languages) without the advert's text, which is never published. So the processor reads those facts from each advert once and publishes them as fields. The legacy did it in `builder/work-mode.mjs`, `builder/contract.mjs`, `builder/years.mjs`, `builder/screens.mjs` and `builder/calm-titles.ts`, with the years reader of Argus (the matching rules, copied into this repo as `AGENTS.md` says).

**Goal:** read from each advert the facts the filters and the matching rules need, leaning to reading less: a demand read where there is none leaves a good offer out.

**Why:** the gate and the web's filters work on these fields, and the text they come from never leaves the processor.

## 2. Users

- **Processor's steps** (downstream): the gate and the publication read the facts.
- **Visitors** (through the API and the web): filter by work mode, contract and working time, and are matched on years, degrees and languages.
- **Adapters** (upstream): fill the source's own contract and hours fields.

## 3. User stories

- As a visitor who wants remote work, I want an offer that says «Work Model: Hybrid» to count as hybrid, and one that says nothing to count as unknown, not on site.
- As a visitor with 3 years of experience, I want an offer asking for 5 years left out, and one that says «5 years is a plus» kept.
- As a visitor who speaks no German, I want an offer that requires German left out, and one where German is «von Vorteil» kept.

## 4. Functional requirements

### Part A — What the source states

**FR-1 — The source's contract and hours fields.**
The stored advert shall carry, when its source states them in fields of their own, the source's contract (`contract`), hours (`hours`) and employment types (`employmentType`, a list) as the source wrote them, and the years of experience it states (`years`). These are optional fields added to the advert, with no format bump; adapters whose source has them fill them.
_Acceptance:_ The advert schema accepts and validates them; an advert written before them still reads; each public feed whose legacy adapter set them (`actiris`, `bolzano`, `escoladeltreball`, `feinaactiva`, `gencat`, `infopraca`, `jobtech`, `kuntarekry`, `valtiolle`, `mpsv`, `iefp`, `upsvr`, `vdab`, `sae`, `clm`, and `forem`, disabled) fills them, checked by its fixture test.

**FR-2 — Contract and working time.**
The contract kind (permanent, temporary with its months, agency work, agency work or temporary with the option to stay, training, freelance) and the working time (full time, part time with its hours a week) shall be read only from those fields: never from the advert's words, nor an agency's name. A list that names two different kinds or hours says neither.
_Acceptance:_ Tests on the legacy's examples per language («Interim met optie vast werk», «CDI Intérimaire», «contratto a tempo determinato 12 mesi», «FULL_TIME, PART_TIME» says nothing).

**FR-3 — Work mode.**
The work mode (on site, hybrid, remote, or not said) shall be read from the source's field when it states it, else from a LinkedIn tag (#LI-Remote, #LI-Hybrid), a location that names remote work instead of a place and a mode written as a field of its own («Work Model: Hybrid») when they agree, then the title, last a sentence that states it. A bare word is not enough.
_Acceptance:_ Tests on the legacy's examples for each way, and a text that only mentions «remote» in passing reads as not said.

**FR-4 — Titles in capitals.**
A title written in capitals (eight letters at least, seven in ten of them capitals) shall be written the way the other titles write each word: the spelling the other titles use most for that word when it appears three times or more («IOT» is «IoT», «DEVOPS» «DevOps»), its acronyms kept, small words small inside the title.
A source whose terms ask that its content not be altered (`config/untranslated.yml`) keeps its titles as written (added 2026-11-19, as the legacy did).
_Acceptance:_ Tests on the legacy's examples; a title not in capitals is never changed; a title of such a source is never changed.

### Part B — What the advert asks for

**FR-5 — Years of experience.**
The years asked shall be the largest number of years of experience the advert names, read one sentence at a time with Argus's reader (the sentence with the short line before it when alone it says nothing), in the languages the legacy read: a range keeps its low end, «less than 3 years» is a ceiling and asks nothing, a number of years that is not experience («5 years warranty», the company's age) asks nothing. A source's own stated years are believed.
_Acceptance:_ Tests on the legacy's examples («3+ years of backend experience», «Entre 7 et 12 ans», «tra 3 e 5 anni», «minimum 5 ans», «less than 3 years»).

**FR-6 — Degrees demanded.**
The degree families (from the `degrees` catalogue) an advert demands shall be read from its text by the catalogue's stems, only where a sentence demands the degree: one named as «a plus», «desirable» or «not required» does not count.
_Acceptance:_ Tests on the legacy's examples in each language, and a degree named only as a plus gives none.

**FR-7 — Languages required.**
The languages (from the `languages` catalogue) an advert requires shall be read from its text by the catalogue's names, only where they are demanded («fluent German», «Deutschkenntnisse erforderlich»): one that is «a plus», «von Vorteil» or «souhaité» does not count, nor the country («Germany») or another word that starts the same («polished»).
_Acceptance:_ Tests on the legacy's examples in each language.

**FR-8 — Pure and offline.**
Reading the facts shall need only the advert, the catalogues and, for titles, the other titles of the same build: no network, and the same input gives the same facts.
_Acceptance:_ Tests run with no network; reading an advert twice gives equal results.

## 5. Non-functional requirements

- **Testability:** every rule ported from the legacy comes with the example its comment names.
- **Speed:** reading the facts of every stored advert takes under two minutes on the server.
- **Measured:** before the feature closes, a pass over a real store reports, per source, the share of adverts with a work mode, a contract, a working time, years, degrees and languages.

## 6. Edge cases

- A source field holds a value the readers do not know: that fact is not said, never guessed.
- A text with no sentences (one long line, a list with no full stops): read line by line, as the legacy did.
- A very long text: read up to the store's cap; the patterns avoid nested repetitions (the legacy's NOB-11).

## 7. Out of scope

- Pay (`006-pay`), places (`004-places`), employers and agencies (`008-companies`).
- Other title cleaning the legacy did in `normalise.mjs` (codes, board tails, clutter, long titles cut at a word): decided with the gate (`007-gate`), which reads the titles.
- Languages a source states in a field of its own (France Travail's «indispensable»): with `014-credentialed-sources`, its only source.
- Writing the facts into the published dataset: `010-publication`.

## 8. Completion criteria

- FR-1 to FR-8 pass their acceptance tests, and `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:run && pnpm build` is green.
- The measurement of section 5 is recorded in `tasks.md`.

## 9. Open questions

- None. (2026-11-19: one feature in two parts; contract and hours from source fields added to the stored advert.)
