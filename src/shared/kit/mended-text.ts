// Letters a source sent broken, mended before any step reads a field, and the length a field is read
// to (legacy builder/normalise.mjs mendedText and builder/build-pile.mjs FIELD_MAX and atMost, word
// for word but for types).

// Windows-1252, as Node's own decoder reads it: the 256 characters of its bytes.
const WINDOWS_1252 = new TextDecoder("windows-1252").decode(
  Uint8Array.from({ length: 256 }, (_, byte) => byte),
);

// Letters a source sent broken, mended where the bytes say what they were: a JSON escape left in the text
// («München», hr4you), UTF-8 read as windows-1252 («SetÃºbal», Zoho; «â€“», helplavoro.it), a value inside its own
// quotes («"Erlangen"», behrco.de). A run is mended only into a Latin, Greek or Cyrillic letter or a mark of punctuation,
// so «CAFÉ’S» stays as it is (1 November 2026).
const UTF8 = new TextDecoder("utf-8", { fatal: true });
const BYTE_OF = new Map(Array.from(WINDOWS_1252, (char, byte) => [char, byte]));
const NEXT =
  "[\\u0080-\\u00BF\\u0152\\u0153\\u0160\\u0161\\u0178\\u017D\\u017E\\u0192\\u02C6\\u02DC\\u2013\\u2014\\u2018-\\u201E\\u2020-\\u2022\\u2026\\u2030\\u2039\\u203A\\u20AC\\u2122]";
const READ_AS_LATIN = new RegExp(
  `[\\u00C2-\\u00DF]${NEXT}|[\\u00E2]${NEXT}{2}`,
  "g",
);
const AMBIGUOUS = /[\u00a0\u2013\u2014\u2018-\u201e]/;
const MENDED = /^[\u00a0-ɏͰ-ϿЀ-ӿ‐-‧€™]$/;
// And a capital read so and then written small («VILA NOVA DE FAMALICÃO» came as «Famalicãƒo», «SETÚBAL» as «Setãšbal»,
// «SANTARÉM» as «Santarã‰m»: 260 published places of Portugal, 8 November 2026): the «Ã» made «ã», before a mark
// windows-1252 has where Latin-1 has none, which no word writes after an «ã» (Czech «Dobříš» has no «ã»).
const READ_SMALL =
  /\u00E3[\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u0192\u02C6\u02DC\u2013\u2014\u2018-\u201E\u2020-\u2022\u2026\u2030\u2039\u203A\u20AC\u2122]/g;
export function mendedText(text: unknown): string {
  let out = String(text ?? "");
  if (out.includes("\\u"))
    out = out.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    );
  // A capital before a hard space, a quote or a dash is mended only into a Latin letter: «Ó» and a hard space made a
  // Cyrillic letter of «DIRECCIÓ TÈCNICA» (NOA-09), while «Ã» and one is a true «à».
  out = out.replace(READ_AS_LATIN, (run) => {
    try {
      const ch = UTF8.decode(
        Uint8Array.from([...run].map((c) => BYTE_OF.get(c) ?? 0)),
      );
      return MENDED.test(ch) &&
        (ch <= "\u024f" || run.length > 2 || !AMBIGUOUS.test(run[1]))
        ? ch
        : run;
    } catch {
      return run;
    }
  });
  out = out.replace(READ_SMALL, (run) => {
    try {
      const ch = UTF8.decode(
        Uint8Array.from([0xc3, BYTE_OF.get(run[1] ?? "") ?? 0]),
      );
      return MENDED.test(ch) ? ch.toLowerCase() : run;
    } catch {
      return run;
    }
  });
  return out.replace(/^\s*"([^"]+)"\s*$/, "$1");
}

// How long a title, an employer or a place is read: a broken or hostile page's run of thousands of letters held the
// gate's and the map's patterns for seconds (NOB-11). A place may list a campaign's towns. Cut at a word.
export const FIELD_MAX = {
  title: 500,
  company: 300,
  location: 2000,
  city: 300,
};
export const atMost = (text: string, max: number): string =>
  text.length <= max
    ? text
    : text.slice(0, max).replace(/\s+\S*$/u, "") || text.slice(0, max);
