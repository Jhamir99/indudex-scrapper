import { anyOf, words } from "../../../shared/words/index.js";
import type { PayPeriod } from "../periods.js";

// The patterns the text pay readers share (legacy `builder/text-pay.mjs`). Each is started only
// where it can match at once or after a run of spaces, so a long text cannot hold one for
// seconds (the legacy's DAA-27).

// The label may carry a word before or after it ("Starting salary", "Salary range",
// «Bruttojahresgehalt», «Salaire annuel brut») and stand without its colon when the figure or the
// currency follows it ("Salary £45,000 - £55,000"), as the offers' diary found in boards' texts
// (1 November 2026).
export const LABEL =
  /(?:^|\n|[.;•·|])[^\p{L}\p{N}\n]{0,6}(?:(?:starting|base|basic|gross|annual|yearly|monthly|hourly|target|indicative|total|competitive|expected|fixed|brutto|jahres|monats|mindest|einstiegs|grund|kv)\s*(?:-\s*)?)*(?:rémunération|remuneration|compensation|salaire|salary|pay rate|day rate|hourly rate|rate|pay|gehalt|gehaltsspanne|gehaltspaket|gehaltsband|gehaltsrahmen|verdienst|bezahlung|stundenlohn|bruttostundenlohn|stundensatz|stundenvergütung|(?<!mindest)lohn|mindestlohn(?=\s+(?:laut|lt\.?|gemäß|gem\.?|nach)\s+(?:kv|kollektivvertrag))|bruttolohn|vergütung|verguetung|entgelt|beloning|verloning|uurloon|brutoloon|salario|retribución|retribucion|sueldo|sou|salari|salaris|loon|retribuzione|stipendio|ral|wynagrodzenie|zarobki|lön|lon|løn|lønn|palkka|palkkaus|wage|hourly wage|mzda|plat|bruto plaća|bruto placa|remuneração|remuneracao)(?:\s+(?:range|band|bracket|package|indication|annuel(?:le)?|brut(?:e|o|to)?|anual|annuo|base))*\s*(?:\([^)]{0,30}\))?\s*(?:[:：]\s*|(?:is|of|from|between|ranges? from|range is|will be|tra|da|a partire da|compresa tra|fra|entre|de|desde|von|ab|zwischen|van|vanaf|tussen|od|från|mellan)\s+(?=[€£$]|\d|(?:eur|gbp|usd|chf|pln)\b)|(?=[€£$]|\d))([^\n]{3,140})/iu;

// A code may stand stuck to its figure («GBP45,000», «SEK 30 000», «EUR45.000»): read up to the
// next letter, not a word's end. The Nordic crown written «kr» or «:-» names no country's crown:
// «kr», which the pay reader turns into the crown of the offer's country.
export const CURRENCIES: readonly (readonly [RegExp, string])[] = [
  [/€|\beur(?![a-z])|\beuros?\b/i, "EUR"],
  [/£|\bgbp(?![a-z])/i, "GBP"],
  [/\$|\busd(?![a-z])/i, "USD"],
  [/kč(?![\p{L}])|\bczk(?![a-z])/iu, "CZK"],
  [/(?<![\p{L}])zł(?![\p{L}])|\bpln(?![a-z])/iu, "PLN"],
  [/\bchf(?![a-z])/i, "CHF"],
  [/\bsek(?![a-z])/i, "SEK"],
  [/\bnok(?![a-z])/i, "NOK"],
  [/\bdkk(?![a-z])/i, "DKK"],
  [/\d\s*(?:kr\.?|:-)(?![\p{L}])|(?<![\p{L}])kr\.?\s*\d/iu, "kr"],
  [/\bhuf\b|\bft\b/i, "HUF"],
  [/\bron\b|\blei\b/i, "RON"],
];

export type TextPeriod = Exclude<PayPeriod, "week">;

