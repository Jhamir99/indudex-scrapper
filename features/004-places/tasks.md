# Tasks: Places

Generated from `spec.md` and `plan.md`. Tasks are ordered by dependency and have a verifiable "Done when". Every task ends with `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:run && pnpm build` green. "Legacy example" means the example the legacy's comment for that rule gives, tested against the real catalogues.

**Depends:** `catalogues` closed (its T009).

## Tasks

- [x] **T001 — Folding and the gazetteer** · FR: FR-2, FR-9 · Depends: catalogues T009
      Done when: `fold` and `unaccent` are in `src/shared/kit/text.ts` with tests; `gazetteer.ts` compiles, once, every town by its folded names per country, with the forms without hyphens, apostrophes and dots and the spelt-out letters kept apart, and the regions and provinces by their names (with and without the word for a province, with spaces for hyphens, and the loose and other names); tests on legacy examples («Aix en Provence», «s Hertogenbosch», «St.Gallen», «Baerum», «Lillestroem», «Muenchen», «Zuid Holland», «prov. west-vlaanderen») find the right GeoNames ids and NUTS codes; `AGENTS.md` states that processor features expose an `index.ts` that only the publication imports.
- [x] **T002 — Areas a place names** · FR: FR-5 · Depends: T001
      Done when: `areaCode` and `areaOf` pass tests on legacy examples: the most precise of nested areas («Terrassa, Barcelona, Catalonia» is ES511), none for areas that disagree («Madrid, Barcelona»), the first loose name when loose names disagree («Bedfordshire, South East»), a province's word (Italy's «provincia di», Belgium's «Provincie», «Kanton», «canton de», «županija»), and a point of the compass not cut into a town («Noord-Brabant»).
- [x] **T003 — A place's pieces** · FR: FR-3 · Depends: T001
      Done when: `pieces.ts` passes tests on legacy examples: postcodes and words around a town removed («08940 Cornellà de Llobregat, Barcelona provincia», «Getafe Area», «Office Eschborn», «BLOIS PLANT», «Cambridge Science Park»), a district after a hyphen («Ulm-Jungingen»), codes in capitals («OCONUS-UK-Warrington», «DE_Ulm», «GE-Hannover (Langenhagen)»), «Sta.» and the saints, a French district named small or great of its town («Petit-Lancy»), a region's hyphenated name not cut («Baden-Württemberg»).
      2026-11-19: done before T002, since `areaOf` reads a place by its pieces. Unit tests use the legacy's own small catalogues (`test/places/gazetteer.ts`); the real catalogues check the gazetteer's names.
- [x] **T004 — The town a place names** · FR: FR-2, FR-3, FR-4 · Depends: T002, T003
      Done when: `townOf` passes tests on legacy examples for every rule of its comments: pieces from the most precise («Terrassa, BARCELONA, ES»), a town inside the area named («Salamanca, Spain», «San Isidro, Alicante»), «bei», «am», «im» and «in der» («Ergolding bei Landshut», «Bornheim bei Landau», «Mühlhausen in der Oberpfalz», «Biberach im Kinzigtal» gives none), Spain's article after the name («Garriga, La»), a saint cut short («St Denis», «St. Ulrich bei Steyr»), France Travail's article left out («17 - Rochelle»), a British town before its county and under its historic county («Swindon Wiltshire», «Manchester, Lancashire»), a town and its district of one name (Leipzig), a broken letter («Z�rich», «Br�gg»), and the words that are no town alone; an advert's town in another country gives none (FR-1).
      2026-11-19: «Mühlhausen in der Oberpfalz» is tested on a small catalogue: the real one has no Mühlhausen in the Oberpfalz (under 1,000 people) and no area named «Oberpfalz».
- [x] **T005 — Placing an advert** · FR: FR-1, FR-5, FR-7, FR-9 · Depends: T004
      Done when: `createPlacer(...).place` gives a `Placement` (validated by its Zod schema) with town, coordinates to two decimals and NUTS 3 code, or the area alone for a place that names no known town, or nothing; fields are capped at 2,000 / 500 / 300 characters cut at a word; the shown name follows FR-7 («MONTCADA I REIXAC», «Munchen» → «München», «la Garriga» → «La Garriga», «Valencia» kept); placing twice gives equal results.
