# Plan: Catalogues

Implements `spec.md` (FR-1 to FR-9). Status: approved (2026-11-19). The first processor feature: it brings data and one shared module, and no processor entry point yet (that is `010-publication`).

## 1. Layout

```
catalogues/                      # the published set (FR-6), JSON, as in the legacy
  families.json occupations.json countries.json languages.json degrees.json seniority.json vetoes.json
  activities.json                # internal: NACE/CNAE names for company cards
  codes/                         # internal working tables (FR-6)
    isco.json ssyk-isco.json titles.json confirmed-titles.json places.json nuts.json elsewhere.json
  positions.json                 # the order of each positional catalogue, recorded at import (FR-4)
src/shared/catalogues/
  header.ts                      # the header every file carries (FR-2)
  schemas.ts                     # one Zod schema per catalogue (FR-3)
  catalogues.ts                  # CATALOGUES: name → file, schema, published or internal (FR-6, FR-7)
  read-catalogue.ts              # readCatalogue(name): load once, validate, cache (FR-7)
  *.test.ts                      # FR-2 to FR-9 against the committed files
src/shared/config/
  data-file.ts                   # the path guard of loadConfig, shared by config and catalogues
```

**Why `src/shared/` and no `src/features/catalogues/`:** the code is a reader that places, advert facts, gate, companies and publication all use; by the rules in `AGENTS.md` that is shared code. The feature's other half is data, which lives at the root next to `config/`.

**Why `catalogues/` and not `config/`:** `config/` holds the operator's settings in YAML, small and edited by hand. Catalogues are large generated JSON (about 20 MB) that comes from outside sources, and the legacy, its tools and its docs all name `catalogues/` and `catalogues/codes/`. JSON also loads the 9 MB `places.json` far faster than YAML would.

## 2. File format

Every file keeps the legacy's data keys and values unchanged. Only the header changes: the legacy's `_about` (a sentence), `about` (in `activities`) and `built_at` become one `about` object (FR-2):

```json
{
  "about": {
    "description": "GeoNames' populated places of more than 1,000 people in the site's countries, ...",
    "sources": [
      {
        "name": "GeoNames",
        "url": "https://download.geonames.org/export/dump/",
        "licence": "CC BY 4.0"
      }
    ],
    "builtAt": "2026-11-08",
    "builtBy": "legacy builder/tools/places.mjs",
    "importedFrom": "JustJans/indudex@b0cd182"
  },
  "places": [ ... ]
}
```