// «Quattordici mensilità» counts the payments of a year's pay: no month (seen on the server,
// 14 November 2026).
export const PERIODS: readonly (readonly [RegExp, TextPeriod])[] = [
  [
    /(?:\bral\b|(?<=€|eur|euroa)\s*\/\s*v\b|\bvuodessa\b|\bpar an\b|\bpar année\b|\bannuel|\/\s*an\b|\bper annum\b|\bp\.?\s?a\.?(?=\s|$)|\bannual|\bper year\b|\ba year\b|\/\s*y(?:ea)?r\b|\byearly\b|\bjahr|\bjährlich|\bjahrlich|\bal año\b|\bpor año\b|\banual|\/\s*año\b|\bannu[oaie]\b|\bl'anno\b|\ball'anno\b|\bper jaar\b|\bper jaar\b|\brocznie\b|\bna rok\b|\bper år(?![a-zåäö])|(?<![a-zåäöø])år(?![a-zåäö]))/i,
    "year",
  ],
  // The legacy wrote «(?![\p{L}])» here without the u flag, where it means none of the characters
  // p, {, L and } (either case): kept as it read, not as it meant.
  [
    /(?:\bp\/m(?![p{}l])|\bpar mois\b|\bmensuel|\/\s*mois\b|\bper month\b|\ba month\b|\bmonthly\b|\/\s*m(?:on)?th\b|\bmonat|\bmonatlich|\bal mes\b|\bpor mes\b|\bmensual|\/\s*mes\b|\bal mese\b|\bmensil(?!it[aà])|\bper maand\b|\bmiesięcznie\b|\bmiesiecznie\b|měsíčně|\bmesicne\b|\bper månad\b|\/\s*mån\b|\bi månaden\b|\bper måned\b|\/\s*kk\b|\bkuukaudessa\b|\bkuussa\b|\bpr\.?\s?måned\b|\bom måneden\b|\bi måneden\b|\/\s*md\b|\/\s*mnd\b|\bper mnd\b)/i,
    "month",
  ],
  [
    /(?:(?<=\d\s?)ph(?![\p{L}])|\bp\/h(?![\p{L}])|\bp\/u(?![\p{L}])|\/\s*uur\b|\/\s*heures?\b|\bde l'heure\b|\bpar heure\b|\bhoraire\b|\/\s*h\b|\/\s*hour\b|\bper hour\b|\bstundenlohn|\bstundensatz|\bstundenverg|\bje stunde\b|\bpro std\b|\ban hour\b|\bhourly\b|\/\s*hr\b|\bpro stunde\b|\bstündlich\b|\/\s*std\b|\bpor hora\b|\bla hora\b|\/\s*hora\b|\bper hora\b|\bl'hora\b|\ball'ora\b|\bper uur\b|\/\s*uur\b|\buurloon\b|\bza godzinę(?![\p{L}])|\bza hodinu\b|\bper timme\b|\bi timmen\b|\/\s*tim\b|\bper time\b|\bi timen\b|\bje arbeitsstunde\b|(?:€|\beur\b)\s*\/?\s*std\.?(?![\p{L}])(?!\s*\/?\s*woche))/iu,
    "hour",
  ],
  [
    /(?:\bday rate\b|\bpar jour\b|\/\s*j(?:our)?(?![a-zà-ÿ])|\bper day\b|\ba day\b|\bdaily\b|\bpro tag\b|\bal día\b|\bpor día\b|\bal giorno\b|\bper dag\b)/i,
    "day",
  ],
];

const GLOBAL_PERIODS = PERIODS.map(
  ([pattern, period], order) =>
    [new RegExp(pattern.source, `${pattern.flags}g`), period, order] as const,
);

// The period written nearest the figure from..end, the table's order breaking a tie: «7.500 €
// brutto monatlich zzgl. Jahresprämie» is a month's, though «Jahr» comes first in the table
// (DAA-19).
export function periodNear(
  text: string,
  from: number,
  end: number,
): TextPeriod | "" {
  const found = GLOBAL_PERIODS.flatMap(([pattern, period, order]) =>
    [...text.matchAll(pattern)].map((match) => ({
      period,
      order,
      gap:
        match.index >= end
          ? match.index - end
          : Math.max(0, from - match.index - match[0].length),
    })),
  ).toSorted((a, b) => a.gap - b.gap || a.order - b.order);
  return found[0]?.period ?? "";
}

// The first period a text names, in the table's order.
export const periodIn = (text: string): TextPeriod | undefined =>
  PERIODS.find(([pattern]) => pattern.test(text))?.[1];

// "60k", "28K", "30,5k", "34 000", "36.000", "52,000", "1925,46".
export const amountOf = (
  whole: string,
  cents: string | undefined,
  thousands: string | undefined,
): number =>
  Number(`${whole.replace(/[ .,'  ]/g, "")}${cents ? `.${cents}` : ""}`) *
  (thousands ? 1000 : 1);

// Two figures are a range only when a range's word or dash joins them («de 950 € à 1 400 €»,
// "€60k-€120k", «27–33 EUR»); else the figure is the one the currency stands beside («€21,8 + 32
// verlofdagen» is 21.80, not 21.80 to 32). A ceiling alone ("up to", «tot», «bis zu», "till") is
// no pay.
export const CEILING =
  /(?:^|\s)(?:up to|jusqu'?à|jusqu’à|bis zu|bis|hasta|fino a|tot|till|max\.?|maximum)\s|(?:^|\s)(?:nawet do|nawet|do|až do)\s+(?=\d)/i;

// The US dollar is read as written («$200k-$400k /yr», "USD 90,000"), shown in dollars (the
// owner's choice, 1 November 2026): the sign other dollars share is the US one in the adverts of
// Europe, unless the line names another («CA$», "AUD"), which is not read.
export const OTHER_DOLLAR =
  /\b(?:ca|c|a|au|nz|s|sg|hk|r|mx|nt)\$|\b(?:cad|aud|nzd|sgd|hkd|mxn|brl|twd)\b/i;

// A sum in millions or billions is a company's money ("$20M Series A", «€5 Mio. Umsatz",
// "Project Value: €30M"), never a pay: it is set aside and the rest of the line read («€ 3.500
// b.p.m.» is a month's pay, not billions). Nor is a line that gives a statistic ("The median
// annual wage for environmental engineers is $96,820", "an average total compensation of $112,000
// based on 67 salaries"), as articles about jobs and theme demos do.
export const FUNDS =
  /(?:[€£$]|\b(?:eur|usd|gbp)\b)\s?\d+(?:[.,]\d+)?\s?(?:m|mn|mm|mio|mrd|bn|b|million|millions|billion|milliards?)\b(?!\.\s?p\.)/gi;
export const STATISTIC =
  /(?<![\p{L}])(?:median|average|averages|expect to earn|salaries|durchschnittlich\p{L}*|durchschnitt|im schnitt|moyenne|promedio|de media|in media|gemiddeld\p{L}*|średnio|srednio)(?![\p{L}])/iu;

const JOIN = String.raw`\s*(?:€|£|\$|eur\b|euros?\b|usd\b|gbp|sek|nok|dkk|chf|kr\.?|:-|kč|czk\b|zł|pln\b)?\s*(?:-|–|—|à|a|t\/m|t\.e\.m\.?|tot en met|to|bis|tot|y|et|and|und|ed|e|al|tussen|en|och|og|till|do|až|az)\s*(?:€|£|US\$|\$|eur|euros?\b|usd|gbp|sek|nok|dkk|chf|zł|kč|pln|czk)?\s*`;
const NUMBER = String.raw`(\d{1,3}(?:[ .,'  ]\d{3}(?!\d))+|\d+)(?:[.,](\d{1,2})|[.,]-)?\s*([kK](?![a-zA-ZÀ-ɏ])|tys\.?|tis\.?)?`;
export const RANGE = new RegExp(`${NUMBER}${JOIN}${NUMBER}`, "i");
// A code stuck to a word's end is none: «soudeur 35 h» is no 35 euros (DAA-17).
export const BESIDE = new RegExp(
  `(?:€|£|\\$|(?<![\\p{L}])(?:eur|euros?\\b|usd|chf|pln|zł|kč|gbp|sek|nok|dkk|czk|kr\\.?))\\s*${NUMBER}|${NUMBER}\\s*(?:€|£|eur\\b|euros?\\b|usd\\b|chf\\b|pln\\b|zł|kč|gbp\\b|sek\\b|nok\\b|dkk\\b|czk\\b|kr\\.?(?![\\p{L}])|:-)`,
  "iu",
);

// A currency written twice («14,50 EUR (€) - 18 EUR (€) / heure») and an hour glued to the first
// end of a band («£14.78ph - £17.97ph») hide the band: they are taken out before it is read (the
// free-label bench, 9 November 2026).
export const TWICE = /(?<!\s)\s*\((?:€|£|\$|eur|gbp|usd)\)/gi;
export const GLUED_HOUR = /(\d)\s?ph(?=\s*[-–—]\s*[€£$]?\s*\d)/gi;
// And a period written after the band's first end too («$42/hr - $50/hr», «$38.94/hr – $47.60/hr»:
// the band was read as its bottom alone), and a dollar written «USD$» («USD$90,000 -
// USD$100,000»): the disagreements with the sources' fields.
export const GLUED_PERIOD =
  /(\d)\s*\/\s*(?:hrs?|hour|h|yr|year|annum|mo|month)\b(?=\s*(?:[-–—]|to)\s*(?:USD\s?\$|US\$|[€£$])?\s*\d)/gi;
export const USD_SIGN = /\bUSD\s?\$/g;

// A word for gross pay in any language the readers know.
export const GROSS = new RegExp(
  `(?<![\\p{L}])${anyOf(words("gross"))}(?![\\p{L}])`,
  "iu",
);

// A net pay in any of its forms: «netos», «neta», «nets», «Nettogehalt» passed the bare word's
// check (DAA-03). Bare «net» is also «.NET» and Dutch «just», so it counts only beside a figure
// and with no gross word in the sentence.
const NET_WORD = new RegExp(
  `(?<![\\p{L}.])${anyOf(words("net"))}(?![\\p{L}])`,
  "iu",
);
const BARE_NET = /(?<![\p{L}.])net(?![\p{L}])/giu;
const FIGURE_NEAR = /[\d€£$]/;
export function isNet(text: string): boolean {
  return (
    NET_WORD.test(text) ||
    (!GROSS.test(text) &&
      [...text.matchAll(BARE_NET)].some((match) =>
        FIGURE_NEAR.test(
          text.slice(Math.max(0, match.index - 15), match.index + 18),
        ),
      ))
  );
}

// The currency beside the figure read, when the line names two («£45,000 … EUR», «CHF 95,000 –
// 110,000 (EUR …)»): the one written just before it, else within it, else just after; not the
// first of the list (DAA-21).
export function currencyBeside(
  line: string,
  from: number,
  end: number,
): string | undefined {
  const at = (start: number, stop: number) =>
    CURRENCIES.flatMap(([pattern, code]) => {
      const match = pattern.exec(line.slice(start, stop));
      return match ? [{ code, index: match.index }] : [];
    });
  const before = at(Math.max(0, from - 6), from).toSorted(
    (a, b) => b.index - a.index,
  )[0];
  const inside = at(from, end).toSorted((a, b) => a.index - b.index)[0];
  const after = at(end, end + 6).toSorted((a, b) => a.index - b.index)[0];
  return (before ?? inside ?? after)?.code;
}
