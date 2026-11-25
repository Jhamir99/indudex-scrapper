import {
  appendFile,
  mkdir,
  open,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { JOBS, type Job } from "./jobs.js";
import type { Machine } from "./machine.js";
import { localStamp, type Notifier } from "./ntfy.js";
import { dayAndClock, number } from "./spanish.js";
import type { Told } from "./told.js";

export interface WatchRun {
  readonly opsDirectory: string;
  // The store: its STOP, and the disk the data lives on.
  readonly storeDirectory: string;
  readonly told: Told;
  readonly notifier: Notifier;
  readonly machine: Machine;
  readonly now?: () => Date;
  readonly jobs?: readonly Job[];
}

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const LOG_LIMIT = 20 * 1024 * 1024;
const LOG_KEPT = 5 * 1024 * 1024;

// Every quarter of an hour (FR-8), as the legacy's `alert.sh --watch`: what no run can tell by itself, each problem
// told once when it starts and once when it is over.
export async function watch(run: WatchRun): Promise<void> {
  const now = run.now ?? (() => new Date());
  const { told, notifier, machine } = run;
  const jobs = (run.jobs ?? JOBS).filter((job) => job.lateHours !== undefined);
  const logs = join(run.opsDirectory, "logs");
  await mkdir(logs, { recursive: true });

  // A problem told once when it starts and once when it is over; its flag says it was told.
  const tell = async (
    name: string,
    yes: boolean,
    problem: { title: string; message: string },
    over: { title: string; message: string },
  ) => {
    if (yes) {
      if (await told.has(name)) return;
      await told.set(name, now());
      await notifier.notify(problem);
    } else if (await told.has(name)) {
      await told.clear(name);
      await notifier.notify({ ...over, kind: "ok" });
    }
  };

  // STOP: told when it appears and again each day while it stays. The jobs' clocks wait meanwhile and start again
  // from the moment it goes, so a long stop is not then told as every job late.
  const stop = await modified(join(run.storeDirectory, "STOP"));
  if (stop) {
    const lastTold = await told.since("stop");
    if (!lastTold || now().getTime() - lastTold.getTime() >= DAY_MS) {
      await told.set("stop", now());
      await notifier.notify({
        title: "Indudex está parado",
        message: `STOP sigue puesto desde las ${dayAndClock(stop)}: no se rastrea, publica ni traduce.`,
      });
    }
  } else if (await told.has("stop")) {
    await told.clear("stop");
    for (const job of jobs) await told.set(`ok-${job.name}`, now());
    await notifier.notify({
      title: "Indudex vuelve a funcionar",
      message: "Se ha quitado STOP.",
      kind: "ok",
    });
  }

  // A job with no run that ended well for its hours, and its log still for two: a run hung with its lock (the next
  // ones are skipped), or its line gone from the crontab. A run still writing is working. A failed run told it
  // already. The first hour after a boot is not judged, nor a stop.
  if (machine.uptimeSeconds() >= 3600 && !stop) {
    for (const job of jobs) {
      const hours = job.lateHours ?? 0;
      if (!(await told.has(`ok-${job.name}`)))
        await told.set(`ok-${job.name}`, now());
      if (await told.has(`failed-${job.name}`)) continue;
      const since = (await told.since(`ok-${job.name}`)) ?? now();
      const wrote = await modified(join(logs, `${job.name}.log`));
      const late =
        now().getTime() - since.getTime() > hours * HOUR_MS &&
        (!wrote ||
          now().getTime() - wrote.getTime() > 2 * HOUR_MS ||
          (await told.has(`late-${job.name}`)));
      await tell(
        `late-${job.name}`,
        late,
        {
          title: `Indudex: ${job.spoken} no termina bien desde las ${dayAndClock(since)}`,
          message: `Ninguna pasada ha terminado bien en ${hours} horas, y su registro lleva dos sin moverse: puede que una se haya quedado colgada.`,
        },
        {
          title: `Indudex: ${job.spoken} vuelve a ir bien`,
          message: "Ha vuelto a terminar bien.",
        },
      );
    }
  }

  // The logs kept from growing for ever: one past 20 MB keeps its last 5 MB, written back into the same file, so the
  // jobs appending to it go on writing to it.
  for (const name of await readdir(logs).catch(() => [] as string[])) {
    if (name.endsWith(".log")) await trimmed(join(logs, name));
  }

  // The disk: told at 90 % full, over under 85 %, so a disk at the line is not told every quarter of an hour.
  const used = await machine.diskUsedPercent(run.storeDirectory);
  const limit = (await told.has("disk")) ? 85 : 90;
  const free = await machine.diskFreeGB(run.storeDirectory);
  await tell(
    "disk",
    used >= limit,
    {
      title: `Indudex: el disco está al ${used} %`,
      message: `Quedan ${number(Math.round(free * 10) / 10)} GB libres.`,
    },
    {
      title: "Indudex: el disco vuelve a tener sitio",
      message: `Está al ${used} %.`,
    },
  );

  // Once a day, the SSD's own report: told when it fails its health check (spare blocks running out, reliability
  // degraded, read-only) or has used 90 % of its rated life.
  const read = await told.since("ssd-read");
  if (!read || now().getTime() - read.getTime() >= DAY_MS) {
    await told.set("ssd-read", now());
    const report = await machine.ssdReport();
    if (report.includes("self-assessment test result")) {
      const life = Number(/^Percentage Used:\s*(\d+)%/m.exec(report)?.[1] ?? 0);
      const bad = !report.includes("test result: PASSED") || life >= 90;
      await tell(
        "ssd",
        bad,
        {
          title: "Indudex: el SSD avisa de un problema",
          message: report
            .split("\n")
            .filter((line) =>
              /test result|Critical Warning|Available Spare|Percentage Used/.test(
                line,
              ),
            )
            .map((line) => line.replaceAll(/ +/g, " ").trim())
            .join("\n"),
        },
        {
          title: "Indudex: el SSD vuelve a estar bien",
          message: "Su informe de salud vuelve a ser bueno.",
        },
      );
    } else {
      await appendFile(
        join(logs, "alerts.log"),
        `[${localStamp(now())}] no SSD report: ${report.replaceAll("\n", " ").trim()}\n`,
      );
    }
  }
}

async function modified(path: string): Promise<Date | undefined> {
  try {
    return (await stat(path)).mtime;
  } catch {
    return undefined;
  }
}

async function trimmed(path: string): Promise<void> {
  const file = await open(path, "r");
  let tail: Buffer;
  try {
    const { size } = await file.stat();
    if (size <= LOG_LIMIT) return;
    tail = Buffer.alloc(LOG_KEPT);
    await file.read(tail, 0, LOG_KEPT, size - LOG_KEPT);
  } finally {
    await file.close();
  }
  await writeFile(path, tail);
}
