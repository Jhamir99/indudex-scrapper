# Tasks: Catalogues

Generated from `spec.md` and `plan.md`. Tasks are ordered by dependency and have a verifiable "Done when". Every task ends with `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:run && pnpm build` green.

**Depends:** `public-feeds` closed (its T018).

## Tasks

- [x] **T001 — Shared path guard and `readCatalogue`** · FR: FR-3, FR-7 · Depends: public-feeds T018
      Done when: `loadConfig`'s path guard lives in `src/shared/config/data-file.ts` and `loadConfig`'s tests still pass unchanged; tests on a temporary folder pass: `readCatalogue` validates a JSON file with its schema, parses it once when read twice, refuses `..`, absolute paths and links leading out, and reports a missing file, broken JSON or a schema mismatch as `CatalogueError` with `file: path: message`, without caching the failure.
- [x] **T002 — Header schema and the import script** · FR: FR-2 · Depends: T001
      Done when: `src/shared/catalogues/header.ts` declares the `about` header (description, sources with name, url and licence, builtAt, builtBy, importedFrom) and a test refuses a header with no source or a source with no licence; the scratchpad import script writes a file with the new header and its data untouched, and its deep comparison with the legacy file passes; `catalogues/` is in `.prettierignore`.
- [x] **T003 — Import the positional catalogues** · FR: FR-1, FR-2, FR-3, FR-5 · Depends: T002
      Done when: `families`, `occupations`, `countries`, `languages`, `degrees`, `seniority` and `vetoes` are under `catalogues/` with their headers (each source's licence read from its page), their strict schemas (`Labelled` over `SITE_LANGUAGES`) and their `CATALOGUES` entries; tests pass on the real files: 71 families, 644 occupations, 45 countries, every labelled entry has an English label, and a damaged copy of each is refused naming file and path.
- [x] **T004 — Positions record** · FR: FR-4 · Depends: T003
      Done when: `catalogues/positions.json` holds the import order of every positional catalogue, and tests pass: the real files match it; a copy with an entry moved, removed or renamed fails; a copy with an entry appended fails until the record is extended, then passes.
- [x] **T005 — Import the occupation tables** · FR: FR-1, FR-2, FR-3, FR-6 · Depends: T002
      Done when: `activities`, `codes/isco.json`, `codes/ssyk-isco.json`, `codes/titles.json`, `codes/confirmed-titles.json` and `codes/wikidata-countries.json` are imported with their headers (`titles`' sources with their own terms), schemas and `CATALOGUES` entries marked internal; tests pass on the real files: 17 groups and 71 unit groups in `isco`, titles in its 23 languages, each family's unit group in `isco`'s `units`.
- [x] **T006 — Import the places tables** · FR: FR-1, FR-2, FR-3 · Depends: T002
      Done when: `codes/places.json`, `codes/nuts.json` and `codes/elsewhere.json` are imported with their headers (GeoNames CC BY 4.0; GISCO, © EuroGeographics), schemas and internal `CATALOGUES` entries; `places` is read as tuples and handed out as named `Place` fields; tests pass: 84,176 places (of 8 or 9 fields), every town of `nuts` (79,826) is a place of `places`, and reading `places` and `nuts` takes under two seconds (measured once on the server and noted here).
      2026-11-19: measured on the development Mac (Node 26), not yet on the server: `places` (as `Place`) and `nuts` read together in about 280 ms, about 130 MB of heap.
- [x] **T007 — Published set and catalogue version** · FR: FR-6 · Depends: T003
      Done when: `publishedCatalogues()` reads the seven published catalogues with their headers, their schemas carry `.openapi` names, `CATALOGUE_VERSION` is 1, and a test fails if the published set is not exactly those seven (`titles`, `activities` and every `codes/` file stay internal).
- [ ] **T008 — Checks across files** · FR: FR-8, FR-9 · Depends: T003, T005, T006
      Done when: tests pass on the real files: `config/isco-units.yml` and the families name the same unit groups; every group of `config/ssyk-groups.yml` is in `ssyk-isco` with the same codes; no string in any catalogue (keys included) holds an e-mail address or a phone number, with a test showing each pattern catches a real one and lets the reference numbers of `confirmed-titles` through.
- [ ] **T009 — Close catalogues** · FR: FR-1 to FR-9 · Depends: T001-T008
      Done when: no code outside `src/shared/catalogues/` reads `catalogues/` (checked with a search); the Dockerfile copies `catalogues/` and a built image reads a catalogue; `008-companies`' spec carries the Public Suffix List question; `CLAUDE.md` ("Intended structure") lists `catalogues/` and `src/shared/catalogues/`; `features/README.md` marks this feature done; the CI command is green.
