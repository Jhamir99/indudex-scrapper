import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEPLOY_LOCKS,
  installed,
  opsDirectoryOf,
  pulled,
  type DeployWorld,
} from "./deploy.js";
import { ALL_LOCKS } from "./jobs.js";
import { installSchedule, MARK, type Crontab } from "./schedule.js";

let repo: string;
beforeEach(async () => {
  repo = await mkdtemp(join(tmpdir(), "deploy-"));
  await mkdir(join(repo, "dist", "bin"), { recursive: true });
  await writeFile(join(repo, "dist", "bin", "crawl.js"), "the running code");
});
afterEach(async () => {
  await rm(repo, { recursive: true, force: true });
});

// A stand-in world: each program answers the code given for it (0 by default); the build writes dist.next.
const world = (codes: Record<string, number[]> = {}) => {
  const calls: string[] = [];
  const waits: number[] = [];
  const logged: string[] = [];
  const stand: DeployWorld = {
    repo,
    run(program, args) {
      const name = program === process.execPath ? "node" : program;
      const call = [name, ...args].join(" ");
      calls.push(call);
      const key = Object.keys(codes).find((prefix) => call.startsWith(prefix));
      const code = key ? (codes[key]?.shift() ?? 0) : 0;
      if (code === 0 && call.includes("--outDir dist.next")) {
        spawnSync("mkdir", ["-p", join(repo, "dist.next", "bin")]);
        spawnSync("sh", [
          "-c",
          `echo 'the new code' > '${join(repo, "dist.next", "bin", "crawl.js")}'`,
        ]);
      }
      return code;
    },
    sleep: (milliseconds) => waits.push(milliseconds),
    log: (line) => logged.push(line),
  };
  return { stand, calls, waits, logged };
};
const running = () => readFile(join(repo, "dist", "bin", "crawl.js"), "utf8");

describe("the deploy (FR-12)", () => {
  it("installs, builds into dist.next, puts it in place and writes the crontab", async () => {
    const { stand, calls, logged } = world();
    expect(installed(stand)).toBe(0);
    expect(calls).toEqual([
      "pnpm install --frozen-lockfile",
      "pnpm exec tsc -p tsconfig.build.json --outDir dist.next",
      "node dist/bin/ops.js schedule",
    ]);
    expect(await running()).toBe("the new code\n");
    expect(existsSync(join(repo, "dist.next"))).toBe(false);
    expect(existsSync(join(repo, "dist.old"))).toBe(false);
    expect(logged).toEqual(["deployed"]);
  });

  it("leaves the running code as it was when the build fails", async () => {
    const { stand, calls } = world({ "pnpm exec tsc": [2] });
    expect(installed(stand)).toBe(1);
    expect(await running()).toBe("the running code");
    expect(existsSync(join(repo, "dist.next"))).toBe(false);
    expect(calls.some((call) => call.includes("schedule"))).toBe(false);
  });

  it("goes no further when the packages cannot be installed", async () => {
    const { stand, calls } = world({ "pnpm install": [1] });
    expect(installed(stand)).toBe(1);
    expect(calls).toEqual(["pnpm install --frozen-lockfile"]);
    expect(await running()).toBe("the running code");
  });

  it("pulls a fast-forward, three tries half a minute apart, and stops when none goes", () => {
    const failing = world({ "git pull": [1, 1, 1] });
    expect(pulled(failing.stand)).toBe(false);
    expect(failing.calls).toEqual([
      "git pull --ff-only",
      "git pull --ff-only",
      "git pull --ff-only",
    ]);
    expect(failing.waits).toEqual([30_000, 30_000]);
    expect(failing.logged).toEqual([
      "the code could not be pulled: nothing changed",
    ]);
    const second = world({ "git pull": [1, 0] });
    expect(pulled(second.stand)).toBe(true);
    expect(second.calls).toHaveLength(2);
  });

  it("holds every job's lock, translate and publish before heavy", () => {
    expect(DEPLOY_LOCKS.toSorted()).toEqual([...ALL_LOCKS].toSorted());
    const heavy = DEPLOY_LOCKS.indexOf("heavy");
    expect(DEPLOY_LOCKS.indexOf("translate")).toBeLessThan(heavy);
    expect(DEPLOY_LOCKS.indexOf("publish")).toBeLessThan(heavy);
  });

  it("finds the locks where ops.js does: OPS_DIR, else .env's, else var/", async () => {
    expect(opsDirectoryOf(repo)).toBe(join(repo, "var"));
    await writeFile(join(repo, ".env"), "OPS_DIR=/srv/ops\n");
    expect(opsDirectoryOf(repo)).toBe("/srv/ops");
  });
});

const crontab = (text: string) => {
  const written: string[] = [];
  const tab: Crontab = {
    read: () => text,
    write: (next) => {
      written.push(next);
      text = next;
    },
  };
  return { tab, written };
};

describe("the schedule installed (FR-12)", () => {
  const where = {
    repo: "/srv/indudex-scrapper",
    node: "/usr/bin/node",
    opsDirectory: "/srv/indudex-scrapper/var",
  };

  it("writes the project's lines and keeps the rest", () => {
    const { tab, written } = crontab("30 2 * * * /usr/local/bin/photos\n");
    const lines = installSchedule(where, tab);
    expect(lines).toHaveLength(5);
    expect(written).toHaveLength(1);
    expect(written[0]?.split("\n")[0]).toBe("30 2 * * * /usr/local/bin/photos");
    expect(
      written[0]?.split("\n").filter((line) => line.endsWith(MARK)),
    ).toEqual(lines);
  });

  it("writes nothing when the crontab already holds them", () => {
    const { tab, written } = crontab("");
    installSchedule(where, tab);
    installSchedule(where, tab);
    expect(written).toHaveLength(1);
  });
});
