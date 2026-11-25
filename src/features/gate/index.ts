// The gate's public entry for the processor (AGENTS.md, "Features").
import type { Countries } from "../../shared/catalogues/schemas.js";
import { compileGate, type GateCatalogues } from "./compile.js";
import { decider, type GateDecision, type GateInput } from "./decide.js";

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
