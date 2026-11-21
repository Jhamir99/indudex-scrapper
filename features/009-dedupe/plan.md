# Plan: Dedupe

Implements `spec.md` (FR-1 to FR-7). Status: approved (2026-11-22). A port of the legacy's `builder/dedupe.mjs` (with Argus v1.11.0's `roleKey` and `titleKey`, `server-bot/scan.mjs` and `server-bot/text.mjs`), the address rule `normUrl` and the title of `toRecord` in `builder/normalise.mjs` (with Argus's `cleanTitle`, `server-bot/notify.mjs`), and their tests (the dedupe, address and title cases of `test/builder.test.mjs`, `test/tidy-names.test.mjs`).

## 1. Layout

```
src/shared/kit/
  advert-address.ts   # advertAddress: the legacy's normUrl (FR-2), read by dedupe and by the scrapper's takedowns
  clutter.ts          # moved from src/features/companies/ (withoutClutter, withoutPictures): companies and the title read it
  shown-title.ts      # shownTitle (FR-1): cleanTitle, withoutBoardTail, withoutCodes, withoutClutter, 250 letters
src/shared/words/catalan.ts   # catalanToo moved from src/features/gate/markets.ts: the gate and dedupe read it
src/features/dedupe/          # processor
  index.ts            # public entry: dedupe, withoutTaken, placeKey, the types
  role.ts             # companyOf, titleKey, roleKey, NOT_AN_EMPLOYER, jobKey (FR-3)
  dedupe.ts           # by address, by role in a place, campaigns and remote jobs, the copy kept, what it inherits (FR-2 to FR-5)
  taken.ts            # withoutTaken (FR-6)
  *.test.ts
```

- `catalanToo` is shared and generic over `{ title, lang?, hintLangs? }`: the gate keeps calling it with its `GateRaw`, dedupe with the advert's title and language. Moving it changes no behaviour (the gate's golden set guards it).
- `clutter.ts` moves as it is; companies imports it from `src/shared/kit/`.
- `advertAddress` replaces `advertUrlKey` in `src/features/crawl-core/config/takedowns.ts`: the legacy's tracking list instead of `utm_*` alone (the operator's answer).

## 2. Inputs and outputs

```ts
// FR-1, for dedupe and the publication alike: the title as mended and cut at 500 letters by 010.
shownTitle(title: string): string

// FR-2 to FR-5. Inputs from other steps come as plain values: dedupe never imports another feature.
interface DedupeAdvert {
  id: string;                         // the store's id: which copy is kept
  url: string;                        // the advert's address (advertAddress applied inside)
  kind: SourceKind;                   // careers 2, feed 1, portal and via 0 (the legacy's board, feed, via)
  company: string;                    // companies' employer name
  title: string;                      // shownTitle
  language?: string;                  // the advert's language (the legacy's `tl`)
  country: string;                    // places
  place: string;                      // placeKey: "#<geonameId>", else "<country>|<town lower-cased>"
  posted: string;                     // the day it was posted, "" when none (010's)
  workMode?: string; pay?: unknown; expires?: string; years?: number;  // inherited when the kept copy lacks them
}
dedupe<T extends DedupeAdvert>(adverts: readonly T[]): {
  kept: { advert: T; alsoAt: T[] }[];  // `advert` with what it inherits; `alsoAt` for a campaign or a remote job
  sameUrl: number; sameRole: number;
}
withoutTaken<T>(adverts: readonly T[], taken: readonly TakenAdvert[]): T[]   // FR-6, by role and place
placeKey({ geonameId?, country, town }): string
```

- The legacy's record fields map so: `u` → `url`, `c` → `company`, `t` → `title`, `tl` → `language`, `cc` → `country`, `d` → `posted`, `w` → `workMode` (`r` → `"remote"`), `p`/`pa` → `pay` (one object with its yearly euros), `x` → `expires`, `y` → `years` (the most asked), `alsoAt` → `alsoAt`; the source's kind comes with each advert.
- The kept advert is a new object with the fields it inherits; the input is never changed (the legacy wrote into its records).
- Which day an advert counts as posted when its source names none, the published id and reading the takedowns list are 010's.

## 3. Porting rules and equivalence

- **Behaviour, not code**, as in 004 to 008; the legacy's lists (`TAIL`, `GENERIC`, the board tails, the code patterns) are extracted by a scratchpad script, never retyped; `Object.hasOwn` for every table looked up by a word.
- **The legacy's regex quirks are kept as they read** and commented where they surprise (a pattern written without `u`).
- **Golden sets**: the legacy's own readings, run in the scratchpad: real titles of the store through `toRecord`'s title steps (`test/fixtures/dedupe/titles.json`), and the store's company names and titles through `companyOf` and `jobKey` (`test/fixtures/dedupe/roles.json`); no person's data in them (titles and employers only).
- **Equivalence (T011)**: over the fresh store, the gated adverts' titles, roles and the copies kept (ids and counts) against the legacy's `dedupe` run on the same records, mended and cut as the legacy's build did, with the legacy's `placeKey` and day.

## 4. Decisions (2026-11-22, operator)

- **The title as published, ported now and shared.** Why: the role key compares that title, and the publication shows it; one module for both.
- **`withoutTaken` in this feature, called by 010.** Why: it reads the same role key; reading the list is the publication's.
- **One address rule, the legacy's.** Why: a takedown and a duplicate are the same advert under another address; the scrapper's takedowns then match a few more addresses (`source`, `ref`, click ids).
