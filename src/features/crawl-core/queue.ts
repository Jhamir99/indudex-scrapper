import type { SourceState } from "../../shared/schemas/source.js";
import { dueAt } from "./domain/schedule.js";

// The sources to read now, in the legacy's order (builder/crawl.ts `due`, career sites FR-6): due, the ones whose offers
// the site shows first (Catalonia's, Spain's, the rest's: `worth`, from the published version in place), each kind the
// most overdue first, and only so many never-read ones, so a scout that found five thousand does not starve the day.
// The employers' sites asked about 307 hours of reading a day and the legacy's crawler gave about 189, so what the site
// shows is read first; the sources that show nothing take one place in five (`noneEvery`), the most overdue first, so
// the offers they post next are still found (8 November 2026).

export interface QueuedSource {
  readonly id: string;
  // The source's group: its platform, the employers' sites, the portals, the feeds (the never-read ones are taken in
  // turn by group).
  readonly group: string;
  // Its cadence in hours.
  readonly cadenceHours: number;
}

export interface QueueRules {
  readonly now: Date;
  // A source's worth to the queue: 3 when it shows offers in Catalonia, 2 in the rest of Spain, 1 elsewhere, 0 when it
  // shows none; every source 1 before the first publication.
  readonly worth: (id: string) => number;
  // Never-read sources a run (the legacy's 300).
  readonly newARun: number;
  // One place in so many for the sources that show nothing (the legacy's 5).
  readonly noneEvery: number;
  // A failing source with adverts is due within these hours of its last try (the three-day rule).
  readonly withAdvertsHours?: number;
}

const HOUR = 3_600_000;

// A source's worth from what the published version shows of it: [offers, in Spain, in Catalonia].
export const worthOf = (
  shown: ReadonlyMap<string, readonly [number, number, number]> | null,
  id: string,
): number => {
  if (!shown) return 1;
  const counts = shown.get(id);
  return !counts || !counts[0] ? 0 : counts[2] ? 3 : counts[1] ? 2 : 1;
};

export function dueQueue<S extends QueuedSource>(
  sources: readonly S[],
  states: ReadonlyMap<string, SourceState>,
  rules: QueueRules,
): S[] {
  const now = rules.now.getTime();
  const known: { source: S; next: number; readingOn: boolean; rank: number }[] =
    [];
  const fresh = new Map<string, S[]>();
  for (const source of sources) {
    const state = states.get(source.id);
    if (!state?.nextDueAt) {
      fresh.set(source.group, [...(fresh.get(source.group) ?? []), source]);
      continue;
    }
    const next = dueAt(state, rules.withAdvertsHours);
    if (next > now) continue;
    const last = state.lastRunAt ? new Date(state.lastRunAt).getTime() : 0;
    known.push({
      source,
      next,
      // A source read well within its own cadence (by more than the jitter) is back only to read on (a portal with
      // pages left): it grows the site as a never-read one does, so it waits behind them.
      readingOn: now - last < source.cadenceHours * HOUR - HOUR,
      rank: rules.worth(source.id),
    });
  }
  known.sort((a, b) => b.rank - a.rank || a.next - b.next);
  const shows = known.filter((x) => !x.readingOn && x.rank > 0);
  const none = known.filter((x) => !x.readingOn && !x.rank);
  const every = rules.noneEvery || 5;
  const overdue: typeof known = [];
  for (let i = 0, j = 0; i < shows.length || j < none.length;) {
    for (let k = 1; k < every && i < shows.length; k++)
      overdue.push(shows[i++]!);
    if (j < none.length) overdue.push(none[j++]!);
    else while (i < shows.length) overdue.push(shows[i++]!);
  }
  // The sources never read come after the ones already overdue (what the site shows stays fresh before it grows), and
  // one group at a time in turn, so eight thousand new boards never push the employers' sites out of the day.
  const lists = [...fresh.values()];
  const picked: S[] = [];
  for (
    let i = 0;
    picked.length < rules.newARun && lists.some((list) => list.length > i);
    i++
  )
    for (const list of lists)
      if (i < list.length && picked.length < rules.newARun)
        picked.push(list[i]!);
  return [
    ...overdue.map((x) => x.source),
    ...picked,
    ...known.filter((x) => x.readingOn).map((x) => x.source),
  ];
}
