# Spec: Legacy resync

Status: approved (2026-11-26). Asked by the operator on 2026-11-26 («ponte al día con el legacy y sus cambios»): done
right after 015 and before 016, out of the numbered order, since 016 reuses the readers it brings up to date.

## 1. Context and goal

Features 002 to 011 were ported from the legacy at `JustJans/indudex@b0cd182` (15 November 2026). The legacy kept
changing: 379 commits by `ec79858` (25 November 2026), 313 files of `builder/`, `app/lib/` and `catalogues/` touched
(+21,457 / −10,204 lines, part of it the move from `.mjs` to `.ts`). Found while porting 015: Danish contract labels in
its word tables, an hour range read whole, `stance.ts` (what a text says only as an option or denies), its text
helper's spacing.

**Goal:** every module ported from the legacy behaves as the legacy's at `ec79858` (or later, when this work starts on a
newer commit), checked by the legacy's own tests of that commit and by a comparison over the store.

**Why:** the rewrite promised the legacy's behaviour; a reader that lags reads adverts differently from the site the
operator knows, and 016 builds on these readers.

## 2. Users

- **The operator**: wants the same readings as the legacy's current ones.

## 3. Functional requirements

**FR-1 — Inventory.** Every module of this repo ported from the legacy shall be mapped to its legacy file at the
snapshot and at the target commit, and each behavioural change listed (renames and the move to TypeScript are not).
_Acceptance:_ The inventory is recorded in `tasks.md`.

**FR-2 — The legacy's current tests.** For each area, the legacy's tests at the target commit shall be carried (as 011
carried them, in `test/legacy/`, or as golden sets) and pass, or each failure be recorded as a departure with its
reason.
_Acceptance:_ The carried tests pass; departures listed in `tasks.md`.

**FR-3 — Golden sets and catalogues.** The golden sets made from the legacy's readings (`test/fixtures/<feature>/`)
shall be made again at the target commit, and the catalogues imported from the legacy brought up to it (with their
`about` headers and the positional order kept).
_Acceptance:_ The golden tests pass on the new sets; the catalogue tests pass.

**FR-4 — Over the store.** The processor's steps shall read the store as the legacy at the target commit does.
_Acceptance:_ On a store copy, ours and the legacy's (its modules run in the scratchpad) compared step by step, the
differences recorded and each one ported or explained.

## 4. Non-functional requirements

- Nothing outside the legacy's behaviour is added; the repo's own rules stand (robots.txt with no exception, the
  store's strict schema, the feature boundaries).

## 5. Out of scope

- Legacy parts not ported yet (careers sites, ATS boards, discovery, tools): they are ported at the target commit by
  their own features.
- The legacy's web.

## 6. Completion criteria

- FR-1 to FR-4 met; `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:run && pnpm build` is green.
