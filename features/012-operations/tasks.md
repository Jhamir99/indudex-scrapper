# Tasks: Operations

Generated from `spec.md` and `plan.md`. Tasks are ordered by dependency and have a verifiable "Done when". Every task ends with `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:run && pnpm build` green.

**Depends:** `title-translation` closed (its T016).

## Part A — The jobs

- [x] **T001 — The job table and the schedule's lines** · FR: FR-1, FR-5 · Depends: title-translation T016
      Done when: `jobs.ts` holds the five jobs of plan section 2 (schedule, command, memory, priority, time limit, late hours, Spanish name); `schedule.ts` renders each crontab line with the repo's and Node's absolute paths and the project's mark, and merges them into a crontab text keeping every other line (comments that mention the project included); `src/bin/dot-env.ts` holds the `.env` reader, used by `crawl.ts`; tests check each line and the merge.
      2026-11-25: done. `jobs.ts` (`JOBS`, `jobNamed`, `ALL_LOCKS`, `REPO_ROOT`, `opsDirectory`: `OPS_DIR`, default `var/`): the backup and the watch are run as `ops.js backup` and `ops.js watch` under their own lock, like the others, so every job goes through the same `flock` wrapper. `schedule.ts` (`scheduleLines`, `mergedCrontab`, `MARK`): words single-quoted for sh and `%` escaped for cron (the repo's path has a space); a comment line is never dropped, even one ending in the mark. `src/bin/dot-env.ts` holds `environmentWithDotEnv`, moved from `crawl.ts`.
- [x] **T002 — Running a job** · FR: FR-2, FR-3, FR-4, FR-5 · Depends: T001
      Done when: `locks.ts` gives each job's argv with its `flock` calls (tested exactly), `run-job.ts` runs a job (STOP first; the child's output appended to its log; exit 0 good, 75 skipped, other failed; the time limit ends the process group, failed) and writes its outcome line, and `src/bin/ops.ts job <name>` runs it and always exits 0; tests with stand-in commands and a stand-in `flock`, and with the real `flock` where it exists.
      2026-11-25: done. `locks.ts` (`lockedCommand`, `SKIPPED_EXIT` 75), `run-job.ts` (`runJob`: STOP first for the jobs that stop; the command in a process group of its own, so the time limit's SIGTERM, then SIGKILL, reaches flock's child and the translator's workers; the outcome line `[time] <job>: <outcome> in <s> s (<why>)`), `src/bin/ops.ts job <name>` (the `.env` passed to every job's command, so `STORE_DIR` and the others reach `process.js` and `translate.js` too, which read only the environment; the locks' folder made first, as flock makes only the file). No stand-in `flock`: the argv is tested exactly, and the three tests with the real `flock` (a held lock skips; a wait lets the publication go; the translator skipped while `heavy` is held) run on CI's Ubuntu and are skipped on the Mac, which has none.
- [x] **T003 — The translator stops at STOP** · FR: FR-4 · Depends: T002
      Done when: `runTranslator` takes a `stopped` check and starts no further chunk once it answers true (logged), `src/bin/translate.ts` passes the store's `FileStopSwitch`; a test with a stand-in engine puts `STOP` in place after the first chunk.
      2026-11-25: done. `TranslatorRun.stopped`, asked before each chunk (before `nextChunk`, so no chunk is taken and dropped): once true, the run logs `mt: STOP is in place: no further chunk` and ends as a short run would (caches merged, the queue left with what is not done). `src/bin/translate.ts` gives it the store's `FileStopSwitch`.

## Part B — Alerts

- [x] **T004 — One notice** · FR: FR-7, FR-10 · Depends: T001
      Done when: `ntfy.ts` sends a notice as plan section 3 says (body, title, priority, tags, retries, quiet hours) and writes it to the alerts' log first; no topic, no request; `told.ts` reads and sets the flag files; tests with a stand-in `fetch` and clock.
      2026-11-25: done. `ntfy.ts` (`ntfyNotifier`): the title, priority and tags go in ntfy's query string rather than headers (a header carries Latin-1 at best; «…» and the like would be mangled), the message as the body, as the legacy's; four tries 20 s apart, 20 s each; a notice that cannot be sent is noted in the alerts' log (without the topic, the channel's secret) and never throws. `spanish.ts`: `number`, `plural`, `clock`, `dayAndClock`, `lasting`. `told.ts` (`Told`): one flag file per thing told, its time the moment it was set.
- [x] **T005 — A job's failure told once, and its end** · FR: FR-6, FR-10 · Depends: T002, T004
      Done when: `alerts.ts` `afterJob` tells a failure once with the log's last five lines (stack frames out, 200 characters each), its end once, and nothing for skipped or stopped; `runJob` calls it; tests for fail, fail, good, skipped, stopped.
      2026-11-25: done. `alerts.ts` (`afterJob`, `lastLines`): a good run sets `ok-<job>` (the watch's last good end) and tells the end of a failure or of a late spell; the log's last 64 KB read for its last five lines (a log may be 20 MB); the job's own outcome line is among them, which the legacy's notice lacked. `ops.js job` calls it after every run, with `NTFY_TOPIC` from `.env`. Tried on the Mac with no `flock`: the job fails to start, and the notice (logged, no topic) says so.
- [x] **T006 — The watch** · FR: FR-8, FR-10 · Depends: T005
      Done when: `watch.ts` and `machine.ts` run the rules of plan section 3 (STOP daily and its end, late jobs with the uptime and log rules, log trimming in place, disk 90/85, SSD once a day), `ops.ts watch` runs it; tests on a temporary `OPS_DIR` with a stand-in machine and clock for each rule.
      2026-11-25: done. `watch.ts` (`watch`) runs the legacy's rules in its order: STOP (told daily; on its end every job's `ok-<job>` set, so the stop is not told as every job late), late jobs (the job's hours, its log still for two, not in the first hour of uptime, not while STOP, not when told as failed), logs past 20 MB cut to their last 5 MB in the same file (its inode kept), the disk where the store lives (90 % on, under 85 % off), the SSD once a day. `machine.ts` (`serverMachine`): uptime, `statfs` as df counts, `MemAvailable` (else `os.freemem`), and smartctl through `findmnt`, `lsblk` and `sudo -n` (its output read whatever its exit, a bit mask). `ops.js watch`. Tried on the Mac: STOP told (logged), the SSD's missing report to the alerts' log only.
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
