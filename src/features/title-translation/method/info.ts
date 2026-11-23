// What the step before the engine notes of each title for the steps after it (legacy builder/mt/
// before.mjs's `info`): the emojis set aside at its ends and inside it, the names it holds and the
// towns' other names, the company, the trades written in (expected in the output) with each one's
// term, its capitalised name and its name, the head noun, the levels taken out and how they are
// said, whether the title was English already and whether "Agentic" stood in for "Robotic".
export type Span = [term: string, cap: string, tr: string];

export interface TitleInfo {
  lead: string;
  trail: string;
  mid: string[];
  names: string[];
  alts: Record<string, string[]>;
  firm: string;
  expect: string[];
  whole: string;
  head: string;
  spans: Span[];
  level: string;
  said: string;
  english: boolean;
  agentic: boolean;
}
