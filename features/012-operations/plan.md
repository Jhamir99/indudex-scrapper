# Plan: Operations

Implements `spec.md` (FR-1 to FR-13). Status: approved (2026-11-25). A rewrite of the legacy's `ops/crontab`, `ops/install.sh`, `ops/alert.sh`, `ops/notice.mjs`, `ops/server-crawl.sh`, `ops/server-refresh.sh`, `ops/server-translate.sh` and `ops/server-backup.sh`: the same behaviour, with the logic in TypeScript so it is tested like the rest, and the shell kept to what only the shell does (`flock`, the deploy's swap of the running code).

## 1. Layout

```
src/features/operations/      # both processes' operations; imports no other feature
  index.ts          # public entry for src/bin/ops.ts
  jobs.ts           # the job table: name, schedule, command, memory, priority, time limit, late hours, Spanish name
  schedule.ts       # the crontab lines from the job table, and a crontab merged with them (others kept)
  locks.ts          # each job's command wrapped in its flock calls (argv), exit 75 = skipped
  run-job.ts        # runJob: STOP, locks, the child with its log and time limit, the outcome, the alerts
  told.ts           # problems told and when each job last ended well: one flag file each, as the legacy
  ntfy.ts           # one notice: ntfy.sh, quiet hours, the alerts' log
  alerts.ts         # afterJob(job, outcome): a failure once, its end once
  watch.ts          # STOP, late jobs, disk, SSD, logs trimmed
  summary.ts        # the notice after a publication
  backup.ts         # the nightly archive and its upload through gh
  machine.ts        # the server's facts behind a port: uptime, disk use, free memory, SSD report (stand-ins in tests)
  deploy.ts         # the deploy's steps; imports nothing of this repo, so Node runs it from src/ as it is
src/bin/ops.ts      # `node dist/bin/ops.js job <name> | watch | backup | schedule`
src/bin/dot-env.ts  # `.env` read by crawl.ts and ops.ts (moved from crawl.ts: a second entry needs it)
ops/deploy.sh       # takes every job's lock, then runs deploy.ts
```

- **Operations folder** `OPS_DIR` (default `var/` at the repo root, ignored by git): `logs/<job>.log`, `logs/alerts.log`, `locks/<lock>.lock`, `told/` (one flag file per problem told, and `ok-<job>`, whose time is the job's last good end). Flag files, not one JSON, so a job ending and the watch never overwrite each other (the legacy's reason).
- **Paths**: the store from `STORE_DIR`, the processor's state from `PROCESSOR_STATE_DIR`, the published dataset from `PUBLISHED_DIR`, as the entries already read them.

## 2. The jobs (FR-1 to FR-5)

| Job         | Schedule       | Command                                                                                 | Locks                                        | Late after |
| ----------- | -------------- | --------------------------------------------------------------------------------------- | -------------------------------------------- | ---------- |
| `crawl`     | `0 * * * *`    | `node --max-old-space-size=3072 dist/bin/crawl.js`                                      | `crawl`                                      | 3 h        |
| `translate` | `10 * * * *`   | `nice -n 10 node --regexp-interpret-all dist/bin/translate.js --minutes 40 --workers 3` | `translate`, then `heavy` without waiting    | 3 h        |
| `publish`   | `0 */3 * * *`  | `node --max-old-space-size=4096 dist/bin/process.js`                                    | `publish`, then `heavy` waiting up to 15 min | 7 h        |
| `backup`    | `0 0 * * *`    | in process (`backup.ts`)                                                                | `backup`                                     | 26 h       |
| `watch`     | `*/15 * * * *` | in process (`watch.ts`)                                                                 | `watch`                                      | —          |

