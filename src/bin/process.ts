// `pnpm process [-- --force] [-- --explain]`: the processor's run. Reads the store (STORE_DIR), the
// catalogues, the configuration and the processor's state (PROCESSOR_STATE_DIR), and writes a whole
// version of the published dataset into PUBLISHED_DIR, then moves `current.json`; a pile that fell
// by a third waits a day unless --force is given. --explain writes the gate's report into the
// version. Never asks the network. Exits 1 when nothing was published.
import { parseArgs } from "node:util";
import { registeredAdapters } from "../features/crawl-core/registry.js";
import { runPublication } from "../features/publication/index.js";
import { readPlaces } from "../shared/catalogues/places.js";
import {
  CATALOGUE_VERSION,
  publishedCatalogues,
} from "../shared/catalogues/published.js";
import { readCatalogue } from "../shared/catalogues/read-catalogue.js";
import { loadTakedowns } from "../shared/config/takedowns.js";
import { loadUntranslated } from "../shared/config/untranslated.js";
import { FileAdvertStore } from "../shared/storage/file-advert-store.js";
import { readKeptRates } from "../shared/storage/kept-rates.js";
import { processorStateDirectory } from "../shared/storage/processor-state.js";
import {
  PublishedDataset,
  publishedDirectory,
} from "../shared/storage/published-dataset.js";
import { readRegisters } from "../shared/storage/registers-file.js";
import { storeDirectory } from "./store-directory.js";
import { processLog } from "../shared/kit/logger.js";
import { FolderLocked, lockFolder } from "../shared/storage/folder-lock.js";

const now = () => new Date();
// A run that finds its folder held by another exits with 75, which the cron's jobs read as a run skipped (012).
const SKIPPED = 75;
const logged = processLog("process");
const log = (message: string) => logged.info(message);

try {
  const { values } = parseArgs({
    args: process.argv.slice(2).filter((argument) => argument !== "--"),
    options: { force: { type: "boolean" }, explain: { type: "boolean" } },
    strict: true,
    allowPositionals: false,
  });
  const store = storeDirectory();
  const rates = await readKeptRates(store, now().toISOString().slice(0, 10));
  if (rates.warning) log(`ALERT ${rates.warning}`);
  // The publication and the translator never run at once, a hand's run or the cron's (the cron's `heavy` lock).
  const release = await lockFolder(processorStateDirectory(), "heavy");
  let result;
  try {
    result = await runPublication({
      store: new FileAdvertStore(store, { now }),
      registers: await readRegisters(store),
      rates: rates.rates,
      catalogues: {
        families: await readCatalogue("families"),
        isco: await readCatalogue("isco"),
        ssykIsco: await readCatalogue("ssykIsco"),
        titles: await readCatalogue("titles"),
        confirmedTitles: await readCatalogue("confirmedTitles"),
        countries: await readCatalogue("countries"),
        nuts: await readCatalogue("nuts"),
        degrees: await readCatalogue("degrees"),
        languages: await readCatalogue("languages"),
        places: await readPlaces(),
      },
      publishedCatalogues: await publishedCatalogues(),
      catalogueVersion: CATALOGUE_VERSION,
      takedowns: await loadTakedowns(),
      untranslated: await loadUntranslated(),
      definitions: registeredAdapters.map((adapter) => adapter.definition),
      dataset: new PublishedDataset(publishedDirectory()),
      stateDirectory: processorStateDirectory(),
      now,
      log,
      force: Boolean(values.force),
      explain: Boolean(values.explain),
    });
  } finally {
    await release();
  }
  if (result.published)
    log(`published version ${result.version}: ${result.offers} offers`);
  else process.exitCode = 1;
} catch (error) {
  logged.error(error instanceof Error ? error.message : String(error));
  process.exitCode = error instanceof FolderLocked ? SKIPPED : 1;
}
