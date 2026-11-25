import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { rm, stat } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";

// A command's answer: its exit code and output. Rejects only when the program cannot start.
export type Runner = (
  program: string,
  args: readonly string[],
) => Promise<{ code: number; stdout: string; stderr: string }>;

export const commandRunner: Runner = (program, args) =>
  new Promise((done, fail) => {
    execFile(
      program,
      args,
      { maxBuffer: 16 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error && typeof error.code !== "number") fail(error);
        else
          done({
            code: typeof error?.code === "number" ? error.code : 0,
            stdout,
            stderr,
          });
      },
    );
  });

export interface BackupRun {
  // The private repository whose release holds the archives (BACKUP_REPO in .env).
  readonly repo: string | undefined;
  // The processor's state folder, and the engine's folder (left out: fetched again with `pnpm translate:fetch`).
  readonly stateDirectory: string;
  readonly mtDirectory: string;
  readonly storeDirectory: string;
  // Where the archive is made before it is sent.
  readonly workDirectory: string;
  readonly now?: () => Date;
  readonly run?: Runner;
  readonly log?: (line: string) => void;
}

export class BackupError extends Error {}

export const RELEASE = "server-backup";
// What the store holds that the crawl cannot fill again by itself: each source's state and memory, the registers'
// companies and the ECB's rates. Not the adverts (the crawl fills them again in a day or two).
export const STORE_PARTS = ["state", "memory", "registers", "rates"];
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// The nightly copy (FR-11), as the legacy's ops/server-backup.sh: what only the server holds, one archive per
// weekday attached to the release `server-backup` of a private repository, each replaced a week later, so a dead
// disk costs a day at most. An archive under half the size of the largest one there is not sent: an emptied state
// must not replace a good copy.
export async function backup(
  backupRun: BackupRun,
): Promise<{ name: string; size: number }> {
  const now = backupRun.now ?? (() => new Date());
  const run = backupRun.run ?? commandRunner;
  const log = backupRun.log ?? ((line: string) => console.log(line));
  const repo = backupRun.repo?.trim();
  if (!repo) throw new BackupError("no BACKUP_REPO in .env: nothing sent");

  const name = `state-${WEEKDAYS[now().getDay()]}.tar.gz`;
  const archive = join(backupRun.workDirectory, name);
  try {
    await run("tar", ["-czf", archive, ...tarArguments(backupRun)]).then(
      ({ code, stderr }) => {
        // GNU tar answers 1 when a file changed while it was read (the crawl writes as it goes): the copy is good.
        if (code !== 0 && code !== 1)
          throw new BackupError(`tar failed (${code}): ${stderr.trim()}`);
      },
    );
    const size = (await stat(archive)).size;

    const gh = async (...args: string[]) => {
      const answer = await run("gh", [...args, "-R", repo]);
      if (answer.code !== 0)
        throw new BackupError(
          `gh ${args[0]} ${args[1]} failed (${answer.code}): ${answer.stderr.trim()}`,
        );
      return answer.stdout;
    };
    const assets = async () => {
      const answer = await run("gh", [
        "release",
        "view",
        RELEASE,
        "-R",
        repo,
        "--json",
        "assets",
      ]);
      if (answer.code !== 0) return null;
      return (
        JSON.parse(answer.stdout) as {
          assets: { name: string; size: number }[];
        }
      ).assets;
    };

    let there = await assets();
    if (!there) {
      await gh(
        "release",
        "create",
        RELEASE,
        "--prerelease",
        "--title",
        "Server backup",
        "--notes",
        "Nightly copy of what only the server holds (indudex-scrapper, features/012-operations). Restore: see ops/README.md.",
      );
      there = [];
    }
    const largest = Math.max(0, ...there.map((asset) => asset.size));
    if (size < largest / 2)
      throw new BackupError(
        `${name} of ${size} bytes is under half of the largest copy (${largest}): not sent`,
      );
    await gh("release", "upload", RELEASE, archive, "--clobber");
    const sent = (await assets())?.find((asset) => asset.name === name)?.size;
    if (sent !== size)
      throw new BackupError(`${name}: sent ${sent ?? 0} bytes of ${size}`);
    log(`${name}: ${size} bytes on GitHub`);
    return { name, size };
  } finally {
    await rm(archive, { force: true });
  }
}

// tar's arguments after the archive: the exclusions first (GNU tar ignores those after the paths), then each folder
// from its parent, so the archive holds `state/...` and `store/state/...` as they sit on disk.
export function tarArguments(
  where: Pick<BackupRun, "stateDirectory" | "mtDirectory" | "storeDirectory">,
): string[] {
  const state = where.stateDirectory,
    store = where.storeDirectory;
  const exclusions = ["--exclude=*.tmp", "--exclude=*.lock"];
  const mtInState = relative(state, where.mtDirectory);
  if (mtInState && !mtInState.startsWith("..") && !mtInState.startsWith("/"))
    exclusions.push(`--exclude=${join(basename(state), mtInState)}`);
  const paths: string[] = [];
  if (existsSync(state)) paths.push("-C", dirname(state), basename(state));
  const storeParts = STORE_PARTS.filter((part) =>
    existsSync(join(store, part)),
  );
  if (storeParts.length)
    paths.push(
      "-C",
      dirname(store),
      ...storeParts.map((part) => join(basename(store), part)),
    );
  if (!paths.length)
    throw new BackupError(
      `nothing to copy: neither ${state} nor ${store}'s parts are there`,
    );
  return [...exclusions, ...paths];
}
