# Spec: Pay

Status: approved (2026-11-19). Requirements written from the outline with the operator's answers of 2026-11-19: the pay a source states in fields of its own is added to the stored advert, and the ECB's rates are fetched by the scrapper and kept in the store, where the processor reads them.

## 1. Context and goal

Visitors can filter by pay and see it on an advert's card, but only pay the advert actually states may be shown: never an estimate. Sources state pay in many ways: in fields of their own (a figure and a period, «1.900 € / Mensual sin prorrata Bruto», a JobPosting's `baseSalary`), in the title («Elektricien €22»), on a labelled line («Rémunération : De 34 000 € à 50 000 € brut par an») or in a sentence of the text. The legacy read all of them (`builder/pay.mjs`, `builder/text-pay.mjs`), checked each figure against the country's minimum wage, and converted it to euros a year with the European Central Bank's reference rates (`builder/exchange-rates.mjs`). Its reasons and measures are in `docs/research/salary.md`.

**Goal:** give every advert that states its pay that pay as written (figures, currency, period), and the top of it in euros a year for the filter; refuse anything unsure.

**Why:** a wrong figure on a card misleads a visitor more than no figure, and the filter compares pay across countries and periods.

## 2. Users

- **Processor's steps** (downstream): the publication writes the pay on the card and the yearly figure for the filter.
- **Visitors** (through the API and the web): read an advert's pay and filter by «at least X a year».
- **Adapters** (upstream): fill the source's own pay fields.
- **The crawl** (upstream): keeps the ECB's rates in the store.

## 3. User stories

- As a visitor, I want an advert that says «1.900 € / Mensual» to show €1,900 a month and count as €22,800 a year in the filter.
- As a visitor in Sweden, I want «35 000 kr i månaden» read as Swedish crowns and compared in euros.
- As a visitor, I want an advert that offers «up to €60,000», a «€5,000 sign-on bonus» or a «€20M Series A» not to show those as its pay.

## 4. Functional requirements

### Part A — What the source states

**FR-1 — The source's pay field.**
The stored advert shall carry, when its source states its pay in fields of its own, that pay as the source gives it (`pay`): the lowest and highest figures (a number or the field's own words, «£35,000 - £40,000»), the currency and the period in the source's words, and the weekly hours and whether the job is part time when the source states them. This is an optional field added to the advert, with no format bump. The public feeds whose legacy adapter set it (`clm`, `feinaactiva`, `infopraca`, `nva`, `mpsv`, `uzt`, `upsvr`) fill it, as the legacy did.
_Acceptance:_ The advert schema accepts and validates it (strict, capped, no figure negative); an advert written before it still reads; each of those adapters fills it, checked by its fixture test.

**FR-2 — The ECB's rates, kept by the scrapper.**
Each crawl run shall fetch the ECB's daily euro reference rates once a day, through the polite client (robots.txt, pace, stop switch), and keep the file in the store, replaced atomically and only by a whole file (a day and at least 25 currencies, with USD, GBP, CHF, PLN and SEK). A failed or partial answer keeps the file kept last time and is logged.
_Acceptance:_ Tests with a fake client: a whole file is kept; a notice page, a cut file or a failure leaves the kept file as it was; a run the same day asks nothing; the stop switch asks nothing.

### Part B — What the processor reads

**FR-3 — Rates read by the processor.**
The processor shall read the kept rates from the store, never the network. Rates older than seven days are read with a warning; with no file, only pay in euros is converted.
_Acceptance:_ Tests on a temporary store: rates read; an old file warns; no file gives euros only.

**FR-4 — A pay field read.**
A pay field shall be read as written: a figure as people write it («45.000», «45,000», «45 000», «3.772,00», «45.000,-», «45k»), a range in one field, its period's words after it («£27,000 p.a.», «16,20 p/u»), the period and currency in the words the sources use (schema.org units, ISO 8601 durations, UN/CEFACT codes, each language's words), a currency named by sign or word only when it names one («€», «zł», «kr» by the country), and the country's currency when none is named. Doubtful grouping, a negative figure, a sign several currencies share with no field to say which, or a word beside the figure is not read.
_Acceptance:_ Tests on the legacy's examples (`test/pay.test.mjs`).

