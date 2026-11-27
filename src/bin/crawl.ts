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
import { createPlacer } from "../features/places/index.js";
import { readPlaces } from "../shared/catalogues/places.js";
import { portalHostGaps } from "../features/job-portals/index.js";
import { readCatalogue } from "../shared/catalogues/read-catalogue.js";
import {
  crawl,
  parseCrawlArguments,
  politeHttpClient,
  UsageError,
} from "../features/crawl-core/run.js";
import { FileAdvertStore } from "../shared/storage/file-advert-store.js";
import { FileRobotsMemory } from "../shared/storage/robots-memory.js";
import { publishedDirectory } from "../shared/storage/published-dataset.js";
import { readShownOffers } from "../shared/storage/shown-offers.js";
import { worthOf } from "../features/crawl-core/queue.js";
import { FileStopSwitch } from "../shared/storage/file-stop-switch.js";
import { FileRatesKeeper } from "../shared/storage/kept-rates.js";
import { environmentWithDotEnv } from "./dot-env.js";
import { readPageFacts } from "./page-facts.js";
import { storeDirectory } from "./store-directory.js";
import { processLog } from "../shared/kit/logger.js";
import { FolderLocked, lockFolder } from "../shared/storage/folder-lock.js";

const clock: Clock = {
  now: () => new Date(),
  sleep: (milliseconds) =>
    new Promise((wake) => setTimeout(wake, Math.max(0, milliseconds))),
};
// A run that finds its folder held by another exits with 75, which the cron's jobs read as a run skipped (012).
const SKIPPED = 75;
const logged = processLog("crawl");
const log = (message: string) => logged.info(message);

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
  // A crawl started by hand and the cron's never run at once over one store.
  const release = await lockFolder(directory, "crawl");
  // What the published version in place shows: a careers site asks again only what the site shows (career sites FR-8),
  // and the queue reads first the sources that show offers (FR-6); none before the first publication.
  const shown = await readShownOffers(publishedDirectory(environment));
  const budgets = new Map(
    Object.entries(config.run.pageBudgets).map(([group, pages]) => [
      group,
      pageBudget(pages),
    ]),
  );
  const { http, close } = politeHttpClient(
    config,
    clock,
    new FileRobotsMemory(directory),
  );
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
      // JOIN's companies draw on the employers' sites' pages, as in the legacy.
      pageBudgetFor: (group: string) =>
        budgets.get(group === "join" ? "careers" : group),
      inFlight: config.run.inFlight,
      ...(config.run.minutes
        ? {
            startUntil: new Date(
              clock.now().getTime() + (config.run.minutes - 5) * 60_000,
            ),
            runEndsAt: new Date(
              clock.now().getTime() + config.run.minutes * 60_000,
            ),
          }
        : {}),
      sourcesARun: config.run.sourcesARun,
      ...(config.run.longQueues
        ? {
            longQueues: {
              ...config.run.longQueues,
              deadlineMs: config.run.longQueues.minutes * 60_000,
            },
          }
        : {}),
      queue: {
        worth: (id: string) => worthOf(shown?.bySource ?? null, id),
        newARun: config.run.newARun ?? Infinity,
        noneEvery: config.run.noneEvery,
      },
      pageFacts: readPageFacts,
      // The legacy processor's reading of a country, the world over, for the sources that state none: the employers'
      // sites and the boards (career sites FR-10). Our towns and NUTS's areas: about 0.7 s and 280 MB.
      countryOf: createPlacer({
        places: await readPlaces(),
        nuts: await readCatalogue("nuts"),
        countries: (await readCatalogue("countries")).countries,
        elsewhere: (await readCatalogue("elsewhere")).elsewhere,
      }).countryOf,
      shown,
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
    await release();
  }
} catch (error) {
  logged.error(error instanceof Error ? error.message : String(error));
  process.exitCode =
    error instanceof UsageError
      ? 2
      : error instanceof FolderLocked
        ? SKIPPED
        : 1;
}
