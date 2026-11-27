import { messageOfLine } from "../../shared/kit/logger.js";
import type { Job } from "./jobs.js";
import type { Notifier } from "./ntfy.js";
import type { Outcome } from "./run-job.js";
import { clock } from "./spanish.js";
import { tailOf } from "./tail.js";
import type { Told } from "./told.js";

export interface AfterJob {
  readonly job: Job;
  readonly outcome: Outcome;
  readonly told: Told;
  readonly notifier: Notifier;
  // The job's log, whose last lines tell what failed.
  readonly logPath: string;
  readonly now?: () => Date;
}

// After each run (FR-6), as the legacy's `alert.sh --job`: a failure told once, until a run ends well again, which is
// told once too; a run skipped by its lock or stopped by STOP changes nothing. A good run also sets the job's last
// good end, which the watch reads for late jobs.
export async function afterJob(after: AfterJob): Promise<void> {
  const { job, told, notifier } = after;
  const now = after.now ?? (() => new Date());
  const failed = `failed-${job.name}`,
    late = `late-${job.name}`;
  if (after.outcome === "good") {
    await told.set(`ok-${job.name}`, now());
    if ((await told.has(failed)) || (await told.has(late)))
      await notifier.notify({
        title: `Indudex: ${job.spoken} vuelve a ir bien`,
        message: `Ha terminado bien a las ${clock(now())}.`,
        kind: "ok",
      });
    await told.clear(failed);
    await told.clear(late);
    return;
  }
  if (after.outcome !== "failed" || (await told.has(failed))) return;
  await told.set(failed, now());
  const detail = await lastLines(after.logPath);
  await notifier.notify({
    title: `Indudex: ha fallado ${job.spoken}`,
    message: detail || `Sin detalle en ${after.logPath}.`,
  });
}

// The log's last five lines without a stack trace's frames (they say where, not what), each cut to 200 characters so
// the notice stays under ntfy's 4,096 bytes. Only the log's end is read: a log may be 20 MB.
export async function lastLines(path: string): Promise<string> {
  const text = await tailOf(path, 64 * 1024);
  return text
    .split("\n")
    .map((line) => messageOfLine(line).message)
    .filter(
      (line) =>
        line.trim() !== "" &&
        !/^ {4}at /.test(line) &&
        !/^ *\d+: 0x/.test(line) &&
        !line.startsWith("Node.js v"),
    )
    .slice(-5)
    .map((line) => [...line].slice(0, 200).join(""))
    .join("\n");
}
