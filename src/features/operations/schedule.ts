import { dirname, join } from "node:path";
import { JOBS } from "./jobs.js";

// Ends every line of the project's own in the crontab, so the deploy replaces those and leaves every other alone.
export const MARK = "# indudex-scrapper";

// Cron's own PATH is short; the jobs need flock, nice, tar, gh and smartctl, and Node's own folder first.
const SYSTEM_PATH =
  "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin";

export interface ScheduleWhere {
  // The repo's absolute path.
  readonly repo: string;
  // Node's absolute path (it may live under a version manager cron does not know).
  readonly node: string;
  // The operations folder, absolute.
  readonly opsDirectory: string;
}

// One crontab line per job (FR-1): into the repo, then `ops.js job <name>`, whose own errors go to cron.log.
export function scheduleLines(where: ScheduleWhere): string[] {
  const path = `${dirname(where.node)}:${SYSTEM_PATH}`;
  const cronLog = join(where.opsDirectory, "logs", "cron.log");
  return JOBS.map(
    (job) =>
      `${job.schedule} cd ${quoted(where.repo)} && PATH=${quoted(path)} ${quoted(where.node)} dist/bin/ops.js job ${job.name} >> ${quoted(cronLog)} 2>&1 ${MARK}`,
  );
}

// The crontab with the project's lines replaced by `lines` and every other line, comments included, kept as it was.
export function mergedCrontab(
  current: string,
  lines: readonly string[],
): string {
  const kept = current
    .split("\n")
    .filter(
      (line) =>
        line.trimStart().startsWith("#") || !line.trimEnd().endsWith(MARK),
    );
  while (kept.length > 0 && kept.at(-1) === "") kept.pop();
  // Cron ignores a last line without its newline.
  return `${[...kept, ...lines].join("\n")}\n`;
}

// A word for sh, in single quotes; cron reads a bare % as a line break, so it is escaped too.
function quoted(word: string): string {
  return `'${word.replaceAll("'", `'\\''`).replaceAll("%", "\\%")}'`;
}
