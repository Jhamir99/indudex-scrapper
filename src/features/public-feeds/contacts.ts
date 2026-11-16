// Contacts written into an advert's text: links, e-mail addresses (a space at the «@» included)
// and phone numbers (9 to 13 digits, an optional «+» and country code, spaces, dots or dashes
// between; never slashes, so dates stay). The store keeps no person data (AGENTS.md).
export function withoutContacts(text: string): string {
  return text
    .replace(/(?:https?:\/\/|www\.)\S+/gi, "")
    .replace(/[\w.+-]+\s?@\s?[\w-]+(?:\.[\w-]+)+/g, "")
    .replace(/(?<![\d/])\+?\d(?:[\s.-]?\d){8,12}(?![\d/])/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .trim();
}
