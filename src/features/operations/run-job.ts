import { spawn } from "node:child_process";
import { closeSync, openSync } from "node:fs";
import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { Job } from "./jobs.js";
import { SKIPPED_EXIT } from "./locks.js";

// Good and failed are told by the alerts; skipped (its lock held) and stopped (STOP in place) are neither.
export type Outcome = "good" | "failed" | "skipped" | "stopped";

export interface JobRun {
  readonly job: Job;
  // The whole command, locks first (lockedCommand).
  readonly command: readonly string[];
  // Where the command runs: the repo's root.
  readonly directory: string;
  // The job's log: its outcome lines and the command's own output.
  readonly logPath: string;
  readonly environment: Readonly<Record<string, string | undefined>>;
  readonly stopSwitch: { isActive(): Promise<boolean> };
  // Past this the command's processes get SIGTERM, and SIGKILL `killGraceMs` later; from the job's own limit.
  readonly timeLimitMs?: number;
  readonly killGraceMs?: number;
  readonly now?: () => Date;
}

export interface JobResult {
  readonly outcome: Outcome;
  // The command's exit code, null when it was ended by a signal or never started.
  readonly code: number | null;
  readonly seconds: number;
  readonly timedOut: boolean;
}

export async function runJob(run: JobRun): Promise<JobResult> {
  const now = run.now ?? (() => new Date());
  const { job, logPath } = run;
  await mkdir(dirname(logPath), { recursive: true });
  const line = (text: string) =>
    appendFile(logPath, `[${now().toISOString()}] ${job.name}: ${text}\n`);

  if (job.stops && (await run.stopSwitch.isActive())) {
    await line("stopped (STOP is in place)");
    return { outcome: "stopped", code: null, seconds: 0, timedOut: false };
  }

  const started = now().getTime();
  const { code, signal, timedOut, error } = await spawned(run);
  const seconds = Math.round((now().getTime() - started) / 1000);
  const outcome: Outcome =
    !timedOut && code === 0
      ? "good"
      : !timedOut && code === SKIPPED_EXIT
        ? "skipped"
        : "failed";
  const why = error
    ? `could not start: ${error}`
    : timedOut
      ? `ended after its ${Math.round((run.timeLimitMs ?? 0) / 60_000)} minutes`
      : signal
        ? `ended by ${signal}`
        : `exit ${code}`;
  await line(`${outcome} in ${seconds} s (${why})`);
  return { outcome, code, seconds, timedOut };
}

interface Ended {
  readonly code: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly timedOut: boolean;
  readonly error?: string;
}

// The command in a process group of its own, its output appended to the log, so the time limit ends the command
// and every process it started (flock's child, the translator's workers).
function spawned(run: JobRun): Promise<Ended> {
  const [program, ...args] = run.command;
  if (!program)
    return Promise.resolve({
      code: null,
      signal: null,
      timedOut: false,
      error: "no command",
    });
  const log = openSync(run.logPath, "a");
  return new Promise((done) => {
    let timedOut = false;
    const timers: NodeJS.Timeout[] = [];
    const child = spawn(program, args, {
      cwd: run.directory,
      env: run.environment,
      stdio: ["ignore", log, log],
      detached: true,
    });
    const group = (signal: NodeJS.Signals) => {
      try {
        if (child.pid) process.kill(-child.pid, signal);
      } catch {
        // The group is gone already.
      }
    };
    if (run.timeLimitMs !== undefined)
      timers.push(
        setTimeout(() => {
          timedOut = true;
          group("SIGTERM");
          timers.push(
            setTimeout(() => group("SIGKILL"), run.killGraceMs ?? 60_000),
          );
        }, run.timeLimitMs),
      );
    let finished = false;
    const finish = (ended: Ended) => {
      if (finished) return;
      finished = true;
      for (const timer of timers) clearTimeout(timer);
      // What the group's leader left behind after the time limit does not outlive the run.
      if (timedOut) group("SIGKILL");
      closeSync(log);
      done(ended);
    };
    child.once("error", (error) =>
      finish({ code: null, signal: null, timedOut, error: error.message }),
    );
    child.once("exit", (code, signal) => finish({ code, signal, timedOut }));
  });
}
