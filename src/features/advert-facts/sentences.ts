// An advert's text split into sentences, the unit the requirement readers read: a requirement is
// stated in a whole sentence ("5+ years of experience", "a degree in mechanical engineering"), so
// what the visitor is judged against is read off sentences and not stray words. A stored text that
// still carries its page's markup (8 % of employers' sites, 20 % of portals, 1 November 2026) ends
// a sentence at each paragraph and list item as well. A bullet alone splits, its spaces trimmed
// after: «\s*» before it was quadratic on a long run of spaces (NOA-14). Legacy builder/sentences.mjs.
export function sentences(text: string): string[] {
  return text
    .replace(/\r/g, "")
    .split(
      /(?<=[.!?])\s+|\n+|[•·▪●]|<\/?(?:p|li|ul|ol|br|div|h[1-6]|tr|td|th|table|section)(?:\s[^<>]*)?\/?>/i,
    )
    .map((sentence) =>
      sentence
        .replace(/<\/?[a-z][a-z0-9]*(?:\s[^<>]*)?\/?>/gi, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((sentence) => sentence.length > 2);
}
