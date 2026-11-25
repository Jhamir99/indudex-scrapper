# Tasks: Operations

Generated from `spec.md` and `plan.md`. Tasks are ordered by dependency and have a verifiable "Done when". Every task ends with `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:run && pnpm build` green.

**Depends:** `title-translation` closed (its T016).

## Part A — The jobs

- [ ] **T001 — The job table and the schedule's lines** · FR: FR-1, FR-5 · Depends: title-translation T016
      Done when: `jobs.ts` holds the five jobs of plan section 2 (schedule, command, memory, priority, time limit, late hours, Spanish name); `schedule.ts` renders each crontab line with the repo's and Node's absolute paths and the project's mark, and merges them into a crontab text keeping every other line (comments that mention the project included); `src/bin/dot-env.ts` holds the `.env` reader, used by `crawl.ts`; tests check each line and the merge.
- [ ] **T002 — Running a job** · FR: FR-2, FR-3, FR-4, FR-5 · Depends: T001
      Done when: `locks.ts` gives each job's argv with its `flock` calls (tested exactly), `run-job.ts` runs a job (STOP first; the child's output appended to its log; exit 0 good, 75 skipped, other failed; the time limit ends the process group, failed) and writes its outcome line, and `src/bin/ops.ts job <name>` runs it and always exits 0; tests with stand-in commands and a stand-in `flock`, and with the real `flock` where it exists.
- [ ] **T003 — The translator stops at STOP** · FR: FR-4 · Depends: T002
      Done when: `runTranslator` takes a `stopped` check and starts no further chunk once it answers true (logged), `src/bin/translate.ts` passes the store's `FileStopSwitch`; a test with a stand-in engine puts `STOP` in place after the first chunk.

## Part B — Alerts

- [ ] **T004 — One notice** · FR: FR-7, FR-10 · Depends: T001
      Done when: `ntfy.ts` sends a notice as plan section 3 says (body, title, priority, tags, retries, quiet hours) and writes it to the alerts' log first; no topic, no request; `told.ts` reads and sets the flag files; tests with a stand-in `fetch` and clock.
- [ ] **T005 — A job's failure told once, and its end** · FR: FR-6, FR-10 · Depends: T002, T004
      Done when: `alerts.ts` `afterJob` tells a failure once with the log's last five lines (stack frames out, 200 characters each), its end once, and nothing for skipped or stopped; `runJob` calls it; tests for fail, fail, good, skipped, stopped.
- [ ] **T006 — The watch** · FR: FR-8, FR-10 · Depends: T005
      Done when: `watch.ts` and `machine.ts` run the rules of plan section 3 (STOP daily and its end, late jobs with the uptime and log rules, log trimming in place, disk 90/85, SSD once a day), `ops.ts watch` runs it; tests on a temporary `OPS_DIR` with a stand-in machine and clock for each rule.
- [ ] **T007 — The summary after a publication** · FR: FR-9, FR-10 · Depends: T005
      Done when: `summary.ts` composes the notice from the published version, the crawl's states, the translator's log, the machine and the open problems, `runJob` sends it after a good `publish`; tests compose it from stand-ins (all well, with problems, with no translator line).

## Part C — Backup and deploy

- [ ] **T008 — The nightly copy** · FR: FR-11 · Depends: T004
      Done when: `backup.ts` packs what plan section 4 lists (and leaves out the rest), creates the release when missing, refuses an archive under half the largest, uploads, checks the size; no `BACKUP_REPO` fails; `ops.ts job backup` runs it; tests with a stand-in runner over a temporary store and state, one test packing for real with `tar` to check the archive's entries; `ops/README.md` documents the restore.
- [ ] **T009 — The deploy** · FR: FR-12 · Depends: T001
      Done when: `ops/deploy.sh` takes every job's lock and runs `deploy.ts` (pull with retries, frozen install, build into `dist.next`, swap, `ops.js schedule`); `ops.ts schedule` writes the merged crontab; tests with a stand-in runner: the order, a failed build leaves `dist` as it was, a failed pull stops before anything else.
- [ ] **T010 — The image, the examples and the ignore list** · FR: FR-13 · Depends: T001
      Done when: the Dockerfile copies `vendor/`; `.env.example` names `NTFY_TOPIC`, `BACKUP_REPO` and `OPS_DIR`; `.gitignore` has `/var/`; the image builds and lists `config/`, `catalogues/`, `vendor/` (or, with Docker's daemon off, that is recorded here).

## Part D — Measured and closed

- [ ] **T011 — Close** · NFR: Measured · Depends: T003, T006, T007, T008, T009, T010
      Done when: `CLAUDE.md` names `ops.js` and the deploy, `OPS_DIR` and the feature's modules; `features/README.md` marks 012 done (or "in progress" until the server's day is recorded); `MEMORY.md` updated; the server's day (each job's outcomes and times, the notices received, one backup's size) recorded here, or why it could not be done yet (the operator runs the deploy on the server).
