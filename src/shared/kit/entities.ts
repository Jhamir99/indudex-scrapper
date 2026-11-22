// HTML entities in text taken from the web ("&amp;", "&#8211;", "&eacute;"), written out (legacy
// builder/lib/entities.ts, word for word but for types): the publication's last step writes out
// what one reading left escaped.

// Windows-1252, as Node's own decoder reads it: «&#150;» is a dash, not a control character.
const WINDOWS_1252 = new TextDecoder("windows-1252").decode(
  Uint8Array.from({ length: 256 }, (_, byte) => byte),
);
const windows1252Char = (byte: number): string => WINDOWS_1252[byte] ?? "";

const ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  AMP: "&",
  LT: "<",
  GT: ">",
  QUOT: '"',
  apos: "'",
  nbsp: " ",
  euro: "€",
  copy: "©",
  reg: "®",
  deg: "°",
  middot: "·",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  laquo: "«",
  raquo: "»",
  iexcl: "¡",
  iquest: "¿",
  ordf: "ª",
  ordm: "º",
  szlig: "ß",
  aelig: "æ",
  AElig: "Æ",
  oslash: "ø",
  Oslash: "Ø",
  aring: "å",
  Aring: "Å",
  ccedil: "ç",
  Ccedil: "Ç",
  ntilde: "ñ",
  Ntilde: "Ñ",
  aacute: "á",
  eacute: "é",
  iacute: "í",
  oacute: "ó",
  uacute: "ú",
  Aacute: "Á",
  Eacute: "É",
  Iacute: "Í",
  Oacute: "Ó",
  Uacute: "Ú",
  agrave: "à",
  egrave: "è",
  igrave: "ì",
  ograve: "ò",
  ugrave: "ù",
  Agrave: "À",
  Egrave: "È",
  acirc: "â",
  ecirc: "ê",
  icirc: "î",
  ocirc: "ô",
  ucirc: "û",
  auml: "ä",
  euml: "ë",
  iuml: "ï",
  ouml: "ö",
  uuml: "ü",
  Auml: "Ä",
  Ouml: "Ö",
  Uuml: "Ü",
  yuml: "ÿ",
  atilde: "ã",
  otilde: "õ",
  // More that the pile of 26 October 2026 still carried: the soft hyphen (3,462 times, "m&shy;/&shy;f&shy;/&shy;d")
  // and the marks that take no room go; arrows, spaces, bullets and the letters of other languages.
  shy: "",
  zwnj: "",
  zwj: "",
  lrm: "",
  rlm: "",
  emsp: " ",
  ensp: " ",
  thinsp: " ",
  rarr: "→",
  larr: "←",
  harr: "↔",
  rArr: "⇒",
  bull: "•",
  vert: "|",
  frasl: "⁄",
  pound: "£",
  yen: "¥",
  cent: "¢",
  trade: "™",
  times: "×",
  divide: "÷",
  plusmn: "±",
  sect: "§",
  para: "¶",
  micro: "µ",
  permil: "‰",
  dagger: "†",
  frac12: "½",
  frac14: "¼",
  frac34: "¾",
  sup2: "²",
  sup3: "³",
  bdquo: "„",
  sbquo: "‚",
  lsaquo: "‹",
  rsaquo: "›",
  OElig: "Œ",
  oelig: "œ",
  Scaron: "Š",
  scaron: "š",
  Zcaron: "Ž",
  zcaron: "ž",
  Acirc: "Â",
  Ecirc: "Ê",
  Icirc: "Î",
  Ocirc: "Ô",
  Ucirc: "Û",
  Euml: "Ë",
  Iuml: "Ï",
  Igrave: "Ì",
  Ograve: "Ò",
  Ugrave: "Ù",
  Atilde: "Ã",
  Otilde: "Õ",
  Yacute: "Ý",
  yacute: "ý",
  curren: "¤",
  brvbar: "¦",
  uml: "¨",
  not: "¬",
  macr: "¯",
  acute: "´",
  cedil: "¸",
  sup1: "¹",
  ETH: "Ð",
  eth: "ð",
  THORN: "Þ",
  thorn: "þ",
  Ccaron: "Č",
  ccaron: "č",
  Lstrok: "Ł",
  lstrok: "ł",
  minus: "−",
  prime: "′",
  Prime: "″",
  larrow: "←",
  check: "✓",
  star: "☆",
  starf: "★",
  hyphen: "‐",
  dash: "‐",
  lowast: "∗",
  sim: "∼",
  le: "≤",
  ge: "≥",
  ne: "≠",
  infin: "∞",
  alpha: "α",
  beta: "β",
  mu: "μ",
  Omega: "Ω",
  ohm: "Ω",
};
// A number as the HTML standard reads it (13.2.5.80): 128 to 159 are Windows-1252's («&#150;» a dash, not a control
// character), and NUL, a lone surrogate or a number past U+10FFFF is the replacement character (LEC-18).
// A number past the last code point (U+10FFFF) names no character and stays as written: String.fromCodePoint throws on
// it, and one such advert stopped every publication while it stayed in the store (the security review, 6 November 2026).
const character = (n: number): string =>
  n === 0 || n > 0x10ffff || (n >= 0xd800 && n <= 0xdfff)
    ? "\uFFFD"
    : n >= 0x80 && n <= 0x9f
      ? windows1252Char(n)
      : String.fromCodePoint(n);
export const decodeEntities = (s: unknown): string =>
  String(s || "")
    .replace(/&#x([0-9a-f]{1,8});/gi, (_, h: string) =>
      character(Number.parseInt(h, 16)),
    )
    .replace(/&#(\d{1,10});/g, (_, d: string) => character(Number(d)))
    .replace(/&([a-zA-Z]+);/g, (m, name: string) =>
      Object.hasOwn(ENTITIES, name) ? (ENTITIES[name] ?? m) : m,
    );

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
