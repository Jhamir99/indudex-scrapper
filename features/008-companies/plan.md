# Plan: Companies

Implements `spec.md` (FR-1 to FR-9). Status: approved (2026-11-19). A port of the legacy's employer-name cleaning (`builder/normalise.mjs` lines 1428-1720 and `builder/lib/crawl.mjs`'s `genericName`), `builder/lib/names.mjs` (`writtenNames` and what it needs), `app/lib/company-key.ts`, `builder/agencies.mjs`, `builder/companies.mjs`, `builder/tools/registers.mjs` and `builder/company-cards.mjs` (without the careers pages), with their tests (`test/{companies,company-key,registers,company-cards,agencies,names}*.test.mjs` and the name cases of `test/builder.test.mjs`).

## 1. Layout

```
src/features/companies/          # processor
  index.ts            # public entry: createEmployerReader, the directory, the cards, the types
  clutter.ts          # withoutClutter, withoutPictures, the patterns a field carries that are no part of it
  employer-name.ts    # companyOfAdvert, companyName, spelledCompany, genericName, the town as a company
  written-names.ts    # writtenNames: a source's names as its adverts write them
  company-key.ts      # nameWords, companyKey, usable, townKey, LEGAL, displayName
  agencies.ts         # isAgency
  history.ts          # the processor's state: state/companies.json, read, validated, written atomically
  directory.ts        # updateCompanies, mainCountry, offersAt
  register-join.ts    # registerJoin, withRegisters
  cards.ts            # companyCards (without careers pages)
  *.test.ts
src/features/registers/          # scrapper: the operator's tool
  lau.ts              # Eurostat's LAU table and the placer
  brreg.ts, sirene.ts, diba.ts   # each register's records to companies
  registers.ts        # the run: read, keep, write into the store
src/shared/schemas/register.ts   # a register's company, the file's schema (the contract between the two)
src/shared/storage/registers-file.ts  # <store>/registers/<register>.json: write (atomic) and read
src/shared/storage/processor-state.ts # the processor's state folder (PROCESSOR_STATE_DIR, default state/)
src/bin/registers.ts             # `pnpm registers <brreg|sirene|diba> [files…] --lau <file>`
```

`src/features/registers/` is a scrapper feature (it collects into the store); `src/features/companies/` is the processor's and reads the registers through `src/shared/storage/registers-file.ts`. As every processor feature, companies exposes only `index.ts`.

## 2. Inputs and outputs

```ts
// Per advert (FR-1 to FR-4): pure.
createEmployerReader(adverts of one source): {
  employer(advert: { company, title, url, description, city }): { name: string; key: string; agency: boolean }
}
// writtenNames is per source, so the reader is made per source's adverts, as the legacy's build did.

// The directory (FR-5, FR-7): the run's offers as the other steps give them.
interface DirectoryOffer {
  employer: string;            // the cleaned name
  families: string[];          // gate
  country: string; town: string; nuts: string | null;  // places
  pay: { low, high, currency, period } | null;          // pay
  workMode: "onsite" | "hybrid" | "remote" | null;      // advert facts
}
listCompanies({ offers, history, groupOf, day, taken }): CompanyRow[]
joinRegisters(rows, registerCompanies, offers): { local, same, listed }
companyCards({ rows, joined, offers, groupOf }): Map<cardKey, Card>
```

- Inputs from other steps come as plain values (`AGENTS.md`, "Features"): companies never imports places, gate, pay or advert facts.
- The legacy's record fields map so: `c` → `employer`, `f` → `families`, `cc` → `country`, `ci` → `town`, `n` → `nuts`, `p` → `pay`, `w` → `workMode`, `m` (a campaign's other towns) → none until `009-dedupe`.
- The row keeps the legacy's shape as named fields (`name`, `count`, `group`, `places`, `town`, `townNuts`); the published shape is `010-publication`'s.
- Cards are keyed by the legacy's `cardKey` (an employer's key; a register company's `country:key`); splitting them into files is 010's.

## 3. The processor's state (FR-5)

- `state/` at the repo root, or `PROCESSOR_STATE_DIR`; ignored by git. `AGENTS.md` ("Processor") gains the line: the processor keeps what it must remember between runs in its own state folder, never in the scrapper's store.
- `state/companies.json`: `{ version: 1, companies: { [key]: { n, g, p, t, tn, seen } } }`, the legacy's fields (careers page `s` left out until 016), validated with Zod; a file that cannot be read is an error naming its path.

## 4. The registers (FR-6)

- **Run by the operator**, as the legacy's: `pnpm registers brreg <enheter_alle.json.gz> --lau <lau.tsv>`, `pnpm registers sirene <StockUniteLegale.zip> <StockEtablissement.zip> --lau <lau.tsv>`, `pnpm registers diba --lau <lau.tsv>` (fetched through the polite client: robots.txt asks ten seconds between requests). The bulk files and the LAU table are the operator's downloads; the tool reads them as streams (Sirene's are several GB). The zip files are read with the system's `unzip`, as the legacy did, so no new dependency.
- **Stored** at `<store>/registers/<register>.json`: `{ version: 1, register, savedAt, licence, credit, companies: RegisterCompany[] }`, `RegisterCompany = { id, name, country, town, nuts, nace, people?, website? }`, written atomically. A new path in the store; its format version stays 1, and the layout comment in `file-advert-store.ts` lists it.
- **People never**: Norway's sole proprietorships and partnerships, France's legal category 1000 and records withheld from public lists, a Spanish tax number of a person: left out at reading, tested.

## 5. Porting rules and equivalence

- **Behaviour, not code**, as in 004 to 007; long legacy lists and patterns are extracted by a scratchpad script, never retyped; `Object.hasOwn` for every table looked up by a word.
- **Golden sets**: the legacy's own readings, run in the scratchpad: every company string of its tests (and of the store's adverts' names) through `companyOfAdvert`, `companyName`, `companyKey`, `usable`, `isAgency`, `displayName` (`test/fixtures/companies/`).
- **Equivalence (T013)**: over the fresh store, every advert's employer, key and agency flag, and `updateCompanies` run on the same offers, against the legacy's functions; with registers read live from Brønnøysund's and Barcelona's open data (Sirene is checked on a sample, its bulk files being several GB).

## 6. Decisions (2026-11-19, operator)

- **Registers in this feature.** Why: the directory lists the companies of the open registers beside the employers, as the legacy's did.
- **Public Suffix List and careers pages with 016.** Why: their only use is each employer's careers page, which comes from employers' own sites and boards.
- **The processor's own state folder.** Why: the directory remembers employers between runs, and the store is the scrapper's.
