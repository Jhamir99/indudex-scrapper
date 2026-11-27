// ➤ What every reader of a source is (builder/sources.ts lists them): its id, its kind, the terms it is read under, and
// ➤ the adverts it yields (RawOffer, builder/normalise.ts), handed what its last pass kept.
// The legacy's builder/adapters/adapter.ts (JustJans/indudex@ec79858), copied (career sites T002): only its imports changed, and its RawOffer type declared here. Its own
// comments keep their marks.
import type { RawOffer } from "./raw-offer.js";
import { dayBefore } from "./time.js";

export type { RawOffer };
export type Licence = {
  name: string;
  short: string;
  url: string;
  licence: string;
  credit: string;
  needsKey: boolean;
};
// ➤ What a feed is handed (builder/readers.ts adapterCtx): the vertical's own codes, its log, and its last pass.
export type Ctx = {
  log: (line: string) => void;
  fail: (what: string, why: string) => void;
  previous: RawOffer[];
  iscoUnits: string[];
  ssykGroups: string[];
  families?: unknown;
  companies?: unknown;
};
export type Adapter = {
  id: string;
  kind: string;
  licence: Licence;
  deadlineMs?: number;
  fetchAll: (ctx: Ctx) => AsyncGenerator<RawOffer>;
};
// ➤ How a reader asks its offers' own pages after its list (builder/lib/details.ts): until when, how many at most, whether
// ➤ robots.txt lets it, and how one is asked (a test gives its own).
export type DetailOptions<P> = {
  until?: number;
  most?: number;
  may?: (url: string) => Promise<boolean>;
  ask?: (key: string) => Promise<P>;
};

// ➤ How long an advert seen on an earlier pass stays when the source no longer lists it and it names no last day.
export const UNDATED_OPEN_DAYS = 30;
type Seen = Pick<RawOffer, "source" | "sourceId" | "expires" | "posted">;
// ➤ This pass's adverts and the earlier ones of source `id` still open: by their own last day, or for
// ➤ UNDATED_OPEN_DAYS from their day when they name none.
export function stillOpenOf<A extends Seen>(
  id: string,
  now: A[],
  previous: A[] | null | undefined,
  today = new Date().toISOString().slice(0, 10),
): A[] {
  const seen = new Set(now.map((a) => a.sourceId));
  const oldest = dayBefore(UNDATED_OPEN_DAYS, Date.parse(today));
  const kept = (previous || []).filter(
    (a) =>
      a.source === id &&
      !seen.has(a.sourceId) &&
      (a.expires ? a.expires >= today : (a.posted || "") >= oldest),
  );
  return [...now, ...kept];
}
