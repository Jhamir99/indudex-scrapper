# Tasks: Companies

Generated from `spec.md` and `plan.md`. Tasks are ordered by dependency and have a verifiable "Done when". Every task ends with `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:run && pnpm build` green. "Legacy example" means the example the legacy's comment or test for that rule gives.

**Depends:** `gate` closed (its T011).

## Part A — The employer of an advert

- [x] **T001 — The employer's key** · FR: FR-3 · Depends: gate T011
      Done when: `company-key.ts` holds the legacy's `LEGAL`, `nameWords`, `companyKey`, `usable`, `townKey` and `displayName`, and tests pass on legacy examples («Siemens AG», «SIEMENS» and «Siemens» one key; «Müller GmbH & Co. KG» «muller»; «SAS Institute», «Groupe SEB»; «S.A.U.», «Sp. z o.o.», «ООО «Мегафон»»; «Confidential» and «0» no employer; «SANDNES ELEKTRISKE AS» shown «Sandnes Elektriske AS»; «Paris 13» Paris); the golden set (`test/fixtures/companies/`) is built from the legacy in the scratchpad and every key, `usable` and `displayName` reading of it matches.
      2026-11-19: done. Extracted from the legacy by a scratchpad script. The golden set (`test/fixtures/companies/names.json`, read by `test/companies/golden.ts`) holds the legacy's readings of the 982 strings of its name tests (one with an e-mail address left out). `foldLetters` in `shared/kit/fold.ts` is back to the legacy web's own rule (every combining mark), which the gate's T001 had narrowed to Argus's; every earlier test still passes.
- [x] **T002 — Clutter and the employer's name** · FR: FR-1 · Depends: T001
      Done when: `clutter.ts` and `employer-name.ts` hold the legacy's `withoutClutter`, `withoutPictures`, `genericName`, `companyName`, `companyOfAdvert` and `spelledCompany` (patterns extracted, not retyped), and tests pass on legacy examples for each rule (markup, an address, a phone, placeholders, control marks; a tax number, «Stellenangebote bei», «Karriere», «Jobs», a board's name, a slogan; «Confidencial», «Human Resources», a country, a board's line; a title taken for the employer; «Fröwag» for «Froewag»; the employer that is the advert's town); every name reading of the golden set matches.
      2026-11-19: done. Extracted from the legacy by line ranges; one range stopped two lines short of `withoutPictures`'s end, which the «Bosch™ Rexroth» example caught (the golden set had no such case), so every extracted function's end was checked against the legacy. The example phone number is made up (the legacy's comment quotes an advert's).
