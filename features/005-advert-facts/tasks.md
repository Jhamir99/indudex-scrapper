# Tasks: Advert facts

Generated from `spec.md` and `plan.md`. Tasks are ordered by dependency and have a verifiable "Done when". Every task ends with `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:run && pnpm build` green. "Legacy example" means the example the legacy's comment for that rule gives.

**Depends:** `places` closed (its T011).

## Part A — What the source states

- [x] **T001 — The source's contract, hours and years fields** · FR: FR-1 · Depends: places T011
      Done when: `Advert` (and so `AdvertDraft`) accepts optional `contract`, `hours`, `employmentType` and `years`, trimmed, non-empty and capped; tests pass: an advert with them validates, one without them (as stored before) still reads from the file store, a value over the cap or empty is refused; the crawl-core contract test still passes for every adapter.
- [x] **T002 — Adapters fill the fields (1/2)** · FR: FR-1 · Depends: T001
      Done when: `actiris`, `bolzano`, `escoladeltreball`, `feinaactiva`, `gencat`, `infopraca`, `jobtech` and `kuntarekry` with `valtiolle` fill the fields their source has (as their legacy adapters did), and each fixture test asserts them on at least one advert.
      2026-11-19: adapters set the fields through `stated()` (`src/features/public-feeds/stated.ts`: only what the source gives, tidied, capped). `jobtech`'s saved answer was trimmed without those fields, so its test builds a hit in the API's documented form; the others assert them on their fixtures.
- [x] **T003 — Adapters fill the fields (2/2)** · FR: FR-1 · Depends: T001
      Done when: `mpsv`, `iefp`, `upsvr`, `vdab` (with `years`), `sae`, `clm` and `forem` fill the fields, `sae`, `clm`, `vdab` and `forem` from the same values the legacy read from their text, and each fixture test asserts them.
      2026-11-19: `upsvr` also states the years its «Prax» field gives, as the legacy did. `sae` and `clm` state their working day with its word («Jornada completa»), so «Completa» alone is not read without context. `mpsv`'s saved answer lacks the hours fields, so its test builds a vacancy. Adverts read before (between whole passes, from earlier stores) keep what their known copy has; an old page is not read again only to get the fields. Not ported: the languages `mpsv` and `upsvr` state in fields of their own (the legacy's `languages`); they stay in the text for the language reader (T009).
- [x] **T004 — Words and sentences** · FR: FR-3, FR-5 to FR-7 · Depends: places T011
      Done when: the legacy's word lists (`builder/words/*.mjs`, with `anyOf`, `words`, `numbers`) and sentence splitter are in `src/features/advert-facts/words/` and `sentences.ts`, with tests on the legacy's examples (a list with no full stops split by lines, a short heading kept with the line after it).
      2026-11-19: the legacy's tables are one typed module (`words/tables.ts`, generated from `builder/words/*.mjs`). Keeping a short heading with the line after it is the years reader's rule (`years.mjs`), so it is tested in T008.
- [x] **T005 — Contract and working time** · FR: FR-2 · Depends: T001, T004
      Done when: `contract.ts` gives `{ kind, months? }` and `{ kind, hours? }` from the fields, and tests pass on legacy examples: the narrower kind first («Interim met optie vast werk», «CDI Intérimaire»), months and hours read («t6», «p20»), the Dutch, Czech, Italian, French, Swiss, Finnish, Nordic and Polish words of 1 November 2026, `employmentType` values, a list of two kinds or hours saying neither, one kind with and without its months being that kind with them, and no fact from an unknown value.
      2026-11-19: checked against the legacy itself: the legacy's `contract.mjs`, run in the scratchpad with Argus's `text.mjs`, and the port agree on all 520 readings of the values in its test and its research note.
