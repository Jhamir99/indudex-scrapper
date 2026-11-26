// Advert facts' public entry for the processor (AGENTS.md, "Features").
export { AdvertFacts, createFactReader, type FactSources } from "./facts.js";
export type { Contract, ContractKind, WorkingTime, WorkMode } from "./codes.js";
export {
  agencyWorkCode,
  contractAndTime,
  factsOfPage,
  type WrittenAdvert,
} from "./written-facts.js";
export {
  deadlineInText,
  labelledFacts,
  loneFacts,
  postedInText,
  writtenFacts,
} from "./labels.js";
export { contractCode, workingTimeCode } from "./codes.js";
