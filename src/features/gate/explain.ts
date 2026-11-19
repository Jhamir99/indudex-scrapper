import type { StoredAdvert } from "../../shared/schemas/advert.js";

// The explain report (FR-9): one line per advert left out, as the legacy's build wrote it:
// `[reason] title | company | location (source)`.
export type ExplainedAdvert = Pick<
  StoredAdvert,
  "title" | "company" | "location" | "source"
>;

export const explainLine = (reason: string, advert: ExplainedAdvert): string =>
  `[${reason}] ${advert.title} | ${advert.company} | ${advert.location} (${advert.source})`;
