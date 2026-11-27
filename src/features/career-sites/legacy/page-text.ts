// ➤ Advert text from its HTML, as every reader of adverts keeps it: line breaks kept where the markup had them, entities
// ➤ decoded. Apart from the readers so the crawler's helpers (lib/crawl.ts, lib/layout.ts) use it without them.
// The legacy's builder/lib/page-text.ts (JustJans/indudex@ec79858), copied (career sites T002): only its imports changed. Its own
// comments keep their marks.
import { decodeEntities } from "../../../shared/kit/entities.js";

// ➤ The whole advert, uncut (the owner, 1 November 2026): what it asks for (years, tools, degrees) comes last. The ceiling
// ➤ is only for a broken page that pours a whole list of vacancies into one advert; on 816 adverts of 50 boards the median
// ➤ text is 5,184 characters (docs/research/whole-advert.md). The record keeps no text, only what the screens read in it.
export const TEXT_KEPT = 100_000;
// ➤ The markup is taken out again once the entities are decoded: a description written as escaped HTML («&lt;p&gt;», in
// ➤ many sites' JSON-LD) only shows its tags then. The second pass takes only what is a tag («< 50 people» stays).
const LINE_TAGS = /<br\s*\/?>|<\/p>|<\/li>|<\/h\d>|<\/div>|<\/tr>/gi;
// ➤ What a page runs or styles is no text of the advert («a<script>alert(1)</script>b»): left out whole, an unclosed one
// ➤ to the end, in one pass whatever the page holds (LEC-28).
const CODE = /<(script|style)\b/gi;
function withoutCode(html: string): string {
  if (!/<(?:script|style)\b/i.test(html)) return html;
  const lower = html.toLowerCase();
  let out = "",
    at = 0;
  for (let m; (CODE.lastIndex = at), (m = CODE.exec(html));) {
    out += html.slice(at, m.index) + " ";
    const close = lower.indexOf(`</${m[1].toLowerCase()}`, m.index);
    const end = close < 0 ? -1 : html.indexOf(">", close);
    at = end < 0 ? html.length : end + 1;
  }
  return out + html.slice(at);
}
// ➤ A tag the ceiling cut before its «>» is no text either: a picture written into the page («<img
// ➤ src="data:image/png;base64,…») stayed as 94 KB of letters in an advert (17 November 2026).
const CUT_TAG = /<\/?[a-z][^<>]*$/i;
export function text(html: unknown): string {
  const page = String(html || "");
  const ends = (s: string) =>
    page.length > 4 * TEXT_KEPT ? s.replace(CUT_TAG, " ") : s;
  return ends(
    withoutCode(
      decodeEntities(
        ends(withoutCode(page.slice(0, 4 * TEXT_KEPT)))
          .replace(LINE_TAGS, "\n")
          .replace(/<[^<>]+>/g, " "),
      ),
    ),
  ) // ➤ not [^>]: a run of «<» with no «>» made it quadratic (RAS-11)
    .replace(LINE_TAGS, "\n")
    .replace(/<\/?[a-z][a-z0-9]*(?:\s[^<>]*)?\/?>/gi, " ")
    .replace(/[ \t ]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .replace(/ +([.,;:!?])/g, "$1")
    .trim()
    .slice(0, TEXT_KEPT);
}
