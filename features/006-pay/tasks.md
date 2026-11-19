# Tasks: Pay

Generated from `spec.md` and `plan.md`. Tasks are ordered by dependency and have a verifiable "Done when". Every task ends with `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:run && pnpm build` green. "Legacy example" means the example the legacy's comment or test for that rule gives.

**Depends:** `advert-facts` closed (its T011).

## Part A — What the source states, and the rates

- [x] **T001 — The source's pay field** · FR: FR-1 · Depends: advert-facts T011
      Done when: `Advert` (and so `AdvertDraft`) accepts an optional strict `pay` (`min`, `max` as a positive number or capped words, at least one of them; `currency`, `period` as capped words; `hoursPerWeek` above 0 and at most 168; `partTime`); tests pass: an advert with it validates, one without it (as stored before) still reads from the file store, a negative figure, an empty pay or an unknown key is refused; the crawl-core contract test still passes for every adapter.
      2026-11-19: done. `SourcePay` in `advert.ts`; the file store keeps it beside adverts stored without it (tested).
- [x] **T002 — Adapters fill the pay** · FR: FR-1 · Depends: T001
      Done when: `job-posting.ts` gives a posting's `baseSalary` as a pay (the legacy's `salaryOf` examples tested); `clm`, `feinaactiva`, `infopraca`, `nva`, `mpsv`, `uzt` and `upsvr` fill `pay` as their legacy adapters did (`clmPay`'s «15.5 € / Hora», `feinaactiva`'s daily hours, `nva`'s period by the minimum wage and «vesela» only), and each fixture test asserts it on at least one advert.
      2026-11-19: done. `statedPay` (`src/shared/kit/stated-pay.ts`) tidies a raw pay into the store's shape (none, 0 or overlong words left out) and `stated()` takes it. The legacy's examples for each adapter are tests. `infopraca`'s saved page states no pay, so its test builds one in its JobPosting form; adverts read before keep their known pay. `nva` now reads `Alga_no`, `Alga_lidz` and `Slodzes_tips`, which its file already had. The text lines some adapters write stay.
- [x] **T003 — The ECB's rates kept in the store** · FR: FR-2, FR-3 · Depends: crawl-core
      Done when: `src/shared/rates/ecb.ts` parses the ECB's file and tells a whole one; `kept-rates.ts` keeps it at `<store>/rates/ecb.xml` and reads it; `crawl()` refreshes it once a day before the sources; tests pass with a fake client and a temporary store: a whole file kept, a notice page, a cut file or a failure leaving the kept one, a second run the same day asking nothing, the stop switch asking nothing, an old file read with a warning, no file giving euros only; the store layout comment lists the file; one live run keeps a real file.
      2026-11-19: done. `RatesKeeper` is a crawl-core port, filled by `FileRatesKeeper` (its file's modification time is the run's time, so the day it was kept is known without another file). `crawl()` takes it as `rates` and asks before the sources, also with `--source`; without it nothing is asked. The fixture is the ECB's file of 19 November 2026 (30 currencies). Live: a `--source uzt` run into a temporary store kept the real file, and a second run the same day did not ask.
- [x] **T004 — Words and sentences shared** · FR: FR-4, FR-5 · Depends: advert-facts T011
      Done when: `words/` and `sentences.ts` live in `src/shared/` (`src/shared/words/`, `src/shared/kit/sentences.ts`) with their tests, advert facts imports them from there, and every advert-facts test, golden sets included, passes unchanged.

      2026-11-19: done. Moved with `git mv`; advert facts imports them from `src/shared/`, and every advert-facts test, golden sets included, passes unchanged. `CLAUDE.md` updated with the move.

## Part B — The readers

- [x] **T005 — Periods, currencies and pay fields** · FR: FR-4 · Depends: T004
      Done when: `periods.ts`, `currencies.ts` and `figures.ts` pass tests on legacy examples: the period words of the sources and each language (`P1Y`, `ANN`, «pro Stunde», «p/maand», «1 YEAR»), a currency by sign or word only when it names one, «kr» and «Fr.» by country, the country's currency when none is named, figures as people write them («45.000,-», «3.772,00», «45k», «Kč» not thousands), a range in one field with its period's words and a remark in brackets, and what is refused (doubtful grouping, a negative figure, a word beside the figure); every field reading of the golden set (`test/fixtures/pay/fields.json`) matches.
      2026-11-19: done. The golden sets come from the legacy itself, run in the scratchpad: its pay tests run through a recorder that keeps every call to `periodOf`, `currencyOf`, `readPay`, `payInText` and `payOfText` (the 49 and 29 legacy checks pass there), then every string of its pay tests (and of `data-audit`, `still-reproducing`, `readers-languages`) read as a period, a currency, a pay field and a text: 6,293 field cases and 2,292 text cases (`test/fixtures/pay/`, read by `test/pay/golden.ts`). Every period and currency reading matches. Periods are words here («month»), the legacy's letters (`m`) mapped in the tests. «75000 OTE» reads as a three-letter currency, as the legacy did, and is refused by the checks (no rate).
- [x] **T006 — Minimum wages and the pay checks** · FR: FR-7, FR-8 · Depends: T005
      Done when: `minimum-wages.ts` and `read-pay.ts` pass tests on legacy examples: a period by the law (month, year, an hour with cents; Britain, Ireland and Malta by the year), «18.000 € al mes» as a year, the believable year and the widest range, a ceiling alone with its 0, part time by its weekly hours, a currency the ECB does not quote refused, the yearly figure to a hundred, and the test that fails when `MINIMUM_WAGE_YEAR` is not this year's; every `readPay` reading of the golden set matches.
      2026-11-19: done. `readPay` gives `{ low, high, currency, period, yearlyEur }` (the legacy's `p` and `pa`); all 3,376 `readPay` readings of the golden set match. A rate is looked up only among the table's own keys, where the legacy's plain object also answered names like `constructor`.
- [x] **T007 — Pay in a line of text** · FR: FR-5 · Depends: T005
      Done when: `text/patterns.ts` and `text/pay-in-text.ts` pass tests on legacy examples: a range and a lone figure, a range that writes its thousands once, the currency beside the figure, the nearest period, a net pay, a statistic, a ceiling, company money, another country's dollar and a year of training refused, a currency written twice and an hour glued to a band; every `payInText` reading of the golden set (`test/fixtures/pay/text.json`) matches.
      2026-11-19: done. The patterns are the legacy's, word for word; every `payInText` reading of the golden set (717 lines) matches. One legacy pattern wrote `(?![\p{L}])` without the `u` flag (the month's «p/m»), where it means none of the characters p, {, L and }: TypeScript refuses it, so it is written as it read, `(?![p{}l])`, with a comment.
- [x] **T008 — Pay in the title and the text** · FR: FR-5 · Depends: T007
      Done when: `text/readers.ts` and `text/pay-of-text.ts` pass tests on legacy examples: the title (a bonus in it refused, under a hundred an hour), the first labelled line that gives a pay, RAL, a sentence with a pay word, a figure around a pay word, a gross figure, a figure with its period, a band alone on its line and a lone Czech month, the B2B part left out; every `payOfText` reading of the golden set matches; a long text with no pay is read in under 50 ms.
      2026-11-19: done. Every `payOfText` reading of the golden set (1,575 titles and texts) matches; a text of about 100,000 characters with no pay is read well under 50 ms on the development Mac.
- [x] **T009 — The pay reader** · FR: FR-3, FR-6, FR-8, FR-9 · Depends: T001, T003, T006, T008
      Done when: `createPayReader({ rates }).pay(advert)` gives `AdvertPay` (validated by its Zod schema) or null, equal on a second read; tests pass on legacy examples for the field and the text together (a template below the text's «Mindestgehalt», a field that is one end of the text's band, a field set aside giving the text's pay); `index.ts` exports only the reader, `AdvertPay` and its types.
      2026-11-19: done. `createPayReader({ rates })` takes the rates `readKeptRates` gives; `pay` reads only the advert's country, title, description and pay (`PayInput`). The legacy read the text after `asLines` and `withoutContacts`; the stored descriptions are already plain text (none of the 191,473 of the fresh store holds markup, 55 an entity), so the reader reads the description as stored, and T010 measures whether that changes any pay.
- [x] **T010 — Measurement and equivalence** · FR: spec section 5 · Depends: T002, T009
      Done when: a live pass of the seven swept adapters into the fresh store fills their pay; a pass over that store records here, per source, the share with a pay from the field, from the text and with a yearly figure, and the time (under two minutes); the legacy's readers, run on the same adverts and rates, give the same pay for every one (differences explained here if any).
      2026-11-19: done. A live pass of the seven adapters (`clm`, `feinaactiva`, `nva`, `mpsv`, `upsvr`, `infopraca`, `uzt`) refilled the fresh store of advert-facts T010 with their pay fields, and the crawl kept the ECB's file of 19 November 2026 there. A pass over that store (191,466 adverts) gives, per source, the share in %:

      | source | adverts | field stated | pay from the field | pay from the text | yearly figure |
      | --- | --: | --: | --: | --: | --: |
      | upsvr | 12,103 | 98.2 | 97.1 | 0.1 | 97.2 |
      | mpsv | 6,277 | 100 | 99.7 | 0.1 | 99.8 |
      | feinaactiva | 4,195 | 72.7 | 68.8 | 0.1 | 68.9 |
      | nva | 1,248 | 74.7 | 74.7 | 0 | 74.7 |
      | clm | 330 | 99.4 | 95.8 | 0 | 95.8 |
      | uzt | 2 | 100 | 100 | 0 | 100 |
      | infopraca | 2,905 | 1.4 | 1.4 | 4.5 | 5.9 |
      | sae | 618 | 0 | 0 | 90.6 | 90.6 |
      | brescia | 117 | 0 | 0 | 40.2 | 40.2 |
      | emilia | 577 | 0 | 0 | 35.5 | 35.5 |
      | sef | 251 | 0 | 0 | 35.5 | 35.5 |
      | solidjobs | 1,760 | 0 | 0 | 33.2 | 33.2 |
      | bolzano | 977 | 0 | 0 | 23.7 | 23.7 |
      | sne | 3,303 | 0 | 0 | 18.4 | 18.4 |
      | emcan | 95 | 0 | 0 | 14.7 | 14.7 |
      | escoladeltreball | 45 | 0 | 0 | 13.3 | 13.3 |
      | kuntarekry | 1,580 | 0 | 0 | 7.3 | 7.3 |
      | vdab | 119,132 | 0 | 0 | 2.2 | 2.2 |
      | actiris | 1,928 | 0 | 0 | 0.9 | 0.9 |
      | the other 19 | 34,023 | 0 | 0 | under 0.2 | under 0.2 |
      | all | 191,466 | 11.8 | 11.6 | 2.7 | 14.3 |

      Reading the pay of every advert took 5.7 s on the development Mac (Node 26), not yet measured on the server. The legacy's readers (its `readPay`, `payOfText` and `normalise.mjs`'s choice between field and text, run in the scratchpad with the same rates) give the same pay for every one of the 191,466 adverts on the stored description. The legacy itself read the text after `asLines` and `withoutContacts`; on that text 23 adverts differ, each a better reading here: in 22 its phone stripping took a pay band joined by a slash («17.000/22.000 euro», «25.000/27.000 EUROS») for a phone number and lost the pay; in one (solidjobs) it read 9,000–18,000 PLN where the line gives the employment band «14 000-18 000 PLN brutto (UoP)». So the processor reads the stored description as it is. Notes: `infopraca` states its pay on its own pages, read 300 a pass, and pages read before the field existed are not read again, so its share rises over later passes; `feinaactiva` and `nva` state no pay on about a quarter of their offers (`nva` only for full-time work); the sources with no pay field and little text pay (anofm, hzz, jobtech, iefp, …) state none, as in the legacy.

- [ ] **T011 — Close pay** · FR: FR-1 to FR-9 · Depends: T001-T010
      Done when: nothing outside the feature imports past `src/features/pay/index.ts` (checked with a search); `CLAUDE.md` ("Intended structure") lists `src/features/pay/`, the advert's `pay`, the moved `words` and `sentences`, the rates file and `refreshRates`; `features/README.md` marks this feature done; the CI command is green.
