// `pnpm gate:explain [-- --out <dir>]`: every stored advert through the gate, the ones left out
// written one per line with their reason to `<dir>/explain.txt.gz` (default `published/` at the
// repo root), and the counts printed. Reads the store and the catalogues only; writes nothing into
// the store.
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  createGate,
  formatSummary,
  writeExplainReport,
} from "../features/gate/index.js";
import { readCatalogue } from "../shared/catalogues/read-catalogue.js";
import { registeredAdapters } from "../features/crawl-core/registry.js";
import type { StoredAdvert } from "../shared/schemas/advert.js";
import { isCompanyBoard } from "../shared/schemas/source.js";
import { FileAdvertStore } from "../shared/storage/file-advert-store.js";
import { storeDirectory } from "./store-directory.js";

try {
  const { values } = parseArgs({
    args: process.argv.slice(2).filter((argument) => argument !== "--"),
    options: { out: { type: "string" } },
    strict: true,
    allowPositionals: false,
  });
  const out = values.out
    ? resolve(values.out)
    : fileURLToPath(new URL("../../published", import.meta.url));
  const store = new FileAdvertStore(storeDirectory(), {
    now: () => new Date(),
  });
  const gate = createGate({
    families: await readCatalogue("families"),
    isco: await readCatalogue("isco"),
    ssykIsco: await readCatalogue("ssykIsco"),
    titles: await readCatalogue("titles"),
    confirmedTitles: await readCatalogue("confirmedTitles"),
    countries: await readCatalogue("countries"),
  });
  // A company board's advert with no readable place is left out (career sites FR-10): the registry knows each kind.
  const kinds = new Map(
    registeredAdapters.map((adapter) => [
      adapter.definition.id,
      adapter.definition.kind,
    ]),
  );
  const adverts: (StoredAdvert & { board: boolean })[] = [];
  for (const source of [...(await store.readStates()).keys()].toSorted())
    for (const advert of await store.readAdverts(source))
      adverts.push({
        ...advert,
        board: isCompanyBoard(source, kinds.get(source)),
      });
  const summary = await writeExplainReport(adverts, gate.decide, out);
  process.stdout.write(formatSummary(summary));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
