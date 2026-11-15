# Spec: Gate

Status: outline. Context, scope and legacy references only; the requirements are written with `/spec` before planning.

## Context and goal

The store holds every advert the sources gave, in and out of scope. Indudex publishes only engineering, technical and IT occupations (ISCO-08 groups 214, 215, 216, 251, 252, 311, 312, 313, 315, 351, 352) and, kept apart, the skilled trades (712, 721-723, 741-742), in Europe only.

**Goal:** decide for each advert which occupation families it belongs to, drop the ones out of scope or outside Europe and the ones that fail hygiene, and say why each one was dropped (`--explain`).

## Scope (from the legacy)

- Three ways in, by trust: the source's own ISCO code; its SSYK code through JobTech's correspondence; the title alone against ESCO's job titles in the source's language and in English (Argus's title rules).
- "Engineer" alone lands in 2149 unless the title names an occupation outside the vertical.
- Skilled trades only for adverts the other families leave out.
- Europe only; vetoes; hygiene (e.g. expired adverts, adverts without a usable title).
- `--explain`: one line per dropped advert with the reason.

## Depends on

- `catalogues` (families, ESCO titles, SSYK table, vetoes, countries), the matching rules (Argus copy, see `AGENTS.md`).

## Legacy reference

- `builder/gate.mjs` (1,719 lines), `builder/isco-esco.mjs`, `builder/tools/{gate-misses,compare-gates,readmit}.mjs`, `docs/research/{occupation-coding,occupation-from-context,title-matching,skilled-trades}.md`.

## Open questions

- [NEEDS CLARIFICATION] The shared matching-rules package (`indudex-matching`, pending in `MEMORY.md`): before or after this feature.
