// Dedupe's public entry for the processor (AGENTS.md, "Features"): one copy of each advert across
// sources, and the adverts without every copy of one taken down. The title it compares is the one
// published, `shownTitle` in src/shared/kit/shown-title.ts.
export {
  CAMPAIGN_TOWNS,
  type DedupeAdvert,
  type Deduped,
  type KeptAdvert,
  dedupe,
  placeKey,
} from "./dedupe.js";
export { type TakenAdvert, withoutTaken } from "./taken.js";
// A company read as one name (an ATS code, a legal form, the country off): the takedowns' companies
// are matched so, as the legacy did.
export { companyOf } from "./role.js";
