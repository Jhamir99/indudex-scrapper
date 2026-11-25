import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { afterJob, lastLines } from "./alerts.js";
import { jobNamed } from "./jobs.js";
import type { Notice, Notifier } from "./ntfy.js";
import type { Outcome } from "./run-job.js";
import { Told } from "./told.js";

let directory: string;
let told: Told;
let notices: Notice[];
const notifier: Notifier = {
  notify: async (notice) => {
    notices.push(notice);
  },
};
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "alerts-"));
  told = new Told(join(directory, "told"));
  notices = [];
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

const logPath = () => join(directory, "publish.log");
const at = new Date(2026, 10, 25, 15, 4);
const after = (outcome: Outcome) =>
  afterJob({
    job: jobNamed("publish")!,
    outcome,
    told,
    notifier,
    logPath: logPath(),
    now: () => at,
  });

describe("after a job (FR-6)", () => {
  it("tells a failure once with its log's last lines, then that it works again", async () => {
    await writeFile(
      logPath(),
      [
        "[15:00:01] reading the store",
        "Error: the pile fell by a third: waits a day",
        "    at runPublication (file:///srv/dist/features/publication/index.js:120:11)",
        "    at async file:///srv/dist/bin/process.js:40:18",
        " 1: 0x10a2b3c node::Abort()",
        "Node.js v26.13.0",
        "[2026-11-25T14:04:00.000Z] publish: failed in 48 s (exit 1)",
        "",
      ].join("\n"),
    );
    await after("failed");
    await after("failed");
    expect(notices).toEqual([
      {
        title: "Indudex: ha fallado la publicación",
        message: [
          "[15:00:01] reading the store",
          "Error: the pile fell by a third: waits a day",
          "[2026-11-25T14:04:00.000Z] publish: failed in 48 s (exit 1)",
        ].join("\n"),
      },
    ]);
    await after("good");
    await after("good");
    expect(notices.slice(1)).toEqual([
      {
        title: "Indudex: la publicación vuelve a ir bien",
        message: "Ha terminado bien a las 15:04.",
        kind: "ok",
      },
    ]);
    expect(await told.names()).toEqual(["ok-publish"]);
  });

  it("says where to look when the log tells nothing", async () => {
    await after("failed");
    expect(notices[0]?.message).toBe(`Sin detalle en ${logPath()}.`);
  });

  it("tells nothing for a run skipped or stopped, and keeps a failure told", async () => {
    await after("skipped");
    await after("stopped");
    expect(notices).toEqual([]);
    await after("failed");
    await after("skipped");
    await after("stopped");
    expect(notices).toHaveLength(1);
    expect(await told.names()).toEqual(["failed-publish"]);
  });

  it("tells a late job's end too, and sets the last good end", async () => {
    await told.set("late-publish");
    await after("good");
    expect(notices.map((notice) => notice.kind)).toEqual(["ok"]);
    expect((await told.since("ok-publish"))?.getTime()).toBe(at.getTime());
  });
});

describe("the log's last lines", () => {
  it("keeps five, each cut to 200 characters, and reads only the end of a long log", async () => {
    const long = "x".repeat(300);
    await writeFile(
      logPath(),
      `${"filler line\n".repeat(20_000)}one\ntwo\nthree\nfour\n${long}\n`,
    );
    expect((await lastLines(logPath())).split("\n")).toEqual([
      "one",
      "two",
      "three",
      "four",
      "x".repeat(200),
    ]);
  });

  it("is empty for a log that is not there", async () => {
    expect(await lastLines(join(directory, "none.log"))).toBe("");
  });
});
