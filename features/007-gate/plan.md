# Plan: Gate

Implements `spec.md` (FR-1 to FR-10). Status: draft (2026-11-19). A port of the legacy `builder/gate.mjs` (1,719 lines), the title rules of its web (`app/lib/titles.ts`, 119 lines), the loader of its tables (`builder/codes.ts`) and the gate's steps in `builder/build-pile.mjs` (outside the vertical, hygiene, outside Europe, the explain report). Split by what each part does, each rule tested on the example its legacy comment gives.

## 1. Layout

```
src/features/gate/
  index.ts             # public entry: createGate, GateDecision, the explain line
  title-rules.ts       # the legacy's titles.ts copied (clean, alternation, matches, inside, winners, index, find), header: source and commit
  matchable-title.ts   # the title as the gate reads it (matchableTitle), and its readings: lemma, second, German, Spanish
  words.ts             # the word lists: engineer words, role words, not-titles, outside words, ICT words
  routes.ts            # the routes: engineer, ICT, the German technician, planner, master, fitter, the French, Flemish and Spanish ones
  compile.ts           # the gate compiled from the catalogues (familyTerms, compileFamilies, compileGate)
  title-families.ts    # what a title names (titleFamilies) and the German compound roles (splitRoles)
  families-of.ts       # one advert's families and occupations against one compiled gate (familiesOf, occupationsOf)
  markets.ts           # gender marks (markedFor, markedToo) and Catalan read in Spanish (catalanToo)
  classifier.ts        # main then trades, the German passes, read once more, confirmed titles, the cache per title
  hygiene.ts           # hygieneReason
  decide.ts            # one advert's decision: families and occupations, or the reason it is left out
  explain.ts           # the explain report: its lines and counts
  *.test.ts
src/bin/gate-explain.ts   # `pnpm gate:explain`: the store through the gate, the report written gzipped
```

As places, advert-facts and pay, the feature exposes only `index.ts` to the publication; the entry in `src/bin/` imports it too.

## 2. Inputs and output

```ts
// What the gate reads of a stored advert (FR-10).
type GateInput = Pick<StoredAdvert, "title" | "language" | "occupationCodes" | "country" | "url" | "company" | "location" | "source">;

createGate({ families, isco, ssykIsco, titles, confirmedTitles, countries }): {
  decide(advert: GateInput): GateDecision;
}

type GateDecision =
  | { kept: true; families: string[]; occupations: string[]; trade: boolean }
  | { kept: false; reason: "outside the vertical" | "outside Europe" | `hygiene: ${string}` };
```

- The catalogues are read with `readCatalogue` (`families`, `codes/isco`, `codes/ssyk-isco`, `codes/titles`, `codes/confirmed-titles`, `countries`) and compiled once.
- The legacy's `raw.lang` is the advert's `language` (every stored advert has one), so the legacy's `hintLangs` path, for adverts that name no language, is not needed until `016-career-sites`. `raw.codes` is `occupationCodes`.
- Order, as the legacy's `build-pile.mjs`: families (outside the vertical), hygiene, then Europe. A family id is the catalogue's (an ISCO-08 unit group); `trade` says the advert was kept by the optional group.

## 3. Porting rules

- **Behaviour, not code**, as in 004 to 006: each rule is a named constant or function with its _why_ and dated measure from the legacy comment; the legacy's references (NOB-, DAA-) kept.
- **Regular expressions copied word for word.** A pattern TypeScript refuses or reads otherwise (a `\p{…}` without the `u` flag, as in 006) is written as it read, with a comment.
- **Tables are plain objects in the legacy**: a word like «constructor» is looked up with `Object.hasOwn` (the legacy's NOB-15 fixed this for `catalanToo`; the port does it everywhere).
- **The cache**: the legacy's `classifier` keeps each answer per (title, language, ISCO, SSYK) for the whole build; so does the port, and `titleFamilies` keeps its last answer as the legacy did.

## 4. Golden sets and equivalence

- **Golden sets.** The legacy's gate is run in the scratchpad (`legacy-run/`, as in 005 and 006) with its catalogues of `JustJans/indudex@b0cd182`, which are this repo's. Every string of its gate tests (`test/builder.test.mjs`, `test/occupation-coding.test.mjs`, `test/catalan-twins.test.mjs`, `test/titles.test.mjs`, `test/ttvic.test.mjs`) is read as a title in the main languages of the sources, and the answers (families, occupations, hygiene) are kept in `test/fixtures/gate/` for the tests.
- **Equivalence (T010).** A scratchpad script runs the legacy's `classifier` and `hygieneReason` and the port over every advert of the fresh store of 005 and 006 and compares families, occupations and reasons; differences are explained in `tasks.md`.

## 5. The explain report (FR-9)

`pnpm gate:explain` (`src/bin/gate-explain.ts`): reads `STORE_DIR` (as `pnpm crawl`), runs every advert that has not expired through `createGate`, writes `explain.txt.gz` atomically into `--out <directory>` (default `published/` at the repo root, the processor's output folder, ignored by git; never the scrapper's store), as the legacy wrote it beside its pile (one line per advert left out, `[reason] title | company | location (source)`, in the store's order), and prints the counts per reason and the share kept. It reads only the store and the catalogues. When the processor's entry exists (010), it takes the same report as its `--explain`.

## 6. Decisions (2026-11-19, operator)

- **Title rules copied.** Why: no new repository before the gate; `indudex-matching` (pending in `MEMORY.md`) replaces the copy, so the copy's header names its source and commit.
- **`pnpm gate:explain` now.** Why: the operator can read what the gate leaves out before the publication exists.
- **Takedowns stay with the publication (010).** Why: the store is already swept at every crawl, and removing a taken-down advert's copies needs dedupe (009).
