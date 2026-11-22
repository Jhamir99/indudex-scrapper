// Advert facts' public entry for the processor (AGENTS.md, "Features").
export { AdvertFacts, createFactReader, type FactSources } from "./facts.js";
export type { Contract, ContractKind, WorkingTime } from "./contract.js";
export type { WorkMode } from "./work-mode.js";
export {
  agencyWorkCode,
  contractAndTime,
  type WrittenAdvert,
  writtenFacts,
} from "./written-facts.js";
export { contractCode, workingTimeCode } from "./contract.js";
// The build's titles in capitals brought down, by how its other titles write each word.
export { calmTitle, type Spellings, spellingsOf } from "./calm-titles.js";
