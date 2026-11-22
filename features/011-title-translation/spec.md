# Spec: Title translation

Status: approved (2026-11-22). Requirements written from the outline with the operator's answers of 2026-11-22: Projecte Aina's Spanish–Catalan model stays in its Python worker, optional (the route through English where it is missing); the titles go into the legacy's six languages (`en`, `es`, `ca`, `fr`, `nl`, `de`); the whole method around the engine is ported (the legacy's version s139); the caches keep the legacy's format, so the operator can copy the legacy server's caches in once.

## 1. Context and goal

The advert's own text is never published nor translated (`AGENTS.md`); its title is shown in the visitor's language. The legacy did it in two processes: the publication applied what its caches held and wrote down the titles they lacked (`builder/translate.mjs`), and a translator run by cron each hour worked through that list (`builder/mt/translate-titles.mjs`) with Firefox's own models (Bergamot, `builder/mt/engine.mjs`), every direction through English (`builder/mt/legs.mjs`), a method of its own before and after the engine (`builder/mt/method.mjs` and its parts: the titles tidied, the trades Firefox gets wrong written in, levels, places and company names kept, gendered forms, Catalan spelling, corrections), and Catalan from Spanish with Projecte Aina's model (`builder/mt/aina.mjs`, `aina_worker.py`). The language a title is written in is read by `builder/mt/language-of.ts`; each language's front page lists ten offers written in it (`builder/latest.mjs`). The research is in `docs/research/translation*.md`.

**Goal:** every published title in each of the site's six languages, translated once per title on our own server, applied by the publication from caches the translator fills between builds.

**Why:** a visitor reads every offer's title in their language, and the engine's cost is paid once per title, not once per build.

## 2. Users

- **Visitors** (through the API and the web): read titles in their language; each language's front page shows ten offers written in it.
- **The publication** (010): applies the caches, marks the titles a source forbids translating, writes the titles still wanted.
- **Operator**: fetches the engine and models once, installs Aina's model where wanted, copies the legacy's caches in, reads the translator's log.

## 3. User stories

- As a Spanish visitor, I want "Process Engineer (m/w/d)" shown as «Ingeniero de procesos», its company and town kept as written.
- As a Catalan visitor, I want «Técnico de mantenimiento» shown as «Tècnic de manteniment», read from the Spanish, not through English.
- As the operator, I want a title translated once, ever, and the legacy's months of translations kept.

## 4. Functional requirements

### Part A — In the publication

**FR-1 — The language a title is written in.**
The publication shall read each offer's title language as the legacy did (`languageOf`): the source's language, else the place's, else the country's first; then what the title's own words say (`language-of.ts`), Spanish-filed titles written in English read as English.
_Acceptance:_ Tests on the legacy's examples (`test/mt-language-of.test.mjs`); a golden set of the legacy's readings of the store's titles.

**FR-2 — The caches applied.**
For each of the six languages, an offer whose title is in another language shall take its translation from that language's cache; a title written in Catalan is its own Catalan title; an offer whose source forbids altering its content (`config/untranslated.yml`) keeps its title as written and is marked with its language (`nt`). The translations are applied before the titles' entities are written out and before the titles in capitals are brought down, as the legacy's order was, and the calm counts every title field.
_Acceptance:_ Tests on the legacy's examples (`test/translate.test.mjs`); over a real store with caches, the offers' title fields equal the legacy's.

**FR-3 — The titles wanted.**
The publication shall write the titles its caches lack, each with its language, the languages it lacks, its number of offers and its most common country, town and employer, Spain's first then the most offered (`wantedTitles`), and the titles to translate anew (`mt-redo.json`).
_Acceptance:_ Tests on the legacy's examples; the list's format is the legacy's.

**FR-4 — Each language's ten.**
`today.json` shall give each language's front page ten offers written in its language, from the countries that speak it, from the employers' own sites and boards, the most facts first, one per employer, each title fit to show (`latestPicks`).
_Acceptance:_ Tests on the legacy's examples (`test/builder.test.mjs`).

### Part B — The translator

