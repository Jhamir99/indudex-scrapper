# Operations

How the home server runs the scrapper, the translator and the processor (feature `012-operations`). The rules are in `src/features/operations/`; this folder holds only the deploy's shell.

## The schedule

`sh ops/deploy.sh` writes these lines into the crontab (each ends with `# indudex-scrapper`; every other line of the crontab is left alone). Times are the server's local time.

| Job         | When                         | What                                                                        |
| ----------- | ---------------------------- | --------------------------------------------------------------------------- |
| `crawl`     | every hour, :00              | `dist/bin/crawl.js`: the due sources into the store                         |
| `translate` | every hour, :10              | `dist/bin/translate.js`: the titles wanted, at low priority, 40 min         |
| `publish`   | every three hours from 00:00 | `dist/bin/process.js`: a new version of the published dataset               |
| `backup`    | every day, 00:00             | what only the server holds, to the release `server-backup` of `BACKUP_REPO` |
| `watch`     | every quarter of an hour     | STOP, late jobs, logs, disk, SSD                                            |

Each line runs `node dist/bin/ops.js job <name>`: with `STOP` in place nothing but the watch and the backup starts; each job takes its lock with `flock` (a run whose lock is held is skipped); the translator and the publication share one more lock and never run together. A run started by hand takes the same care: the crawl holds its store, the publication and the translator one lock in the processor's state (`proper-lockfile`); a run that finds it held stops with 75, which the cron reads as skipped. Each job's output goes to `var/logs/<job>.log` (`OPS_DIR`, default `var/`): the crawl, the publication, the translator and the registers write one JSON line a message (pino: `time`, `level`, `process`, `msg`; read them with `jq -r .msg`), a crash's trace as plain text.

## Setting the server up

Linux with cron, util-linux (`flock`, `findmnt`, `lsblk`), GNU tar, Node (the version in `.nvmrc`), pnpm, the GitHub CLI and smartmontools.

1. Clone the repo and write `.env` from `.env.example`: `NTFY_TOPIC` (a long random name; subscribe to it in the ntfy app), `BOT_SIGNING_KEY` (the bot's signing key, the legacy server's), `BACKUP_REPO` (a private repository with at least one commit, e.g. `owner/indudex-backups`), and the paths if not the defaults.
2. `gh auth login` as a user that can write to `BACKUP_REPO`'s releases.
3. Let the watch read the SSD's health without a password: `sudo visudo -f /etc/sudoers.d/smartctl` with `<user> ALL=(root) NOPASSWD: /usr/bin/env LC_ALL=C smartctl -H -A *`.
4. `sh ops/deploy.sh`: installs, builds and writes the crontab's lines.
5. `node dist/bin/translate-fetch.js` (or `pnpm translate:fetch`) once: the engine and models into `MT_DIR`. Aina is optional (`AINA_DIR`).

## The first deploy, step by step

Ready on 27 November 2026: the build, the crontab's lines, the locks, the logs and the Docker image were checked on the
operator's Mac; nothing below was run on the server yet.

1. On the server, as the user that will run the jobs: `node -v` (the version in `.nvmrc`), `pnpm -v`, `gh --version`,
   `flock -V`, `smartctl -V`. Install what is missing.
2. `git clone https://github.com/Jhamir99/indudex-scrapper.git && cd indudex-scrapper`.
3. Create the backup repository: `gh repo create <owner>/indudex-backups --private --add-readme` (one commit).
4. `cp .env.example .env` and fill in `NTFY_TOPIC` (a long random name: `openssl rand -hex 16`) and `BACKUP_REPO`
   (`<owner>/indudex-backups`), and copy `BOT_SIGNING_KEY` from the legacy server's `builder/.env` (the key whose
   public half indudex.com publishes; without it Workday's boards answer 429). Leave the credentialed sources empty:
   they stay off.
5. In the ntfy app, subscribe to `NTFY_TOPIC`.
6. `gh auth login`.
7. The sudoers line for smartctl (step 3 of "Setting the server up").
8. The legacy's translations, once: copy `builder/state/titles-*.json` from the legacy server into `state/` (the
   publication applies them; without them every title waits for the translator).
9. `sh ops/deploy.sh`.
10. `node dist/bin/translate-fetch.js`: the engine and models into `MT_DIR`. Aina only if wanted (`AINA_DIR`).
11. Check: `crontab -l | grep indudex-scrapper` shows five lines; `node dist/bin/ops.js watch` ends without error and a
    test notice reaches the phone (`curl -d test ntfy.sh/$NTFY_TOPIC`).
12. After the first hours: `var/logs/crawl.log` (`jq -r .msg var/logs/crawl.log | tail`), `node dist/bin/crawl-status.js`,
    and after 03:00 `published/current.json`. After the first midnight, the release `server-backup` of `BACKUP_REPO`.

Then one day of the schedule is recorded in `features/012-operations/tasks.md` (T011) and 012 is closed.

## Deploying new code

`sh ops/deploy.sh`. It waits for every job's lock (no run on half the code), pulls a fast-forward of the branch checked out, installs the exact dependencies, builds into `dist.next` and only then puts it in place of `dist/` (a failed build leaves the running code as it was), and writes the crontab's lines again. It never touches the store, the state or the published dataset.

## Stopping everything

`touch store/STOP` (in `STORE_DIR` when set): no crawl, translation or publication starts, the crawl and the translator stop between requests and chunks, and the phone hears of it once a day while it stays. `rm store/STOP` to start again.

## Notices

Through ntfy.sh to `NTFY_TOPIC`: a failure once and its end once, a job late, the disk at 90 %, the SSD's health, STOP; after each publication a silent summary. Between 22:00 and 09:00 everything arrives silent. Every notice is also written to `var/logs/alerts.log`.

## Restoring the backup

The release `server-backup` of `BACKUP_REPO` holds one archive per weekday (`state-mon.tar.gz` … `state-sun.tar.gz`), each with the processor's state folder (without the models) and the store's `state/`, `memory/`, `registers/` and `rates/`, named from their parents.

```sh
touch store/STOP
gh release download server-backup -R "$BACKUP_REPO" -p 'state-tue.tar.gz'
tar -tzf state-tue.tar.gz | head          # state/… and store/…
tar -xzf state-tue.tar.gz -C <the folder that holds state/ and store/>   # the repo's root with the defaults
pnpm translate:fetch                      # the models, left out of the copy
rm store/STOP
```

The adverts are not in the copy: the crawl fills the store again within a day or two.
