import { readCatalogue } from "../../src/shared/catalogues/read-catalogue.js";
import {
  compileGate,
  type GateCatalogues,
} from "../../src/features/gate/compile.js";

// The real catalogues the gate reads, and the gate compiled from them once per test file.
export async function gateCatalogues(): Promise<GateCatalogues> {
  return {
    families: await readCatalogue("families"),
    isco: await readCatalogue("isco"),
    ssykIsco: await readCatalogue("ssykIsco"),
    titles: await readCatalogue("titles"),
    confirmedTitles: await readCatalogue("confirmedTitles"),
  };
}

export const realGate = async () => compileGate(await gateCatalogues());
