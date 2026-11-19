// Copied from Argus (https://github.com/JustJans/argus), server-bot/requirements.mjs at v1.11.0,
// MIT licence, © JustJans: only extractRequiredYears and what it calls. The rest of that module
// (the YAML search profile, html-to-text, the screens for a user) is not needed here. To be
// replaced by the shared matching package (indudex-matching) when it exists (MEMORY.md).
// Its own comments are kept: they say why each guard is there.

// The word "years" in the 6 languages. The closing \b is added where it is
// used, so French "an(s)" can't fire inside "analyst"/"and".
// The Catalan singular "any" is left out and the plural made strict ("anys"): it
// collides with the English "any".
const YEAR = "(?:years?|yrs?|años?|anys|ans?|jahren?|jaar|jaren)";

// "Experience" in the 6 languages: a number only counts as a requirement if
// one of these sits next to it. (Text is already lowercased.)
const EXP = /experien|experiè|expérien|erfahrung|ervaring/;

// Requirement VERBS, an alternative gate to EXP: "the role requires 5+ years in WMS
// projects" never says "experience" but clearly asks for years. The NEG guard below
// still protects against false positives.
const REQ =
  /\brequir|\brequier|\brequisit|\bexige|\bexigen|\berforder|\bvereist|must have|you have|you bring/;

// The company talking about ITSELF, not about you: "for over 25 years, our experience…",
// "sommige met 25 jaar ervaring". Adzuna pages carry the whole "about us" next to the
// job, so these show up constantly; a marker in the context window makes the number not
// count even though EXP matched. Generous on purpose: ignoring a number can only KEEP an
// offer, never drop it.
const NEG =
  /combined|collective|cumulative|founded|established|in business|in the market|en el mercado|op de markt|sur le marché|am markt|of history|de historia|of experience delivering|years young|our experi|our team|our expert|for over|with over|on over|built on|building on|we have|we bring|we are a|is a leading|leader in|leading provider|team of|sommige|some of our|some with|years serving|years in business|thanks to|gracias a|dank |is your partner|we deliver|we provide|we offer|we serve|trusted by|serving clients|our company|our history|proudly|since 19|since 20|warrant|garant[ií]|guarantee/;

// Finds "number + years", ranges included ("3-5 years", "3 a 5 años", "2 or 5 years"),
// and keeps the LOW end. The lookarounds keep the number a standalone 1-2 digit integer,
// so GE's "building on over 130 years…" can't match "13".
const YEARS_RE = new RegExp(
  // DECIMALS: without them "1.5 years of experience" fails at the "1" and the scanner
  // matches the "5" instead, reading FIVE years and dropping a junior offer.
  `(?<!\\d)(\\d{1,2})(?:[.,]\\d+)?(?!\\d)\\s*(?:[-–—+]|\\s+(?:to|a|à|y|and|und|en|bis|tot|hasta|or|o|ou|oder|of)\\s+)?\\s*(?:\\d{1,2})?\\s*\\+?\\s*(?:(?:more|m[áa]s|mehr|meer|plus)\\s+(?:de\\s+|d['']\\s*)?)?${YEAR}\\b`,
  "gi",
);
// "3 or more years" / "3 o más años": the "more/más" between the number and "years" is
// allowed, so the requirement reads as 3.

