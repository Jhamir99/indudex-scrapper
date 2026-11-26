// ➤ What a shown title should not carry, taken from it in every language it is shown in, once the translations are in:
// ➤ the gender mark («(m/w/d)», «(H/F)», «(m/ž)», «[K/M]», and «(m/f)» or «(h/m)» where a translation wrote one) and the
// ➤ advert's own number at its end («(ID: 3911)», «(A14911)», «[1245]», «- 20759»). After the translation, which is asked
// ➤ and cached by the title as written: the cache keeps its keys. Of the published parts on 23 November 2026, 4,433
// ➤ titles as written and 18,784 translations kept a gender mark, and about 9,000 titles or translations a number.
// The legacy's builder/tidy-titles.ts (0c8e3524), copied (legacy resync T008): its `tidyTitles` loop is the build's, over
// the same fields and skipping the same sources. Its own comments keep their marks.

// ➤ One letter of a gender mark in the languages of the offers, or the words that stand for the third. Every pattern
// ➤ reads the title with its spaces already single, so none goes back over a run of them (#1057).
const MARK = String.raw`(?:[mwdfhvxkżžnai]|div\.?|divers|all|\*)`;
const GENDER = new RegExp(
  String.raw`[([] ?${MARK} ?(?:[/,|] ?${MARK} ?){1,3}[)\]]`,
  "giu",
);
// ➤ A number in brackets closing the title, with its label or two letters before it; a year stays, and so do a
// ➤ word and a number («(Part145)», the aviation rule).
const NUMBER_IN_BRACKETS =
  /^[([] ?(?:(?:id|ref|réf|référence|reference|referencia|nr|no|n°|code)\.? ?[:#]? ?)?(?!(?:19|20)\d{2} ?[)\]])[A-Z]{0,2}-?\d{3,7}[A-Z]? ?[)\]]$/iu;
// ➤ A number after a dash or a bar closing the title, three figures at least, a year staying («Graduate - 2027»).
const NUMBER_AFTER_DASH = / [-–|] (?:[A-Z]{1,3}-)?(?!(?:19|20)\d{2}$)\d{3,7}$/u;
const SIGNS_AT_END = new Set([" ", "-", "–", "—", "|", "/", ",", ":", ";"]);

const single = (s: string) => s.replace(/\s+/g, " ").trim();
const withoutSignsAtEnd = (s: string) => {
  let end = s.length;
  while (end > 0 && SIGNS_AT_END.has(s[end - 1] ?? "")) end--;
  return s.slice(0, end);
};
const withoutNumberInBrackets = (s: string) => {
  const open = Math.max(s.lastIndexOf("("), s.lastIndexOf("["));
  return open > 0 && NUMBER_IN_BRACKETS.test(s.slice(open))
    ? withoutSignsAtEnd(s.slice(0, open))
    : s;
};

export const tidyTitle = (title: string): string => {
  const marked = single(single(title).replace(GENDER, ""));
  const tidied = withoutNumberInBrackets(marked).replace(NUMBER_AFTER_DASH, "");
  // ➤ The dash or bar that stood before what was taken goes with it; a title with nothing taken stays as it was.
  return tidied === single(title) ? tidied : withoutSignsAtEnd(tidied).trim();
};
