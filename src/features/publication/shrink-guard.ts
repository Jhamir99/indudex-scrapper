import type { Offer } from "../../shared/schemas/published/offer.js";
import type { PileCounts, RememberedPile } from "./state.js";

// Whether a pile has fallen rather than been built (FR-11; legacy builder/lib/shrink-guard.ts): its
// offers, Spain's and Catalonia's, against the most each had in the piles of the last days. The
// last pile alone missed a fall in steps (832 to 63 offers in eight publications) and a country
// gone whole while the total held (PUB-04).
export const KEEP_AT_LEAST = 0.7; // a pile a third smaller is a fault, not a day
export const HISTORY_DAYS = 3;
// A pile that fell is held back a day; a fall that lasts a day is the new state of the sources.
export const HOLD_HOURS = 24;
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

export const pileCounts = (offers: readonly Offer[]): PileCounts => ({
  offers: offers.length,
  es: offers.filter((offer) => offer.cc === "es").length,
  cat: offers.filter(
    (offer) => offer.cc === "es" && String(offer.n ?? "").startsWith("ES51"),
  ).length,
});

// The counts that fell under KEEP_AT_LEAST of their most in the history, as [name, now, most].
export function falls(
  now: PileCounts,
  history: readonly Partial<PileCounts>[],
): [string, number, number][] {
  return (Object.keys(now) as (keyof PileCounts)[]).flatMap(
    (key): [string, number, number][] => {
      const most = Math.max(0, ...history.map((pile) => pile[key] ?? 0));
      return most && now[key] < most * KEEP_AT_LEAST
        ? [[key, now[key], most]]
        : [];
    },
  );
}

// The history with this pile added and what is older than HISTORY_DAYS gone.
export function remember(
  history: readonly RememberedPile[],
  counts: PileCounts,
  at: number,
): RememberedPile[] {
  const since = at - HISTORY_DAYS * DAY_MS;
  return [
    ...history.filter((pile) => Date.parse(pile.at) >= since),
    { at: new Date(at).toISOString(), ...counts },
  ];
}

export type GuardVerdict =
  | { readonly publish: true; readonly alert?: string }
  | { readonly publish: false; readonly reason: string };

// Whether this pile is published: never an empty one; one that fell only with `force`, or once
// the last published pile is a day old (then with an alert, and the history starts again).
export function guard({
  counts,
  history,
  lastPublishedAt,
  force,
  now,
}: {
  readonly counts: PileCounts;
  readonly history: readonly RememberedPile[];
  readonly lastPublishedAt: string | null;
  readonly force: boolean;
  readonly now: number;
}): GuardVerdict & { readonly fell: [string, number, number][] } {
  if (!counts.offers)
    return {
      publish: false,
      reason: "nothing usable in the store: not publishing",
      fell: [],
    };
  const fell = falls(counts, history);
  if (!fell.length) return { publish: true, fell };
  const said = fell
    .map(
      ([key, n, most]) =>
        `${key} ${n} (the most in ${HISTORY_DAYS} days was ${most})`,
    )
    .join(", ");
  if (force)
    return {
      publish: true,
      alert: `ALERT publishing although it fell (forced): ${said}`,
      fell,
    };
  const hoursHeld =
    (now - Date.parse(lastPublishedAt ?? "1970-01-01T00:00:00Z")) / HOUR_MS;
  if (hoursHeld < HOLD_HOURS)
    return {
      publish: false,
      reason: `ALERT not publishing: under ${Math.round(KEEP_AT_LEAST * 100)}% in ${said} (--force overrides; after ${HOLD_HOURS} h it is published anyway)`,
      fell,
    };
  return {
    publish: true,
    alert: `ALERT publishing although it fell: ${said}; the fall has lasted ${Math.round(hoursHeld)} h`,
    fell,
  };
}
