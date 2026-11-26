// ➤ How a sentence holds a fact it names: as the job's own, as one of a choice («CDI ou CDD», «Voll- oder Teilzeit»), as
// ➤ an option («Teilzeit möglich», "you can work part time") or denied («keine Zeitarbeit»). One rule for each, in every
// ➤ language, from the stance words of the tables (builder/words); the readers kept lists of phrasings each before
// ➤ (docs/research/stance.md).
// ➤ A text is read as the readers fold it: small letters, no accents, quotes, dashes and underscores as spaces.
// The legacy's builder/stance.ts, copied (legacy resync T003): only its imports changed. Its own comments keep their marks.
import { foldLetters } from "../kit/fold.js";
import { anyOf, words } from "./index.js";

// ➤ A fact the readers read: any of its words (`member`, not global), and the value a word of it names (`valueOf`).
export type Fact = { member: RegExp; valueOf: (said: string) => string };

const plainWord = (w: string) =>
  foldLetters(w)
    .toLowerCase()
    .replace(/["'“”«»]/g, " ")
    .replace(/[\s_-]+/g, " ")
    .trim();
const wordsOf = (concepts: string[], leaving: string[] = []) => {
  const all = new Set(
    concepts.flatMap((c) => words(c, { folded: true })).map(plainWord),
  );
  return `(?<![a-z])${anyOf(
    [...all].filter((w) => !leaving.includes(w)),
    "[a-z]*",
  )}(?![a-z])`;
};

// ➤ A German «u.» or «bzw.» keeps its stop.
const JOIN = `(?:${wordsOf(["or", "and"])}\\.?|[/|&+])`;
// ➤ Beside one member alone, an "or" that is no other common word: not Portuguese «o» ("the"), nor Dutch «of» (English "of").
const OR = wordsOf(["or"], ["o", "of"]);
const BOTH = wordsOf(["both"]);
const NO = wordsOf(["no"]);
const POSSIBLE = wordsOf(["possible"]);
const CHANCE = wordsOf(["possible", "chance"]);
const CAN = wordsOf(["can"]);
const LATER = wordsOf(["laterStep"]);
// ➤ Words of a stance that speak of none: a start as soon as possible, "not only".
const NO_STANCE = new RegExp(wordsOf(["startSoon", "notOnly"]), "g");

type Span = { start: number; end: number; value: string };
// ➤ A member's rule for every match of a text, and for a whole word, each built once.
const builder = (make: (re: RegExp) => RegExp) => {
  const built = new WeakMap<RegExp, RegExp>();
  return (re: RegExp) => {
    const out = built.get(re) ?? make(re);
    built.set(re, out);
    return out;
  };
};
const globally = builder(
  (re) => new RegExp(re.source, re.flags.replace("g", "") + "g"),
);
const anchored = builder(
  (re) => new RegExp(`^(?:${re.source})$`, re.flags.replace("g", "")),
);

// ➤ One of a choice: members of two values joined by "or", "and", a slash or a bar, a word allowed on each side of it, and
// ➤ the first ones of their list («CDI ou CDD», «Vollzeit oder auch Teilzeit», «CDI, CDD ou intérim»), not two words for
// ➤ one value («Autónomo / freelance»); a member said in part ("full or part time", «Voll- oder Teilzeit», «Vollzeit- und
// ➤ Teilzeitstellen»); the only value named, beside an "or" or after "both" ("KYC, CDD, or AML", "both permanent and
// ➤ contract roles"). The choice's own words go with it.
const NEAR = 40;
const JOINED = new RegExp(`^ ?(?:[a-z]+ ?)?${JOIN} ?(?:[a-z]+ )?$`);
const LISTED = /^ ?, ?$/;
const JOINED_BEFORE = new RegExp(`([a-z]+) ?${JOIN} ?$`);
const JOINED_AFTER = new RegExp(`^ ?${JOIN} ?([a-z]+)`);
const OR_BEFORE = new RegExp(`(?:${OR}|${BOTH}(?: [a-z]+)?) $`);
const OR_AFTER = new RegExp(`^ ?,? ${OR}(?= [a-z])`);
// ➤ The word joined makes a member of another value: in this one's place («full» for "part time"), with its ending («Voll-»
// ➤ and «Teilzeit» make «Vollzeit») or as its first part («Teilzeitstellen»).
function makesOther(
  word: string,
  span: Span,
  said: string,
  first: boolean,
  fact: Fact,
): boolean {
  const is = (s: string) =>
    anchored(fact.member).test(s) && fact.valueOf(s) !== span.value;
  if (anchored(fact.member).test(word)) return false;
  const parts = said.split(" ");
  if (parts.length > 1)
    return is(
      (first ? [word, ...parts.slice(1)] : [...parts.slice(0, -1), word]).join(
        " ",
      ),
    );
  const cuts = [...Array(Math.max(said.length, word.length)).keys()].slice(1);
  return cuts.some((i) => is(word + said.slice(i)) || is(word.slice(0, i)));
}
// ➤ A word starts where nothing of a word comes before it.
const atWordStart = (text: string, at: number) =>
  at === 0 || !/[a-z]/.test(text[at - 1]);
function choiceBeside(
  f: string,
  span: Span,
  fact: Fact,
  alone: boolean,
): Span | null {
  const from = Math.max(0, span.start - NEAR);
  const before = f.slice(from, span.start);
  const after = f.slice(span.end, span.end + NEAR);
  const said = f.slice(span.start, span.end);
  let { start, end } = span;
  const or = before.match(OR_BEFORE);
  if (alone && or && atWordStart(before, or.index ?? 0))
    start = from + (or.index ?? 0);
  const joinedBefore = before.match(JOINED_BEFORE);
  if (joinedBefore && makesOther(joinedBefore[1], span, said, true, fact))
    start = from + (joinedBefore.index ?? 0);
  const orAfter = after.match(OR_AFTER);
  if (alone && orAfter) end = span.end + orAfter[0].length;
  const joinedAfter = after.match(JOINED_AFTER);
  if (joinedAfter && makesOther(joinedAfter[1], span, said, false, fact))
    end = span.end + joinedAfter[0].length;
  return start === span.start && end === span.end
    ? null
    : { start, end, value: span.value };
}
function chosen(f: string, spans: Span[], fact: Fact): Span[] {
  const out: Span[] = [];
  const alone = new Set(spans.map((s) => s.value)).size === 1;
  const gap = (i: number) => f.slice(spans[i].end, spans[i + 1].start);
  for (let i = 0; i < spans.length; i++) {
    const beside = choiceBeside(f, spans[i], fact, alone);
    if (beside) out.push(beside);
    if (i === spans.length - 1 || !JOINED.test(gap(i))) continue;
    let j = i;
    while (j > 0 && LISTED.test(gap(j - 1))) j--;
    if (new Set(spans.slice(j, i + 2).map((s) => s.value)).size > 1)
      out.push({ start: spans[j].start, end: spans[i + 1].end, value: "" });
  }
  return out;
}

// ➤ Denied: right after a "no" («keine Zeitarbeit», «pas d'intérim», "no agency work"), or a few words before a "not
// ➤ possible" («Teilzeit ist leider nicht möglich»).
const NO_BEFORE = new RegExp(`(?:^|[^a-z])${NO} (?:[a-z]+ )?$`);
const NO_AFTER = new RegExp(`^(?: [a-z]+){0,3} ${NO}(?: [a-z]+)? ${POSSIBLE}`);
const denied = (f: string, s: Span): boolean =>
  NO_BEFORE.test(f.slice(Math.max(0, s.start - 30), s.start)) ||
  NO_AFTER.test(f.slice(s.end, s.end + 60));

// ➤ Offered: a word of possibility right after it or a few words before it («Teilzeit möglich», «parttime bespreekbaar»,
// ➤ «possibilité de temps partiel»), or the one hired told they can («du kannst … Teilzeit arbeiten», "you can work part
// ➤ time"). A chance after it ends its phrase («Vast contract in het vooruitzicht»): one before another word is that
// ➤ word's («Try & Hire mit Aussicht auf Festanstellung»).
const OPTION_AFTER = new RegExp(`^(?: [a-z]+){0,2} ${POSSIBLE}`);
const CHANCE_AFTER = new RegExp(`^(?: [a-z]+){0,3} ${CHANCE}(?! [a-z])`);
// ➤ After a chance's noun, a move toward the fact and a word of a job lead to it and count for no word («possibilità di
// ➤ passare a un contratto a tempo indeterminato», "the possibility of transitioning to a permanent contract"); not after
// ➤ «possible», which speaks of the words before it («met ervaring bespreekbaar Eerst een contract voor bepaalde tijd»).
const CHANCE_NOUN = `(?!${POSSIBLE})${wordsOf(["chance"])}`;
const LEADING = `(?: (?:${wordsOf(["towardKind", "ofAJob"])}))*`;
// ➤ A word of what the job may become offers the fact after it the same way («Mission longue durée, évolutive en CDI»,
// ➤ «finalizzato a un contratto a tempo indeterminato»), only before it: «Vast dienstverband bij goed functioneren» is
// ➤ permanent.
const MAY_BECOME = wordsOf(["mayBecome"]);
const OPTION_BEFORE = new RegExp(
  `(?:${CHANCE}(?:,? [a-z]+){0,3}|(?:${CHANCE_NOUN}|${MAY_BECOME})(?:${LEADING},? [a-z]+){0,3}${LEADING}) $`,
);
// ➤ Or put off to a later step («Übernahme in Festanstellung», «CDI après la période d'essai», «spätere Teilzeit»).
const LATER_AFTER = new RegExp(`^(?: [a-z]+){0,3} ${LATER}`);
const LATER_BEFORE = new RegExp(`${LATER}(?: [a-z]+){0,3} $`);
const CAN_BEFORE = new RegExp(`${CAN}(?: [a-z0-9]+){0,14} $`);
const offered = (f: string, s: Span): boolean => {
  const before = f.slice(Math.max(0, s.start - 120), s.start);
  const after = f.slice(s.end, s.end + 60);
  return (
    [OPTION_AFTER, CHANCE_AFTER, LATER_AFTER].some((re) => re.test(after)) ||
    [OPTION_BEFORE, LATER_BEFORE, CAN_BEFORE].some((re) => re.test(before))
  );
};

// ➤ The text with the words of each fact that `unsaid` picks set to spaces.
type Pick = (g: string, spans: Span[], fact: Fact) => Span[];
function blanking(f: string, facts: Fact[], unsaid: Pick): string {
  if (!facts.some((fact) => fact.member.test(f))) return f;
  const g = f.replace(NO_STANCE, (w) => " ".repeat(w.length));
  const blanks = facts.flatMap((fact) => {
    const spans = [...g.matchAll(globally(fact.member))].map((m) => ({
      start: m.index,
      end: m.index + m[0].length,
      value: fact.valueOf(m[0]),
    }));
    return unsaid(g, spans, fact);
  });
  if (!blanks.length) return f;
  const out = f.split("");
  for (const s of blanks) out.fill(" ", s.start, s.end);
  return out.join("");
}
// ➤ Without what it holds as a choice, an option or denied: the readers read only what it states as the job's own.
export const withoutUnsaid = (f: string, ...facts: Fact[]): string =>
  blanking(f, facts, (g, spans, fact) => [
    ...chosen(g, spans, fact),
    ...spans.filter((s) => denied(g, s) || offered(g, s)),
  ]);
// ➤ Without what it denies: a prospect is an option of its own («Geen uitzicht op een vast contract»).
export const withoutDenied = (f: string, ...facts: Fact[]): string =>
  blanking(f, facts, (g, spans) => spans.filter((s) => denied(g, s)));
// ➤ Without what it offers or denies, keeping its choices: a working time offered beside another is no choice of both
// ➤ («Media jornada con opción a jornada completa», "Part-time with the option of full time").
export const withoutOptions = (f: string, ...facts: Fact[]): string =>
  blanking(f, facts, (g, spans) =>
    spans.filter((s) => denied(g, s) || offered(g, s)),
  );
