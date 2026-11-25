// The gate's public entry for the processor (AGENTS.md, "Features").
import type { Countries } from "../../shared/catalogues/schemas.js";
import { compileGate, type GateCatalogues } from "./compile.js";
import { classifier } from "./classifier.js";
import { decider, type GateDecision, type GateInput } from "./decide.js";
import { languagesOfCountry } from "../../shared/words/country-languages.js";

export { saysClosed } from "./closed.js";
export {
  CLOSED,
  GateDecision,
  HYGIENE,
  OUTSIDE_EUROPE,
  type GateInput,
} from "./decide.js";
export {
  explainLine,
  type ExplainedAdvert,
  type ExplainSummary,
  formatSummary,
  writeExplainReport,
} from "./explain.js";

export interface GateSources extends GateCatalogues {
  readonly countries: Countries;
}

// Whether a title, or the words of a vacancy's address, names a job of ours, read in its country's languages: what the
// scrapper's readers ask before reading a page (job portals FR-4; the legacy's builder/lib/ours.ts `namesOurs` and
// `titleIsOurs`). The crawl's entry point builds it and hands it to the sources through crawl-core.
export function createTitleReader(
  sources: GateCatalogues,
): (title: string, country: string) => boolean {
  const classify = classifier(compileGate(sources));
  return (title, country) =>
    classify({ title, lang: "", hintLangs: languagesOfCountry(country) })
      .families.length > 0;
}

// The gate compiled once from the catalogues; each advert is decided from its own fields alone
// (FR-10), each title worked out once.
export function createGate(sources: GateSources): {
  decide(advert: GateInput): GateDecision;
} {
  const europe = new Set(
    sources.countries.countries.map((country) => country.iso),
  );
  return { decide: decider(compileGate(sources), europe) };
}
