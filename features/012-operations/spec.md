# Spec: Operations

Status: approved (2026-11-25). Requirements written from the outline with the operator's answers of 2026-11-25: alerts through ntfy.sh, as the legacy; the daily backup attached to a release of a private repository named in `BACKUP_REPO` (this repository is public); new code reaches the server only when the operator deploys it by hand, never by a pull from cron; the watch covers late jobs, the disk, the SSD's health, and a silent summary after each publication; the notices are written in Spanish, the operator's language, as the legacy's were.

## 1. Context and goal

A home server runs every process on its own schedule: the crawl (001), the publication (010) and the title translator (011). Nobody watches it. The operator needs to hear when a job fails or stops ending well, to be able to stop everything at once, to restore what only the server holds after a dead disk, and to put new code on it without breaking a run in progress.

The legacy did it with the host's crontab (`ops/crontab`), one `flock` per job, shell scripts per job (`ops/server-*.sh`), notices to the owner's phone through ntfy.sh (`ops/alert.sh`, research in `docs/research/server-alerts.md`), a summary after each publication (`ops/notice.mjs`), and a nightly copy of its state to a GitHub release (`ops/server-backup.sh`). Its daily discovery jobs (`server-daily.sh`, `server-probe.sh`, `server-discover.sh`) belong to 016 and 017.

**Goal:** the server runs the crawl, the translator and the publication unattended, each on its own schedule and never stacked; the operator hears on the phone what went wrong and when it is over; one file stops everything; what only the server holds is copied away each night; new code goes on with one command.

**Why:** the first published pile (010, 011) is only useful if it is kept fresh without the operator at the keyboard, and a silent failure on a home server can last days.

## 2. Users

- **Operator**: installs and deploys, reads notices on the phone, stops and starts everything, restores a backup.
- **The crawl, the publication and the translator**: started by the schedule, each in its own lock.

## 3. User stories

- As the operator, I want my phone to ring once when the crawl fails, and once more when it works again, not every hour in between.
- As the operator, I want to put `STOP` in place before touching the server and know nothing starts until I take it away, with a daily reminder while it stays.
- As the operator, I want a dead disk to cost me at most a day of the translator's caches and the companies' directory.
- As the operator, I want to deploy new code without a crawl or a publication running on half of it.
- As the operator, I want a quiet summary after each publication telling me how many offers went up and whether anything needs a look.

## 4. Functional requirements

### Part A — The schedule

**FR-1 — The jobs and their times.**
The server's schedule shall start, in the server's local time: the crawl every hour on the hour; the translator every hour at :10, at low priority; the publication every three hours from 00:00; the backup every day at 00:00; the watch every quarter of an hour.
_Acceptance:_ The schedule's lines, installed by the deploy (FR-12), are these five; a test checks each line names its job and its time.

**FR-2 — One lock per job.**
When a job's time comes while its previous run still holds its lock, the schedule shall skip the new run and record it as _skipped_, neither good nor failed.
_Acceptance:_ A test runs a job while its lock is held: the new run does not start and its outcome is "skipped".

**FR-3 — The translator and the publication never together.**
The translator and the publication shall never run at the same time: a translator shall not start while a publication builds; a publication shall wait for a running translator to end (at most a quarter of an hour, then it is skipped); and a translator run shall end before the next hour's publication is due.
_Acceptance:_ Tests with both locks: each case gives the outcome stated.

**FR-4 — The stop file.**
While the stop file (`STOP` in the store, as 001 defined it) exists, no job but the watch and the backup shall start, and a job that finds it shall end as _stopped_, neither good nor failed. The translator shall also start no further chunk once the file appears mid-run.
_Acceptance:_ Tests: each job with `STOP` in place ends "stopped" without running its process; the translator with a stand-in engine stops between chunks when the file appears.

**FR-5 — How each job runs.**
Each job shall run the compiled code with its own memory limit, write its output to a log of its own, and report its outcome (good, failed, skipped, stopped) to the alerts (FR-6). The translator shall be stopped by force when it runs past its time, and that run counts as failed.
_Acceptance:_ A test runs a stand-in job of each outcome and finds its log line and its outcome recorded.

### Part B — Alerts

**FR-6 — A failure told once, and its end.**
When a job fails, the operator shall receive one notice with the last lines of its log (stack frames left out, each line cut to 200 characters); while it keeps failing, no further notice; when it next ends well, one notice that it works again. A skipped or stopped run changes nothing.
_Acceptance:_ Tests: fail, fail, good gives two notices; skipped and stopped give none.

**FR-7 — The channel.**
Notices shall go to ntfy.sh on the topic named by `NTFY_TOPIC` in `.env`, retried a few times; a problem rings, a problem over and the summary arrive silently, and every notice arrives silently between 22:00 and 09:00. Every notice is also written to the alerts' log; with no topic, it is only written there.
_Acceptance:_ Tests with a stand-in ntfy: the request's title, priority, tags and body; quiet hours; no topic, no request.

**FR-8 — The watch.**
Every quarter of an hour the watch shall tell what no run can tell by itself, each problem once when it starts and once when it is over:

