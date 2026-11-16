import { brz } from "../public-feeds/adapters/brz/brz.js";
import type { SourceAdapter } from "./ports.js";

// Every source the scrapper runs, in no particular order (the runner decides when each runs).
// The source features add their adapters here; each one must pass the shared contract test
// (`registry.test.ts`) with its saved responses in `test/fixtures/<id>/` (FR-12).
export const registeredAdapters: readonly SourceAdapter[] = [brz];
