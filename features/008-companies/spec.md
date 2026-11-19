# Spec: Companies

Status: approved (2026-11-19). Requirements written from the outline with the operator's answers of 2026-11-19: the open business registers are in this feature; the Public Suffix List and the careers pages wait for `016-career-sites`; the processor keeps the employers it has listed in a state folder of its own.

## 1. Context and goal

One employer appears under many spellings ("Siemens AG", "SIEMENS", "Siemens"), boards write their own name or a slogan where the employer goes, agencies post for employers, and the web has a directory of companies with a panel per company. The legacy cleaned the employer's name when it normalised each advert (`builder/normalise.mjs`: `companyOfAdvert`, `companyName`, `spelledCompany`), spelt a name copied from an address as the adverts write it (`builder/lib/names.mjs`), keyed employers (`app/lib/company-key.ts`), told agencies apart (`builder/agencies.mjs`), kept every employer it had listed (`builder/companies.mjs`, `builder/state/companies.json`), read companies from open business registers (`builder/tools/registers.mjs`) and joined them to the employers, and wrote a card per company (`builder/company-cards.mjs`). Its research is in `docs/research/{directory,employer-names}.md`.

**Goal:** give each advert a clean employer name, its key and whether it is an agency's, and give the publication the directory of companies (employers with offers today and before, and the registers' companies that hire the site's occupations) and a card per company.

**Why:** a visitor finds an employer under one name, sees who hires for what and where, and an agency's advert says it is one.

## 2. Users

- **Processor's steps** (downstream): places reads the agency flag; the publication writes the employer, the directory and the cards.
- **Visitors** (through the API and the web): browse companies by place and occupation group, open a company's card.
- **Operator**: refreshes the registers' data from their bulk files.

## 3. User stories

- As a visitor, I want "Siemens AG", "SIEMENS" and "Siemens" to be one company in the directory, shown under the spelling its adverts use most.
- As a visitor, I want an advert of Randstad or of an «Empresa de Trabajo Temporal» to say it comes from an agency.
- As a visitor in Norway, I want the engineering companies of my county listed even when they have no offer today.

## 4. Functional requirements

### Part A — The employer of an advert

**FR-1 — The employer's name.**
An advert's employer shall be its source's company field cleaned as the legacy did: control characters, markup, addresses, placeholders and the marks left at either end out; a sign before the name, a Spanish tax number or a person's DNI after it, a careers site's words («Stellenangebote bei», «Karriere», «Jobs»), a board's name and a slogan after a dash taken off; a long name cut at a word (120 letters); and none when what is left names no one («Confidencial», «Human Resources», a country, a template's field, a board's line), when the source's reader took the title for the employer, or when the employer is the advert's own town on a site not of that name.
_Acceptance:_ Tests on the legacy's examples for each rule (`test/fixtures/companies/` golden set, read from the legacy itself).

**FR-2 — Spelt as its adverts write it.**
A name a source gives in capitals or copied from its address («Zeissgroup», «JACKSON HOGG») shall be written the way most of that source's adverts write it in their text («ZEISS Group», «Jackson Hogg»), when two adverts agree or the source has only one.
_Acceptance:_ Tests on the legacy's examples.

**FR-3 — One employer, one key.**
An employer's key shall fold its letters as a town's are folded, join initials («S.A.U.»), and drop the legal forms and joiners at its end and the Russian ones at its front; a name that hides the employer («Confidential», «our client») or has fewer than two letters is no employer. A name the registers give in capitals is shown as people write it, legal forms and short words kept.
_Acceptance:_ Tests: «Siemens AG», «SIEMENS» and «Siemens» share a key; «Müller GmbH & Co. KG» is «muller»; «SAS Institute» keeps its «sas».