- **The crontab line** is `<schedule> cd <repo> && <node> dist/bin/ops.js job <name> >> var/logs/cron.log 2>&1 # indudex-scrapper`, with the repo's and Node's absolute paths written by the deploy (cron's `PATH` is short and Node may live under a version manager) and a `PATH` that reaches `flock`, `nice`, `tar`, `gh` and `smartctl`. The trailing mark tells the project's lines from the rest of the crontab.
- **Locks with `flock`** (util-linux on the server), as the legacy: the kernel lets the lock go when the process dies, so a crash or a reboot never leaves one held. `runJob` spawns `flock -n -E 75 <lock> [flock … <next lock>] <command>`; 75 means skipped. The `heavy` lock is FR-3: the translator takes it without waiting (a publication building, it is skipped), the publication waits for it up to 15 minutes (a translator ending its chunk). The translator starts no chunk after 40 minutes and `runJob` ends it at 48 (SIGTERM to its process group, SIGKILL a minute later), so it is done before the next publication at :00.
- **STOP** is read by `runJob` before anything (FR-4): with `STOP` in place a job other than `watch` and `backup` ends `stopped` without spawning. The translator also gets the store's stop switch and checks it before each chunk (a `stopped` field on `TranslatorRun`, filled by `src/bin/translate.ts` with `FileStopSwitch`).
- **Outcomes**: 0 good, 75 skipped, STOP stopped, anything else (or the time limit) failed. `ops.js job` always exits 0 (cron would mail otherwise; the alerts are the channel), and writes `[time] <job>: <outcome> in <s> s (exit <code>)` to the job's log after the child's own output.
- **Testing**: the argv of each job is a pure function, tested exactly; `runJob` is tested with stand-in commands (`sh -c 'exit 75'`, a sleeper for the time limit) and a stand-in `flock` script on `PATH`; real `flock` tests run where it exists (CI's Ubuntu) and are skipped on the Mac.

## 3. Alerts (FR-6 to FR-10)

- **`told/`**: `failed-<job>`, `late-<job>`, `disk`, `ssd`, `stop`, `ssd-read`, `ok-<job>`; each a flag file whose time matters where the rule needs it, as the legacy's.
- **`ntfy.ts`**: `notify({ title, message, kind })` with `kind` `warn` (priority 3, ringing), `ok` and `info` (2, silent); 2 between 22:00 and 09:00 in the server's local time. The body is sent as the request body (never as a header), retried 3 times 20 s apart, 20 s each. `fetch` and the clock injectable. Every notice first goes to `logs/alerts.log`; no `NTFY_TOPIC` writes "not sent" there.
- **Texts in Spanish**, the legacy's own wording where it exists («Indudex: ha fallado el rastreo», «… vuelve a ir bien», «Indudex está parado», «el disco está al 91 %»); numbers with `de-DE` grouping, times with `es-ES` in the server's zone.
- **The watch** runs the legacy's rules in its order: STOP (told daily while it stays; on its end every `ok-<job>` touched, so the stop is not told as every job late), late jobs (not in the first hour of uptime, not while STOP), log trimming (past 20 MB keep 5 MB, rewritten in place, as appending jobs keep their descriptor), disk (90 % on, under 85 % off; the store's filesystem), SSD (once in 24 h: `sudo -n env LC_ALL=C smartctl -H -A <disk>`, the disk found with `findmnt` and `lsblk`; bad when the check is not PASSED or «Percentage Used» ≥ 90; a report it cannot read goes to the alerts' log only). `machine.ts` gives the facts so the rules are tested with stand-ins.
- **The summary** (FR-9), after a good `publish`: the version from `current.json` and its `status.json` (`offers`, `optional`, `generated_at`), the run's time from `runJob`, the crawl's sources by state from `FileAdvertStore.readStates()` (enabled, failing, parked, disabled; failing and parked named in «Ojo» when there are any), the translator's last line with titles from its log (`mt: N titles translated (M translations written, K without an answer)`), disk and free memory (`MemAvailable`, else `os.freemem`), and the problems still open in `told/`.

## 4. Backup (FR-11)

- `tar -czf <tmp>/state-<mon…sun>.tar.gz` of the processor's state folder (its parent as `-C`, `mt/` and `*.tmp`, `*.lock` left out) and of the store's `state/`, `memory/`, `registers/`, `rates/`; GNU tar's exit 1 (a file changed while read) counts as good.
- `gh release view server-backup -R $BACKUP_REPO`, created as a pre-release when missing; the largest asset's size read first: under half of it, not sent, failed; `gh release upload --clobber`; the uploaded asset's size compared. The commands run through an injectable runner, so the tests check the calls and their order without `gh`.
- Restore, in `ops/README.md`: `gh release download server-backup -R $BACKUP_REPO -p 'state-<day>.tar.gz'`, then `tar xzf <file> -C <the folders' parents>`; the models fetched again with `pnpm translate:fetch`.

## 5. Deploy (FR-12, FR-13)

- `sh ops/deploy.sh`: `flock` on every job's lock (waiting: at most the translator's hour), then `node src/features/operations/deploy.ts`, which: `git pull --ff-only` (3 tries, 30 s apart: the home line's DNS drops lookups), `pnpm install --frozen-lockfile`, `tsc -p tsconfig.build.json --outDir dist.next`, then `dist` → `dist.old`, `dist.next` → `dist`, `dist.old` removed (a failed build leaves `dist` untouched), and finally `node dist/bin/ops.js schedule`, which writes the project's lines into the crontab and keeps every other. The first install is the same command.
- `deploy.ts` imports nothing of this repo (Node 26 strips its types and runs it from `src/`, as `merge.ts`), since it replaces the compiled code it would otherwise run from. Its steps run through an injectable runner for the tests.
- **Dockerfile**: also copies `vendor/` (the engine's loader, Aina's worker); `config/` and `catalogues/` are there already. The jobs stay on the host (open decision).
- **`.env.example`**: `NTFY_TOPIC`, `BACKUP_REPO`, `OPS_DIR`, empty. **`.gitignore`**: `/var/`.

## 6. Decisions (2026-11-25)

- **ntfy.sh** (operator). Why: the legacy's, works with a free app and no account; the topic is the secret.
- **Backup to a release of the private repository in `BACKUP_REPO`** (operator). Why: this repository is public; GitHub keeps the seven archives off the server with nothing else to run.
- **Deploy by hand** (operator). Why: CI gates `main`; a pull from cron ran a script while it was changing under itself (legacy, 9 October) and tied every publication to GitHub being reachable.
- **Logic in TypeScript, `flock` in the shell's place.** Why: the legacy's `alert.sh` grew to 160 lines of shell nobody could test; the rules now have tests, and `flock` is still the safest lock (released by the kernel).
- **One `heavy` lock** between the translator and the publication. Why: both take about 2 GB and the publication must not read caches the translator is merging; the translator ends its hour before the publication's time.
- **Notices in Spanish** (operator). Why: they are read by the operator on the phone, not by contributors; code, logs and docs stay in English.
