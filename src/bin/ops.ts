// `node dist/bin/ops.js job <name> | watch`: the server's operations (012).
//   job <name>  what the crontab's lines (written by the deploy) run: STOP first, then the job's locks and command,
//               its output into its log, then the alerts (a failure told once, and its end). Always exits 0 (the
//               alerts are the channel, not cron's mail). After a good publication, the summary.
//   watch       the quarter-hourly watch (run by `job watch`, under its lock): STOP, late jobs, logs, disk, SSD.
// Exits 2 on a usage error.
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import {
  afterJob,
  jobNamed,
  JOBS,
  lockedCommand,
  ntfyNotifier,
  opsDirectory,
  publicationSummary,
  REPO_ROOT,
  runJob,
  serverMachine,
  Told,
  watch,
} from "../features/operations/index.js";
import { FileAdvertStore } from "../shared/storage/file-advert-store.js";
import { FileStopSwitch } from "../shared/storage/file-stop-switch.js";
import { publishedDirectory } from "../shared/storage/published-dataset.js";
import { environmentWithDotEnv } from "./dot-env.js";
import { storeDirectory } from "./store-directory.js";

const USAGE = `usage: ops.js job <${JOBS.map((job) => job.name).join("|")}> | watch`;

const [command, name] = process.argv.slice(2);
const environment = environmentWithDotEnv();
const ops = opsDirectory(environment);
const store = storeDirectory(environment);
const told = new Told(join(ops, "told"));
const notifier = ntfyNotifier({
  topic: environment["NTFY_TOPIC"],
  logPath: join(ops, "logs", "alerts.log"),
});

if (command === "job" && name && jobNamed(name)) {
  const job = jobNamed(name)!;
  // flock makes its lock file, not the folder.
  await mkdir(join(ops, "locks"), { recursive: true });
  const logPath = join(ops, "logs", `${job.name}.log`);
  const result = await runJob({
    job,
    command: lockedCommand(job, {
      locksDirectory: join(ops, "locks"),
      node: process.execPath,
    }),
    directory: REPO_ROOT,
    logPath,
    environment,
    stopSwitch: new FileStopSwitch(store),
    ...(job.timeLimitMinutes === undefined
      ? {}
      : { timeLimitMs: job.timeLimitMinutes * 60_000 }),
  });
  await afterJob({ job, outcome: result.outcome, told, notifier, logPath });
  // Once a publication is up, how everything stands, silent (FR-9). A summary that cannot be made fails nothing.
  if (job.name === "publish" && result.outcome === "good") {
    try {
      await notifier.notify(
        await publicationSummary({
          publishedDirectory: publishedDirectory(environment),
          storeDirectory: store,
          store: new FileAdvertStore(store, { now: () => new Date() }),
          translatorLogPath: join(ops, "logs", "translate.log"),
          machine: serverMachine,
          told,
          startedAt: new Date(Date.now() - result.seconds * 1000),
          seconds: result.seconds,
        }),
      );
    } catch (error) {
      console.error(
        `no summary: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  console.log(`${new Date().toISOString()} ${job.name}: ${result.outcome}`);
} else if (command === "watch") {
  await watch({
    opsDirectory: ops,
    storeDirectory: store,
    told,
    notifier,
    machine: serverMachine,
  });
} else {
  console.error(USAGE);
  process.exitCode = 2;
}
