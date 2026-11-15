# Spec: Title translation

Status: outline. Context, scope and legacy references only; the requirements are written with `/spec` before planning.

## Context and goal

Adverts come already translated into every locale (`en`, `es`, `ca`), but only their titles: the advert's own text is never published nor translated (`AGENTS.md`). The original title is kept next to its translations and is the fallback when one is missing.

**Goal:** translate each title into every supported locale with an engine run on our own server, once per title, as its own process with its own cron (it needs a lot of memory).

## Scope (from the legacy)

- Bergamot (Firefox's translation models) on the server; Aina for Catalan.
- One cache per language, keyed by the title alone; a title that needs no translation is remembered as such.
- A build applies what the caches hold and writes down what they lack; the translator works through that list between builds.
- Fixes before and after the engine: places and company names kept, gendered forms, Catalan spelling, corrections list.
- Sources whose terms forbid altering their text keep their titles as written.

## Depends on

- `publication` (the list of wanted titles), `catalogues` (place names).

## Legacy reference

- `builder/translate.mjs`, `builder/mt/` (`translate-titles.mjs`, `engine.mjs`, `aina.mjs`, `catalan-spelling.ts`, `corrections.mjs`, ...), `builder/config/untranslated.yml`, `ops/server-translate.sh`, `docs/research/translation-between-languages.md`.

## Open questions

- [NEEDS CLARIFICATION] Aina runs as a Python worker in the legacy (`mt/aina_worker.py`): keep it, or look for a Node option.