// ── Numbers written as WORDS ────────────────────────────────────────────
// The detector above only reads DIGITS, so a requirement spelled out ("vijf jaar", "fünf
// Jahre") would go unnoticed. We translate those words to their digit BEFORE searching,
// and everything above keeps working unchanged. Word→digit map (0-15) in the 6
// languages. Unique keys; when the same spelling exists in two languages with the SAME
// value, it goes only once.
const NUM_WORDS: Readonly<Record<string, number>> = {
  zero: 0,
  cero: 0,
  zéro: 0,
  null: 0,
  nul: 0,
  one: 1,
  uno: 1,
  un: 1,
  une: 1,
  ein: 1,
  eins: 1,
  een: 1,
  two: 2,
  dos: 2,
  deux: 2,
  zwei: 2,
  twee: 2,
  three: 3,
  tres: 3,
  trois: 3,
  drei: 3,
  drie: 3,
  four: 4,
  cuatro: 4,
  quatre: 4,
  vier: 4,
  five: 5,
  cinco: 5,
  cinc: 5,
  cinq: 5,
  fünf: 5,
  funf: 5,
  vijf: 5,
  six: 6,
  seis: 6,
  sis: 6,
  sechs: 6,
  zes: 6,
  // Catalan "set" (7) is left out: "a broad skill set years in the making" would read as SEVEN years.
  seven: 7,
  siete: 7,
  sept: 7,
  sieben: 7,
  zeven: 7,
  eight: 8,
  ocho: 8,
  vuit: 8,
  huit: 8,
  acht: 8,
  nine: 9,
  nueve: 9,
  nou: 9,
  neuf: 9,
  neun: 9,
  negen: 9,
  ten: 10,
  diez: 10,
  deu: 10,
  dix: 10,
  zehn: 10,
  tien: 10,
  // Spanish "once" (11) is left out: a very common English word.
  eleven: 11,
  onze: 11,
  elf: 11,
  twelve: 12,
  doce: 12,
  dotze: 12,
  douze: 12,
  zwölf: 12,
  zwolf: 12,
  twaalf: 12,
  thirteen: 13,
  trece: 13,
  fourteen: 14,
  catorce: 14,
  fifteen: 15,
  quince: 15,
};
// The range separators (same as YEARS_RE) and the two alternations: ALL the words (for
// ranges) and only those of 3+ (the ones that discard on their own), longest first.
const numberWords = Object.keys(NUM_WORDS).toSorted(
  (a, b) => b.length - a.length,
);
const NUM_ALL = numberWords.join("|");
const NUM_BIG = numberWords.filter((w) => NUM_WORDS[w] >= 3).join("|");
const SP_RANGE_SEP = `(?:[-–—]|\\s+(?:to|a|à|y|and|und|en|tot|bis|hasta|or|o|ou|oder)\\s+)`;
const SPELLED_RANGE = new RegExp(
  `\\b(${NUM_ALL})\\b(${SP_RANGE_SEP})(${NUM_ALL})\\b(\\s*\\+?\\s*${YEAR}\\b)`,
  "gi",
);
const SPELLED_SINGLE = new RegExp(
  `\\b(${NUM_BIG})\\b(\\s*\\+?\\s*${YEAR}\\b)`,
  "gi",
);

// Two passes:
//  (A) RANGES, both ends ("nul tot drie jaar" → "0 tot 3 jaar"). Translating
//      only "drie" would leave "nul tot 3", and a 0-3 range — junior, and
//      good for the user — would then be read as a flat 3.
//  (B) STANDALONE of 3+ ("vijf jaar" → "5 jaar"). A standalone 0-2 is left
//      alone: those are years the user accepts, so the offer is kept anyway.
function normalizeSpelledYears(t: string): string {
  let out = t.replace(
    SPELLED_RANGE,
    (_, a: string, sep: string, b: string, tail: string) =>
      `${NUM_WORDS[a.toLowerCase()]}${sep}${NUM_WORDS[b.toLowerCase()]}${tail}`,
  );
  out = out.replace(
    SPELLED_SINGLE,
    (_, w: string, tail: string) => `${NUM_WORDS[w.toLowerCase()]}${tail}`,
  );
  return out;
}

