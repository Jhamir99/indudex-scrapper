// The legacy's builder/work-mode.ts `modeWord`, `mostFlexible` and `tagMode`, copied (career sites T002) for the scrapper's
// readers (the board and careers readers name a board's own mode word and LinkedIn's tags); advert facts keeps its own
// copy of the whole module. Its own comments keep their marks.

type Mode = "onsite" | "hybrid" | "remote";
// ➤ "#LI-Onsite" all read "onsite". JobTech's "Arbete på plats" is left out on purpose: it is its form's default, set on
// ➤ remote and hybrid adverts too.
const MODES: Record<string, Mode> = {
  onsite: "onsite",
  oraonsite: "onsite",
  lionsite: "onsite",
  hybrid: "hybrid",
  orahybrid: "hybrid",
  lihybrid: "hybrid",
  hybridarbete: "hybrid",
  remote: "remote",
  oraremote: "remote",
  liremote: "remote",
  fullyremote: "remote",
  distansarbete: "remote",
};
export const modeWord = (value: unknown): Mode | "" =>
  MODES[
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z]/g, "")
  ] || "";

// ➤ An employer that offers several modes counts as the most flexible one: the filter asks "can I work this way?".
const FLEXIBILITY: string[] = ["onsite", "hybrid", "remote"];
// ➤ The boards give their flags as they are: a word, or nothing where the flag is off.
export const mostFlexible = (modes: readonly unknown[]): Mode | "" =>
  (modes.filter((m) => FLEXIBILITY.includes(m as Mode)) as Mode[]).sort(
    (a, b) => FLEXIBILITY.indexOf(b) - FLEXIBILITY.indexOf(a),
  )[0] || "";

// ➤ LinkedIn's tags for jobs it copies from employers' sites; Indeed and Monster read them too.
const LINKEDIN_TAG = /#LI-(Remote|Hybrid|On-?site)\b/gi;
export const tagMode = (text: unknown) =>
  mostFlexible(
    [...String(text || "").matchAll(LINKEDIN_TAG)].map((m) => modeWord(m[1])),
  );
