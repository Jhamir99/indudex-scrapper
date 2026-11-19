import {
  amountOf,
  BESIDE,
  CEILING,
  CURRENCIES,
  currencyBeside,
  FUNDS,
  GLUED_HOUR,
  GLUED_PERIOD,
  isNet,
  OTHER_DOLLAR,
  periodNear,
  RANGE,
  STATISTIC,
  type TextPeriod,
  TWICE,
  USD_SIGN,
} from "./patterns.js";

// The figures, currency and period a line of text writes, as the text readers give them to the
// pay reader (`readPay`), which checks them.
export interface TextPay {
  readonly min: number;
  readonly max: number;
  // An ISO code, or «kr» for the crown of the advert's country.
  readonly currency: string;
  readonly period: TextPeriod | "";
}

// A band with no currency beside it, in a line that writes one figure with its currency, is no pay
// band: «SMIC à 2 000 € … Référence : 2026-3332» is 2,000 € a month, not 2,026 to 3,332
// (alliance-emploi.org, 9 November 2026).
const CURRENCY_NEAR =
  /[€£$]|(?<![a-z])(?:eur|euros?|usd|chf|pln|gbp|sek|nok|dkk|czk|kr)(?![a-z])|zł|kč/i;

// «im ersten Lehrjahr», «im 2. Ausbildungsjahr» name the year of the training, not a pay per year.
const YEAR_OF_TRAINING =
  /(?:im|in|1\.|2\.|3\.|4\.|ersten|zweiten|dritten|vierten)\s+(?:lehr|ausbildungs)?jahr/iu;

// One line's pay (legacy `payInText`), or null.
export function payInText(text: string): TextPay | null {
  const line = text
    .replace(TWICE, "")
    .replace(GLUED_HOUR, "$1")
    .replace(GLUED_PERIOD, "$1")
    .replace(USD_SIGN, "$")
    .replace(FUNDS, " ");
  if (!line.trim() || isNet(line) || STATISTIC.test(line)) return null;
  const currency = CURRENCIES.find(([pattern]) => pattern.test(line))?.[1];
  if (!currency || (currency === "USD" && OTHER_DOLLAR.test(line))) return null;
  let min: number;
  let max: number;
  let from: number;
  let end: number;
  // Two figures joined that are no band (the second smaller: «3.500 € und 30 Tage Urlaub») leave
  // the first alone.
  const range = RANGE.exec(line);
  const thousands = range && (range[3] || range[6]);
  const low = range
    ? amountOf(range[1] ?? "", range[2], range[3] || thousands || undefined)
    : 0;
  const high = range
    ? amountOf(range[4] ?? "", range[5], range[6] || thousands || undefined)
    : 0;
  // A range that writes its thousands once («38-42.000 Kč», «3-4.000 €») means both ends in
  // thousands.
  const lowInThousands =
    range &&
    low < 1000 &&
    high >= 1000 &&
    low * 1000 <= high &&
    low * 2000 >= high
      ? low * 1000
      : low;
  const bare =
    range &&
    !CURRENCY_NEAR.test(
      line.slice(
        Math.max(0, range.index - 6),
        range.index + range[0].length + 6,
      ),
    );
  if (range && high >= lowInThousands && !(bare && BESIDE.test(line))) {
    end = range.index + range[0].length;
    from = range.index;
    min = lowInThousands;
    max = high;
  } else {
    const one = BESIDE.exec(line);
    if (!one) return null;
    // A ceiling's word counts only before the figure: «bis» of a closing day after it is no
    // ceiling (DAA-20).
    if (CEILING.test(`${line.slice(0, one.index + one[0].length)} `))
      return null;
    min = max = one[1]
      ? amountOf(one[1], one[2], one[3])
      : amountOf(one[4] ?? "", one[5], one[6]);
    end = one.index + one[0].length;
    from = one.index;
  }
  if (!(min >= 5) || max < min) return null;
  // The period written before the figure or within 40 characters after it: a second figure's
  // period further on is its own. Further on in the sentence too, when no other figure stands
  // between («4,500 to 8,000 eur gross (and more in exceptional cases) per month»: the month was
  // lost, 9 November 2026).
  const said = line.slice(0, end + 40);
  const further = line.slice(end, end + 120);
  const stop = further.search(/\d/);
  const period =
    periodNear(said, from, end) ||
    periodNear(stop < 0 ? further : further.slice(0, stop), 0, 0);
  const near = currencyBeside(line, from, end);
  if (near === "USD" && OTHER_DOLLAR.test(line)) return null;
  return {
    min,
    max,
    currency: near ?? currency,
    period: YEAR_OF_TRAINING.test(line) && period === "year" ? "" : period,
  };
}
