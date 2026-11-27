// HTML entities in text taken from the web ("&amp;", "&#8211;", "&eacute;"), written out as the HTML standard reads
// them, by the `entities` library (strict: an entity ends at its semicolon; 128 to 159 are Windows-1252's, «&#150;» a
// dash; NUL, a lone surrogate or a number past U+10FFFF the replacement character). The legacy's builder/lib/entities.ts
// read its own table of some thirty names; the library reads them all (the operator's call of 27 November 2026). The
// publication's last step writes out what one reading left escaped.
import { decodeHTMLStrict } from "entities";

// Characters that show nothing: a soft hyphen, zero-width spaces and joiners (a joiner inside an emoji stays), the
// byte-order mark (the legacy's builder/lib/entities.ts `INVISIBLE`).
export const INVISIBLE =
  /[\u00ad\u200b\u200c\u2060\ufeff]|\u200d(?!\p{Extended_Pictographic})/gu;

// «&nbsp;» is a plain space, as the legacy's table wrote it: the readers' rules on spaces (a space before a colon goes)
// read the text as the legacy's did. A no-break space written as a character or a number stays one.
export const decodeEntities = (s: unknown): string =>
  decodeHTMLStrict(String(s || "").replace(/&nbsp;/g, " "));

// Text a source escaped twice over ("&amp;#038;", which one reading leaves as "&#038;"), read
// until nothing changes, three times at most.
export function decodeFully(s: unknown): string {
  let v = String(s || "");
  for (let k = 0; k < 3; k++) {
    const next = decodeEntities(v);
    if (next === v) break;
    v = next;
  }
  return v;
}