// The rule: if it demands it, drop it; if it says nothing or says NOT required, keep it
// — silence benefits the candidate. Four guards, checked in the number's own SENTENCE so
// a "valorable" elsewhere cannot cancel a real requirement. (1) NEGATED: "you don't need
// 5 years", "brauchen keine 5 Jahre".
const NEG_YEARS =
  /\b(?:don'?t|doesn'?t|do not|does not|no|not|never|without|sin|keine?n?|nicht|niet|geen|pas)\b[^.!?;]{0,40}\b(?:need\w*|requir\w*|requier\w*|requerid\w*|necessary|necesari\w*|necesit\w*|mandatory|compulsory|obligatori\w*|imprescindible|verplicht|exig\w*|erforderlich|brauch\w*|besoin|nodig|vereist)\b|\b(?:brauch\w*|necesit\w*|need\w*)\b[^.!?;]{0,10}\b(?:keine?|geen|niet|no)\b|no importa|da igual (?:si|cu[áa]nt)|whether you have|not a requirement/i;
// (2) SOFTENED: "ideally 4 years", "se valoran 5 años" — desirable, not a floor.
const SOFT_YEARS =
  /preferred|preferably|ideally|idealerweise|nice to have|a plus|an asset|bonus|desirable|deseable|valorable|se valoran?|von vorteil|w[üu]nschenswert|bij voorkeur|een pr[ée]|pluspunt|de pr[ée]f[ée]rence|souhait|not essential|optiona?l|opcional|facultativ\w*|freiwillig|no (?:es )?(?:imprescindible|excluyente)/i;
