# Plan: Closed adverts

Implements `spec.md` (FR-1 to FR-4). Status: approved (2026-11-25). A port of the legacy's `builder/closed.ts` (its two patterns extracted, never retyped) and its test `test/closed.test.mjs`, wired into the gate's decision where the legacy's `builder/work-out.ts` called it.

## 1. Layout

```
src/features/gate/closed.ts        # saysClosed({ title, description }): the legacy's CLOSED and CLOSED_TITLE, folded with shared/kit's fold
src/features/gate/decide.ts        # + the reason CLOSED ("closed"), after hygiene, before Europe
src/features/gate/index.ts         # + saysClosed, CLOSED exported
src/features/publication/build.ts  # + counts.closed from the gate's reason
test/legacy/closed.test.mjs        # the legacy's test, carried as it is (harness.mjs)
```

- **In the gate, not a folder of its own.** The operator chose the gate (2026-11-25): the check must run between hygiene and Europe, inside `decide`, and one processor feature never imports another. So the code of `013-closed-adverts` lives in `src/features/gate/`, as advert-facts' readers live in theirs. The feature keeps its own spec, plan and tasks.
- **The gate's input** already carries `title`; it gains `description` (the stored advert has it). The gate's golden set (`test/gate/golden.ts`) and `test/gate/catalogues.ts` pass the description where they build an input.
- **The fold** is `shared/kit/fold.ts`'s `fold`, the same as Argus's (checked for 007: only U+0300–U+036F taken off, so ł and ø stay, as the legacy's patterns expect: `wygas[lł]a`, `udl[oø]bet`).

## 2. Equivalence

- The two patterns extracted from the legacy's file by a scratchpad script, compared with it as text.
- The legacy's test carried in `test/legacy/` (only its import changed).
- Over the store copy of 2026-11-19, ours and the legacy's (its file run as it is with our `fold`) read the same adverts as closed (0 and 0 today); the gate's time recorded before and after.

## 3. Decisions (2026-11-25, operator)

- **In the gate, in the legacy's order.** Why: counted and explained like the other reasons; a change of notices applies at the next build, no crawl needed.
- **No register.** Why: an advert that still says closed is caught again at every build; the legacy's `closed-register` lists sources, not adverts, and goes to 017.
- **The legacy's notices only.** Why: none of our sources writes them yet; new ones come with a read sample from the sources that use them (015, 016).
