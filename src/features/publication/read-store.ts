import { advertAddress } from "../../shared/kit/advert-address.js";
import { atMost, FIELD_MAX, mendedText } from "../../shared/kit/mended-text.js";
import type { StoredAdvert } from "../../shared/schemas/advert.js";

// What the publication reads of the store (FR-2; legacy builder/build-pile.mjs): the sources the
// registry lists today, each advert's fields cut at their limit and mended; and what it leaves out,
// counted as the legacy's status counts it.

// A source nobody could read for this long is taken to have closed its adverts: a source that comes
// back unchanged waits up to a week, and two days more keep a delay of the crawl from dropping them.
export const DROP_AFTER_DAYS = 9;
const DAY_MS = 86_400_000;

export interface StoreReader {
  storedSources(): Promise<string[]>;
  readPass(
    source: string,
  ): Promise<{ readonly savedAt: string; readonly adverts: StoredAdvert[] }>;
}

export interface Takedowns {
  sourceReason(source: string): string | undefined;
  // The advert's address taken down.
  advertTaken(url: string): boolean;
  // The employer taken down, by its name as the advert writes it.
  companyTaken(name: string): boolean;
}

export interface SourcePass {
  readonly source: string;
  readonly adverts: readonly StoredAdvert[];
}

export interface StoreReading {
  readonly passes: readonly SourcePass[];
  // The adverts taken down by address, mended, for their copies in other sources (withoutTaken).
  readonly taken: readonly StoredAdvert[];
  readonly counts: {
    // Adverts of the sources read (listed, not stale).
    readonly found: number;
    // Of sources no longer listed or taken down, and adverts taken down.
    readonly withdrawn: number;
    readonly stale: number;
    readonly noLink: number;
  };
  // The source files read, and the newest pass among them ("" for none).
  readonly sources: number;
  readonly crawledAt: string;
}

// An advert's fields as every step reads them: cut at a word to their limit (a broken page's run of
// thousands of letters held the patterns for seconds), then the letters a source sent broken mended.
export const readable = (advert: StoredAdvert): StoredAdvert => ({
  ...advert,
  title: mendedText(atMost(advert.title, FIELD_MAX.title)),
  company: mendedText(atMost(advert.company, FIELD_MAX.company)),
  location: mendedText(atMost(advert.location, FIELD_MAX.location)),
  city: mendedText(atMost(advert.city, FIELD_MAX.city)),
});

export async function readStore({
  store,
  listed,
  takedowns,
  now,
}: {
  readonly store: StoreReader;
  readonly listed: ReadonlySet<string>;
  readonly takedowns: Takedowns;
  readonly now: Date;
}): Promise<StoreReading> {
  const stale = new Date(
    now.getTime() - DROP_AFTER_DAYS * DAY_MS,
  ).toISOString();
  const passes: SourcePass[] = [];
  const taken: StoredAdvert[] = [];
  const counts = { found: 0, withdrawn: 0, stale: 0, noLink: 0 };
  let sources = 0;
  let crawledAt = "";
  for (const source of await store.storedSources()) {
    const pass = await store.readPass(source);
    sources++;
    // What is published is what the lists name today: a source taken off them, or taken down,
    // leaves at the next publication, not when its file ages.
    if (!listed.has(source) || takedowns.sourceReason(source)) {
      counts.withdrawn += pass.adverts.length;
      continue;
    }
    if (pass.savedAt > crawledAt) crawledAt = pass.savedAt;
    if (!pass.savedAt || pass.savedAt < stale) {
      counts.stale += pass.adverts.length;
      continue;
    }
    counts.found += pass.adverts.length;
    const adverts: StoredAdvert[] = [];
    for (const stored of pass.adverts) {
      const advert = readable(stored);
      if (!/^https?:\/\//.test(advert.url)) {
        counts.noLink++;
        continue;
      }
      if (takedowns.companyTaken(advert.company)) {
        counts.withdrawn++;
        continue;
      }
      // The advert taken down is kept aside, so its copies from other sources go too.
      if (takedowns.advertTaken(advertAddress(advert.url))) {
        taken.push(advert);
        counts.withdrawn++;
        continue;
      }
      adverts.push(advert);
    }
    passes.push({ source, adverts });
  }
  return { passes, taken, counts, sources, crawledAt };
}