- [x] **T006 — Work mode** · FR: FR-3 · Depends: T004
      Done when: `work-mode.ts` passes tests on legacy examples for each way, in order: the source's field, a LinkedIn tag, a location naming remote work, a labelled field («Work Model: Hybrid»), the title, a stating sentence; tags and location that disagree say nothing; a passing mention of «remote» says nothing.
      2026-11-19: ported rule for rule. Checked against the legacy itself, run in the scratchpad: the same mode for all 188,365 stored adverts of the live runs, and for the 1,716 readings of every text in its `test/work-mode.test.mjs`, kept as a golden set in `test/fixtures/advert-facts/work-mode.json` that the tests check. The legacy's `modeTag` (a tag an adapter read elsewhere) is not a field here: the tag is read in the text.
- [x] **T007 — Titles in capitals** · FR: FR-4 · Depends: T004
      Done when: `calm-titles.ts` passes tests on legacy examples: what counts as capitals (eight letters, seven in ten; «MAßSCHNEIDER»), the spelling the other titles use most when seen three times («IoT», «DevOps»), acronyms kept, small words small inside the title, a title not in capitals unchanged.
      2026-11-19: checked against the legacy, run in the scratchpad: the same 16,274 spellings learnt from the 188,365 stored titles, and the same result for all 10,073 titles in capitals. As the legacy, a source whose terms ask that its content not be altered keeps its capitals: `config/untranslated.yml` (sne, feinaactiva, gencat, madrid, clm, adzuna, solidjobs, bund, each with its clause) is imported from the legacy with `src/shared/config/untranslated.ts`, since title translation (011) reads it too.

## Part B — What the advert asks for

- [x] **T008 — Years of experience** · FR: FR-5 · Depends: T004
      Done when: `argus/requirements.ts` holds the copied `extractRequiredYears` with its header, and `years.ts` passes tests on legacy examples: «3+ years of backend experience» in a list with no full stops, a heading over «7–10 years in heavy industrial construction», «Entre 7 et 12 ans», «tra 3 e 5 anni», «Expérience significative dans le domaine (minimum 5 ans)», «less than 3 years» asking nothing, the largest of several, a source's `years` believed.
      2026-11-19: checked against the legacy with Argus v1.11.0, run in the scratchpad: the same reading for all 188,365 stored adverts (51,249 ask years) and for the 440 readings of every text in its `test/years.test.mjs` and `test/readers-languages.test.mjs`, kept as `test/fixtures/advert-facts/years.json`. As the legacy, the reader gives the largest and the smallest figure (`{ most, least }`): the card shows the largest, the filter reads the smallest (its decision 15, 15 November 2026), so `AdvertFacts.years` carries both.
- [x] **T009 — Degrees and languages** · FR: FR-6, FR-7 · Depends: T004
      Done when: `screens.ts` compiles the `degrees` and `languages` catalogues and passes tests on legacy examples: a degree or language demanded is read, one named «a plus», «von Vorteil», «souhaité», «not required» is not, «Deutschkenntnisse» and «Nederlandstalig» are languages, «Germany» and «polished» are not, a stem matches its endings («fliessend*»).
      2026-11-19: ported rule for rule and checked against the legacy over its own catalogues: the same degrees and languages for all 188,365 stored adverts (2,366 demand a degree, 10,915 a language) and for the 315 texts of its tests that call them, kept as `test/fixtures/advert-facts/screens.json`.
