# Spec: Catalogues

Status: approved (2026-11-19). Requirements written from the outline with the operator's answers of 2026-11-19: names are kept in the eight legacy languages; the legacy data is imported now and the tools that rebuild it come later; every legacy catalogue file lives here; the Public Suffix List moves to `008-companies`.

## 1. Context and goal

Matching and filtering need reference data: occupation families (ISCO-08 unit groups by minor group) with their ESCO occupations and job titles, countries, towns, regions, languages, degrees and vetoes, each named in the site's languages. The processor owns them and publishes a copy that the API serves.

The legacy project keeps them in `catalogues/` (the ones the web reads) and `catalogues/codes/` (the builder's working tables), built by its tools from open sources (ESCO, JobTech, GeoNames, GISCO, national statistics offices) and partly by hand. Some of them are **positional**: the web's profile code (the "plate" in the URL hash) names a family, an occupation, a country, a language, a degree, a level or a veto by its position in the file, so those files only ever grow at the end.

**Goal:** import the legacy catalogues into this repo as validated, versioned data, each file crediting its sources and licences, with one way for the processor's steps to read them and a declared set that the publication copies for the API.

**Why:** most processor steps (places, advert facts, gate, companies, publication) read them, so they come first.

## 2. Users

- **Processor's steps** (downstream): read the catalogues they need.
- **Publication and the API** (downstream): copy and serve the catalogues the web reads.
- **Operator**: updates a catalogue by replacing its file, and needs a wrong edit to fail loudly.

## 3. User stories

- As a processor step, I want to read a catalogue already validated and typed so that I never parse or check reference data myself.
- As the operator, I want a reordered or broken catalogue to fail the tests so that no visitor's saved profile code starts meaning something else.
- As the API, I want a fixed, versioned set of published catalogues with their credits so that the web can show them and their sources.

## 4. Functional requirements

**FR-1 — Coverage.**
The repo shall hold every catalogue file of the legacy project except the Public Suffix List: `families`, `occupations`, `countries`, `languages`, `degrees`, `seniority`, `vetoes` and `activities`, and the working tables `isco` (ISCO-08 groups with ESCO occupations and titles in 23 languages), `ssyk-isco`, `titles`, `confirmed-titles`, `places` (GeoNames towns), `nuts`, `elsewhere` and `wikidata-countries` (each country's Wikidata item, for source discovery).
_Acceptance:_ Each file exists under `catalogues/` with the same entries as the legacy file (same counts: 71 families, 644 occupations, 45 countries, 84,176 places, 71 ISCO unit groups), only its header changed.

**FR-2 — Credit and licence.**
Every catalogue file shall carry a header naming what it holds, each source it was built from (name, address, licence or terms), the date it was built and how (the legacy tool and commit it came from).
_Acceptance:_ A test reads every file's header and fails on a file with no source or no licence.

**FR-3 — Validation.**
Every catalogue shall be validated by its Zod schema when it is read; a file that does not match fails the read, naming the file and the place in it.
_Acceptance:_ Tests pass on the real files, and a damaged copy of each kind of file is refused with its name and path in the error.

**FR-4 — Positions never move.**
In the positional catalogues (families and their groups, occupations, countries, languages, degrees, seniority levels, vetoes) an entry shall keep its position for good: entries are only added at the end, never removed or reordered.
_Acceptance:_ A test compares each positional catalogue with the order recorded at import and fails if any recorded entry is missing or has moved; adding an entry at the end passes once the record is extended.

**FR-5 — Languages.**
Names shall be kept in the eight languages of the legacy (`en`, `es`, `ca`, `fr`, `nl`, `de`, `it`, `pl`) and ESCO's titles in the 23 languages the legacy took, as they are; a name missing in a language is allowed, and the English one stands in for it.
_Acceptance:_ Every labelled entry has an English label; no imported name is dropped.

**FR-6 — Published and internal catalogues.**
The catalogues the web reads (`families`, `occupations`, `countries`, `languages`, `degrees`, `seniority`, `vetoes`) shall be declared as the published set, each with its Zod schema and its header, under one catalogue version that changes whenever a published catalogue's shape changes. The others are internal to the processor and never published, in particular `titles`, whose sources include terms that allow occupational use only.
_Acceptance:_ The published set lists exactly those seven files; a test fails if an internal file is added to it.

**FR-7 — One way to read them.**
Processor steps shall read catalogues only through a shared module that loads a catalogue on first use and returns the same copy afterwards, so a step that does not need the towns never loads them.
_Acceptance:_ Reading a catalogue twice parses the file once; no code outside the module reads `catalogues/`.

**FR-8 — Consistent scope.**
The scope lists in `config/` (`isco-units.yml`, `ssyk-groups.yml`) shall agree with the catalogues they were built from.
_Acceptance:_ A test fails if a unit group of `isco-units.yml` is not a family of `families`, or the reverse, or the SSYK groups of `ssyk-groups.yml` are not exactly the concepts of `ssyk-isco` with an ISCO code among the families, each with those codes. (2026-11-19: was "with the same ISCO codes"; the list keeps only the codes in the scope, as its header says.)

**FR-9 — No personal data.**
No catalogue shall hold an e-mail address or a phone number (`confirmed-titles` holds advert titles as sources wrote them).
_Acceptance:_ A test scans every string of every catalogue and fails on either.

## 5. Non-functional requirements

- **Testability:** every requirement is checked by Vitest against the committed files; no test needs the network.
- **Size:** the files stay as the legacy had them (about 20 MB, `places` 9 MB); loading `places` and `nuts` takes under two seconds on the server.

## 6. Edge cases

- A catalogue file is missing, or is not valid JSON: the read fails naming the file; no step runs on a partial catalogue.
- A legacy entry lacks a name in some language (vetoes have only `es` and `ca`): kept as it is (FR-5).
- An entry is no longer wanted (the vetoes the site stopped offering): it stays in its place, since old profile codes still name it (FR-4).

## 7. Out of scope

- **The tools that rebuild each catalogue from its source** (legacy `builder/isco-esco.mjs`, `builder/tools/{places,nuts,occupations,make-families,title-indexes}.mjs`). They come in a later feature, after `010-publication`; until then a catalogue changes only by replacing its file.
- The Public Suffix List: decided in `008-companies`, its only user.
- Using the catalogues (each step's own spec), writing the published copy into `published/<version>/` (`010-publication`), and files derived for the web, such as the legacy `family-terms.json` (`010-publication`).

## 8. Completion criteria

- FR-1 to FR-9 pass their acceptance tests, and `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:run && pnpm build` is green.
- The Docker image carries `catalogues/`.

## 9. Open questions

- None. (2026-11-19: eight languages kept; rebuild tools later; all legacy catalogue files here; Public Suffix List to `008-companies`.)
