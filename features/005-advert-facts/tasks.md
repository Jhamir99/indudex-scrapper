# Tasks: Advert facts

Generated from `spec.md` and `plan.md`. Tasks are ordered by dependency and have a verifiable "Done when". Every task ends with `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:run && pnpm build` green. "Legacy example" means the example the legacy's comment for that rule gives.

**Depends:** `places` closed (its T011).

## Part A — What the source states

- [ ] **T001 — The source's contract, hours and years fields** · FR: FR-1 · Depends: places T011
      Done when: `Advert` (and so `AdvertDraft`) accepts optional `contract`, `hours`, `employmentType` and `years`, trimmed, non-empty and capped; tests pass: an advert with them validates, one without them (as stored before) still reads from the file store, a value over the cap or empty is refused; the crawl-core contract test still passes for every adapter.
- [ ] **T002 — Adapters fill the fields (1/2)** · FR: FR-1 · Depends: T001
      Done when: `actiris`, `bolzano`, `escoladeltreball`, `feinaactiva`, `gencat`, `infopraca`, `jobtech` and `kuntarekry` with `valtiolle` fill the fields their source has (as their legacy adapters did), and each fixture test asserts them on at least one advert.
- [ ] **T003 — Adapters fill the fields (2/2)** · FR: FR-1 · Depends: T001
      Done when: `mpsv`, `iefp`, `upsvr`, `vdab` (with `years`), `sae`, `clm` and `forem` fill the fields, `sae`, `clm`, `vdab` and `forem` from the same values the legacy read from their text, and each fixture test asserts them.
- [ ] **T004 — Words and sentences** · FR: FR-3, FR-5 to FR-7 · Depends: places T011
      Done when: the legacy's word lists (`builder/words/*.mjs`, with `anyOf`, `words`, `numbers`) and sentence splitter are in `src/features/advert-facts/words/` and `sentences.ts`, with tests on the legacy's examples (a list with no full stops split by lines, a short heading kept with the line after it).
- [ ] **T005 — Contract and working time** · FR: FR-2 · Depends: T001, T004
      Done when: `contract.ts` gives `{ kind, months? }` and `{ kind, hours? }` from the fields, and tests pass on legacy examples: the narrower kind first («Interim met optie vast werk», «CDI Intérimaire»), months and hours read («t6», «p20»), the Dutch, Czech, Italian, French, Swiss, Finnish, Nordic and Polish words of 1 November 2026, `employmentType` values, a list of two kinds or hours saying neither, one kind with and without its months being that kind with them, and no fact from an unknown value.
- [ ] **T006 — Work mode** · FR: FR-3 · Depends: T004
      Done when: `work-mode.ts` passes tests on legacy examples for each way, in order: the source's field, a LinkedIn tag, a location naming remote work, a labelled field («Work Model: Hybrid»), the title, a stating sentence; tags and location that disagree say nothing; a passing mention of «remote» says nothing.
- [ ] **T007 — Titles in capitals** · FR: FR-4 · Depends: T004
      Done when: `calm-titles.ts` passes tests on legacy examples: what counts as capitals (eight letters, seven in ten; «MAßSCHNEIDER»), the spelling the other titles use most when seen three times («IoT», «DevOps»), acronyms kept, small words small inside the title, a title not in capitals unchanged.

## Part B — What the advert asks for

- [ ] **T008 — Years of experience** · FR: FR-5 · Depends: T004
      Done when: `argus/requirements.ts` holds the copied `extractRequiredYears` with its header, and `years.ts` passes tests on legacy examples: «3+ years of backend experience» in a list with no full stops, a heading over «7–10 years in heavy industrial construction», «Entre 7 et 12 ans», «tra 3 e 5 anni», «Expérience significative dans le domaine (minimum 5 ans)», «less than 3 years» asking nothing, the largest of several, a source's `years` believed.
- [ ] **T009 — Degrees and languages** · FR: FR-6, FR-7 · Depends: T004
      Done when: `screens.ts` compiles the `degrees` and `languages` catalogues and passes tests on legacy examples: a degree or language demanded is read, one named «a plus», «von Vorteil», «souhaité», «not required» is not, «Deutschkenntnisse» and «Nederlandstalig» are languages, «Germany» and «polished» are not, a stem matches its endings («fliessend*»).
- [ ] **T010 — The fact reader and its measurement** · FR: FR-8, spec section 5 · Depends: T002, T003, T005-T009
      Done when: `createFactReader(...).facts(advert)` gives `AdvertFacts` (validated by its Zod schema), equal on a second read; a pass over the stores of the live runs (and a live pass of the swept adapters into a temporary store, for contract and hours) records here per source the share with each fact and the time (under two minutes); a source far below the others has a note.
- [ ] **T011 — Close advert-facts** · FR: FR-1 to FR-8 · Depends: T001-T010
      Done when: `index.ts` exports only the reader, `AdvertFacts` and its types; `CLAUDE.md` ("Intended structure") lists `src/features/advert-facts/` and the advert's new fields; `features/README.md` marks this feature done; the CI command is green.
