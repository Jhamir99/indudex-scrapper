# Spec: Places

Status: approved (2026-11-19). Requirements written from the outline with the operator's answers of 2026-11-19: the adapter's country is trusted (the legacy's country guessing comes with `016-career-sites`), and towns are also read from the advert's text when its location names none.

## 1. Context and goal

A visitor filters by country, region, or a town and a radius. Sources write places in many ways («Aix en Provence», «Baerum», «08940 Cornellà de Llobregat, Barcelona provincia», «Terrassa, BARCELONA, ES», a region only). Job sites locate each advert before anyone searches: its place is matched against a gazetteer to get coordinates, and a search draws a radius around the town the visitor names. The legacy did this with GeoNames and NUTS (`builder/towns.mjs`, `builder/place-names.ts`), backed by a long list of fixes measured on published offers.

**Goal:** give every advert, in the processor, the town it is in (GeoNames, with coordinates) and its NUTS region, from what the source wrote, and give the publication the towns and regions that hold offers.

**Why:** the map, the radius search and the region filter depend on it, and so do `dedupe` (one job in two towns is two offers) and `companies` (an employer's places).

## 2. Users

- **Processor's steps** (downstream): the publication writes each advert's place, `dedupe` keys offers by town, `companies` counts an employer's towns.
- **Visitors** (through the API and the web): find offers by town, radius and region.

## 3. User stories

- As a visitor, I want an offer that says «Muenchen», «München» or «Munich» to be on the map in Munich, so that a search around Munich finds it.
- As a visitor, I want an offer that names only «Provincie West-Vlaanderen» to show up when I filter by that province, even with no town.
- As the operator, I want each place rule tested on the cases that made the legacy add it, so that porting it changes nothing a visitor sees.

## 4. Functional requirements

**FR-1 — Country from the adapter.**
The advert's country shall be the one its adapter gave; places shall only look for its town and region inside that country.
_Acceptance:_ An advert whose location names a town of another country gets no town; its country is unchanged.

**FR-2 — Town by any of its names.**
The town shall be found by any of its GeoNames names within the advert's country, whatever the case, accents, hyphens, apostrophes or dots («Aix en Provence», «s Hertogenbosch», «St.Gallen»), and by the forms sources write letters in («Baerum», «Lillestroem», «Muenchen»).
_Acceptance:_ Tests over the real catalogue place each of these and the other written forms the legacy lists in `builder/towns.mjs`.

**FR-3 — The place's pieces.**
A place shall be read piece by piece, from the most precise, as addresses are written: postcodes, codes and words around a town that are not the town are left out («Getafe Area», «Office Eschborn», «DE_Ulm»); a district after a hyphen is tried as its town («Ulm-Jungingen»); the legacy's language-specific forms are kept (saints cut short, articles after the name or left out, German «bei», «am», «im», a British town before its county).
_Acceptance:_ Each rule of the legacy's `townOf` has a test with the example its comment gives.

**FR-4 — Two towns of one name.**
When a country has several towns of the name, the town shall be the one in the region or province the place also names, else the one nearest the town it is «bei», else the biggest; a place whose areas disagree names no area.
_Acceptance:_ «Salamanca, Spain» is the city and not Madrid's district; «San Isidro, Alicante» is Alicante's; «Bornheim bei Landau» is not the Bornheim near Bonn.

**FR-5 — Region and province.**
Every placed advert shall get its town's NUTS 3 code (its region and province are the codes it begins with). An advert whose place names a region or province but no known town shall get that area's code, by any of its names, with or without its word for a province («Provincie West-Vlaanderen», «Kanton Zürich», «Barcelona provincia»).
_Acceptance:_ Tests give each the expected NUTS code, and a place naming a province named like a town («Barcelona provincia») gets the province, not the town.

**FR-6 — Towns from the text.**
When the location names no town, the town shall be read from the advert's text: a town written with its postcode in the country's postcode form («63456 Hanau», «64-100 Leszno», «2511 CV Den Haag»), a labelled line («Arbeitsort: Lüdenscheid», «Lugar de trabajo: Getafe», «Lokalita Jihlava»), and the phrases the legacy reads in German, Dutch, French and English («Niederlassung in Hilgert», «basé à Strasbourg», «based in Redhill»). Only a town of the advert's country counts; when the location names a region, only a town inside it; a recruitment agency's text gives only the job's own labels, never its branch («Standort»).
_Acceptance:_ Tests on the legacy's examples; a word that is no town of the country gives nothing; an agency's «Standort: Wiesbaden» is not read.

**FR-7 — How the town is shown.**
The town shall be shown as the advert wrote it, in GeoNames' letters when the advert wrote the same name in capitals or without accents («MONTCADA I REIXAC» is «Montcada i Reixac»), with a capital at the start («la Garriga» shows as «La Garriga»); its coordinates are kept to two decimals (about a kilometre).
_Acceptance:_ Tests for each case, including «Munchen» shown as «München».

**FR-8 — Towns and regions in use.**
Places shall give the publication the towns that hold offers (each under the name its offers use most, with GeoNames' name when it differs, its region, country, coordinates, offer count and its names in the visitors' languages), the regions and provinces that hold offers with their names and the other names people search them by, and the town names the search bar must not take for a town unless marked as one (a name more than a quarter of whose mentions in titles and employers are words, «Orange», «Hook»).
_Acceptance:_ Tests on a small set of placed adverts give each list, in a stable order.

**FR-9 — Pure and offline.**
Placing shall read only the advert and the catalogues: no network, no store, and the same input gives the same output.
_Acceptance:_ Tests run on the real catalogues with no network; placing an advert twice gives equal results.

## 5. Non-functional requirements

- **Testability:** every rule ported from the legacy comes with the example its comment names.
- **Speed:** placing every stored advert takes under a minute on the server, the gazetteer built once per run.
- **Measured:** before the feature closes, a pass over a real store reports the share of adverts placed by town, by area only and not at all, per source.

## 6. Edge cases

- A place that names only its country: no town unless the text gives one (FR-6); no area.
- A town and the district around it share a name (Leipzig DED51 and DED52): the area the rest of the place names, else the one beside the namesake in the same region.
- A letter the source sent broken («Z�rich»): the one town of that country whose name fits, with a letter outside plain ASCII in each broken place.
- A place too long (a broken page, a campaign listing many towns): read only up to its first 2,000 characters (300 for the city), cut at a word, as the legacy did after a run of thousands of letters held its patterns for seconds.

## 7. Out of scope

- **Guessing or correcting the country** (the legacy's `placeOfAdvert`, `countryOfTown`, `countryOfArea`, the site's domain): ported with `016-career-sites`, whose adverts may not know their country.
- The other towns of a campaign kept once per country (`campaignPlaces`): `009-dedupe`.
- Telling recruitment agencies apart: `008-companies`; places takes it as an input (FR-6).
- Writing the lists of FR-8 into the published dataset: `010-publication`.

## 8. Completion criteria

- FR-1 to FR-9 pass their acceptance tests, and `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:run && pnpm build` is green.
- The measurement of section 5 is recorded in `tasks.md`.

## 9. Open questions

- None. (2026-11-19: country from the adapter; towns from the text included.)
