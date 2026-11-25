import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type JobName = "crawl" | "translate" | "publish" | "backup" | "watch";

// A lock taken before the job's command: without waiting (the run is skipped when it is held), or
// waiting up to `waitSeconds` for it.
export interface LockStep {
  readonly lock: string;
  readonly waitSeconds?: number;
}

export interface Job {
  readonly name: JobName;
  // Cron's five fields, in the server's local time.
  readonly schedule: string;
  // How a notice names it (in Spanish, the operator's language).
  readonly spoken: string;
  // Node's arguments, from the repo root: flags, then the compiled entry and its own arguments.
  readonly node: readonly string[];
  // `nice`'s adjustment, for a job that must give way to the others.
  readonly nice?: number;
  readonly locks: readonly LockStep[];
  // Past these minutes the job's processes are ended and the run counts as failed.
  readonly timeLimitMinutes?: number;
  // Hours without a run that ended well before the watch tells the job as late.
  readonly lateHours?: number;
  // Whether `STOP` keeps it from starting (the watch and the backup run whatever).
  readonly stops: boolean;
}

// The server's schedule (spec FR-1, plan section 2). The translator starts no chunk after 40 minutes and is ended at
// 48, so a run started at :10 is over before the publication's :00; the two share `heavy` (FR-3): the translator does
// not wait for it, the publication waits a quarter of an hour.
export const JOBS: readonly Job[] = [
  {
    name: "crawl",
    schedule: "0 * * * *",
    spoken: "el rastreo",
    node: ["--max-old-space-size=3072", "dist/bin/crawl.js"],
    locks: [{ lock: "crawl" }],
    lateHours: 3,
    stops: true,
  },
  {
    name: "translate",
    schedule: "10 * * * *",
    spoken: "la traducción",
    node: [
      "--regexp-interpret-all",
      "dist/bin/translate.js",
      "--minutes",
      "40",
      "--workers",
      "3",
    ],
    nice: 10,
    locks: [{ lock: "translate" }, { lock: "heavy" }],
    timeLimitMinutes: 48,
    lateHours: 3,
    stops: true,
  },
  {
    name: "publish",
    schedule: "0 */3 * * *",
    spoken: "la publicación",
    node: ["--max-old-space-size=4096", "dist/bin/process.js"],
    locks: [{ lock: "publish" }, { lock: "heavy", waitSeconds: 900 }],
    lateHours: 7,
    stops: true,
  },
  {
    name: "backup",
    schedule: "0 0 * * *",
    spoken: "la copia de seguridad",
    node: ["dist/bin/ops.js", "backup"],
    locks: [{ lock: "backup" }],
    lateHours: 26,
    stops: false,
  },
  {
    name: "watch",
    schedule: "*/15 * * * *",
    spoken: "la vigilancia",
    node: ["dist/bin/ops.js", "watch"],
    locks: [{ lock: "watch" }],
    stops: false,
  },
];

export function jobNamed(name: string): Job | undefined {
  return JOBS.find((job) => job.name === name);
}

// Every lock a job takes, once each: the deploy holds them all.
export const ALL_LOCKS: readonly string[] = [
  ...new Set(JOBS.flatMap((job) => job.locks.map((step) => step.lock))),
];

// The repo's root, the same from src (tsx) and dist (node).
export const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

// The operations' own folder (logs, locks, the problems told): OPS_DIR when set, else `var/` at the repo root (git
// ignores it).
export function opsDirectory(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const configured = environment["OPS_DIR"]?.trim();
  if (configured) return resolve(configured);
  return resolve(REPO_ROOT, "var");
}
