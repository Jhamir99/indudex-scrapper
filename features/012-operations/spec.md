# Spec: Operations

Status: outline. Context, scope and legacy references only; the requirements are written with `/spec` before planning.

## Context and goal

A home server runs every process on its own schedule. The operator needs to know when a job fails and must be able to restore what only the server holds.

**Goal:** the host cron, locks, alerts and backups for the scrapper, the processor and the translator.

## Scope (from the legacy)

- Crontab: crawl every hour, translation every hour at :10, publication every 3 hours, daily jobs and backup at midnight, a watch every 15 minutes.
- One lock per job (`flock`), so a slow run is skipped rather than stacked.
- An alert to the owner's phone when a job fails or the watch sees something wrong.
- Backup of what only the server holds (state, found sources, caches).
- One stop file that stops crawl, translation and publication.

## Depends on

- The entry points of `crawl-core`, `title-translation` and `publication`.

## Legacy reference

- `ops/crontab`, `ops/server-*.sh`, `ops/alert.sh`, `ops/notice.mjs`, `builder/lib/tell-owner.ts`, `docs/research/{alerts,server-alerts}.md`.

## Open questions

- [NEEDS CLARIFICATION] Which channel the alerts use (the legacy reaches the owner's phone through Argus).
- Moving the cron into Docker is an open decision in `AGENTS.md`.
