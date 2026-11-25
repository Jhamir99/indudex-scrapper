import { join } from "node:path";
import type { Job } from "./jobs.js";

// What `flock` answers when it could not take a lock (`-E`): the run is skipped, neither good nor failed (FR-2).
export const SKIPPED_EXIT = 75;

// The job's command line: each lock in turn with util-linux's `flock` (the kernel lets it go when the process dies,
// so a crash or a reboot never leaves one held), then `nice` when the job gives way, then Node with its arguments.
export function lockedCommand(
  job: Job,
  where: { readonly locksDirectory: string; readonly node: string },
): string[] {
  const command: string[] = [];
  for (const step of job.locks) {
    command.push(
      "flock",
      ...(step.waitSeconds === undefined
        ? ["-n"]
        : ["-w", String(step.waitSeconds)]),
      "-E",
      String(SKIPPED_EXIT),
      join(where.locksDirectory, `${step.lock}.lock`),
    );
  }
  if (job.nice !== undefined) command.push("nice", "-n", String(job.nice));
  command.push(where.node, ...job.node);
  return command;
}
