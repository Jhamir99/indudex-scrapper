import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Job } from "./jobs.js";
import { jobNamed } from "./jobs.js";
import { lockedCommand } from "./locks.js";
import { runJob, type JobRun } from "./run-job.js";

const job = (overrides: Partial<Job> = {}): Job => ({
  name: "crawl",
  schedule: "0 * * * *",
  spoken: "el rastreo",
  node: ["-e", ""],
  locks: [{ lock: "crawl" }],
  stops: true,
  ...overrides,
});

let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "run-job-"));
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

const run = (overrides: Partial<JobRun>): JobRun => ({
  job: job(),
  command: ["sh", "-c", "exit 0"],
  directory,
  logPath: join(directory, "logs", "crawl.log"),
  environment: process.env,
  stopSwitch: { isActive: async () => false },
  ...overrides,
});
const log = () => readFile(join(directory, "logs", "crawl.log"), "utf8");

describe("each job's command", () => {
  it("takes its locks with flock, then nice, then Node", () => {
    const where = { locksDirectory: "/ops/locks", node: "/usr/bin/node" };
    expect(lockedCommand(jobNamed("crawl")!, where)).toEqual([
      "flock",
      "-n",
      "-E",
      "75",
      "/ops/locks/crawl.lock",
      "/usr/bin/node",
      "--max-old-space-size=3072",
      "dist/bin/crawl.js",
    ]);
    expect(lockedCommand(jobNamed("translate")!, where)).toEqual([
      "flock",
      "-n",
      "-E",
      "75",
      "/ops/locks/translate.lock",
      "flock",
      "-n",
      "-E",
      "75",
      "/ops/locks/heavy.lock",
      "nice",
      "-n",
      "10",
      "/usr/bin/node",
      "--regexp-interpret-all",
      "dist/bin/translate.js",
      "--minutes",
      "40",
      "--workers",
      "3",
    ]);
    expect(lockedCommand(jobNamed("publish")!, where).slice(0, 10)).toEqual([
      "flock",
      "-n",
      "-E",
      "75",
      "/ops/locks/publish.lock",
      "flock",
      "-w",
      "900",
      "-E",
      "75",
    ]);
  });
});

describe("a job's run", () => {
  it("is good when its command ends well, its output and outcome in its log (FR-5)", async () => {
    const result = await runJob(
      run({ command: ["sh", "-c", "echo reading the sources"] }),
    );
    expect(result).toMatchObject({ outcome: "good", code: 0, timedOut: false });
    expect(await log()).toMatch(
      /^reading the sources\n\[\S+Z\] crawl: good in \d+ s \(exit 0\)\n$/,
    );
  });

  it("is skipped when its lock is held: exit 75 (FR-2)", async () => {
    const result = await runJob(run({ command: ["sh", "-c", "exit 75"] }));
    expect(result.outcome).toBe("skipped");
    expect(await log()).toContain("crawl: skipped in");
  });

  it("failed on any other exit, or when its program cannot start", async () => {
    expect(
      (await runJob(run({ command: ["sh", "-c", "exit 3"] }))).outcome,
    ).toBe("failed");
    const missing = await runJob(
      run({ command: [join(directory, "no-such-program")] }),
    );
    expect(missing).toMatchObject({ outcome: "failed", code: null });
    expect(await log()).toContain("could not start");
  });

  it("is stopped without starting while STOP is in place (FR-4)", async () => {
    const marker = join(directory, "ran");
    const result = await runJob(
      run({
        command: ["touch", marker],
        stopSwitch: { isActive: async () => true },
      }),
    );
    expect(result.outcome).toBe("stopped");
    expect(existsSync(marker)).toBe(false);
    expect(await log()).toMatch(/crawl: stopped \(STOP is in place\)\n$/);
  });

  it("runs the watch and the backup whatever STOP says", async () => {
    const marker = join(directory, "ran");
    const result = await runJob(
      run({
        job: job({ name: "watch", stops: false }),
        command: ["touch", marker],
        stopSwitch: { isActive: async () => true },
      }),
    );
    expect(result.outcome).toBe("good");
    expect(existsSync(marker)).toBe(true);
  });

  it("ends the command and what it started past its time limit, as failed (FR-5)", async () => {
    const started = Date.now();
    const result = await runJob(
      run({
        command: ["sh", "-c", "sleep 30 & sleep 30; wait"],
        timeLimitMs: 300,
        killGraceMs: 300,
      }),
    );
    expect(result).toMatchObject({ outcome: "failed", timedOut: true });
    expect(Date.now() - started).toBeLessThan(5_000);
    expect(await log()).toContain("crawl: failed in");
  });

  it("passes its environment to the command", async () => {
    await runJob(
      run({
        command: ["sh", "-c", 'echo "store at $STORE_DIR"'],
        environment: { ...process.env, STORE_DIR: "/srv/store" },
      }),
    );
    expect(await log()).toContain("store at /srv/store");
  });
});

// util-linux's flock is on the server and CI's Ubuntu, not on the Mac.
const hasFlock = spawnSync("flock", ["--version"]).status === 0;

const holding = async (lock: string, seconds: number) => {
  const holder = spawn("flock", [lock, "sleep", String(seconds)]);
  for (let tries = 0; tries < 50; tries++) {
    if (spawnSync("flock", ["-n", lock, "true"]).status !== 0) return holder;
    await new Promise((wake) => setTimeout(wake, 20));
  }
  throw new Error("the lock was never taken");
};

describe.skipIf(!hasFlock)("with the real flock", () => {
  it("skips a run whose lock is held (FR-2)", async () => {
    const locksDirectory = join(directory, "locks");
    await runJob(run({ command: ["mkdir", "-p", locksDirectory] }));
    const holder = await holding(join(locksDirectory, "crawl.lock"), 3);
    const result = await runJob(
      run({
        command: lockedCommand(job(), {
          locksDirectory,
          node: process.execPath,
        }),
      }),
    );
    holder.kill();
    expect(result.outcome).toBe("skipped");
  });

  it("lets a run that waits for a lock go once it is free (FR-3)", async () => {
    const locksDirectory = join(directory, "locks");
    await runJob(run({ command: ["mkdir", "-p", locksDirectory] }));
    const holder = await holding(join(locksDirectory, "heavy.lock"), 1);
    const waiting = job({
      name: "publish",
      locks: [{ lock: "publish" }, { lock: "heavy", waitSeconds: 10 }],
    });
    const result = await runJob(
      run({
        job: waiting,
        command: lockedCommand(waiting, {
          locksDirectory,
          node: process.execPath,
        }),
      }),
    );
    holder.kill();
    expect(result.outcome).toBe("good");
    expect(result.seconds).toBeGreaterThanOrEqual(0);
  });

  it("skips the translator while a publication holds heavy (FR-3)", async () => {
    const locksDirectory = join(directory, "locks");
    await runJob(run({ command: ["mkdir", "-p", locksDirectory] }));
    const holder = await holding(join(locksDirectory, "heavy.lock"), 3);
    const translator = job({
      name: "translate",
      locks: [{ lock: "translate" }, { lock: "heavy" }],
    });
    const result = await runJob(
      run({
        job: translator,
        command: lockedCommand(translator, {
          locksDirectory,
          node: process.execPath,
        }),
      }),
    );
    holder.kill();
    expect(result.outcome).toBe("skipped");
  });
});
