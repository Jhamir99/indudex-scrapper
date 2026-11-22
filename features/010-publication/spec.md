# Spec: Publication

Status: approved (2026-11-22). Requirements written from the outline with the operator's answers of 2026-11-22: the published dataset keeps the legacy's shape (`packages/published-data`: its files and short keys), declared as Zod schemas; one shard per family and country holds every locale's title (011 fills them); the legacy's labelled facts (`builder/lib/labels.mjs`: the days and the labelled contract and working time) are ported here, the tools an advert names wait for a feature of their own; incremental builds wait until a whole build is measured.

## 1. Context and goal

The browser downloads only the parts of the pile a search names and filters them on its own. The legacy's publication (`builder/build-pile.mjs`) read the whole store, turned each advert into an offer (`toRecord` in `builder/normalise.mjs`), gated, deduplicated and wrote the pile: shards by family and country (`builder/shard.mjs`), the newest offers, a word index (`builder/word-index.mjs`), the front page's rows (`builder/backdrop.ts`), the towns and regions in use, the company directory and cards, an index of it all and a status, and held back a pile that had fallen by a third (`builder/lib/shrink-guard.ts`). Its shape is typed in `packages/published-data/index.d.ts`. Steps 004 to 009 ported each part of the reading; this feature runs them and writes what they give.

**Goal:** the processor's entry: run every step over the store and write a whole, versioned dataset (`published/<version>/`), then move the `current` pointer, unless the build looks wrong.

**Why:** the API serves only whole builds, read-only and cached for good, and a broken day of the sources never empties the site.

## 2. Users

- **The API** (`indudex-api`, downstream): serves the version `current` names, file by file.
- **Visitors** (through the API and the web): search the offers, browse the directory and its cards.
- **Operator**: runs the processor (by hand or from cron), reads its log, its status and its explain report, forces a publication after checking a fall.

## 3. User stories

- As a visitor, I want the offers of my occupations in my country to load without downloading the rest of Europe's.
- As the API, I want to read only finished builds, so a visitor never sees half of one.
- As the operator, I want a build whose offers fell by a third (a broken source, a bad change) to wait instead of replacing a good one.
- As the operator, I want to know how many adverts were found, why the rest were left out, and how long each stage took.

## 4. Functional requirements

### Part A — Reading the store

**FR-1 — The processor's entry.**
`pnpm process` (and `node dist/bin/process.js` once built) shall read the store (`STORE_DIR`), the ECB's rates the store keeps, the catalogues, the configuration and the processor's state, run every step, and write the dataset into `published/` (`PUBLISHED_DIR`); `--force` publishes past the shrink guard, `--explain` writes the explain report into the version. It never asks the network.
_Acceptance:_ A test runs the entry on a temporary store of saved adverts and finds a whole version and the pointer; a test without network access passes.

**FR-2 — What is read.**
Only adverts of sources the registry lists today shall be read; a source taken down (the takedowns list's `sources`), and an advert or employer taken down (its `adverts` and `companies`, with every copy of a taken advert from other sources, `withoutTaken`) shall be left out; so shall a source whose last stored pass is more than nine days old, an advert whose last day has passed, an advert over a year old (by its day, else the day it was first in the store), and one with no `http(s)` address. Each field is read cut at its limit (title 500, employer 300, place 2,000, town 300, at a word) and with the letters a source sent broken mended (`mendedText`), before any step reads it.
_Acceptance:_ Tests on a temporary store for each rule, with the count each one adds to the status.

**FR-3 — The days an advert states.**
The day an advert was posted shall be its source's (when it is past), else the earlier of the day its text says it was posted and the day it was first in the store; with neither, the day it was first in the store is kept apart (`fs`, for the date filters only). Its last day shall be its source's, else the one its text states while it is ahead; never one more than 400 days away or more than six months after its posting, nor, for a fresh advert, one on or before its posting day (as the legacy did).
_Acceptance:_ Tests on the legacy's examples (`builder/lib/labels.mjs` and `toRecord`'s: «Fecha de publicación», «Bewerbungsfrist», prospective.ch's ten years ahead, Manfred's same day twice, Raiffeisen's year-long `validThrough`).

**FR-4 — The contract and working time an advert's text states.**
Where its source's fields are silent, the contract and working time shall be read from a labelled line of its text or a part of its title, as the legacy did (`writtenFacts`); agency work its text states as such («im Rahmen der Arbeitnehmerüberlassung») is agency work whatever the source's field says, with the option to stay where the text offers it, never where it says it is none.
_Acceptance:_ Tests on the legacy's examples of `labels.mjs` and of the agency-work rule; a golden set of the legacy's readings of the store's texts.

### Part B — The offer

**FR-5 — The offer.**
Each advert kept shall become an offer with the legacy's fields (`packages/published-data`'s `Offer`): its id from its address (the legacy's `idFor`), the title as published (`shownTitle`, brought down from capitals unless its source forbids altering it), the employer and the agency flag, the place as written, country, town with its position, NUTS code and a campaign's other towns (`m`), the days, address, source, families, ESCO occupations, the source's occupation code, contract, working time, work mode, pay with its yearly euros, years (most and least), degrees and languages asked; a field only when there is something to say. The other locales' titles (`te`, `ts`, `tc`, `tf`, `tn`, `td`) and `nt` (the title's language for a source that forbids translating it, read by the translator's language reader) are `011-title-translation`'s, the tools (`tk`) a later feature's.
_Acceptance:_ Tests on each field; over a real store, each offer equal to the legacy's record for the same advert (section 5).

### Part C — The files

**FR-6 — Shards and the newest.**
Offers shall be written one file per family and country (`offers/<family>-<country>.json`), split into numbered parts past four million characters, newest first, the same offers giving the same bytes; the newest 6,000 of the last 21 days of the main occupations in three growing parts (`offers/latest[-n].json`), and the newest 2,000 of the skilled trades apart (`offers/latest-optional.json`); each family's occupations counted.
_Acceptance:_ Tests on the legacy's examples (`builder/shard.mjs`'s); the same offers twice give the same bytes.