- [x] **T006 — Towns from postcodes and labelled lines** · FR: FR-6 · Depends: T005
      Done when: `postalTowns` and `labelledTowns` pass tests on legacy examples («63456 Hanau», «64-100 Leszno», «D-84579 Unterneukirchen», «2511 CV Den Haag», «08100 Mollet del Vallès» is not Mollet de Peralada, «Arbeitsort: Lüdenscheid», «Lugar de trabajo: Getafe», «Lokalita Jihlava a další», «Lokalita Česká republika» gives none, an agency's «Standort» not read); `place` uses them when the location names no town, only inside the area the location names.
      2026-11-19: the text is read only when the place names no town of its own (the adapter's city, else the location's first piece that is not the country's name: the legacy's `ci`), or names a region as its town. So `createPlacer` also takes the `countries` catalogue. A text that places staff with a client («unser Kunde») is read as an agency's (legacy `FOR_A_CLIENT`).
- [x] **T007 — Towns from phrases** · FR: FR-6 · Depends: T006
      Done when: `phraseTowns` passes tests on legacy examples in German («… in Oppenheim», «Region Mannheim», «für unseren Standort Wittlich», not «Hauptsitz in Wiesbaden»), Dutch («regio Zwolle», «vestiging Eindhoven»), French («basé à Strasbourg», «site de Palaiseau») and English («based in Redhill», «London E» cut, «Buckingham Palace» not), and an agency's text gives none while its title still does.
- [x] **T008 — Towns and regions in use** · FR: FR-8 · Depends: T005
      Done when: `townsInUse` and `regionsInUse` pass tests on a small set of placements: each town under the name its offers use most, GeoNames' name when it differs, its names in visitors' languages (four letters at least, three words at most), the fullest first and ties by id; regions and provinces with their names, other names and counts.
- [x] **T009 — Ambiguous town names** · FR: FR-8 · Depends: T008
      Done when: `ambiguousNames` passes tests on legacy examples: «Orange» in a company name and «Hook» in «Hook Up Engineer» are words, «Engineer – Vigo», «(Vigo)», «in Vigo», «Köln, NRW», «Softwareentwickler Duisburg» are places, a name is ambiguous above a quarter of word uses, and a mention near its town counts as a place.
      2026-11-19: as the legacy's code reads them, a separator or region word after a name marks it only past the title's first word («Köln, NRW» alone is a word, «Engineer Köln, NRW» a place). The legacy also read the offer's English title (`te`); that comes with title translation (011).
- [x] **T010 — Measure on a real store** · FR: FR-9, spec section 5 · Depends: T007
      Done when: the scratchpad script has placed every advert of a real store and the numbers are recorded here: per source the share placed from the location, from the text, by area only and not at all, and the time for the whole pass (under a minute). Any source far below the others has a note: an adapter finding to check, or a rule to add with its test.
      2026-11-19: measured on the stores of the public-feeds live runs (38 enabled sources, the newest file of each, 188,365 adverts, no network) on the development Mac: the gazetteer compiled in 0.65 s and every advert placed in 2.8 s. Placed from the location 92.1 %, from the text 0.2 %, by area only 4.3 %, not at all 3.4 %. 18 sources place every advert; most others leave under 5 % unplaced. Agency flag `false` throughout (companies does not exist yet).

      | source | adverts | location % | text % | area % | none % |
      | --- | --- | --- | --- | --- | --- |
      | island | 138 | 0 | 0 | 0 | 100 |
      | actiris | 1,884 | 27 | 7 | 0 | 66.1 |
      | infopraca | 2,868 | 60.8 | 0 | 0 | 39.2 |
      | jobindex | 148 | 67.6 | 0 | 0 | 32.4 |
      | nva | 1,260 | 84 | 0 | 0.2 | 15.9 |
      | anofm | 8,468 | 54.7 | 0 | 31 | 14.3 |
      | mpsv | 6,260 | 87.1 | 0.6 | 0 | 12.3 |
      | brescia | 113 | 92 | 0 | 0 | 8 |
      | upsvr | 12,184 | 94.9 | 0 | 0 | 5.1 |
      | hzz | 6,011 | 39 | 0 | 56.9 | 4.1 |
      | cyprus | 401 | 0 | 0 | 100 | 0 |
      | vdab | 117,042 | 98.2 | 0.1 | 1.4 | 0.3 |
      | all 38 | 188,365 | 92.1 | 0.2 | 4.3 | 3.4 |

      Findings (none changes a ported rule; each needs its own decision):
      - `infopraca`: jobs abroad («Niemcy», «Holandia», «Jenbach / Austria») are stored with country `pl` (945 of its 2,868 adverts name a foreign country or region). An adapter fault: the legacy guessed the country, which 004 leaves out (FR-1).
      - `island`: the location is an Icelandic region («Höfuðborgarsvæðið», «Suðurland»), not one of NUTS's names for Iceland (IS001 is «Höfuðborgarsvæði»). Needs other names for those regions.
      - `actiris`: 1,240 adverts name only «Belgique»; the adapter may have the commune in another field.
      - `anofm`: «Municipiul Bucuresti» (1,211 adverts) is Bucharest; Romanian «Municipiul» before a town's name is not a rule of the legacy.
      - `jobindex`: Copenhagen's and Aarhus's postal districts («København Ø», «Aarhus N»).
      - `nva` and `mpsv`: villages under 1,000 people and addresses («Lidosta "Rīga"»), and 590 `mpsv` adverts that name only «Česko».
      - `hzz` gives counties only («Grad Zagreb» is the area HR050, not the town), and `cyprus` only «Κύπρος» (CY000, the whole island): placed by area, as the sources give no town.

- [ ] **T011 — Close places** · FR: FR-1 to FR-9 · Depends: T001-T010
      Done when: `index.ts` exports only `createPlacer`, `Placement` and the list types; `CLAUDE.md` ("Intended structure") lists `src/features/places/`; `features/README.md` marks this feature done; the CI command is green.
