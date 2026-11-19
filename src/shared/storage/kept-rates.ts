import { readFile, stat, utimes } from "node:fs/promises";
import { join } from "node:path";
import { type EcbRates, parseEcbRates } from "../rates/ecb.js";
import { writeFileAtomic } from "./atomic.js";

// The ECB's rates file inside the store (layout at the top of `file-advert-store.ts`).
export const RATES_FILE = join("rates", "ecb.xml");

interface Clock {
  now(): Date;
}

const dayOf = (date: Date) => date.toISOString().slice(0, 10);

const isMissing = (error: unknown) =>
  (error as NodeJS.ErrnoException | undefined)?.code === "ENOENT";

// The ECB's file as the crawl keeps it (pay FR-2): written whole and atomically, with the run's
// time as its modification time, so the crawl asks again only on another day. Fits crawl-core's
// `RatesKeeper` port structurally: shared code does not import features.
export class FileRatesKeeper {
  readonly path: string;

  constructor(
    storeDirectory: string,
    private readonly clock: Clock,
  ) {
    this.path = join(storeDirectory, RATES_FILE);
  }

  // The day (UTC) the kept file was written, or undefined when there is none.
  async keptOn(): Promise<string | undefined> {
    try {
      return dayOf((await stat(this.path)).mtime);
    } catch (error) {
      if (isMissing(error)) return undefined;
      throw error;
    }
  }

  async keep(xml: string): Promise<void> {
    await writeFileAtomic(this.path, xml);
    const now = this.clock.now();
    await utimes(this.path, now, now);
  }
}

// Rates read by the processor (pay FR-3): the day they are of, the rates, and a warning when they
// are more than a week old or missing. With no file, only the euro is known.
export interface KeptRates extends EcbRates {
  readonly warning?: string;
}

const STALE_DAYS = 7;
const DAY_MS = 86_400_000;

export async function readKeptRates(
  storeDirectory: string,
  today: string,
): Promise<KeptRates> {
  let xml: string;
  try {
    xml = await readFile(join(storeDirectory, RATES_FILE), "utf8");
  } catch (error) {
    if (!isMissing(error)) throw error;
    return {
      day: "",
      rates: { EUR: 1 },
      warning: "no exchange rates kept: only pay in euros is converted",
    };
  }
  const kept = parseEcbRates(xml);
  const age = kept.day
    ? (Date.parse(today) - Date.parse(kept.day)) / DAY_MS
    : Number.POSITIVE_INFINITY;
  return age > STALE_DAYS
    ? {
        ...kept,
        warning: `the exchange rates kept are of ${kept.day || "no day"}: pay in other currencies may be converted at old rates`,
      }
    : kept;
}
