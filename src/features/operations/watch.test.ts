import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Machine } from "./machine.js";
import type { Notice, Notifier } from "./ntfy.js";
import { Told } from "./told.js";
import { watch } from "./watch.js";

let directory: string, ops: string, store: string;
let told: Told;
let notices: Notice[];
let clock: Date;
let machine: Machine & { used: number; uptime: number; report: string };
const notifier: Notifier = {
  notify: async (notice) => {
    notices.push(notice);
  },
};
const HOUR = 3_600_000;
const later = (hours: number) => {
  clock = new Date(clock.getTime() + hours * HOUR);
};
const healthy = [
  "SMART overall-health self-assessment test result: PASSED",
  "Critical Warning:                   0x00",
  "Available Spare:                    100%",
  "Percentage Used:                    3%",
].join("\n");

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "watch-"));
  ops = join(directory, "var");
  store = join(directory, "store");
  await mkdir(join(ops, "logs"), { recursive: true });
  await mkdir(store, { recursive: true });
  told = new Told(join(ops, "told"));
  notices = [];
  clock = new Date(2026, 10, 25, 12, 0);
  machine = {
    used: 50,
    uptime: 10 * 3600,
    report: healthy,
    uptimeSeconds: () => machine.uptime,
    diskUsedPercent: async () => machine.used,
    diskFreeGB: async () => 123.45,
    freeMemoryGB: async () => 4,
    ssdReport: async () => machine.report,
  };
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

const watched = () =>
  watch({
    opsDirectory: ops,
    storeDirectory: store,
    told,
    notifier,
    machine,
    now: () => clock,
  });
const titles = () => notices.map((notice) => notice.title);
const touched = async (path: string, at: Date) => {
  await writeFile(path, "", { flag: "a" });
  await utimes(path, at, at);
};

describe("the watch: STOP (FR-8)", () => {
  it("is told when it appears, again each day it stays, and when it goes", async () => {
    await touched(join(store, "STOP"), new Date(2026, 10, 25, 11, 30));
    await watched();
    later(23);
    await watched();
    later(1);
    await watched();
    expect(notices.map((n) => n.title)).toEqual([
      "Indudex está parado",
      "Indudex está parado",
    ]);
    expect(notices[0]?.message).toBe(
      "STOP sigue puesto desde las 11:30 del 25/11: no se rastrea, publica ni traduce.",
    );
    await rm(join(store, "STOP"));
    later(5);
    await watched();
    expect(notices.at(-1)).toEqual({
      title: "Indudex vuelve a funcionar",
      message: "Se ha quitado STOP.",
      kind: "ok",
    });
  });

  it("does not tell the jobs late for the time it stood", async () => {
    await watched();
    await touched(join(store, "STOP"), clock);
    later(30);
    await watched();
    await rm(join(store, "STOP"));
    await watched();
    later(1);
    await watched();
    expect(titles()).toEqual([
      "Indudex está parado",
      "Indudex vuelve a funcionar",
    ]);
  });
});

