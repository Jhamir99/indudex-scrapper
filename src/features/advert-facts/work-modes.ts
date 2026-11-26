// ➤ Where the work is done: the names the filter and the profile code use (lib/codec.ts), and the letter an offer keeps
// ➤ in `w` for each (builder/work-mode.ts reads it from the advert).
// The legacy's app/lib/work-modes.ts, copied (legacy resync T003): only its imports changed. Its own comments keep their marks.
export const MODE_LETTER = { onsite: "o", hybrid: "h", remote: "r" } as const;
// ➤ The order of a company card's counts of adverts by work mode, `md` (builder/company-cards.ts writes them).
export const CARD_MODES = ["r", "h", "o"];
