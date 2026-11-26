// Companies' public entry for the processor (AGENTS.md, "Features"): each advert's employer, the
// directory of companies kept between runs, the registers' companies joined to it, and the cards.
export {
  createEmployerReader,
  type Employer,
  type EmployerAdvert,
} from "./employer.js";
export {
  type CompanyRow,
  type DirectoryOffer,
  updateCompanies,
} from "./directory.js";
export { type History, readHistory, writeHistory } from "./history.js";
export {
  type ListedItem,
  type Registered,
  withRegisters,
} from "./register-join.js";
export { cardKey, type CompanyCard, companyCards } from "./cards.js";
export { agenciesByShare, CLIENT_SHARE } from "./agencies.js";
export { companyKey } from "./company-key.js";
