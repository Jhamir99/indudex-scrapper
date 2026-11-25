import { execFile } from "node:child_process";
import { readFile, statfs } from "node:fs/promises";
import { freemem, uptime } from "node:os";
import { promisify } from "node:util";

const run = promisify(execFile);

// The server's own facts the watch and the summary read, behind a port so their rules are tested with stand-ins.
export interface Machine {
  uptimeSeconds(): number;
  // As df counts it: used over used plus what is left to ordinary users, rounded up.
  diskUsedPercent(path: string): Promise<number>;
  diskFreeGB(path: string): Promise<number>;
  freeMemoryGB(): Promise<number>;
  // smartctl's health report of the root filesystem's disk, or why it could not be read.
  ssdReport(): Promise<string>;
}

export const serverMachine: Machine = {
  uptimeSeconds: () => uptime(),
  async diskUsedPercent(path) {
    const disk = await statfs(path);
    const used = disk.blocks - disk.bfree;
    return Math.ceil((used / (used + disk.bavail)) * 100);
  },
  async diskFreeGB(path) {
    const disk = await statfs(path);
    return (disk.bavail * disk.bsize) / 1024 ** 3;
  },
  async freeMemoryGB() {
    // Linux's own estimate of what can be given to a new process; os.freemem leaves the page cache out.
    try {
      const kilobytes = /^MemAvailable:\s+(\d+)/m.exec(
        await readFile("/proc/meminfo", "utf8"),
      )?.[1];
      if (kilobytes) return Number(kilobytes) / 1024 ** 2;
    } catch {
      // Not Linux.
    }
    return freemem() / 1024 ** 3;
  },
  async ssdReport() {
    try {
      const { stdout: source } = await run("findmnt", [
        "-n",
        "-o",
        "SOURCE",
        "/",
      ]);
      const { stdout: parent } = await run("lsblk", [
        "-no",
        "pkname",
        source.trim(),
      ]);
      const disk = `/dev/${parent.trim()}`;
      // smartctl's exit code is a bit mask of what it found, so its output is read whatever it answers.
      const answer = await run("sudo", [
        "-n",
        "env",
        "LC_ALL=C",
        "smartctl",
        "-H",
        "-A",
        disk,
      ]).catch((error: { stdout?: string; message: string }) => ({
        stdout: error.stdout || error.message,
      }));
      return answer.stdout;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  },
};
