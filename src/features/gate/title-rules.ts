// Copied from the legacy's app/lib/titles.ts (JustJans/indudex@b0cd182), the title rules its gate
// and its web's CV reader shared. Kept as written, but for TypeScript's stricter checks and the two helpers that need no fold
// (`matches`, `find`) moved out of the factory, until the
// shared matching-rules package (`indudex-matching`, pending in MEMORY.md) replaces this copy.
//
// The one rule for reading a job title against lists of known titles, shared by the pile's gate
// (Node, with Argus's fold) and the CV reader (browser, with the engine's fold), which is why
// `fold` is passed in. Titles compare folded, with apostrophes read as spaces; on one text the
// longest match wins ("naval architect" is not an "architect"); among equal matches the family
// that names the occupation beats those that list it as an alternative.
import { fold } from "../../shared/kit/fold.js";

const escapeRe = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// A title found in one text: the list it belongs to and whether that list names it or lists it as
// an alternative.
export interface Hit {
  id: string;
  text: string;
  named?: boolean;
}
// The trie of many lists' titles: each letter's next node, and at a title's last letter the lists
// it ends.
export interface TitleNode {
  next: Map<string, TitleNode>;
  ends: Set<string> | null;
}

// The word characters of the rule: a folded title's letters and digits.
const isWord = (c: number): boolean =>
  (c >= 97 && c <= 122) || (c >= 48 && c <= 57);
const SPACE = /\s/;

const matches = (re: RegExp | null, text: string): string[] => {
  if (!re) return [];
  re.lastIndex = 0;
  return [...text.matchAll(re)].map((m) => m[1] ?? "");
};

const find = (root: TitleNode, text: string): Map<string, string[]> => {
  // For each list, the end of its longest title starting at each place.
  const found = new Map<string, Map<number, number>>();
  for (let start = 0; start < text.length; start++) {
    if (start > 0 && isWord(text.charCodeAt(start - 1))) continue;
    let node: TitleNode | undefined = root;
    let i = start;
    for (;;) {
      if (node.ends && (i === text.length || !isWord(text.charCodeAt(i)))) {
        for (const id of node.ends) {
          let at = found.get(id);
          if (!at) found.set(id, (at = new Map()));
          at.set(start, i);
        }
      }
      if (i === text.length) break;
      if (SPACE.test(text[i] ?? "")) {
        node = node.next.get(" ");
        if (!node) break;
        while (i < text.length && SPACE.test(text[i] ?? "")) i++;
      } else {
        node = node.next.get(text[i] ?? "");
        if (!node) break;
        i++;
      }
    }
  }
  // Then each list's titles left to right, as a global regex takes them: one starts only past
  // the end of the one before, with a separator of its own.
  const out = new Map<string, string[]>();
  for (const [id, at] of found) {
    const texts: string[] = [];
    let last = 0;
    for (const start of [...at.keys()].toSorted((a, b) => a - b)) {
      if (start === 0 ? last > 0 : start - 1 < last) continue;
      const end = at.get(start) as number;
      texts.push(text.slice(start, end));
      last = end;
    }
    out.set(id, texts);
  }
  return out;
};

export function titleRules(foldText: (s: string) => string) {
  const clean = (s: unknown): string =>
    foldText(String(s || ""))
      .replace(/['’]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const phrase = (s: unknown): string =>
    escapeRe(clean(s)).replace(/ /g, "\\s+");
  // One regex over many titles, longest first so the alternation prefers the longer one.
  const alternation = (
    labels: readonly string[] | null | undefined,
  ): RegExp | null => {
    const uniq = [
      ...new Set((labels || []).map(clean).filter(Boolean)),
    ].toSorted((a, b) => b.length - a.length);
    return uniq.length
      ? new RegExp(
          `(?:^|[^a-z0-9])(${uniq.map(phrase).join("|")})(?![a-z0-9])`,
          "g",
        )
      : null;
  };
  const inside = (a: string, b: string): boolean =>
    a !== b && new RegExp(`(?:^|[^a-z0-9])${phrase(a)}(?![a-z0-9])`).test(b);
  // hits: [{ id, text, named }] found in one text; others: texts found by other lists that count
  // for length too (the gate's blockers). Returns the hits that stand.
  const winners = <H extends Hit>(hits: H[], others: string[] = []): H[] => {
    const all = [...hits.map((h) => h.text), ...others];
    const longest = hits.filter((h) => !all.some((o) => inside(h.text, o)));
    return longest.filter(
      (h) => h.named || !longest.some((o) => o.text === h.text && o.named),
    );
  };

  // Many lists read in one pass, FlashText's way (Singh, 2017): every title of every list in one
  // trie, walked once from each place a title may start, so the time grows with the text and not
  // with the thousands of titles. `index({ id: [titles] })` builds it; `find(index, text)` gives
  // for each list exactly what `matches` gives with that list's alternation alone: the leftmost
  // longest titles, whole words, never overlapping, spaces as any run of white space.
  const index = (
    lists: Record<string, readonly string[] | null | undefined>,
  ): TitleNode => {
    const root: TitleNode = { next: new Map(), ends: null };
    for (const [id, labels] of Object.entries(lists)) {
      for (const label of new Set((labels || []).map(clean).filter(Boolean))) {
        let node = root;
        for (const letter of label.split("")) {
          let next = node.next.get(letter);
          if (!next) {
            next = { next: new Map(), ends: null };
            node.next.set(letter, next);
          }
          node = next;
        }
        (node.ends ||= new Set()).add(id);
      }
    }
    return root;
  };
  return { clean, phrase, alternation, matches, inside, winners, index, find };
}

// The rules with Argus's fold, as the legacy's gate built them (`titleRules(fold)`).
export const TITLES = titleRules(fold);
