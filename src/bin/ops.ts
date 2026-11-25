// `node dist/bin/ops.js job <name> | watch`: the server's operations (012).
//   job <name>  what the crontab's lines (written by the deploy) run: STOP first, then the job's locks and command,
//               its output into its log, then the alerts (a failure told once, and its end). Always exits 0 (the
//               alerts are the channel, not cron's mail).
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
  REPO_ROOT,
  runJob,
  serverMachine,
  Told,
  watch,
} from "../features/operations/index.js";
import { FileStopSwitch } from "../shared/storage/file-stop-switch.js";
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