- `STOP` in place: told when it appears and again each day while it stays; told again when it goes. While it is in place, and after it goes, no job counts as late for the time it stood.
- A late job: no run ended well within its hours (crawl and translator 3 h, publication 7 h, backup 26 h) and its log has not moved for two hours, so a long run still writing is not told as hung. A job already told as failed is not told as late. Nothing is judged in the first hour after the server starts.
- The disk: told at 90 % full, over below 85 %.
- The SSD: once a day, its own health report; told when it fails its check or has used 90 % of its rated life; a report that cannot be read goes to the log only.
- The logs: one past 20 MB keeps its last 5 MB, the file kept in place so the job writing to it goes on.
  _Acceptance:_ Tests on a temporary folder with stand-in clocks, disks and reports for each rule.

**FR-9 — The summary after a publication.**
After a publication that went up, the operator shall receive one silent notice: «Todo bien» or what needs a look (the problems still open, sources failing or parked); the version published, when and how long it took, the offers in it; the crawl's sources by state; the translator's last run with titles (titles and translations written, without an answer); the disk's use and the free memory.
_Acceptance:_ Tests compose the notice from stand-in inputs; no publication went up, no notice.

**FR-10 — Notices in Spanish.**
Notice titles and bodies shall be written in Spanish, as the legacy's; numbers with a dot every three digits and times in the server's local time.
_Acceptance:_ The tests of FR-6 to FR-9 check the texts.

### Part C — Backup

**FR-11 — The nightly copy.**
Every night the backup shall pack what only the server holds (the processor's state folder without the translation models; the store's source states, sources' memory, registers and rates; not the adverts, the published dataset, the logs or `.env`) into one archive per weekday, attached to the release `server-backup` of the private repository named by `BACKUP_REPO`, the same weekday's archive replaced a week later. An archive under half the size of the largest one already there shall not be sent, and the run fails; the run also fails when the size sent does not match. With no `BACKUP_REPO` the run fails, so the operator hears of it. A file that changed while it was read does not fail the copy.
_Acceptance:_ Tests with a stand-in for the release's tool: what goes in and what stays out, the size guard, the size check, no repository. Restoring is one command, documented.

### Part D — Deploy and install

**FR-12 — The deploy.**
The operator's one command shall bring the server to the latest code: wait for every job's lock (no run on half the code), pull only a fast-forward, install the exact dependencies, build into a fresh folder and only then put it in place of the running one (a failed build leaves the running code as it was), and write the schedule's lines into the crontab, leaving every other line of the crontab as it was. Run again, it changes nothing more; it never touches the store, the state or the published dataset.
_Acceptance:_ Tests on a temporary crontab: the project's lines replaced, the others kept; a failed build leaves the code in place. One deploy on the server recorded.

**FR-13 — What the processes read.**
The container image shall carry everything the processes read besides the compiled code (configuration, catalogues, the engine's loader and Aina's worker), for when the jobs move into Docker.
_Acceptance:_ The image builds and lists those folders.

## 5. Non-functional requirements

- **Platform:** the server runs Linux with cron, `flock` and `smartctl`; the development Mac only runs the tests, with stand-ins for those.
- **No user data:** notices and logs carry counts, sources and job names, never an advert's text, a key or a token (failure reasons already cut credentials, 001).
- **Secrets:** `NTFY_TOPIC` and `BACKUP_REPO` live only in `.env`; `.env.example` names them empty.
- **Memory:** the jobs' memory limits leave room for the others on the server (the publication measured at 1.9 GB on the Mac, the translator at 1.7 GB with three workers, a crawl at about 1.1 GB with mpsv).
- **Measured:** before the feature closes, one day of the schedule on the server is recorded: each job's outcomes and times, the notices received, one backup's size.

## 6. Edge cases

- The server restarts mid-run: the lock goes with the process; the next run starts; the watch does not judge the first hour.
- A run hung while holding its lock: the next runs are skipped and the watch tells it as late once its log stops moving.
- ntfy.sh unreachable: the notice is written to the log and the job's outcome is unchanged.
- `STOP` put in place while a crawl reads: the crawl's own switch stops its requests (001); the job's outcome is whatever the run says.
- The backup's repository has no release yet: the first run creates it.
- A deploy while the translator runs: it waits for the translator's lock (at most its hour).

## 7. Out of scope

- The daily discovery jobs of the legacy (provider pacing, the ATS probe, the Sunday hunt): with 016 and 017.
- Moving the jobs into Docker (open decision in `AGENTS.md`); only the image's contents (FR-13).
- Code pulled by cron and tests run before each publication (the operator deploys by hand; CI gates `main`).
- The legacy's test of the home line (TCP greetings) in the summary.
- The API's and the web's operations.

## 8. Completion criteria

- FR-1 to FR-13 pass their acceptance tests, and `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:run && pnpm build` is green.
- The measurement of section 5 is recorded in `tasks.md` (the server's day, or why it could not be done yet).

## 9. Open questions

- None. (2026-11-25: ntfy.sh; a release of the private repository in `BACKUP_REPO`; deploy by hand; the watch with late jobs, disk, SSD and the summary; notices in Spanish.)
