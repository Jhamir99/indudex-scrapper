// Pay's public entry for the processor (AGENTS.md, "Features").
import type { Rates } from "../../shared/rates/ecb.js";
import { type AdvertPay, advertPay, type PayInput } from "./advert-pay.js";

export { AdvertPay, type PayInput } from "./advert-pay.js";
export type { PayPeriod } from "./periods.js";

export interface PaySources {
  // The ECB's rates the crawl kept (`readKeptRates`), units for one euro.
  readonly rates: Rates;
}

// The reader of an advert's pay (pay FR-3 to FR-9): pure, given the advert and the rates.
export function createPayReader({ rates }: PaySources): {
  pay(advert: PayInput): AdvertPay | null;
} {
  return { pay: (advert) => advertPay(advert, rates) };
}
