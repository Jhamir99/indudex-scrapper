import { ECB_URL, isWhole, parseEcbRates } from "../../shared/rates/ecb.js";
import type { Clock, HttpClient, RatesKeeper, StopSwitch } from "./ports.js";

export interface RatesDependencies {
  readonly http: HttpClient;
  readonly rates: RatesKeeper;
  readonly clock: Clock;
  readonly stopSwitch: StopSwitch;
  readonly log: (message: string) => void;
}

export type RatesOutcome = "kept" | "fresh" | "stopped" | "refused" | "failed";

// The ECB's rates, asked once a day through the polite client and kept in the store for the
// processor (pay FR-2). Only a whole file replaces the one kept; a failure or a partial answer
// keeps it and is logged, and the run goes on. On a weekend the Friday file is asked once a day.
export async function refreshRates(
  dependencies: RatesDependencies,
): Promise<RatesOutcome> {
  const { http, rates, clock, stopSwitch, log } = dependencies;
  const today = clock.now().toISOString().slice(0, 10);
  if ((await rates.keptOn()) === today) return "fresh";
  if (await stopSwitch.isActive()) return "stopped";
  try {
    const { body } = await http.request(ECB_URL);
    const read = parseEcbRates(body);
    if (!isWhole(read)) {
      log(
        `exchange rates: the ECB's answer is not its file (${Object.keys(read.rates).length - 1} rates): the last one kept stays`,
      );
      return "refused";
    }
    await rates.keep(body);
    log(`exchange rates: the ECB's file of ${read.day} kept`);
    return "kept";
  } catch (error) {
    log(
      `exchange rates: not asked (${error instanceof Error ? error.message : String(error)}): the last one kept stays`,
    );
    return "failed";
  }
}
