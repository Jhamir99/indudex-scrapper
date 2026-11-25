// The operator's deploy (012 FR-12), run by `sh ops/deploy.sh`. It imports nothing of this repo, only Node's own
// modules, so Node runs it from src/ as it is (stripping its types): it replaces the compiled code it would otherwise
// run from.
//   1. Takes every job's lock, waiting, so no run starts or goes on with half the code.
//   2. Pulls a fast-forward (three tries, half a minute apart: the home line's DNS sometimes drops a lookup), then
//      starts again from the pulled copy of this file, so a change to the deploy itself takes effect at once.
//   3. Installs the exact dependencies, builds into dist.next and only then puts it in place of dist/: a failed build
//      leaves the running code as it was.
//   4. Writes the schedule's lines into the crontab (`ops.js schedule`), every other line kept.
// It never touches the store, the state or the published dataset.
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseEnv } from "node:util";

// The jobs' locks (jobs.ts's ALL_LOCKS, a test keeps them the same), in the order the jobs take them: `translate` and
// `publish` before `heavy`, so the deploy never holds one a job waits on while it waits on that job's.
export const DEPLOY_LOCKS = [
  "crawl",
  "translate",
  "publish",
  "heavy",
  "backup",
  "watch",
];

export interface DeployWorld {
  readonly repo: string;
  // Runs a program in the repo, its output to the terminal; answers its exit code.
  run(program: string, args: readonly string[]): number;
  sleep(milliseconds: number): void;
  log(line: string): void;
}

export function pulled(world: DeployWorld): boolean {
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (world.run("git", ["pull", "--ff-only"]) === 0) return true;
    if (attempt < 3) world.sleep(30_000);
  }
  world.log("the code could not be pulled: nothing changed");
  return false;
}

// Steps 3 and 4. Answers the exit code.
export function installed(world: DeployWorld): number {
  const dist = join(world.repo, "dist"),
    next = join(world.repo, "dist.next"),
    old = join(world.repo, "dist.old");
  if (world.run("pnpm", ["install", "--frozen-lockfile"]) !== 0) {
    world.log("the packages could not be installed: the running code stays");
    return 1;
  }
  rmSync(next, { recursive: true, force: true });
  if (
    world.run("pnpm", [
      "exec",
      "tsc",
      "-p",
      "tsconfig.build.json",
      "--outDir",
      "dist.next",
    ]) !== 0
  ) {
    rmSync(next, { recursive: true, force: true });
    world.log("the build failed: the running code stays");
    return 1;
  }
  rmSync(old, { recursive: true, force: true });
  if (existsSync(dist)) renameSync(dist, old);
  renameSync(next, dist);
  rmSync(old, { recursive: true, force: true });
  if (world.run(process.execPath, ["dist/bin/ops.js", "schedule"]) !== 0) {
    world.log("the crontab could not be written");
    return 1;
  }
  world.log("deployed");
  return 0;
}

// The operations folder as ops.js finds it: OPS_DIR from the environment, else from .env, else var/.
export function opsDirectoryOf(repo: string): string {
  const envFile = join(repo, ".env");
  const fromFile = existsSync(envFile)
    ? parseEnv(readFileSync(envFile, "utf8"))
    : {};
  const configured = (process.env["OPS_DIR"] ?? fromFile["OPS_DIR"])?.trim();
  return configured ? resolve(repo, configured) : join(repo, "var");
}

function main(argv: readonly string[]): number {
  const self = fileURLToPath(import.meta.url);
  const repo = resolve(self, "../../../..");
  const world: DeployWorld = {
    repo,
    run: (program, args) =>
      spawnSync(program, args, { cwd: repo, stdio: "inherit" }).status ?? 1,
    sleep: (milliseconds) =>
      Atomics.wait(
        new Int32Array(new SharedArrayBuffer(4)),
        0,
        0,
        milliseconds,
      ),
    log: (line) => console.log(`[${new Date().toISOString()}] deploy: ${line}`),
  };
  if (!argv.includes("--locked")) {
    const locks = join(opsDirectoryOf(repo), "locks");
    mkdirSync(locks, { recursive: true });
    world.log("waiting for every job's lock");
    return world.run("flock", [
      ...DEPLOY_LOCKS.flatMap((lock) => [
        join(locks, `${lock}.lock`),
        "flock",
      ]).slice(0, -1),
      process.execPath,
      self,
      "--locked",
    ]);
  }
  if (!argv.includes("--pulled")) {
    if (!pulled(world)) return 1;
    return world.run(process.execPath, [self, "--locked", "--pulled"]);
  }
  return installed(world);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  process.exitCode = main(process.argv.slice(2));
