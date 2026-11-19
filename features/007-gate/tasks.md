# Tasks: Gate

Generated from `spec.md` and `plan.md`. Tasks are ordered by dependency and have a verifiable "Done when". Every task ends with `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:run && pnpm build` green. "Legacy example" means the example the legacy's comment or test for that rule gives.

**Depends:** `pay` closed (its T011).

## Tasks

- [x] **T001 — Title rules** · FR: FR-2 · Depends: pay T011
      Done when: `title-rules.ts` is the legacy's `app/lib/titles.ts` with a header naming its source and commit, and tests pass on the legacy's examples (`test/titles.test.mjs`): folding and apostrophes, the longest match on one text («naval architect» is no «architect»), a named title over an alternative, and `find` over an index giving what `matches` gives with each list's alternation.
      2026-11-19: done. `TITLES` is the rules with Argus's fold. That fold is `src/shared/kit/fold.ts`, whose `unaccent` took off every combining mark (`\p{M}`) where Argus takes off only U+0300-U+036F: corrected to Argus's, and every test of places, advert facts and pay, golden sets included, still passes.
- [x] **T002 — The title as the gate reads it** · FR: FR-2 · Depends: T001
      Done when: `matchable-title.ts` passes tests on legacy examples: gender marks off («Ingeniero/a», «(m/w/d)», «Ingénieur(e)», «technicien·ne», a zero-width space in «(d/m/f)»), a word written for both genders once, a reference number and a board's «Oferta de empleo para» off, «Engineering Graduate» and the misspellings of «engineer»; the second reading (plurals, words kept as they are, «CAD-Designer»), the German reading (small words, female and plural endings, a hyphen left open, at most thirty letters) and the Spanish reading («Soldadores», «Técnico calidad»).
      2026-11-19: done. The expected readings are the legacy's own, read through a copy of its `gate.mjs` in the scratchpad that also exports its internal readings (`gate-internals.mjs`).
- [x] **T003 — Word lists and routes** · FR: FR-3 · Depends: T002
      Done when: `words.ts` and `routes.ts` hold the legacy's lists and routes word for word, and tests pass on legacy examples for each: the outside words (sales, teaching, care, «Maçon paysagiste», «Schichtleiter Gastronomie»), the ICT words («mobile Pflege» is none), each engineer, ICT, German, French, Flemish and Spanish route and its «out» list.
      2026-11-19: done. `words.ts` and `routes.ts` are extracted from the legacy's `gate.mjs` by a scratchpad script (comments and patterns as written, only `export` and types added), so no pattern was retyped. The 126 cases of `routes.test.ts` are the legacy's own readings of example titles.
