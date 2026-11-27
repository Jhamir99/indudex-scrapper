// ➤ Spans of time in milliseconds, and the day a number of days back, for the web and the server alike.
// The legacy's app/lib/time.ts (JustJans/indudex@ec79858), copied (career sites T002): only its imports changed. Its own
// comments keep their marks.
export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

// ➤ An advert older than this leaves at publication, as on the big portals (the owner's decision).
export const KEPT_DAYS = 365;

// ➤ The day `days` before `now`, as an advert's day is written ("2026-11-14").
export const dayBefore = (days: number, now = Date.now()) =>
  new Date(now - days * DAY_MS).toISOString().slice(0, 10);