**FR-5 — Pay in the title and the text.**
When the source has no pay field, or one the reader sets aside, the pay shall be read from the title, else the first labelled pay line, else a sentence that names the pay with its figure, a figure called gross, a figure with its period written at once after it, or a line that is a pay band alone, as the legacy did. Never read: a net pay, a ceiling alone («up to», «bis zu»), a bonus, allowance, benefit, price or company money, a statistic about a job («the median wage»), another country's dollar, nor the B2B part of a Polish line that gives both.
_Acceptance:_ Tests on the legacy's examples (`test/text-pay.test.mjs`).

**FR-6 — Field and text together.**
When both give a pay in the same currency and period, the text's shall be shown if the field's is a template below a minimum the text states («Mindestgehalt»), or one end of the band the text gives; else the field's.
_Acceptance:_ Tests on the legacy's examples (Raiffeisen's «Mindestgehalt», «von 4.200,00 bis 5.000»).

**FR-7 — Believable pay only.**
A pay shall be kept only when it is believable: a figure with no period gets one by the country's minimum wage (a month from 80 % to five times it, a year from 90 % of twelve of them and never under €15,000, an hour with its cents) or none; a «month» that is a year's pay is a year («18.000 € al mes» in Spain); in euros a year it lies between €7,000 and €300,000; a range's top is at most five times its bottom. A currency the ECB does not quote gives no pay. The minimum wages are those of 1 January 2026, and a test fails when the year changes, to renew them.
_Acceptance:_ Tests on the legacy's examples for each rule.

**FR-8 — What is given.**
For each advert, the pay as stated (its low figure, or 0 for a ceiling a field states alone, its high figure, its currency's ISO code and its period: hour, day, week, month or year), where it came from (the field or the text), and the top in euros a year (hours a week × 52 for an hourly pay that states them, else 2,080 hours, 260 days, 52 weeks or 12 months a year), rounded to a hundred. A part-time pay by the hour, day or week with no weekly hours gets no yearly figure.
_Acceptance:_ Tests on the legacy's examples; the yearly figure matches the legacy's for each.

**FR-9 — Pure and offline.**
Reading the pay shall need only the advert and the rates: no network, and the same input gives the same pay.
_Acceptance:_ Tests run with no network; reading an advert twice gives equal results.

## 5. Non-functional requirements

- **Testability:** every rule ported from the legacy comes with the example its comment or test names.
- **Equivalence:** a pass over a real store gives the legacy's pay for every advert, checked by running the legacy's readers on the same input.
- **Speed:** reading the pay of every stored advert takes under two minutes on the server.
- **Measured:** before the feature closes, a pass over a real store reports, per source, the share with a pay from a field, from the text and with a yearly figure.

## 6. Edge cases

- A source field holds pay the reader cannot read (empty, 0, «14.73 a year»): the text is read instead.
- A very long text: read up to the store's cap; the patterns avoid nested repetitions (the legacy's DAA-27), started only where a run of spaces starts.
- A pay in US dollars in a European advert is shown in dollars (the owner's choice, 1 November 2026); another country's dollar («CA$») is not read.
- The ECB's file is missing on the first run: pay in other currencies is not converted, and so not kept, until the file is there.

## 7. Out of scope

- Estimating a pay a source does not state, or a pay from an aggregator's estimate (Adzuna's `salary_is_predicted`: `014-credentialed-sources`).
- Pay in JobPosting blocks of company career sites: `016-career-sites` (the shared JobPosting reader gains `baseSalary` here, for `infopraca`).
- Writing the pay into the published dataset: `010-publication`.

## 8. Completion criteria

- FR-1 to FR-9 pass their acceptance tests, and `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:run && pnpm build` is green.
- The measurement of section 5 is recorded in `tasks.md`.

## 9. Open questions

- None. (2026-11-19: the pay field added to the stored advert; the ECB's rates fetched by the scrapper and kept in the store.)
