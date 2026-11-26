// `pnpm crawl [-- --source <id>]`: one crawl run, started hourly by the host's cron. Runs the
// due sources (or the one asked for) and stores their adverts. Exits 0 when the run finished,
// whatever the sources did; 2 on a usage error; 1 when it could not start.
import {
  CrawlConfig,
  scheduleRules,
} from "../features/crawl-core/config/crawl-config.js";
import { loadConfig } from "../shared/config/load-config.js";
import { loadTakedowns } from "../shared/config/takedowns.js";
import type { Clock } from "../features/crawl-core/ports.js";
import { pageBudget } from "../features/crawl-core/page-budget.js";
import { registeredAdapters } from "../features/crawl-core/registry.js";
import { createTitleReader } from "../features/gate/index.js";
import { portalHostGaps } from "../features/job-portals/index.js";
import { readCatalogue } from "../shared/catalogues/read-catalogue.js";
import {
  crawl,
  parseCrawlArguments,
  politeHttpClient,
  UsageError,
} from "../features/crawl-core/run.js";
import { FileAdvertStore } from "../shared/storage/file-advert-store.js";
import { FileStopSwitch } from "../shared/storage/file-stop-switch.js";
import { FileRatesKeeper } from "../shared/storage/kept-rates.js";
import { environmentWithDotEnv } from "./dot-env.js";
import { readPageFacts } from "./page-facts.js";
import { storeDirectory } from "./store-directory.js";

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
  const loaded = await loadConfig("crawl.yml", CrawlConfig);
  // Each portal's host gets its gap (job portals FR-5); one written in crawl.yml wins.
  const config = {
    ...loaded,
    pace: {
      ...loaded.pace,
      hosts: { ...portalHostGaps(), ...loaded.pace.hosts },
    },
  };
  const kinds = new Map(
    registeredAdapters.map((adapter) => [
      adapter.definition.id,
      adapter.definition.kind,
    ]),
  );
  const { http, close } = politeHttpClient(config, clock);
  try {
    const result = await crawl(argumentsGiven, registeredAdapters, {
      http,
      store: new FileAdvertStore(directory, clock),
      clock,
      rulesFor: (source) => scheduleRules(config, source, kinds.get(source)),
      takedowns: await loadTakedowns(),
      stopSwitch: new FileStopSwitch(directory),
      environment,
      log,
      concurrency: config.run.concurrency,
      // The gate's reading, so a portal reads only the vacancy pages of ours (job portals FR-4). An entry point may import
      // any feature; the sources get it through crawl-core.
      isOurs: createTitleReader({
        families: await readCatalogue("families"),
        isco: await readCatalogue("isco"),
        ssykIsco: await readCatalogue("ssykIsco"),
        titles: await readCatalogue("titles"),
        confirmedTitles: await readCatalogue("confirmedTitles"),
      }),
      pageBudget: pageBudget(config.run.pageBudget),
      pageFacts: readPageFacts,
      rates: new FileRatesKeeper(directory, clock),
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
