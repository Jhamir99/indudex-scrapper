# Tasks: Legacy resync

Generated from `spec.md` and `plan.md`. Every task ends with `pnpm lint && pnpm format:check && pnpm typecheck &&
pnpm test:run && pnpm build` green; "carried" means the legacy's tests at the target commit, in `test/legacy/`.

**Depends:** `job-portals` closed (its T010).

- [x] **T001 — Inventory** · FR-1 · Depends: job-portals T010
      Done when: the map of our modules to the legacy's files and the list of their behavioural changes since
      `b0cd182` are recorded here.
      2026-11-26: done. Snapshot `b0cd182` (#840, 2026-11-15), target `ec79858` (#1220, 2026-11-25): 379 commits, 313 files of `builder/`, `app/lib/`, `catalogues/` (the legacy's full history fetched into the scratchpad's clone). Lines changed by area, renames followed at 50 % (a file both moved to TypeScript and much changed counts twice, so these overstate): words, sentences and stance 5,000 (47 files; every language's table, `stance.ts` new); advert facts 4,199 (`screens`, `labels`, `work-mode`, `contract`, `years`); pay 1,159 (`text-pay`, `pay`); gate 371 (`gate`, `isco-esco`); places 998 (`normalise`, `towns`); companies 368 (`company-cards`, `companies`, `names`, `agencies`); dedupe 144; publication 1,179 (`build-pile`, `work-out`, `work-out-pool`, `translate`, `latest`, `tidy-titles`, `shard`, `word-index`); title translation 5,179 (37 files: `trades-data`, `corrections`, `levels`, `before`, `method-tables`, `after`, `level-words`); crawl and public feeds 3,242 (54 files: `http`, `crawl`, `servers`, adapters such as `sne`, `vdab`, `bund`); catalogues 1,384 (`occupations.json` 1,290, `degrees`, `families`, `titles`). Not ported yet, so not this feature's: 6,221 (`boards`, `careers`, `sources`, the discovery tools). Already current: what 012 to 015 ported this week came from the target. The legacy's tests that changed most: `every-language.json` (3,692), `sentences` (625 + 325), `builder.test.mjs` (502), the method's reviews (`mt-languages-review`, `mt-rule-review`, `mt-root-causes`), `words`, `readers-languages`, `labels`, `tidy-titles`. The scratchpad's `legacy-numstat.tsv` holds the list.
- [x] **T002 — Words, sentences, stance** · FR-2, FR-3 · Depends: T001
      Done when: `shared/words`, `shared/kit/sentences.ts` and the legacy's `stance.ts` (where its users need it) match
      the target; its `words`, `sentences`, `readers-languages` tests carried and passing.
- [x] **T003 — Advert facts** · FR-2, FR-3 · Depends: T002
      Done when: contract, working time, work mode, years, screens and the written and page facts match the target;
      its tests carried (the two cases skipped in `page-labels.test.mjs` back on); the golden sets made again.
- [x] **T004 — Pay** · FR-2, FR-3 · Depends: T002
      Done when: the text pay, currencies and periods match the target; its tests carried; golden sets made again.
- [x] **T005 — Gate and catalogues** · FR-2, FR-3 · Depends: T002
      Done when: the title rules, routes, hygiene and gate match the target, the catalogues brought up to it; tests
      carried; golden sets made again.
- [x] **T006 — Places** · FR-2, FR-3 · Depends: T005
- [x] **T007 — Companies and dedupe** · FR-2, FR-3 · Depends: T006
- [x] **T008 — Publication** · FR-2, FR-3 · Depends: T003 to T007
- [x] **T009 — Title translation** · FR-2, FR-3 · Depends: T008
- [x] **T010 — Crawl-core, public feeds, text helpers** · FR-2 · Depends: T001
      Done when: the HTTP client, robots, pacing, the public feeds' adapters and the text helpers match the target where
      ported; tests carried.
- [ ] **T011 — Over the store, and close** · FR-4 · Depends: T008, T009, T010
      Done when: the processor's steps compared with the target's on a store copy, the differences recorded; `CLAUDE.md`,
      `MEMORY.md` and `features/README.md` updated.
- [x] **T012 — False towns** · FR-2, FR-3 · Depends: T008
      Done when: the legacy's `withoutFalseTown` (normalise.ts, with 48ca26c1, 61f4ec6c, a9476d82, dbdfe934, 40c6ba72)
      reads the town an offer shows, the country it names included, in places; its cases carried.

Notes on T002 to T004 (2026-11-26). The legacy's modules were copied whole, their imports pointed here, rather than
our ports edited: `shared/words` (its tables and index, with its option names `langs` and `READ_BY_BOT`),
`shared/words/stance.ts`, `shared/kit/sentences.ts`, advert-facts' contract, work mode, years, screens and labels, pay's
`pay.ts` and `text-pay.ts`. Our typed shapes sit over them (advert-facts' `codes.ts`, pay's `advert-pay.ts`). The
degrees and languages catalogues were brought to the target with them (the screens read them; the languages'
`required` and `softened` lists moved into the word tables). The golden sets of advert facts, labels and pay were made
again from the target over the same texts, and the legacy's tests carried whole into `test/legacy/`: words, sentences,
readers-languages, contract (without the site's cases), labels (its `withLabels` through `src/bin/page-facts.ts`),
years, screens, text-pay and text-pay-currencies; `page-labels.test.mjs` gave way to the whole labels test, its two
skipped cases now passing. The legacy's work-mode and pay tests call its adapters and normalise: their calls are in
the golden sets.

Notes on T005 (2026-11-26). The gate's code had changed only in its move to TypeScript: the golden set, remade from the
target and grown by the 180 new strings of its gate tests (builder, occupation-coding, catalan-twins, titles, ttvic),
reads the same through ours. The catalogues that changed were brought to the target, body only, our headers kept:
families, occupations (Catalan names), seniority, `codes/titles.json` (its last pass for 2511 and 7412) and
`codes/nuts.json` (the areas NRW, IDF and PACA, read by places in T006); positions unchanged. The legacy's «too slow»
advert (a worker held past a minute, e79e7e23) is the publication's run: T008.

Notes on T006 (2026-11-26). The legacy's place changes since the snapshot are ported: the article put back before its
town in any advert's place, an elided one always (077eb06c), and a town the map lacks written in a name's letters,
not in capitals (21dd1a49); the areas NRW, IDF and PACA came with `codes/nuts.json` in T005. «Ihrer» as a sentence's
word (dbdfe934) belongs to the legacy's `withoutFalseTown`, which our places never ported (a gap older than the
snapshot: a postcode, a label, a work mode, a list of countries or a sentence read as the town): owed, for T011's
comparison to measure.

Notes on T007 (2026-11-26). Dedupe reads an employer by the shortest name its copies of a title in a place go by
(3c5b128e: «Vivaldis» and «Vivaldis Interim»), the offer's town given to it as the legacy's `ci`. The publication flags
as an agency every advert of an employer with five or more adverts, a fifth of them for a client (7c2bf8df:
companies' `agenciesByShare`), its text read by places' `FOR_A_CLIENT`, now the legacy's from the word tables. The
layout reader's list headings (the same 3c5b128e) were already in our copy of `layout.ts` (015).

Notes on T008 (2026-11-26). The publication takes the legacy's title tidy (0c8e3524: gender marks and the advert's
number off every shown title, after the translations and the capitals, `tidy-titles.ts` copied, its test carried),
the wider job-offer labels of a title (feee7668, in `shownTitle`), the today picks that show tools and a closing date
first (c4c209e1, `latest.ts`, `tk` and `x` in today's schema), and the agency share (T007). The legacy's caching, its
pool of workers and its «too slow» advert (53813326, ce67b14b, d399229e, e79e7e23) change how fast it publishes, not
what: left out. `KEPT_DAYS` is our year already. The legacy's false towns (`withoutFalseTown` and four commits on it)
read the town and can change the country, which our places keep apart: T012.

Notes on T009 (2026-11-26). The legacy's method (builder/mt) changed in about 80 commits since s139: its modules were
copied whole into `method/` (new: contracts, countries, level-words, the two functions of towns-back), their data
reads through our `data.ts`; `trades.json` regenerated from its `trades-data.ts` (872 trades, 40 more) and
`spellings.json` taken. Its outer changes are ported into ours: `legs.ts` (contract names written through the
glossary, a title naming a contract kept from Aina, capitals calmed before Aina, Aina's Catalan corrected), `aina.ts`
(a town or a kept word under any of its names, a part lost at a conjunction), `translate.ts` (the towns a title names
spelled as written, Catalan apostrophes). Its translation tests carried again, the three new ones too (languages
review, root causes, rule review), the site's cases of translate.test (app/lib/i18n.ts) left out; the method's golden
set remade (48 of 314 changed) and ours gives each the same. The legacy's own run needs Node's
--regexp-interpret-all, as our translator does.

Notes on T010 (2026-11-26). Ported: a silent robots.txt read from its last copy, and a host silent thirty days with
none open (4fbb1c49: the robots client's `RobotsMemory`, kept by `FileRobotsMemory` in `<store>/robots/`); a 503 with
Retry-After held like a 429 (27c645f1); a 429 without one held ten minutes, not an hour (a7e3a449); a failing source
with adverts due at most three days after its last try, parked or not (f09a65d9, e8030e63: `backoff.withAdvertsHours`);
Escola del Treball's offers up to a year old (f09a65d9); `pageText` takes the space before punctuation off, as the
legacy's `text()` (the layout case skipped since 015 now passes). Already in our copies: the six vacancy words of
silent sites (ff4eff05) and the file links of a list page (41a2bfe2). The feed adapters' other change (#848) moved
constants only. Left for 016: the careers sites' long-queue lanes (ffc94293, 7c98bf27), streamed job feeds (6aa9698e)
and a platform tenant's move (3f1efb06, 7767f8fe). Not ours: the bot-check hold on a redirect's last server
(a6b3fd47; our client has no bot-check hold), the legacy's machine split (f27b8731) and its late-source alerts
(e398d60a; our watch judges jobs, not sources). MPSV's language note (f09a65d9): our adapter reads no languages.

Notes on T012 (2026-11-26). The legacy's `withoutFalseTown` and what it reads are copied into places' `false-town.ts`,
the map it asks being our gazetteer; with its `echoesAdvert` (the employer's name, the title's bracket, the site's
name, an office's code), it reads the town an advert's place names when the gazetteer finds none: places'
`namedPlace` gives that town and the country it names. The publication places and publishes the advert in that
country, so a Polish board's «Niemcy» is in Germany with no town, as the legacy reads it. Its cases of 48ca26c1,
a9476d82, 40c6ba72 and dbdfe934 carried into place-advert.test.ts (61f4ec6c's Dutch postcode is the legacy's
`placeOf`, which our pieces read already).