- [x] **T010 — The fact reader and its measurement** · FR: FR-8, spec section 5 · Depends: T002, T003, T005-T009
      Done when: `createFactReader(...).facts(advert)` gives `AdvertFacts` (validated by its Zod schema), equal on a second read; a pass over the stores of the live runs (and a live pass of the swept adapters into a temporary store, for contract and hours) records here per source the share with each fact and the time (under two minutes); a source far below the others has a note.
      2026-11-19: done. `facts` is checked by its schema and equal on a second read. The old stores of the live runs (38 sources, 188,365 adverts, stored before the new fields) give: work mode 8.7 %, years 27.2 %, degrees 1.3 %, languages 5.8 %, 6,654 titles calmed. Each reader matched the legacy itself on every one of those adverts (zero differences). A fresh live pass into a temporary store (191,473 adverts, 38 sources, 1 h 20 min, most of it vdab) gives, per source, the share in %:

      | source | adverts | mode | contract | hours | years | degrees | languages | titles calmed |
      | --- | --: | --: | --: | --: | --: | --: | --: | --: |
      | actiris | 1,928 | 1.2 | 99.5 | 100 | 1.9 | 1.6 | 13.9 | 90 |
      | anofm | 8,843 | 99.8 | 0 | 0 | 19.3 | 0.2 | 0.5 | 0 |
      | bolzano | 977 | 2.1 | 99.6 | 0 | 4.6 | 8.5 | 35.4 | 23 |
      | brz | 60 | 96.7 | 0 | 0 | 86.7 | 25 | 90 | 0 |
      | clm | 330 | 0 | 91.5 | 98.5 | 0 | 0 | 0 | 0 |
      | escoladeltreball | 45 | 4.4 | 88.9 | 0 | 22.2 | 60 | 20 | 0 |
      | feinaactiva | 4,199 | 0.1 | 99.4 | 92.3 | 62 | 8.3 | 49.7 | 0 |
      | gencat | 424 | 0 | 100 | 0 | 0 | 2.4 | 0 | 0 |
      | iefp | 5,739 | 98.3 | 5.2 | 5.1 | 0.3 | 0 | 0.2 | 0 |
      | infopraca | 2,887 | 0 | 0 | 9.5 | 0.2 | 1.5 | 0.5 | 940 |
      | jobtech | 9,753 | 10.4 | 87.1 | 97.6 | 17.9 | 7 | 56.7 | 76 |
      | kuntarekry | 1,580 | 0 | 47.3 | 68.3 | 0.1 | 0 | 8.9 | 3 |
      | mpsv | 6,277 | 0 | 0 | 99.8 | 5.6 | 5.4 | 6.1 | 929 |
      | nva | 1,248 | 0 | 0 | 0 | 0 | 0 | 0 | 1,000 |
      | sae | 618 | 0 | 99.7 | 100 | 2.8 | 5 | 1.1 | 1 |
      | sef | 251 | 0 | 0 | 0 | 15.1 | 8.8 | 8 | 247 |
      | sne | 3,303 | 0.3 | 0 | 0 | 10.4 | 7.6 | 4.1 | 0 |
      | solidjobs | 1,760 | 72.4 | 0 | 0 | 86.7 | 11.4 | 49.9 | 0 |
      | upsvr | 12,124 | 0 | 2.4 | 0 | 0.8 | 0 | 0.6 | 19 |
      | valtiolle | 250 | 0 | 100 | 0 | 0 | 0 | 0.8 | 1 |
      | vdab | 119,132 | 0 | 99.1 | 100 | 36.2 | 0.2 | 0.7 | 3,493 |
      | the other 17 | 9,745 | 0.1 | 0 | 0 | 1.9 | 1.1 | 1.5 | 41 |
      | all | 191,473 | 8.8 | 71.3 | 74.8 | 27.1 | 1.2 | 5.8 | 6,863 |

      Facts for every advert took 22 s on the development Mac (Node 26), not yet measured on the server. Notes: the 17 other sources have no contract or hours fields (brandenburg, hungary, hzz and the rest), as in the legacy. `iefp`, `upsvr`, `infopraca` and half of `kuntarekry` fill the fields from their own pages, and a first pass on an empty store reads only 300 to 800 of them; the shares rise as later runs read the rest. Pages read before the fields existed are not read again for them.

- [ ] **T011 — Close advert-facts** · FR: FR-1 to FR-8 · Depends: T001-T010
      Done when: `index.ts` exports only the reader, `AdvertFacts` and its types; `CLAUDE.md` ("Intended structure") lists `src/features/advert-facts/` and the advert's new fields; `features/README.md` marks this feature done; the CI command is green.