- [x] **T004 — The gate compiled from the catalogues** · FR: FR-1, FR-2 · Depends: T001, T002
      Done when: `compile.ts` builds the main and optional gates from `families`, `codes/isco`, `codes/ssyk-isco`, `codes/titles` and `codes/confirmed-titles` (read with `readCatalogue`); tests pass on the real catalogues: 71 families split into the main ones and the trades, every family's ISCO unit group found back, an SSYK concept of several families, the bare role words and «not ours» titles kept out of the index, a family's `not_terms` not taken; compiling takes under five seconds (noted here).
      2026-11-19: done. Reading the five catalogues and compiling both gates takes about 1.1 s on the development Mac (the legacy's compile alone, 0.9 s). Tables keyed by language or title are `Map`s, so no word reads a property of every object. «marketing specialist» is a blocker, «marketing manager» is not (as in the legacy: it is left out by `OUTSIDE_WORDS` instead).
- [x] **T005 — An advert's families and occupations** · FR: FR-1 to FR-3, FR-6 · Depends: T003, T004
      Done when: `title-families.ts` and `families-of.ts` pass tests on legacy examples: a code of the vertical and one outside it, an SSYK code narrowed by the title, a title found by each reading, a blocker over our titles, the contexts, each catch-all and route, «Hardwareentwickler», an Italian «ai»; occupations inside the families («Naval Architect», «Mechanical Design Engineer»). The golden sets (`test/fixtures/gate/`) are built from the legacy itself in the scratchpad.
      2026-11-19: done. The golden set (`test/fixtures/gate/titles.json`, read by `test/gate/golden.ts`) is built by running the legacy's own gate in the scratchpad over every string of its gate tests (818 titles) in seven languages (en, es, ca, de, fr, nl, it), plus 178 adverts with ISCO or SSYK codes; the main gate's families match on all 5,726 readings.
- [x] **T006 — The classifier** · FR: FR-4, FR-5, FR-10 · Depends: T005
      Done when: `markets.ts` and `classifier.ts` pass tests on legacy examples: the trades only for what the main families leave out, the vehicle trades first («Kfz-Mechatroniker» 7231), the Spanish technician, the German passes (whole, then with the compound roles apart), the gender marks («Industriemechaniker (m/w/d)» in an Italian source), Catalan read in Spanish («Mecànic/a de manteniment», «Enginyer/a de processos» out of 2149), the confirmed titles never against the gate's own decisions; the same answer twice and from the cache; every reading of the golden sets matches.
      2026-11-19: done. The classifier's families and occupations match the legacy's on all 5,726 title readings and 178 coded adverts of the golden set. `markets.ts` (the gender marks and the Catalan table) is extracted from the legacy by the scratchpad script, types added. The answer also says whether a trade kept the advert (`trade`), which the legacy knew only by the family's group.
- [x] **T007 — Hygiene** · FR: FR-7 · Depends: pay T011
      Done when: `hygiene.ts` passes tests on legacy examples: a listing page, a template, workwear, a site task, a filled vacancy, an application form (title and address both), and the sales, recruiting, trainee, apprentice, student, helper, labourer, retail, operative and gig roles in the sources' languages; an engineer's title passes; every hygiene reading of the golden sets matches.
      2026-11-19: done. Patterns extracted from the legacy by the scratchpad script; the 818 titles of the golden set get the legacy's reasons (45 left out).
- [x] **T008 — The gate's decision** · FR: FR-8, FR-9, FR-10 · Depends: T006, T007
      Done when: `decide.ts` and `index.ts` give `createGate(...).decide(advert)`: families, occupations and whether a trade kept it, or the reason in the legacy's order (outside the vertical, hygiene, outside Europe); tests pass: each reason, a country outside the catalogue, the same decision twice; `index.ts` exports only `createGate`, the decision type and the explain line.
      2026-11-19: done. Reasons are «outside the vertical», «hygiene: …» (the legacy's own words) and «outside Europe» (a country not in the catalogue's 45). `index.ts` exports `createGate`, `GateDecision`, `GateInput`, `explainLine` and `ExplainedAdvert`.
- [x] **T009 — The explain report** · FR: FR-9 · Depends: T008
      Done when: `explain.ts` and `pnpm gate:explain [-- --out <dir>]` (`src/bin/gate-explain.ts`, built to `dist/bin/gate-explain.js`) write `explain.txt.gz` atomically (one line per advert left out, `[reason] title | company | location (source)`) and print the counts per reason and the share kept; tests on a temporary store pass (lines, counts, expired adverts skipped, nothing written into the store); `published/` stays ignored by git.
      2026-11-19: done. `writeExplainReport` (in `explain.ts`) decides every advert, writes the lines gzipped and atomically, and counts the reasons; `src/bin/gate-explain.ts` feeds it the store's adverts that have not expired, source by source. On the fresh store of 005 and 006: 191,466 adverts in about 8 s, the report in `published/` (ignored by git) or `--out`.
- [x] **T010 — Measurement and equivalence** · FR: spec section 5 · Depends: T008
      Done when: a pass over the fresh store of 005 and 006 records here, per source, the share kept, left out by each reason and kept by the trades, and the time (under two minutes); the legacy's gate, run on the same adverts, gives the same families, occupations and reasons for every one (differences explained here if any).
      2026-11-19: done. A pass over the fresh store of advert-facts and pay (191,466 adverts) gives, per source, the share in %:

      | source | adverts | kept | by the trades | outside the vertical | hygiene |
      | --- | --: | --: | --: | --: | --: |
      | vdab | 119,132 | 52.3 | 30.9 | 47.7 | 0.1 |
      | upsvr | 12,103 | 19.0 | 14.7 | 81.0 | 0 |
      | jobtech | 9,753 | 97.4 | 30.3 | 1.7 | 0.9 |
      | anofm | 8,843 | 21.7 | 13.1 | 78.3 | 0 |
      | mpsv | 6,277 | 97.4 | 59.3 | 0 | 2.6 |
      | hzz | 6,020 | 15.5 | 8.6 | 84.5 | 0 |
      | iefp | 5,739 | 23.7 | 14.2 | 76.3 | 0 |
      | feinaactiva | 4,195 | 11.1 | 6.7 | 88.7 | 0.2 |
      | sne | 3,303 | 19.6 | 13.2 | 80.2 | 0.2 |
      | infopraca | 2,905 | 50.7 | 44.7 | 49.3 | 0 |
      | actiris | 1,928 | 13.1 | 6.7 | 86.7 | 0.2 |
      | solidjobs | 1,760 | 78.6 | 5.6 | 21.0 | 0.3 |
      | kuntarekry | 1,580 | 3.0 | 0.3 | 97.0 | 0 |
      | nva | 1,248 | 8.1 | 1.9 | 91.9 | 0 |
      | bolzano | 977 | 13.5 | 6.0 | 86.4 | 0.1 |
      | trento | 705 | 17.2 | 10.2 | 82.7 | 0.1 |
      | karrierenrw | 675 | 23.1 | 0.3 | 76.9 | 0 |
      | sae | 618 | 10.8 | 7.4 | 88.8 | 0.3 |
      | emilia | 577 | 14.2 | 7.8 | 85.3 | 0.5 |
      | gencat | 424 | 5.2 | 0.2 | 94.8 | 0 |
      | cyprus | 412 | 99.8 | 72.6 | 0 | 0.2 |
      | brandenburg | 379 | 6.9 | 0.3 | 92.1 | 1.1 |
      | clm | 330 | 19.4 | 14.2 | 80.0 | 0.6 |
      | the other 15 | 1,583 | 20.6 | 8.6 | 79.0 | 0.4 |
      | all | 191,466 | 47.1 | 26.5 | 52.7 | 0.2 |

      No advert is outside Europe (every public feed's country is one of the catalogue's). Compiling the gate took 1.0 s and deciding every advert 5.3 s on the development Mac (Node 26), not yet measured on the server. The legacy's gate (its `classifier`, `hygieneReason` and `build-pile.mjs`'s order, run in the scratchpad on the same adverts) gives the same decision, families, occupations and trade for every one of the 191,466: no difference. Notes: the sources whose adapters ask only for our occupations (jobtech, mpsv, cyprus) are kept at 97 % and more; the feeds that list every job (vdab, upsvr, hzz, kuntarekry, …) are mostly outside the vertical, as in the legacy. The legacy also mended broken letters and cut long fields before the gate (`mendedText`, `atMost` in `build-pile.mjs`); both readers were given the same stored title here, so that step is the publication's to place (010).

- [x] **T011 — Close gate** · FR: FR-1 to FR-10 · Depends: T001-T010
      Done when: nothing outside the feature imports past `src/features/gate/index.ts` but its entry in `src/bin/` (checked with a search); `CLAUDE.md` lists `src/features/gate/`, `pnpm gate:explain` and the title rules' copy; `MEMORY.md` notes the copy for `indudex-matching`; `features/README.md` marks this feature done; the CI command is green.
      2026-11-19: done. Only `src/bin/gate-explain.ts` imports the feature, through `index.ts`, besides the test helper `test/gate/catalogues.ts` (checked with a search). `CLAUDE.md` lists the feature, `pnpm gate:explain` and the copy of the title rules; `MEMORY.md` notes the copy for `indudex-matching`.
