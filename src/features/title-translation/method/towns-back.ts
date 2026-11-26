// The legacy's builder/mt/towns-back.ts (JustJans/indudex@ec79858), its two functions copied (legacy resync T009): the
// tool that ran them over every cache once (1 November 2026) is left out. The towns a cached translation renamed,
// written back as the title writes them: towns are proper names and are not translated (the owner's rule).
import { placesIn, otherNames, townsBack } from "./places.js";

// ➤ The translation with each town of the title written back where another of its names stands in its place.
export function withTownsBack(title: string, out: string): string {
  if (!out) return out;
  const towns = placesIn(title);
  return towns.length
    ? townsBack(out, Object.fromEntries(towns.map((t) => [t, otherNames(t)])))
    : out;
}

// ➤ Every translation of a cache with its towns written back: how many changed, and the first few to show.
export function backAll(cache: Map<string, string>, show = 5) {
  const shown: string[] = [];
  let fixed = 0;
  for (const [title, out] of cache) {
    const back = withTownsBack(title, out);
    if (back === out) continue;
    fixed++;
    if (shown.length < show) shown.push(`  ${title} → ${out} → ${back}`);
    cache.set(title, back);
  }
  return { fixed, shown };
}