- `description` is the legacy's `_about` text, kept with its rules ("APPEND ONLY", what each field means).
- `sources` names every source a file comes from. Hand-made files (families' short labels, degrees' stems, seniority, vetoes, languages' words) name the legacy Indudex project (© 2026 JustJans) as their source, plus ESCO or ISCO-08 where their codes come from. `titles` keeps its own `sources` list (one per statistics office, with its terms) and its `about.sources` repeats them. `licence` is the licence or terms as the source states them, read from each source's page when the file is imported, never guessed.
- `builtAt` is the legacy's `built_at`, or the date of the legacy commit that last changed the file when it has none.
- The files are not formatted by Prettier (`catalogues/` goes in `.prettierignore`), so a re-import compares byte for byte with what the import script writes.

## 3. Schemas (FR-3)

One Zod schema per file in `src/shared/catalogues/schemas.ts`, written from the legacy files and the legacy `packages/published-data/index.d.ts`. Names follow the files: `Families`, `Occupations`, `Countries`, `Languages`, `Degrees`, `Seniority`, `Vetoes`, `Activities`, `IscoTable`, `SsykIsco`, `NationalTitles`, `ConfirmedTitles`, `Places`, `Nuts`, `Elsewhere`.

- **Strict objects** wherever the legacy shape is fixed, so a misspelt key fails, as in `config/`.
- **Labels:** a `Labelled` entry has `label` (English) and optional `es`, `ca`, `fr`, `nl`, `de`, `it`, `pl` (FR-5). The language list is one constant, `SITE_LANGUAGES`.
- **Codes:** ISCO unit groups as four digits, ESCO occupation codes as `NNNN.N…`, countries as two lower-case letters, GeoNames ids as positive integers, NUTS codes as the country's letters and up to three characters.
- **`places`** is a list of tuples `[geonameId, name, country, region, latitude, longitude, population, otherNames, localNames?]`, as the legacy writes it to keep the file small. The schema reads it as a tuple, and the module gives the steps named fields (`Place`), so the file format stays inside `src/shared/catalogues/`.
- The published schemas get `.openapi("<Name>")` names: they are the contract `indudex-api` serves (FR-6), like the advert schemas.

## 4. Reading (FR-7)

- `src/shared/config/data-file.ts` takes the path guard out of `loadConfig`: only files inside the folder, no `..`, no absolute paths, no links leading out. `loadConfig` keeps its behaviour and its tests; it only calls the guard.
- `readCatalogue(name, directory = CATALOGUE_DIRECTORY)` reads `catalogues/<file>`, parses the JSON, validates it with its schema and caches the promise per directory and name. A failure raises `CatalogueError` with `file: path: message` (the `ConfigError` format) and is not cached, so a fixed file can be read again in the same process.
- `CATALOGUES` maps each name to its file, its schema and whether it is published. `readCatalogue`'s return type follows the name.
- No other code reads `catalogues/`. Every later step receives what it needs through `readCatalogue`, and tests read the real files the same way.

## 5. Positions (FR-4)

`catalogues/positions.json` records, for each positional catalogue, the ids in their order at import: family groups and families by `id`, occupations by `code`, countries by `iso`, languages by `code`, degrees, seniority levels and vetoes by `id`. The test fails if:

- the recorded list is not the start of the catalogue's current list (an entry removed, renamed or moved), or
- the catalogue is longer than the record (an entry added without recording it).

So adding at the end means appending to both files in the same change. The second rule keeps the record current, so the first one always guards the newest order.

## 6. Published set (FR-6)

- `CATALOGUES` marks `families`, `occupations`, `countries`, `languages`, `degrees`, `seniority` and `vetoes` as published. `publishedCatalogues()` reads those seven. The publication (010) writes them, with their headers, into `published/<version>/catalogues/`, and records `CATALOGUE_VERSION` in the dataset's metadata.
- `CATALOGUE_VERSION` starts at 1. The legacy's `catalogue_v: 2` belonged to the old web and its file shapes; the new header makes this a new contract. It goes up whenever a published schema changes shape. Adding entries does not change it.
- `activities` stays internal: the company cards (008) publish the activity names they use, not the whole table. `titles` stays internal because two of its sources allow occupational use only (BA's index, "commercial use needs its leave"; the DKZ download portal, "never sold, unchanged").

## 7. Import

A one-off script in the scratchpad, not committed, since the rebuild tools come later. It reads the legacy commit `b0cd182`, writes each file with the new header and its data untouched, and writes `positions.json`. The script is not kept; each header records where its file came from.

- Each imported file is checked against the legacy with a deep comparison of everything but the header.
- `public_suffix_list.dat` is not imported: it goes to `008-companies`, whose spec gets that open question.

## 8. Checks across files (FR-8, FR-9)

- **Scope (FR-8):**
  - the ISCO codes of `config/isco-units.yml` equal the families' `isco` codes;
  - each family's unit group is in `codes/isco.json`'s `units`;
  - each group of `config/ssyk-groups.yml` is in `codes/ssyk-isco.json` with the same SSYK code and ISCO codes.
- **Personal data (FR-9):** every string of every catalogue, keys included, is checked against an e-mail pattern (`name@domain.tld`) and a phone pattern (an optional `+`, then 9 or more digits with spaces or dashes). The phone pattern skips the reference numbers sources put in titles (`j12070 - 01200`): it counts only runs of digits not glued to letters, and the legacy's 45,111 confirmed titles are checked against it before it is fixed. A real hit is removed from the file and noted in its `description`. The import found no e-mail address: the 34 titles with an `@` are handles such as "@marshtech".

## 9. Deployment

The Dockerfile copies `catalogues/` into the runtime image next to `config/`. `CATALOGUE_DIRECTORY` is resolved like `CONFIG_DIRECTORY` (three levels up from the module, in `src/` and in `dist/` alike).

## 10. Decisions (2026-11-19, operator)

- **Languages:** the eight legacy languages, as they are. Why: nothing is lost, and the web can add a locale without touching the catalogues.
- **Data now, tools later.** Why: the first published pile comes sooner, the data is from October and November 2026, and the ESCO tool depends on the Argus title rules, which are not a shared package yet. Until the rebuild tools come, a catalogue changes only by replacing its file, and the schemas, positions and scope tests guard every replacement.
- **Every legacy catalogue file lives here.** Why: one home and one reader for reference data. Each step only reads it.
- **Public Suffix List to `008-companies`.** Why: it is the only user, and the choice between the file and a library such as `tldts` belongs there.