describe("the watch: late jobs (FR-8)", () => {
  it("tells a job with no good run in its hours and its log still for two, once, and its end", async () => {
    await watched();
    expect(notices).toEqual([]);
    later(3.5);
    await watched();
    await watched();
    expect(titles().filter((title) => title.includes("rastreo"))).toEqual([
      "Indudex: el rastreo no termina bien desde las 12:00 del 25/11",
    ]);
    expect(notices[0]?.message).toBe(
      "Ninguna pasada ha terminado bien en 3 horas, y su registro lleva dos sin moverse: puede que una se haya quedado colgada.",
    );
    await told.set("ok-crawl", clock);
    await watched();
    expect(notices.at(-1)).toEqual({
      title: "Indudex: el rastreo vuelve a ir bien",
      message: "Ha vuelto a terminar bien.",
      kind: "ok",
    });
  });

  it("leaves a long run that is still writing alone, and keeps telling once it was told", async () => {
    await watched();
    later(4);
    await touched(
      join(ops, "logs", "crawl.log"),
      new Date(clock.getTime() - HOUR),
    );
    await watched();
    expect(titles().some((title) => title.includes("rastreo"))).toBe(false);
    later(2);
    await watched();
    expect(titles().filter((title) => title.includes("rastreo"))).toHaveLength(
      1,
    );
    await touched(join(ops, "logs", "crawl.log"), clock);
    await watched();
    expect(titles().filter((title) => title.includes("rastreo"))).toHaveLength(
      1,
    );
  });

  it("judges each job by its own hours", async () => {
    await watched();
    later(6);
    await watched();
    expect(titles().map((title) => title.split(" no termina")[0])).toEqual([
      "Indudex: el rastreo",
      "Indudex: la traducción",
    ]);
    later(2);
    await watched();
    expect(titles()).toHaveLength(3);
    expect(titles()[2]).toContain("la publicación");
  });

  it("does not judge a job already told as failed, nor the first hour after a boot", async () => {
    await watched();
    await told.set("failed-crawl");
    machine.uptime = 1800;
    later(10);
    await watched();
    expect(notices).toEqual([]);
    machine.uptime = 4000;
    await watched();
    expect(titles().some((title) => title.includes("rastreo"))).toBe(false);
    expect(titles().some((title) => title.includes("traducción"))).toBe(true);
  });
});

describe("the watch: logs, disk and SSD (FR-8)", () => {
  it("keeps the last 5 MB of a log past 20 MB, in the same file", async () => {
    const path = join(ops, "logs", "crawl.log");
    const small = join(ops, "logs", "publish.log");
    await writeFile(path, Buffer.alloc(21 * 1024 * 1024, "a"));
    await writeFile(path, "the end\n", { flag: "a" });
    await writeFile(small, "short\n");
    const inode = (await stat(path)).ino;
    await watched();
    const kept = await readFile(path, "utf8");
    expect(kept.length).toBe(5 * 1024 * 1024);
    expect(kept.endsWith("the end\n")).toBe(true);
    expect((await stat(path)).ino).toBe(inode);
    expect(await readFile(small, "utf8")).toBe("short\n");
  });

  it("tells the disk at 90 % and its end under 85 %", async () => {
    machine.used = 89;
    await watched();
    machine.used = 90;
    await watched();
    machine.used = 87;
    await watched();
    machine.used = 84;
    await watched();
    expect(notices).toEqual([
      {
        title: "Indudex: el disco está al 90 %",
        message: "Quedan 123,5 GB libres.",
      },
      {
        title: "Indudex: el disco vuelve a tener sitio",
        message: "Está al 84 %.",
        kind: "ok",
      },
    ]);
  });

  it("reads the SSD once a day and tells a failed check or a worn drive", async () => {
    // Days go by in this test: the jobs are not judged (the first hour after a boot).
    machine.uptime = 60;
    let reads = 0;
    machine.ssdReport = async () => {
      reads++;
      return machine.report;
    };
    await watched();
    await watched();
    expect(reads).toBe(1);
    expect(notices).toEqual([]);
    machine.report = healthy.replace("3%", "91%");
    later(24);
    await watched();
    expect(notices).toEqual([
      {
        title: "Indudex: el SSD avisa de un problema",
        message: [
          "SMART overall-health self-assessment test result: PASSED",
          "Critical Warning: 0x00",
          "Available Spare: 100%",
          "Percentage Used: 91%",
        ].join("\n"),
      },
    ]);
    machine.report = healthy;
    later(24);
    await watched();
    expect(notices.at(-1)?.title).toBe("Indudex: el SSD vuelve a estar bien");
    machine.report = healthy.replace("PASSED", "FAILED!");
    later(24);
    await watched();
    expect(notices.at(-1)?.title).toBe("Indudex: el SSD avisa de un problema");
  });

  it("writes a report it cannot read to the alerts' log only", async () => {
    machine.report = "sudo: a password is required";
    await watched();
    expect(notices).toEqual([]);
    expect(await readFile(join(ops, "logs", "alerts.log"), "utf8")).toBe(
      "[2026-11-25 12:00:00] no SSD report: sudo: a password is required\n",
    );
  });
});
