# Spec: Gate

Status: approved (2026-11-19). Requirements written from the outline with the operator's answers of 2026-11-19: the legacy's title rules are copied into this repo (the shared `indudex-matching` package replaces the copy later), a small entry writes the explain report before the processor's own entry exists, and takedowns stay with the publication (010).

## 1. Context and goal

The store holds every advert the sources gave, in and out of scope. Indudex publishes only engineering, technical and IT occupations (the catalogue's main families: ISCO-08 groups 214, 215, 216, 251, 252, 311, 312, 313, 315, 351, 352) and, kept apart, the skilled trades (712, 721-723, 741-742), in Europe only. The legacy decided this in `builder/gate.mjs` (1,719 lines), with the title rules shared with its web (`app/lib/titles.ts`), against ESCO's job titles and the official coding indexes (`catalogues/codes/`), and wrote one line per advert left out with its reason (`--explain`).

**Goal:** give each advert the occupation families (and ESCO occupations) it belongs to, leave out the ones outside the vertical, outside Europe or failing hygiene, and say why each one was left out.

**Why:** the site shows only its vertical, and every advert left out must have a reason the operator can read, so a wrong rule is found and fixed rather than guessed at.

## 2. Users

- **Processor's steps** (downstream): the publication keeps only the adverts the gate lets through, with their families and occupations.
- **Visitors** (through the API and the web): filter by family and narrow a family to an occupation.
- **Operator**: reads the explain report to find adverts left out wrongly.

## 3. User stories

- As a visitor looking for mechanical engineers, I want «Ingeniero/a mecánico», «Maschinenbauingenieur (m/w/d)» and «Werktuigbouwkundig ingenieur» to be in that family, and «Mechanical Sales Engineer» not to be.
- As a visitor, I want a «Software Engineer» in the software family and a bare «Engineer» among engineers not elsewhere classified, unless its title names a discipline.
- As the operator, I want to read why «Elektrohelfer (m/w/d)» or «Stage ingénieur» was left out.

## 4. Functional requirements

**FR-1 — The source's own code first.**
An advert whose source gives an ISCO-08 code shall be in the family of its unit group, and in none when the vertical has no family for it. One that gives an SSYK code shall be in the families JobTech's SSYK→ISCO-08 correspondence names, narrowed to the ones its title names when it names any.
_Acceptance:_ Tests on the legacy's examples: an ISCO code of the vertical, one outside it, an SSYK code of one and of several families, narrowed by the title.

**FR-2 — The title against the occupations' titles.**
Without a code, the title shall be read, its gender marks and reference numbers taken off, against the job titles of every family (ESCO's in the advert's language and in English, Catalan read also in Spanish; the official coding indexes'; the catalogue's own extra terms) and of the occupations outside the vertical: on one title the longest match wins, a family that names the occupation beats one that lists it as an alternative, a title outside the vertical over ours leaves the advert out. A title nothing matches is read again with plurals as singulars, then the German way and the Spanish way, as the legacy did. Bare role words («technician», «coordinador») and the index's «not ours» titles never match alone; a title stops being ours in an industry its title names (the index's contexts).
_Acceptance:_ Tests on the legacy's examples for each reading; the title rules are the legacy's (`app/lib/titles.ts`), copied with a header naming the source.

