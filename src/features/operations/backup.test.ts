import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  backup,
  commandRunner,
  tarArguments,
  type BackupRun,
  type Runner,
} from "./backup.js";

let directory: string, state: string, store: string, work: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "backup-"));
  state = join(directory, "state");
  store = join(directory, "store");
  work = join(directory, "work");
  for (const folder of [
    join(state, "mt", "models"),
    join(store, "adverts"),
    join(store, "state"),
    join(store, "memory"),
    join(store, "rates"),
    work,
  ])
    await mkdir(folder, { recursive: true });
  await writeFile(join(state, "companies.json"), "{}");
  await writeFile(join(state, "titles-es.json"), "{}");
  await writeFile(join(state, "titles-es.json.tmp"), "half");
  await writeFile(join(state, "mt", "models", "model.bin"), "big");
  await writeFile(join(store, "adverts", "brz.json"), "{}");
  await writeFile(join(store, "state", "brz.json"), "{}");
  await writeFile(join(store, "memory", "hzz.json"), "{}");
  await writeFile(join(store, "rates", "ecb.xml"), "<x/>");
  await writeFile(join(store, "STOP"), "");
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

// A stand-in for tar (writes an archive of the size asked) and gh (a release holding the assets given).
const standIn = (options: {
  size?: number;
  assets?: { name: string; size: number }[] | null;
  sentSize?: number;
}) => {
  const calls: string[][] = [];
  let assets = options.assets === undefined ? [] : options.assets;
  const run: Runner = async (program, args) => {
    calls.push([program, ...args]);
    if (program === "tar") {
      await writeFile(args[1]!, Buffer.alloc(options.size ?? 1000));
      return { code: 0, stdout: "", stderr: "" };
    }
    if (args[0] === "release" && args[1] === "view") {
      if (!assets) return { code: 1, stdout: "", stderr: "release not found" };
      return { code: 0, stdout: JSON.stringify({ assets }), stderr: "" };
    }
    if (args[0] === "release" && args[1] === "create") {
      assets = [];
      return { code: 0, stdout: "", stderr: "" };
    }
    if (args[0] === "release" && args[1] === "upload") {
      const name = args[3]!.split("/").at(-1)!;
      assets = [
        ...(assets ?? []).filter((asset) => asset.name !== name),
        { name, size: options.sentSize ?? statSync(args[3]!).size },
      ];
      return { code: 0, stdout: "", stderr: "" };
    }
    return { code: 9, stdout: "", stderr: "unexpected" };
  };
  return { calls, run };
};
const wednesday = new Date(2026, 10, 25, 0, 0);
const run = (overrides: Partial<BackupRun>): BackupRun => ({
  repo: "op/indudex-backups",
  stateDirectory: state,
  mtDirectory: join(state, "mt"),
  storeDirectory: store,
  workDirectory: work,
  now: () => wednesday,
  log: () => {},
  ...overrides,
});

describe("the nightly copy (FR-11)", () => {
  it("packs, then sends the weekday's archive to the release and checks its size", async () => {
    const { calls, run: runner } = standIn({
      assets: [{ name: "state-tue.tar.gz", size: 1500 }],
    });
    const lines: string[] = [];
    expect(
      await backup(run({ run: runner, log: (line) => lines.push(line) })),
    ).toEqual({ name: "state-wed.tar.gz", size: 1000 });
    expect(calls.map((call) => call.slice(0, 3).join(" "))).toEqual([
      `tar -czf ${join(work, "state-wed.tar.gz")}`,
      "gh release view",
      "gh release upload",
      "gh release view",
    ]);
    expect(calls[2]).toEqual([
      "gh",
      "release",
      "upload",
      "server-backup",
      join(work, "state-wed.tar.gz"),
      "--clobber",
      "-R",
      "op/indudex-backups",
    ]);
    expect(lines).toEqual(["state-wed.tar.gz: 1000 bytes on GitHub"]);
    expect(existsSync(join(work, "state-wed.tar.gz"))).toBe(false);
  });

  it("creates the release the first time", async () => {
    const { calls, run: runner } = standIn({ assets: null });
    await backup(run({ run: runner }));
    expect(calls.map((call) => call.slice(0, 3).join(" "))).toEqual([
      `tar -czf ${join(work, "state-wed.tar.gz")}`,
      "gh release view",
      "gh release create",
      "gh release upload",
      "gh release view",
    ]);
    expect(calls[2]).toContain("--prerelease");
  });

  it("does not send an archive under half the largest one there", async () => {
    const { calls, run: runner } = standIn({
      size: 400,
      assets: [{ name: "state-mon.tar.gz", size: 1000 }],
    });
    await expect(backup(run({ run: runner }))).rejects.toThrow(
      "state-wed.tar.gz of 400 bytes is under half of the largest copy (1000): not sent",
    );
    expect(calls.some((call) => call[2] === "upload")).toBe(false);
  });

  it("fails when the size sent is not the archive's", async () => {
    const { run: runner } = standIn({ sentSize: 10 });
    await expect(backup(run({ run: runner }))).rejects.toThrow(
      "state-wed.tar.gz: sent 10 bytes of 1000",
    );
  });

  it("fails with no repository, and when tar fails, but not on a file that changed while read", async () => {
    await expect(backup(run({ repo: " " }))).rejects.toThrow("no BACKUP_REPO");
    const changed = standIn({});
    const tarSaysChanged: Runner = async (program, args) => {
      const answer = await changed.run(program, args);
      return program === "tar" ? { ...answer, code: 1 } : answer;
    };
    await expect(backup(run({ run: tarSaysChanged }))).resolves.toBeDefined();
    const broken: Runner = async (program, args) =>
      program === "tar"
        ? { code: 2, stdout: "", stderr: "tar: no space left" }
        : changed.run(program, args);
    await expect(backup(run({ run: broken }))).rejects.toThrow(
      "tar failed (2): tar: no space left",
    );
  });
});

describe("what the copy holds", () => {
  it("names the state and the store's parts from their parents, the models left out", () => {
    expect(
      tarArguments({
        stateDirectory: state,
        mtDirectory: join(state, "mt"),
        storeDirectory: store,
      }),
    ).toEqual([
      "--exclude=*.tmp",
      "--exclude=*.lock",
      "--exclude=state/mt",
      "-C",
      directory,
      "state",
      "-C",
      directory,
      "store/state",
      "store/memory",
      "store/rates",
    ]);
  });

  it("packs for real what only the server holds, and nothing else", async () => {
    const { run: gh } = standIn({});
    const realTar: Runner = (program, args) =>
      program === "tar" ? commandRunner(program, args) : gh(program, args);
    let entries: string[] = [];
    const keep: Runner = async (program, args) => {
      const answer = await realTar(program, args);
      if (program === "tar")
        entries = execFileSync("tar", ["-tzf", args[1]!], { encoding: "utf8" })
          .split("\n")
          .filter((entry) => entry && !entry.endsWith("/"))
          .map((entry) => entry.replace(/^\.\//, ""))
          .toSorted();
      return answer;
    };
    const { size } = await backup(run({ run: keep }));
    expect(size).toBeGreaterThan(0);
    expect(entries).toEqual([
      "state/companies.json",
      "state/titles-es.json",
      "store/memory/hzz.json",
      "store/rates/ecb.xml",
      "store/state/brz.json",
    ]);
  });
});
