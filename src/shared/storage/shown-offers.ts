import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { PublishedDataset } from "./published-dataset.js";

// What the published version in place shows (career sites FR-8, FR-6): its offers' ids, and per source its offers, those
// in Spain and those in Catalonia (the legacy's shown-ids.txt and shown-by-source.json, written by its pile). The crawl
// reads them once a run: a careers site asks again only a vacancy the site shows, and the queue reads first the sources
// that show offers (Catalonia's, Spain's, the rest's). Null before the first publication: everything counts as shown.
export interface ShownOffers {
  readonly ids: ReadonlySet<string>;
  // Source → [offers, in Spain, in Catalonia].
  readonly bySource: ReadonlyMap<string, readonly [number, number, number]>;
}

const CATALONIA = /^ES51/;

export async function readShownOffers(
  directory: string,
): Promise<ShownOffers | null> {
  const dataset = new PublishedDataset(directory);
  const version = await dataset.current();
  if (!version) return null;
  const folder = join(directory, version, "offers");
  const ids = new Set<string>();
  const bySource = new Map<string, [number, number, number]>();
  for (const file of (await readdir(folder)).filter((name) =>
    name.endsWith(".json"),
  )) {
    const part = JSON.parse(await readFile(join(folder, file), "utf8")) as {
      offers?: { id?: string; s?: string; cc?: string; n?: string }[];
    };
    for (const offer of part.offers ?? []) {
      if (!offer.id || !offer.s) continue;
      ids.add(offer.id);
      const counts = bySource.get(offer.s) ?? [0, 0, 0];
      counts[0]++;
      if (offer.cc === "es") counts[1]++;
      if (CATALONIA.test(offer.n ?? "")) counts[2]++;
      bySource.set(offer.s, counts);
    }
  }
  return { ids, bySource };
}
