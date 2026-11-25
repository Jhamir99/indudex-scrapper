// `node dist/bin/ops.js job <name>`: the server's operations (012). The crontab's lines, written by the deploy,
// run `ops.js job <name>` for each job: STOP first, then the job's locks and command, its output into its log,
// then the alerts (a failure told once, and its end). Always exits 0 after a job (the alerts are the channel,
// not cron's mail); 2 on a usage error.
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import {
  afterJob,
  jobNamed,
  JOBS,
  lockedCommand,
  opsDirectory,
  REPO_ROOT,
  ntfyNotifier,
  runJob,
  Told,
} from "../features/operations/index.js";
import { FileStopSwitch } from "../shared/storage/file-stop-switch.js";
import { environmentWithDotEnv } from "./dot-env.js";
import { storeDirectory } from "./store-directory.js";

const USAGE = `usage: ops.js job <${JOBS.map((job) => job.name).join("|")}>`;

const [command, name] = process.argv.slice(2);
const environment = environmentWithDotEnv();
const ops = opsDirectory(environment);
const told = new Told(join(ops, "told"));
const notifier = ntfyNotifier({
  topic: environment["NTFY_TOPIC"],
  logPath: join(ops, "logs", "alerts.log"),
});

if (command === "job") {
  const job = name ? jobNamed(name) : undefined;
  if (!job) {
    console.error(USAGE);
    process.exitCode = 2;
  } else {
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
      stopSwitch: new FileStopSwitch(storeDirectory(environment)),
      ...(job.timeLimitMinutes === undefined
        ? {}
        : { timeLimitMs: job.timeLimitMinutes * 60_000 }),
    });
    await afterJob({ job, outcome: result.outcome, told, notifier, logPath });
    console.log(`${new Date().toISOString()} ${job.name}: ${result.outcome}`);
  }
} else {
  console.error(USAGE);
  process.exitCode = 2;
}
