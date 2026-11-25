import { describe, expect, it } from "vitest";
import { ALL_LOCKS, JOBS, jobNamed, opsDirectory } from "./jobs.js";
import { MARK, mergedCrontab, scheduleLines } from "./schedule.js";

const where = {
  repo: "/home/op/indudex Project/indudex-scrapper",
  node: "/home/op/.nvm/versions/node/v26.13.0/bin/node",
  opsDirectory: "/home/op/indudex Project/indudex-scrapper/var",
};

describe("the job table", () => {
  it("has the five jobs at their times (FR-1)", () => {
    expect(JOBS.map((job) => [job.name, job.schedule])).toEqual([
      ["crawl", "0 * * * *"],
      ["translate", "10 * * * *"],
      ["publish", "0 */3 * * *"],
      ["backup", "0 0 * * *"],
      ["watch", "*/15 * * * *"],
    ]);
  });

  it("starts the translator interpreted, at low priority, ended before the next hour", () => {
    const translate = jobNamed("translate");
    expect(translate?.node.slice(0, 2)).toEqual([
      "--regexp-interpret-all",
      "dist/bin/translate.js",
    ]);
    expect(translate?.nice).toBe(10);
    expect((translate?.timeLimitMinutes ?? 60) + 10).toBeLessThan(60);
  });

  it("shares heavy between the translator and the publication, which waits for it (FR-3)", () => {
    expect(jobNamed("translate")?.locks).toEqual([
      { lock: "translate" },
      { lock: "heavy" },
    ]);
    expect(jobNamed("publish")?.locks).toEqual([
      { lock: "publish" },
      { lock: "heavy", waitSeconds: 900 },
    ]);
    expect(ALL_LOCKS).toEqual([
      "crawl",
      "translate",
      "heavy",
      "publish",
      "backup",
      "watch",
    ]);
  });

  it("lets only the watch and the backup run while STOP is in place (FR-4)", () => {
    expect(JOBS.filter((job) => !job.stops).map((job) => job.name)).toEqual([
      "backup",
      "watch",
    ]);
  });

  it("finds the operations folder in OPS_DIR, else var/ at the repo root", () => {
    expect(opsDirectory({ OPS_DIR: "/srv/ops" })).toBe("/srv/ops");
    expect(opsDirectory({})).toMatch(/\/var$/);
  });
});

describe("the schedule's lines", () => {
  it("runs each job from the repo through ops.js, with absolute paths quoted", () => {
    const lines = scheduleLines(where);
    expect(lines).toHaveLength(5);
    expect(lines[0]).toBe(
      "0 * * * * cd '/home/op/indudex Project/indudex-scrapper' && " +
        "PATH='/home/op/.nvm/versions/node/v26.13.0/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin' " +
        "'/home/op/.nvm/versions/node/v26.13.0/bin/node' dist/bin/ops.js job crawl " +
        ">> '/home/op/indudex Project/indudex-scrapper/var/logs/cron.log' 2>&1 # indudex-scrapper",
    );
    for (const [index, job] of JOBS.entries()) {
      expect(lines[index]).toMatch(
        new RegExp(
          `^\\S+ \\S+ \\S+ \\S+ \\S+ .* job ${job.name} >> .* ${MARK}$`,
        ),
      );
      expect(lines[index]?.startsWith(`${job.schedule} `)).toBe(true);
    }
  });

  it("escapes quotes and cron's percent sign", () => {
    const [line] = scheduleLines({ ...where, repo: "/srv/it's 100%" });
    expect(line).toContain(`cd '/srv/it'\\''s 100\\%'`);
  });
});

describe("the crontab merged", () => {
  const lines = scheduleLines(where);

  it("adds the project's lines to an empty crontab", () => {
    expect(mergedCrontab("", lines)).toBe(`${lines.join("\n")}\n`);
  });

  it("replaces the project's old lines and keeps every other, comments included", () => {
    const current = [
      "# backups of the photos; see indudex-scrapper # indudex-scrapper",
      "MAILTO=op@example.org",
      "30 2 * * * /usr/local/bin/photos-backup",
      "0 * * * * cd /old && node dist/bin/ops.js job crawl # indudex-scrapper",
      "5 * * * * cd /old && node dist/bin/ops.js job gone # indudex-scrapper  ",
      "",
    ].join("\n");
    expect(mergedCrontab(current, lines)).toBe(
      [
        "# backups of the photos; see indudex-scrapper # indudex-scrapper",
        "MAILTO=op@example.org",
        "30 2 * * * /usr/local/bin/photos-backup",
        ...lines,
        "",
      ].join("\n"),
    );
  });

  it("changes nothing when run again", () => {
    const once = mergedCrontab("30 2 * * * other\n", lines);
    expect(mergedCrontab(once, lines)).toBe(once);
  });
});