**FR-4 — Agencies.**
An advert shall be marked as an agency's when its employer's name says so (the words staffing and recruitment agencies call themselves by in the sources' languages, and the big brands whose names say nothing of it); a name in doubt stays an employer's.
_Acceptance:_ Tests on the legacy's examples (Randstad, Adecco, «ETT», «Personaldienstleistung», «uitzendbureau»; «Siemens» is none).

### Part B — The directory

**FR-5 — The employers listed, kept between runs.**
The processor shall keep every employer it has listed (`state/companies.json` in its own state folder, never the scrapper's store): its shown name (the spelling seen most), the occupation group it hires most for, the places it had offers in, its town with the town's NUTS 3 code, the day it was last seen. Each run lists every employer with offers today and every one listed before, with today's count overall and in each of its places (0 where it has none today); an employer that is no longer a name or is taken down is forgotten; one remembered under a key the rules no longer give moves to its own.
_Acceptance:_ Tests on temporary state: a first run, a second run with fewer offers keeping the employer at 0, a key that changed, a taken-down employer forgotten; the file is versioned, validated and written atomically.

**FR-6 — The registers' companies, collected.**
An operator's tool shall read the open registers into the store: Norway's Enhetsregisteret (NLOD 2.0) and France's Sirene (Licence Ouverte 2.0) from their bulk files, and the province of Barcelona's census of activities (CC BY 4.0) fetched through the polite client. It keeps only companies (never a sole trader or a record withheld from public lists) whose activity hires the site's occupations (the legacy's NACE divisions), with ten people or more where the register says how many, each placed in its NUTS 3 unit by its municipality's code in Eurostat's LAU table, with each register's licence and credit.
_Acceptance:_ Tests on saved records of each register: a company kept, a person, a withheld record, a small company and another activity left out; placed by its code, a missing code by its département's unit; the file written atomically into the store with its licence.

**FR-7 — Registers joined with the employers.**
A register's company shall be an employer of the directory when the legacy's rules say so (the same key, not made only of words every company bears nor shown with another country's legal form, and found where the employer has offers, by the size and length rules), or belong to one (the employer's key followed only by words of place or unit, near its offers); else it is listed alone in its country, once per key, the largest kept. An employer joined so takes the company's town in its main country and lists the company's province.
_Acceptance:_ Tests on the legacy's examples (Airbus of Blagnac with offers in Toulouse; «META» of Paris is not Meta; «Barry Callebaut Manufacturing Iberica SAU» belongs to Barry Callebaut; «ABB AS» in Norway is not ABB of Switzerland).

**FR-8 — Company cards.**
Each employer and each listed register company shall get a card with what there is to say: the three occupation groups and six occupations it hires most for, the three towns with most of its offers and in how many towns it has offers, the pay its adverts state (in the currency and period most use, its lowest and highest figures, or the tenth and ninetieth with five adverts or more), the work modes its adverts say, the register's activity, register and size, the register companies that belong to it, and for a register company the employer it belongs to, that employer's offers in its town and its website.
_Acceptance:_ Tests on the legacy's examples; a card with nothing to say is not given.

**FR-9 — Pure and offline, but for the state.**
Cleaning, keying and the agency flag shall need only the advert; the directory and the cards only the run's adverts, the registers in the store and the processor's state, with no network.
_Acceptance:_ Tests run with no network; the same input gives the same output.

## 5. Non-functional requirements

- **Testability:** every rule ported from the legacy comes with the example its comment names.
- **Equivalence:** over a real store, the employer, key and agency flag of every advert, and the directory, are the legacy's (checked by running the legacy's functions on the same input).
- **Speed:** naming and keying every stored advert takes under a minute on the server.
- **People are never listed:** no register record of a person, and no person's tax number in a name (FR-1, FR-6).
- **Measured:** before the feature closes, a pass over a real store reports the share of adverts with an employer and with an agency's, the directory's size, and the registers' companies kept and joined.

## 6. Edge cases

- A name with a writing-direction mark or a control character: taken out, so a card is never drawn backwards (the legacy's NOA-19).
- A name that is a property of every object («constructor»): never read as a word of a table.
- A register record with no municipality the LAU table knows (Paris by arrondissement): its département's or province's unit.
- A state file from an older version or broken: refused with its path, never reset silently (as the store is).

## 7. Out of scope

- The Public Suffix List, each employer's careers page and the boards' brand names (`brandName`, `addressCode`, the Workday rules): `016-career-sites`, whose adverts carry them.
- Applying the takedowns list: given to the directory as an input; reading it is `010-publication`'s.
- Writing the directory and the cards into the published dataset (files, the cards' 512 buckets): `010-publication`.
- More registers than these three (Czech, Slovak, Estonian, Danish, Belgian, British): one by one later, each checked for terms.

## 8. Completion criteria

- FR-1 to FR-9 pass their acceptance tests, and `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:run && pnpm build` is green.
- The measurement of section 5 is recorded in `tasks.md`.

## 9. Open questions

- None. (2026-11-19: registers in this feature; PSL and careers pages with 016; the processor's own state folder.)