**FR-3 — Catch-alls and routes.**
A title with only the bare word «engineer» (in the sources' languages, or compounded: «Bauingenieur») shall be in the discipline its title names, else among engineers not elsewhere classified (2149); one with only computing words in the family its words name, else 2519; an IT security adviser in 2529; the bare German «Techniker», «Planer», «Meister» and «Monteur», the French technician, mechanic and fitter, the Flemish technician and mechanic, and the Spanish mechanic, technician and supervisor by the trade or discipline they name, as the legacy's routes do. Words that put a title outside the vertical (sales, teaching, care, facilities, …) leave it out whatever else it says.
_Acceptance:_ Tests on the legacy's examples for each route and each word list.

**FR-4 — Skilled trades apart.**
The skilled trades (the catalogue's optional group) shall be read only for an advert the main families leave out, so a trade never takes an advert from them; the car mechatronics technician and mechanic, the refrigeration mechatronics technician and the British «Gas Engineer» are read by the trades first.
_Acceptance:_ Tests: an advert of both is in the main family; «Kfz-Mechatroniker» is 7231.

**FR-5 — Read once more.**
An advert no reading kept shall be read again: with German or French among its languages when its title carries that market's gender mark («(m/w/d)», «(H/F)»); a Catalan title in Spanish word by word (also one read only into a catch-all whose Spanish reading is more precise); and last, a title the registers confirm (`codes/confirmed-titles`) in its unit group, never against a decision the gate already makes.
_Acceptance:_ Tests on the legacy's examples («Industriemechaniker (m/w/d)» in an Italian source, «Mecànic/a de manteniment», «Enginyer/a de processos»).

**FR-6 — Occupations.**
Within its families, an advert shall get the ESCO occupations its title names (the longest title standing), or the discipline's own occupation when a route filed it.
_Acceptance:_ Tests: «Naval Architect» is ESCO's naval architect inside its family; «Mechanical Design Engineer» is the mechanical engineer.

**FR-7 — Hygiene.**
An advert in the vertical shall still be left out when its title is a listing page, a template, a product or a site task, an application form, or names a sales, recruiting, trainee, apprentice, student, labourer, helper, retail, operative or gig role, in the sources' languages.
_Acceptance:_ Tests on the legacy's examples («Elektrohelfer», «Stage ingénieur», «Jobs als Bauzeichner: 3.504 Stellenangebote»), and an engineer's title passes.

**FR-8 — Europe only.**
An advert whose country is not one of the catalogue's countries shall be left out.
_Acceptance:_ Tests: a country of the catalogue passes, another is left out.

**FR-9 — Reasons and the explain report.**
Each advert left out shall carry its reason (outside the vertical, hygiene with its kind, outside Europe), and `pnpm gate:explain` shall write, for a store, one line per advert left out (`[reason] title | company | location (source)`), gzip-compressed, and print the count per reason.
_Acceptance:_ Tests on a temporary store: the report's lines and counts; the entry reads only the store and the catalogues.

**FR-10 — Pure and offline.**
The gate shall read only the advert and the catalogues: no network, the same input gives the same answer, and a title read once in the same languages with the same codes is not worked out again.
_Acceptance:_ Tests run with no network; reading an advert twice gives equal results.

## 5. Non-functional requirements

- **Testability:** every rule ported from the legacy comes with the example its comment names.
- **Equivalence:** a pass over a real store gives the legacy's families and occupations for every advert, checked by running the legacy's gate on the same adverts.
- **Speed:** gating every stored advert takes under two minutes on the server, the catalogues compiled once.
- **Measured:** before the feature closes, a pass over a real store reports, per source, the share kept, left out by each reason, and the share in the trades.

## 6. Edge cases

- A title with zero-width characters or soft hyphens in its gender marks: read as if they were not there.
- A very long title (a broken page): the German reading tries at most a word's last thirty letters (the legacy's NOB-11).
- A label named like a property of every object («constructor»): never read as a word of a table.
- A source that gives a code and a title outside the vertical: the code decides (FR-1).

## 7. Out of scope

- Applying takedowns again, and a taken-down advert's copies from other sources: `010-publication` (with `009-dedupe`).
- Closed notices in the text or title: `013-closed-adverts`.
- Adverts of company boards whose place names nothing known (the legacy's «PLACE UNKNOWN»): `016-career-sites`, whose adverts may not know their country.
- Rebuilding the occupation catalogues (`builder/isco-esco.mjs`) and the confirmation tools (`builder/tools/gate-misses.mjs`): the later catalogue tools.
- The visitor's own vetoes: the web's profile.

## 8. Completion criteria

- FR-1 to FR-10 pass their acceptance tests, and `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:run && pnpm build` is green.
- The measurement of section 5 is recorded in `tasks.md`.

## 9. Open questions

- None. (2026-11-19: title rules copied; `pnpm gate:explain` now; takedowns with 010.)
