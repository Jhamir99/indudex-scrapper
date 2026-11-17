// `pnpm crawl [-- --source <id>]`: one crawl run, started hourly by the host's cron. Runs the
// due sources (or the one asked for) and stores their adverts. Exits 0 when the run finished,
// whatever the sources did; 2 on a usage error; 1 when it could not start.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import {
  CrawlConfig,
  scheduleRules,
} from "../features/crawl-core/config/crawl-config.js";
import { loadConfig } from "../shared/config/load-config.js";
import { loadTakedowns } from "../features/crawl-core/config/takedowns.js";
import type { Clock } from "../features/crawl-core/ports.js";
import { registeredAdapters } from "../features/crawl-core/registry.js";
import {
  crawl,
  parseCrawlArguments,
  politeHttpClient,
  UsageError,
} from "../features/crawl-core/run.js";
import { FileAdvertStore } from "../shared/storage/file-advert-store.js";
import { FileStopSwitch } from "../shared/storage/file-stop-switch.js";
import { storeDirectory } from "./store-directory.js";

// Keys from `.env` at the repo root (never committed); a variable already set wins.
function environmentWithDotEnv(): Record<string, string | undefined> {
  const file = fileURLToPath(new URL("../../.env", import.meta.url));
  const fromFile = existsSync(file) ? parseEnv(readFileSync(file, "utf8")) : {};
  return { ...fromFile, ...process.env };
}

const clock: Clock = {
  now: () => new Date(),
  sleep: (milliseconds) =>
    new Promise((wake) => setTimeout(wake, Math.max(0, milliseconds))),
};
const log = (message: string) =>
  console.log(`${new Date().toISOString()} ${message}`);

try {
  const argumentsGiven = parseCrawlArguments(process.argv.slice(2));
  const environment = environmentWithDotEnv();
  const directory = storeDirectory(environment);
  const config = await loadConfig("crawl.yml", CrawlConfig);
  const { http, close } = politeHttpClient(config, clock);
  try {
    const result = await crawl(argumentsGiven, registeredAdapters, {
      http,
      store: new FileAdvertStore(directory, clock),
      clock,
      rulesFor: (source) => scheduleRules(config, source),
      takedowns: await loadTakedowns(),
      stopSwitch: new FileStopSwitch(directory),
      environment,
      log,
      concurrency: config.run.concurrency,
    });
    const counts = new Map<string, number>();
    for (const { outcome } of result.sources) {
      counts.set(outcome, (counts.get(outcome) ?? 0) + 1);
    }
    const summary = [...counts].map(([outcome, n]) => `${n} ${outcome}`);
    log(
      `run ${result.stopped ? "stopped" : "finished"}: ${summary.length > 0 ? summary.join(", ") : "no source ran"}`,
    );
  } finally {
    close();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = error instanceof UsageError ? 2 : 1;
}
