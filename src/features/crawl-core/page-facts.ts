import type { SourcePay } from "../../shared/schemas/advert.js";

// What a vacancy's page says beside its JobPosting block or layout, as labelled fields or fields of their own: the
// contract, the hours, the years, the pay and the last day (job portals FR-3; the legacy's builder/lib/labels.ts
// `withLabels`). The readers are the processor's (advert-facts, pay, publication); the crawl's entry point composes them
// and hands them to the sources through the adapter context, so no source feature imports a processor feature.
export interface PageFacts {
  readonly contract?: string;
  readonly hours?: string;
  readonly years?: number;
  readonly pay?: SourcePay;
  readonly expires?: string;
}

export const NO_PAGE_FACTS = (): PageFacts => ({});

// A page's facts added to what its block or layout gave, where those say nothing.
export function withPageFacts<
  J extends {
    contract?: string;
    hours?: string;
    years?: number;
    pay?: SourcePay;
    expires?: string;
  },
>(job: J, facts: PageFacts): J {
  return {
    ...job,
    ...(!job.contract && facts.contract ? { contract: facts.contract } : {}),
    ...(!job.hours && facts.hours ? { hours: facts.hours } : {}),
    ...(job.years === undefined && facts.years !== undefined
      ? { years: facts.years }
      : {}),
    ...(!job.pay && facts.pay ? { pay: facts.pay } : {}),
    ...(!job.expires && facts.expires ? { expires: facts.expires } : {}),
  };
}