**FR-7 — The word index.**
A search with words shall read an index of every offer: offers numbered newest first, the intermediaries' last; every word of the title, its translations, the employer, its key and the places, in 1,024 files by three-letter piece; each two-letter word in 256 files; each country's offers; the offers in blocks of consecutive numbers (at most 2,000 blocks); numbers written as gaps in base64, as the legacy did (`builder/word-index.mjs`, `app/lib/word-index.ts`).
_Acceptance:_ Tests on the legacy's examples; a golden set of the legacy's files for a sample of offers.

**FR-8 — The rest of the dataset.**
Each version shall hold, as the legacy's did: `index.json` (families with their files, counts and occupations; the newest; the sources with their licence and credit; the counts; where the word index is; when it was built and crawled, and when it expires), `status.json` (what was found and why the rest was left out, the duplicates, the offers by country), `places.json` (the towns in use and the names not to take for a town alone), `regions.json` (the regions and provinces in use, the registers' companies counted), `today.json` (the front page's rows; each language's ten latest come with 011), `companies.json` and `companies/<country>.json` (the directory and the registers' companies), `cards/<n>.json` (the cards in 512 files by key), the catalogues the processor publishes, and, with `--explain`, `explain.txt.gz`. The directory is kept between runs in the processor's state.
_Acceptance:_ Tests on each file's content on a temporary store; every file validates against its schema.

**FR-9 — Declared and versioned.**
Every published file shall be declared as a Zod schema in this repo, named so the API can describe it, with the legacy's format version in it (`v`); a breaking change bumps that version. An offer field the schema does not name fails the build.
_Acceptance:_ Tests validate every file of a build; an unknown offer field is refused.

### Part D — Publishing

**FR-10 — A whole version, then the pointer.**
A build shall write a new folder `published/<version>/` (the version is the build's UTC time, `YYYYMMDDTHHMMSSZ`), and only when every file is written move the pointer (`published/current.json`, `{ version }`, written atomically); a build that stops leaves the last version current and its own folder unfinished, removed by the next build. The last three versions are kept, the current one always.
_Acceptance:_ Tests: a whole build moves the pointer; a build stopped before the end leaves it; a fourth build removes the oldest; the current version is never removed.

**FR-11 — The shrink guard.**
A build whose offers, or Spain's, or Catalonia's (NUTS ES51), fall under 70 % of the most of the last three days' builds shall not move the pointer, unless `--force` is given or the last published version is a day old; then it is published with an alert in the log, and the history starts again from it (`state/pile-history.json`). An empty build never publishes.
_Acceptance:_ Tests on the legacy's examples (a fall in steps, a country gone while the total held, a fall kept for a day).

**FR-12 — Measured and offline.**
The build shall log how long each stage took and the memory it held, read nothing but the store, the catalogues, the configuration and its state, and write nothing but `published/` and `state/`.
_Acceptance:_ Tests run with no network; the log names each stage.

## 5. Non-functional requirements

- **Equivalence:** over a real store, every offer kept, its fields and the files of the dataset are the legacy's for the same adverts (checked by running the legacy's `toRecord` and its pile's steps in the scratchpad), but for the translations, the tools and what each step's own measure already explained.
- **Speed and memory:** a whole build of the store on the server takes under ten minutes and stays under the server's memory; measured before the feature closes, with the time each stage takes.
- **Privacy:** no advert text, contact field or e-mail address reaches the dataset; the schemas are strict.
- **Stable bytes:** the same store and day give the same files, so a CDN keeps what did not change.

## 6. Edge cases

- A store with no adverts, or none kept: nothing is published, the pointer stays, the run fails with its reason.
- A pointer that names a missing version, or a folder that is not a version: an error naming it, never a silent reset.
- A source in the store the registry no longer lists: its adverts are left out and counted (withdrawn).
- An offer in no family's country file (the remote `xx`, the unknown `zz`): kept in its own file, as the legacy did.

## 7. Out of scope

- The other locales' titles (`te`, `ts`, `tc`, `tf`, `tn`, `td`), each language's ten latest in `today.json` and the titles left for the translator: `011-title-translation`.
- The tools an advert names (`tk`, `builder/tools.mjs`): a feature of its own, added to `features/README.md`.
- Incremental builds (`builder/pile-cache.mjs`): a later feature, if the measured time calls for it.
- Closed adverts: `013-closed-adverts`. Careers pages on the cards and the crawler's feedback (`shown-ids.txt`, `shown-by-source.json`): `016-career-sites`.
- The cron, locks and alerts: `012-operations`. Serving the files: `indudex-api`.

## 8. Completion criteria

- FR-1 to FR-12 pass their acceptance tests, and `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:run && pnpm build` is green.
- The measurement of section 5 is recorded in `tasks.md`.

## 9. Open questions

- None. (2026-11-22: the legacy's shape; one shard with every title; labels now, tools later; incremental builds later.)
