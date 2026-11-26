// ➤ What the steps after Firefox need to know of a title: the emojis set aside, the names to keep, the towns' other
// ➤ names, the company, the trades written in (expect, spans: as found, as written, the table's name), the title
// ➤ written whole or its opening trade, the levels taken out and those to say.
// The legacy's builder/mt/info.ts (JustJans/indudex@ec79858), copied (legacy resync T009): only its imports and data reads
// changed. Its own comments keep their marks.
export type Info = {
  lead: string;
  trail: string;
  mid: string[];
  names: string[];
  alts: Record<string, string[]>;
  firm: string;
  expect: string[];
  whole: string;
  head: string;
  spans: [string, string, string][];
  level: string;
  said: string;
  english: boolean;
  agentic: boolean;
};