**FR-5 — The engine.**
The translator shall run Firefox's Bergamot engine (its WebAssembly 4.0 and the loader `bergamot-translator.js`, MPL 2.0) with Firefox's models in Node worker threads, with Firefox's settings and without the lexical shortlist, the same list, workers and batch giving the same output. An operator's tool fetches the engine and the models from Firefox's Remote Settings, each file checked against its SHA-256, into `MT_DIR`.
_Acceptance:_ Tests of the engine's wiring with a stand-in; the fetch tool's checks tested on saved answers; one live run on the server recorded.

**FR-6 — The method.**
Each title shall go through the legacy's method s139 around the engine: every direction through English (the first leg into English, the English tidied, the second into each language); before the engine, the title tidied, the trades Firefox gets wrong written in, levels taken out, places and the company kept behind stand-ins, dash and bare versions; after it, what Firefox adds removed, its known slips corrected, levels, places and names put back, gendered forms, Catalan spelling; a title whose name got lost translated again behind a stand-in.
_Acceptance:_ The legacy's tests of each part (`test/mt-*.test.mjs`); over the store's titles, the method's output equal to the legacy's with the same stand-in engine.

**FR-7 — Catalan from Spanish.**
Where Projecte Aina's model is installed (`AINA_DIR`, its Python with CTranslate2), a title written in Spanish shall get its Catalan from Aina, with the company and names kept, unless the result is not whole or looks made up; everywhere else, and when its worker fails, the route through English stands.
_Acceptance:_ The legacy's tests (`test/mt-aina.test.mjs`) with a stand-in worker; no Aina, no change.

**FR-8 — The caches and the queue.**
The caches shall be one file per language in the processor's state (`titles-<lang>.json`, the legacy's format: title → translation, or the mark that it needed none), read whole and merged by a process of its own; the queue (`mt-wanted.json`) worked group by group (a language and the languages it lacks), Spain's titles first, chunk by chunk; a chunk the engine fails on done again in halves; a chunk a run never ended done last, one title at a time, and a title that alone kept a run from ending set aside (`mt-stuck.json`); the caches written every ten minutes and at the end; a title leaves the queue only with an answer in every language it lacked; a cache that cannot be read stops the run, never read as empty.
_Acceptance:_ The legacy's tests (`test/mt-queue.test.mjs`); tests on temporary state for each rule.

**FR-9 — The run.**
`pnpm translate [-- --minutes 45] [-- --workers 2] [-- --group 400]` shall start no chunk after its minutes, log what it did, and fail when it wrote nothing or got no answer for most titles; with no models it fails, with no queue it ends well.
_Acceptance:_ Tests on temporary state with a stand-in engine.

## 5. Non-functional requirements

- **Equivalence:** the language read, the caches applied, the titles wanted and the method's output are the legacy's on the same input (the method checked with a stand-in engine on the store's titles, since the models are not in the tests).
- **Measured:** before the feature closes, the translator runs on the server with the real models and Aina, and its titles a minute, memory and the share without an answer are recorded, with a sample of its titles read against the legacy's.
- **Licences:** the engine's loader keeps its MPL 2.0 notice; Firefox's models and Aina's (Apache-2.0) are fetched by the operator, never committed.
- **Memory:** a run stays within what the server's translator was given (the legacy's three workers on four cores, 200 to 300 MB each).

## 6. Edge cases

- A cache from the legacy with titles our build never writes: kept, harmless.
- An empty answer from the engine: a slip of the run; the title waits for the next.
- A title in a language with no model: counted and left in the queue.
- A word that is a property of every object («constructor») in a table looked up by a word: never read from it.

## 7. Out of scope

- The cron, the lock, the hold while a publication builds and the stop file: `012-operations`.
- The legacy's maintenance tools over the caches (`redo-titles.mjs`, `towns-back.mjs`, `merge` by hand): later, when a method change needs them.
- Languages beyond the six (`COMING`, empty in the legacy).
- Translating the advert's text: never.

## 8. Completion criteria

- FR-1 to FR-9 pass their acceptance tests, and `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:run && pnpm build` is green.
- The measurement of section 5 is recorded in `tasks.md` (the server's run, or why it could not be done yet).

## 9. Open questions

- None. (2026-11-22: Aina's Python worker kept, optional; the six languages; the whole method; the legacy's cache format.)