- [x] **T003 — Names as the adverts write them** · FR: FR-2 · Depends: T002
      Done when: `written-names.ts` holds `writtenNames` and the parts of `names.mjs` it needs (`spelling`, `capsSpelling`, `apart`, `asName`, `calm`), and tests pass on legacy examples («Zeissgroup» → «ZEISS Group», «JACKSON HOGG» → «Jackson Hogg», «Manpower» stays, two adverts needed, a source's only one enough).
      2026-11-19: done. Extracted from the legacy's `names.mjs` (`letters`, `calm`, `spelling`, `apart`, `asName`, `capsSpelling`, `writtenNames`); `GLUED`, used only by `addressCode`, waits for 016 with it. Expected values are the legacy's own readings.
- [ ] **T004 — Agencies** · FR: FR-4 · Depends: gate T011
      Done when: `agencies.ts` holds the legacy's words and brands (extracted), and tests pass on legacy examples in each language and on the golden set; «Siemens» is none.
- [ ] **T005 — The employer reader** · FR: FR-1 to FR-4, FR-9 · Depends: T002, T003, T004
      Done when: `createEmployerReader(adverts)` gives each advert's `{ name, key, agency }` as the legacy's build did (the source's written names first, then `companyOfAdvert` and `spelledCompany`, then the town rule), tested on legacy examples, the same answer twice.

## Part B — The directory

- [ ] **T006 — The processor's state folder** · FR: FR-5 · Depends: gate T011
      Done when: `processor-state.ts` gives the folder (`PROCESSOR_STATE_DIR`, default `state/` at the repo root, in `.gitignore`), and `history.ts` reads and writes `state/companies.json` (versioned, validated, atomic; a broken file an error naming its path; none an empty history); `AGENTS.md` ("Processor") says the processor keeps its state there; tests on a temporary folder pass.
- [ ] **T007 — The employers listed** · FR: FR-5 · Depends: T001, T006
      Done when: `directory.ts` holds `updateCompanies`, `mainCountry` and `offersAt` over `DirectoryOffer`s, and tests pass on legacy examples: the most seen spelling, the group hired most for, places with today's counts and 0, the town and its NUTS code, a key that changed moved, a name no longer usable and a taken-down employer forgotten, the order (most offers first, then by name).

## Part C — The registers

- [ ] **T008 — Registers' schema, file and LAU** · FR: FR-6 · Depends: gate T011
      Done when: `src/shared/schemas/register.ts` and `registers-file.ts` keep `<store>/registers/<register>.json` (versioned, validated, atomic, with licence and credit), the store's layout comment lists it, and `lau.ts` reads Eurostat's LAU table and places a code (a missing one by its département's or province's unit), tested on a small table.
- [ ] **T009 — Brønnøysund and Sirene** · FR: FR-6 · Depends: T008
      Done when: `brreg.ts` and `sirene.ts` turn records into companies as the legacy did (its relevant activities, ten people, the size bands, legal forms that are people, withheld records, struck-off and bankrupt companies left out) and read their bulk files as streams; tests on saved records (the legacy's `test/registers.test.mjs` cases) pass.
- [ ] **T010 — Barcelona's census and the tool** · FR: FR-6 · Depends: T009
      Done when: `diba.ts` reads the census through the polite client (ten seconds apart, robots.txt first) and keeps companies as the legacy did (a person's tax number left out, the activity by CCAE class or industrial mark); `pnpm registers` runs each register into the store; tests with a fake client and saved answers pass; a live run of `brreg` and `diba` into a temporary store is recorded here (counts kept and placed).

## Part D — Joining and cards

- [ ] **T011 — Registers joined** · FR: FR-7 · Depends: T007, T008
      Done when: `register-join.ts` holds `registerJoin` and `withRegisters`, and tests pass on legacy examples (the same key and its size and length rules, «META» of Paris, Airbus of Blagnac, a company that belongs to an employer, «ABB AS», generic words, another country's legal form, the largest of a key kept, the employer's town from its main country).
- [ ] **T012 — Company cards** · FR: FR-8 · Depends: T011
      Done when: `cards.ts` holds `companyCards` without careers pages, and tests pass on legacy examples (groups, occupations, towns and their count, the pay range with five adverts or more and fewer, a ceiling's top, work modes, register fields from the main country, belonging companies, a register company's employer, its offers in its town and website, no empty card); `index.ts` exports only the reader, the directory, the joining, the cards and their types.
- [ ] **T013 — Measurement and equivalence** · FR: spec section 5 · Depends: T005, T007, T012
      Done when: a pass over the fresh store records here the share of adverts with an employer and with an agency's per source, the directory's size, the registers' companies kept and joined, and the time (under a minute); the legacy's functions, run on the same adverts and offers, give the same employer, key, agency flag and directory rows (differences explained here if any).
- [ ] **T014 — Close companies** · FR: FR-1 to FR-9 · Depends: T001-T013
      Done when: nothing outside the features imports past `src/features/companies/index.ts` but tests (checked with a search); `CLAUDE.md` lists both folders, `pnpm registers`, the state folder and the registers' files; `MEMORY.md` is updated; `features/README.md` marks this feature done; the CI command is green.
