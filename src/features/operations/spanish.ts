// The notices' words (FR-10): Spanish, the operator's language, as the legacy's; times in the server's local time.

// 41.935: a dot every three digits, as Spain writes them.
export const number = (value: number): string => value.toLocaleString("de-DE");

export const plural = (value: number, one: string, many: string): string =>
  `${number(value)} ${value === 1 ? one : many}`;

// "18:40".
export const clock = (at: Date): string =>
  at.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

// "18:40 del 25/11", as the legacy's `date '+%H:%M del %-d/%-m'`.
export const dayAndClock = (at: Date): string =>
  `${clock(at)} del ${at.getDate()}/${at.getMonth() + 1}`;

// "1 h 5 min", "48 min", "40 s".
export const lasting = (seconds: number): string =>
  seconds >= 3600
    ? `${Math.floor(seconds / 3600)} h ${Math.floor((seconds % 3600) / 60)} min`
    : seconds >= 60
      ? `${Math.floor(seconds / 60)} min`
      : `${Math.round(seconds)} s`;