// (3) CAP: "up to 5 years" caps what they accept, it does not ask for it.
const CAP_BEFORE =
  /(?:up to|bis zu|maximaal|jusqu'?[àa]|max\.?|maximum(?: of)?|m[áa]ximo(?: de)?|hasta un m[áa]ximo de)\s*$/i;
// (4) DURATION of the JOB, not of your past: "contrato de 2 años", "a 2-year
// assignment". Only counted ATTACHED before the number. The filler words carry their own
// whitespace INSIDE the repetition and "de" is spelled once, not twice: repeating bare
// alternatives with two of them matching the same text is the recipe for exponential
// backtracking on a near-miss — and this regex runs against a window of every advert
// body.
const DURATION_BEFORE =
  /(?:contra(?:ct|to)s?|contrat|vertrag|dienstverband|arbeitsvertrag|assignment|secondment|mission|duraci[óo]n|duration|dur[ée]e|looptijd|laufzeit|posting|placement|project)\s*(?:(?:is|es|ist|van|of|for|por|pour|f[üu]r|d[ée]e?|:)\s*)*(?:an?\s+)?$/i;

const WINDOW = 50; // chars of context scanned around each number match

// The guards read the segment BETWEEN COMMAS around the match, plus the previous segment
// when short ("Ideally, 4 años…") and the next one always ("5 años, aunque no
// imprescindibles,…") — a "preferred" about another topic must not cancel a real
// requirement. A softener that opens the NEXT segment and then names a FIELD ("…,
// ideally in offshore wind") modifies the field, not the requirement: softener +
// preposition → that segment stays out of the guard zone. A bare ", preferred" still
// cancels.
const SOFT_FIELD_NEXT =
  /\b(?:ideally|preferably|preferable|preferiblemente|idealmente|idealerweise|bij voorkeur|de pr[ée]f[ée]rence|voorkeur)\s+(?:in|en|im|dans|with|met|op|auf|from|de|du|des)\b/i;

function guardZone(t: string, cs: number, ce: number, idx: number): string {
  const clause = t.slice(cs, ce);
  const rel = Math.min(Math.max(idx - cs, 0), clause.length);
  const parts: { start: number; end: number; seg: string }[] = [];
  let p = 0;
  for (const seg of clause.split(",")) {
    parts.push({ start: p, end: p + seg.length, seg });
    p += seg.length + 1;
  }
  let i = parts.findIndex((s) => rel >= s.start && rel <= s.end);
  if (i === -1) i = 0;
  let zone = parts[i].seg;
  if (i > 0 && parts[i - 1].seg.trim().length <= 25)
    zone = parts[i - 1].seg + "," + zone;
  if (i + 1 < parts.length && !SOFT_FIELD_NEXT.test(parts[i + 1].seg))
    zone = zone + "," + parts[i + 1].seg;
  return zone;
}

// Internal engine: returns EACH years requirement found in the text with its context
// snippet, to look at WHAT those years are asked in, not just how many.
function collectYearHits(
  text: string | undefined,
): { n: number; ctx: string }[] {
  if (!text) return [];
  // Lowercases, unifies spaces and translates years written as words to digits ("vijf
  // jaar" → "5 jaar"). Typographic apostrophes fold first: NEG_YEARS's "don'?t" can't see
  // U+2019, and "You don’t need 5 years" must not read as a firm requirement.
  const t = normalizeSpelledYears(
    String(text).replace(/[’‘]/g, "'").toLowerCase().replace(/\s+/g, " "),
  );
  const hits: { n: number; ctx: string }[] = [];
  let m: RegExpExecArray | null;
  YEARS_RE.lastIndex = 0;
  // Goes through the text looking for each occurrence of "number + years".
  while ((m = YEARS_RE.exec(t)) !== null) {
    const n = parseInt(m[1] ?? "", 10);
    // Only numbers between 1 and 30 count: outside that it's not a real requirement.
    if (!(n >= 1 && n <= 30)) continue;
    // Cuts out the text snippet around the number to examine its context.
    const ctx = t.slice(
      Math.max(0, m.index - WINDOW),
      Math.min(t.length, YEARS_RE.lastIndex + WINDOW),
    );
    // Needs an "experience" word or a requirement verb beside the number, and no company
    // boast; anything less is not counted and the offer is KEPT. The boast check reads the
    // WHOLE SENTENCE: the giveaway comes after the comma — "With 25 years of experience…,
    // Acme is your partner." The negated/softened checks below stay bound to the comma
    // segment on purpose (r30).
    let ss = m.index,
      se = m.index;
    while (ss > 0 && !/[.!?;]/.test(t[ss - 1])) ss--;
    while (se < t.length && !/[.!?;]/.test(t[se])) se++;
    const sentence = t.slice(ss, se);
    if (
      (EXP.test(ctx) || REQ.test(ctx)) &&
      !NEG.test(ctx) &&
      !NEG.test(sentence)
    ) {
      // Guards: if the number's own segment negates or softens the requirement, it does not
      // count and the offer stays.
      let cs = m.index,
        ce = m.index;
      while (cs > 0 && !/[.!?;]/.test(t[cs - 1])) cs--;
      while (ce < t.length && !/[.!?;]/.test(t[ce])) ce++;
      const zone = guardZone(t, cs, ce, m.index);
      if (NEG_YEARS.test(zone) || SOFT_YEARS.test(zone)) continue;
      const before = t.slice(Math.max(0, m.index - 20), m.index);
      // "up to / máximo" right before? It's a cap, not a minimum → doesn't count.
      if (CAP_BEFORE.test(before)) continue;
      // "contrato de / contract van" right before? It's the DURATION of the
      // position, not an experience requirement → doesn't count.
      if (DURATION_BEFORE.test(before)) continue;
      // "more than 3 years" / "más de 3 años" means 4+, so the number goes up by one. Company
      // boasts with "for/with/on over" are already killed by NEG.
      const strict =
        /(more than|más de|mas de|plus de|mehr als|meer dan|over)\s*$/.test(
          before,
        );
      hits.push({ n: strict ? n + 1 : n, ctx });
    }
  }
  return hits;
}

// CLASSIC FUNCTION: the years of experience an offer asks for (the LOWEST if several),
// or null when unclear — and in doubt the offer is KEPT.
export function extractRequiredYears(text: string | undefined): number | null {
  const hits = collectYearHits(text);
  return hits.length ? Math.min(...hits.map((h) => h.n)) : null;
}
