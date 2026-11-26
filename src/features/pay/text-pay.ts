// ➤ The pay an advert writes in its title ("Software Engineer — €60k-€120k /yr + equity") or on a labelled line of its text
// ➤ («Rémunération : De 34 000 € à 50 000 € brut par an», "Salary: £45,000 - £52,000 per annum"), when its source has no
// ➤ pay field: the figures, the currency and the period, given to the pay reader (builder/pay.ts), which checks them
// ➤ against each country's minimum wage. A net pay is not read (the site shows gross), a ceiling alone ("up to") only
// ➤ where a pay word names it, nor words without figures ("selon profil", "competitive"). docs/research/salary.md.
// ➤ Its words come from the language tables (builder/words): a word added there is read here.
// The legacy's builder/text-pay.ts, copied (legacy resync T004): only its imports changed. Its own comments keep their marks.

import { sentences } from "../../shared/kit/sentences.js";
import { anyOf, words } from "../../shared/words/index.js";

// ════ Words ════

// ➤ Several concepts' words as one alternation, and as a whole word: no letter right before or after it.
const anyWord = (concepts: string[], opts = {}) =>
  anyOf(concepts.flatMap((c) => words(c, opts)));
const wholeWord = (concepts: string[], opts = {}) =>
  `(?<![\\p{L}])${anyWord(concepts, opts)}(?![\\p{L}])`;
const wholeWordRe = (concepts: string[], opts = {}) =>
  new RegExp(wholeWord(concepts, opts), "iu");

// ════ Money: currencies and figures ════

// ➤ Each currency's code and names as written beside a figure, inflected too («40 000 euroa», «45 000 korun», «8000
// ➤ złotych», «7000 de lei», «2 000 eurótól»). A code may stand stuck to its figure («GBP45,000», «12.31EUR»), a name not («556euro-jobs»).
const CURRENCY_NAMES: [string, string[]][] = [
  [
    "EUR",
    ["euro", "euros", "euroa", "euron", "eura", "euró", "eurótól", "de euro"],
  ],
  ["GBP", []],
  ["USD", []],
  ["CZK", ["korun", "koruna", "koruny"]],
  ["PLN", ["złotych", "złote", "złoty"]],
  ["CHF", ["franken", "franchi"]],
  ["SEK", ["kronor"]],
  ["NOK", []],
  ["DKK", []],
  ["HUF", ["ft", "forint", "forinttól"]],
  ["RON", ["lei", "de lei"]],
];
const CODES = CURRENCY_NAMES.flatMap(([code, names]) => [
  code.toLowerCase(),
  ...names,
]);
const moneyWith = (signs: string) =>
  `(?:[${signs}]|zł|kč|(?<![\\p{L}])(?:${CODES.join("|")})(?![\\p{L}]))`;
const MONEY = moneyWith("€£$");
// ➤ A dollar sign is written before its figure: after one it is a template's or a script's («404 ${path}»).
const MONEY_AFTER = moneyWith("€£");
const A_CURRENCY = new RegExp(MONEY, "iu");
// ➤ The Nordic crown written «kr» or «:-» names no country's crown: the pay reader takes the offer's (builder/pay.ts).
const CROWN = String.raw`(?<![\p{L}])(?:kr\.?|kroner)(?![\p{L}])`;
const SIGNS: Record<string, string> = {
  EUR: "€",
  GBP: "£",
  USD: "\\$",
  CZK: "kč(?![\\p{L}])",
  PLN: "(?<![\\p{L}])zł(?![\\p{L}])",
};
const CURRENCIES: [RegExp, string][] = [
  ...CURRENCY_NAMES.map(([code, names]): [RegExp, string] => [
    new RegExp(
      [
        ...(SIGNS[code] ? [SIGNS[code]] : []),
        `(?<![\\p{L}])${code}(?![\\p{L}])`,
        ...names.map((name) => `(?<![\\p{L}\\d])${name}(?![\\p{L}])`),
      ].join("|"),
      "iu",
    ),
    code,
  ]),
  [/\d\s*(?:kr\.?|kroner|:-)(?![\p{L}])|(?<![\p{L}])kr\.?\s*\d/iu, "kr"],
];
// ➤ The US dollar is read as written («$200k-$400k /yr», "USD 90,000"), shown in dollars (the owner's choice, 1 November
// ➤ 2026): the sign other dollars share is the US one in the adverts of Europe, unless the line names another («CA$»,
// ➤ "AUD"), which is not read.
const OTHER_DOLLAR =
  /\b(?:ca|c|a|au|nz|s|sg|hk|r|mx|nt)\$|\b(?:cad|aud|nzd|sgd|hkd|mxn|brl|twd)\b/i;

// ➤ A figure: "60k", "28K", "30,5k", "34 000", "36.000", "52,000", "1925,46", «12 tys.», a Swiss «90'000.–».
const THOUSAND = `${anyWord(["thousand"])}(?![\\p{L}])`;
const NUMBER = String.raw`(\d{1,3}(?:[ .,'\u00a0\u202f]\d{3}(?!\d))+|\d+)(?:[.,](\d{4}(?!\d)|\d{1,2})|[.,][-–—])?\s*(${THOUSAND})?`;
// ➤ Belgian hourly pays carry four decimals («€ 17,8490»), read to the cent.
function amountOf(
  whole: string,
  cents: string | undefined,
  thousand: string | undefined,
) {
  const figure = Number(
    `${whole.replace(/[ .,'\u00a0\u202f]/g, "")}${cents ? `.${cents}` : ""}`,
  );
  return Math.round(figure * (thousand ? 1000 : 1) * 100) / 100;
}
// ➤ Two figures are a range only when a range's word or dash joins them («de 950 € à 1 400 €», "€60k-€120k", «27–33 EUR»,
// ➤ «de 28.000 hasta 36.000 €», «RAL da 28k fino a 36k€»); else the figure is the one the currency stands beside («€21,8 +
// ➤ 32 verlofdagen» is 21.80, not 21.80 to 32).
const JOIN_WORD = `(?:[-–—]|${anyWord(["rangeJoin", "upTo"])})`;
const RANGE = new RegExp(
  `${NUMBER}\\s*(?:${MONEY}|${CROWN}|:-)?\\s*${JOIN_WORD}\\s*(?:${MONEY})?\\s*${NUMBER}`,
  "iu",
);
// ➤ A band or a figure in thousands written with its «k» and no currency («28 - 35k», «50k-70k», «hasta 28K»): the
// ➤ country's, where a pay word names it.
const THOUSANDS_BAND = new RegExp(
  `(?<![\\p{L}\\d])\\d+\\s*k?\\s*${JOIN_WORD}\\s*\\d+\\s*k(?![\\p{L}])`,
  "iu",
);
const THOUSANDS_ONE =
  /(?<![\p{L}\d.,])(\d{1,3})(?:[.,](\d))?\s*(k)(?![\p{L}])/iu;
const inThousands = (text: string) =>
  THOUSANDS_BAND.test(text) || THOUSANDS_ONE.test(text);
const moneyIn = (text: string) => A_CURRENCY.test(text) || inThousands(text);
// ➤ A code stuck to a word's end is none: «soudeur 35 h» is no 35 euros (DAA-17).
const BESIDE = new RegExp(
  `(?:${MONEY}|${CROWN})\\s*${NUMBER}|${NUMBER}\\s*(?:${MONEY_AFTER}|${CROWN}|:-)`,
  "iu",
);
// ➤ A figure in a currency, alone or a range, as a run of words holds it.
const FIGURE = String.raw`\d(?:[\d.,'’ ]*\d)?(?:,-)?(?:\s*[kK](?![\p{L}]))?`;
const FIGURE_RUN = new RegExp(
  `(?:${MONEY}\\s*)?${FIGURE}(?:\\s*${MONEY})?(?:\\s*${JOIN_WORD}\\s*(?:${MONEY})?\\s*${FIGURE})?(?:\\s*${MONEY})?`,
  "giu",
);
// ➤ A figure just before a pay word, two words apart at most ("€70-100K salary", "€3,000 monthly base salary").
const FIGURE_BEFORE = new RegExp(
  `\\d\\s*[kK]?\\s*(?:${MONEY})?\\s*(?:\\p{L}+\\s+){0,2}$`,
  "iu",
);

// ➤ A currency written twice («14,50 EUR (€) - 18 EUR (€) / heure») and an hour glued to the first end of a band («£14.78ph -
// ➤ £17.97ph») hide the band: they are taken out before it is read (the free-label bench, 9 November 2026).
// ➤ Started only where a run of spaces starts: from inside one, a long run took seconds (DAA-27).
const TWICE = new RegExp(`(?<!\\s)\\s*\\(${MONEY}\\)`, "giu");
const GLUED_HOUR = /(\d)\s?ph(?=\s*[-–—]\s*[€£$]?\s*\d)/gi;
// ➤ And a period written after the band's first end too («$42/hr - $50/hr»: the band was read as its bottom alone), and a
// ➤ dollar written «USD$» or «US$» («USD$90,000 - USD$100,000»): the disagreements with the sources' fields.
const USD_SIGN = /\bUSD?\s?\$/g;
// ➤ And a band whose ends are named («min € 2600,00 – max € 3700,00», as Belgian boards write it): «max» read as a ceiling.
const NAMED_ENDS =
  /\bmin(?:imum)?\.?\s*([€£$]?\s*\d[\d.,]*(?:\s*[€£$])?)\s*[-–—]\s*max(?:imum)?\.?\s*/gi;
const GLUED_PERIOD = new RegExp(
  `(\\d)\\s*\\/\\s*(?:hrs?|hour|h|yr|year|annum|mo|month)\\b(?=\\s*(?:[-–—]|to)\\s*[€£$]?\\s*\\d)`,
  "giu",
);

// ════ Periods ════

// ➤ A period's words, a space allowed after their «/»: one that starts with a letter is a whole word («p/m», «per year»);
// ➤ one that starts with «/» or a sign may follow a figure or a letter («€50k/yr», «2.000 €/v»).
function periodRe(...concepts: string[]) {
  const all = concepts.flatMap((c) => words(c));
  const letterFirst = all.filter((w) => /^\p{L}/u.test(w)),
    others = all.filter((w) => !letterFirst.includes(w));
  const forms = [
    `(?<![\\p{L}])${anyOf(letterFirst)}`,
    ...(others.length ? [anyOf(others)] : []),
  ];
  return new RegExp(
    `(?:${forms.join("|")})(?![\\p{L}])`.replaceAll("/", "\\/\\s*"),
    "iu",
  );
}
// ➤ «Quattordici mensilità» counts the payments of a year's pay: no month (seen on the server, 14 November 2026).
const PERIODS: [RegExp, string][] = [
  [periodRe("perYear"), "year"],
  [periodRe("perMonth"), "month"],
  [periodRe("perHour", "hourlyPay"), "hour"],
  [periodRe("perDay"), "day"],
];
const A_PERIOD = PERIODS.map(([re]) => re.source).join("|");
const periodIn = (text: string) => PERIODS.find(([re]) => re.test(text))?.[1];
// ➤ The period written nearest the figure from..end, the table's order breaking a tie: «7.500 € brutto monatlich zzgl.
// ➤ Jahresprämie» is a month's, though «Jahr» comes first in the table (DAA-19).
// ➤ A period after an hour is the hours' («8 Stunden pro Tag», «€14,99 tot 40 uur per week»), never the pay's. A week
// ➤ names the pay's only right beside its figure («600 - 670 EUR / semana», «Na tydzień: 530 €»).
const PER_WEEK = new RegExp(periodRe("perWeek").source, "giu");
const HOUR_BEFORE = new RegExp(
  `(?<![\\p{L}])${anyWord(["hour"])}\\.?\\s*$`,
  "iu",
);
const WEEK_BESIDE = 12;
const notOfHours = (text: string, re: RegExp) =>
  [
    ...text.matchAll(new RegExp(re.source, `${re.flags.replace("g", "")}g`)),
  ].filter((m) => !HOUR_BEFORE.test(text.slice(0, m.index)));
const weeksIn = (text: string) => notOfHours(text, PER_WEEK);
const periodNear = (text: string, from: number, end: number) => {
  const gap = (m: RegExpExecArray) =>
    m.index >= end ? m.index - end : Math.max(0, from - m.index - m[0].length);
  const named = PERIODS.flatMap(([re, period], order) =>
    notOfHours(text, re).map((m) => ({ period, order, gap: gap(m) })),
  );
  const weeks = weeksIn(text)
    .map((m) => ({ period: "week", order: PERIODS.length, gap: gap(m) }))
    .filter((w) => w.gap <= WEEK_BESIDE);
  return (
    [...named, ...weeks].sort((a, b) => a.gap - b.gap || a.order - b.order)[0]
      ?.period || ""
  );
};
// ➤ «im ersten Lehrjahr», «im 2. Ausbildungsjahr» name the year of the training, not a pay per year.
const TRAINING_YEAR = wholeWordRe(["trainingYear"]);
// ➤ The ranges a pay of each period falls in: «Tarife ab 9,99 € pro Monat» is a price, not a month's pay.
const SANE: Record<string, number[]> = {
  hour: [5, 150],
  day: [30, 2000],
  week: [150, 5000],
  month: [400, 30000],
  year: [5000, 1000000],
};

// ════ What is no pay ════

// ➤ A ceiling ("up to", «tot», «bis zu», "till"; Polish and Czech «do», «až do» only right before a figure) is a pay only
// ➤ where a pay word names it («Gehalt bis zu 2.600 € brutto im Monat»), never a sum beside one.
const CEILING = new RegExp(
  `(?:^|[\\s(])${anyWord(["upTo", "maximum", "until"])}\\s|(?:^|[\\s(])${anyWord(["upToFigure"])}\\s+(?=\\d)`,
  "iu",
);
// ➤ A sum in millions or billions is a company's money ("$20M Series A", «€5 Mio. Umsatz», "Project Value: €30M"), never a
// ➤ pay: it is set aside and the rest of the line read («€ 3.500 b.p.m.» is a month's pay, not billions).
const SHORT_MILLIONS = ["m", "mn", "mm", "bn", "b"];
const FUNDS = new RegExp(
  `${MONEY}\\s?\\d+(?:[.,]\\d+)?\\s?${anyOf([...words("millions"), ...SHORT_MILLIONS])}(?![\\p{L}])(?!\\.\\s?p\\.)`,
  "giu",
);
// ➤ Nor is a line that gives a statistic ("The median annual wage for environmental engineers is $96,820", "an average
// ➤ total compensation of $112,000 based on 67 salaries"), as articles about jobs and theme demos do, or what one might come to
// ➤ earn («5.000 €, 7.000 € oder sogar 10.000 € im Monat sind möglich»).
const STATISTIC = wholeWordRe(["statistic"]);
// ➤ A net pay in any of its forms: «netos», «neta», «nets», «Nettogehalt» passed the bare word's check (DAA-03). Bare
// ➤ «net» is also «.NET» and Dutch «just», so it counts only beside a figure and with no gross word in the sentence.
const GROSS = wholeWordRe(["gross"]);
const NET_WORD = new RegExp(
  `(?<![\\p{L}.])${anyWord(["net"])}(?![\\p{L}])`,
  "iu",
);
const BARE_NET = /(?<![\p{L}.])net(?![\p{L}])/giu;
const FIGURE_NEAR = /[\d€£$]/;
export const NET = {
  test: (s: string) =>
    NET_WORD.test(s) ||
    (!GROSS.test(s) &&
      [...s.matchAll(BARE_NET)].some((m) =>
        FIGURE_NEAR.test(s.slice(Math.max(0, m.index - 15), m.index + 18)),
      )),
};
// ➤ The sums beside a pay that are none: a bonus, a ceiling, a company's money, an allowance, shares.
const NOT_PAY = wholeWordRe(["notPay", "upTo", "millions"]);
// ➤ A benefit's sum or a price («Tarife ab 9,99 € pro Monat»), and a company's figures.
const A_BENEFIT = wholeWordRe(["benefit", "price"]);
const BUSINESS_FIGURE = wholeWordRe(["businessFigure"]);

// ════ Bonuses ════

// ➤ A sum a bonus word stands beside, before or after it («3.000 € Startprämie», «1.500 € de prima de fichaje», «bonus de
// ➤ 3.000 €», «Prime d'embauche de 2 000 €», «tekenpremie van maar liefst € 2.000») is the bonus, not the pay: taken out
// ➤ of the title and the text before they are read, the word «bonus» left in its place so the sentence still names one
// ➤ (DAA-04). Not one joined to the pay by «+» («€70K + bonus», «45.000 € + Prämie»), and bare «bonus» only before its
// ➤ sum: «€60k bonus» may be a pay with a bonus. Dutch «prima arbeidsvoorwaarden» and Italian «da prima occupazione a
// ➤ senior €23.000» name none. Nor a sum the pay word names, with a bonus after it («loon vanaf €17,62 ploegenpremie»:
// ➤ the pay with its shift premium; the server's comparison, 15 November 2026).
const BONUS = anyWord(["bonus"], { bare: true });
// ➤ A bonus for joining is one wherever it stands («erfahrungsbasiertes Gehalt 4.000€ Willkommensprämie»: the pay names no
// ➤ figure, the server's comparison of 15 November 2026), and a sentence that names one gives no pay from a gross or a
// ➤ period alone; other premiums beside the pay leave it («€ 1.071,- brutto/Monat, Prämien für besondere Leistungen»).
const JOINING_BONUS = wholeWord(["joiningBonus"], { bare: true });
const A_JOINING_BONUS = new RegExp(JOINING_BONUS, "iu");
const SUM_OF = anyWord(["sumOf"]);
const SUM = String.raw`(?:${MONEY}[^\S\n]{0,2}\d{1,6}(?:[.,' \u00a0]\d{3})*(?:[.,]\d{1,2})?|\d{1,6}(?:[.,' \u00a0]\d{3})*(?:[.,]\d{1,2})?(?:,-)?[^\S\n]{0,2}${MONEY})`;
// ➤ Started only at a figure or a currency, never inside a figure.
const SUM_START = `(?=\\d|${MONEY})(?<![\\d.,'])`;

// ════ Pay words and labels ════

// ➤ The legal minimum wage is no job's pay, unless the collective agreement sets it («Mindestlohn laut KV»).
// ➤ Checked where the word ends, so that it costs nothing where no pay word is.
const NOT_UNAGREED_MINIMUM = `(?:(?<!${anyWord(["minimumWage"])})|(?=\\s+${anyWord(["accordingTo"])}\\s+${anyWord(["collectiveAgreement"])}))`;
// ➤ A word that names the pay in a sentence («Rémunération entre…», «Salaris € 3.350», German compounds of Lohn, Gehalt or
// ➤ Vergütung), or its hourly rate («Uurtarief», «Timpris»). A figure in a currency must follow, so «Lohnbuchhaltung» or
// ➤ «Gehaltsabrechnung» alone say nothing.
const PAY_WORD = new RegExp(
  `(?<![\\p{L}])${anyWord(["payWord", "hourlyPay"])}(?![\\p{L}])${NOT_UNAGREED_MINIMUM}`,
  "iu",
);
const NOT_PAY_WORD = `(?!${PAY_WORD.source})[\\p{L}'’]+`;
const BONUS_SUM = new RegExp(
  [
    // ➤ «3.000,00 € (brutto) Willkommensprämie»
    `${SUM_START}${SUM}[^\\S\\n]{1,3}${JOINING_BONUS}`,
    // ➤ «1.500 € de prima de fichaje», «2.000€ Neustart-Bonus»: not after «+» nor the pay word's own figure.
    `${SUM_START}(?<!\\+[^\\S\\n]*)(?<!${PAY_WORD.source}[^\\S\\n]*:?(?:[^\\S\\n]+\\p{L}+)?[^\\S\\n]*)${SUM}[^\\S\\n]{1,3}(?:${SUM_OF}[^\\S\\n]?)?(?:\\p{L}+-(?=\\p{L})|(?!bonus(?![\\p{L}])))${BONUS}(?![\\p{L}])`,
    // ➤ «Prime d'embauche de 2 000 €»: not a bonus the pay includes («inklusive Fixprämie: € 2.830,65 brutto/Monat»), nor
    // ➤ a pay's floor after it («fixe + primes à partir de 42 000 € brut annuel»).
    `(?<![\\p{L}])(?=\\p{L})(?<!${anyWord(["includes"])}[^\\S\\n]{1,3})${BONUS}(?![\\p{L}])(?:[^\\S\\n]*:|[^\\S\\n]+${anyWord(["bonusOf"])}|(?:[^\\S\\n]+${NOT_PAY_WORD}){0,2}[^\\S\\n]+${SUM_OF}(?:[^\\S\\n]+${NOT_PAY_WORD}){0,2})[^\\S\\n]*(?<!${anyWord(["fromAmount"])}[^\\S\\n]*)${SUM}`,
  ].join("|"),
  "giu",
);
// ➤ Line by line, and only the lines that name a currency: no bonus's sum spans two lines, and most lines name none.
const withoutBonusSums = (text: string) =>
  text
    .split("\n")
    .map((line) =>
      A_CURRENCY.test(line) ? line.replace(BONUS_SUM, " bonus ") : line,
    )
    .join("\n");
// ➤ A title's sum that is a bonus, not the pay: one for joining («NÁBOROVÝ PŘÍSPĚVEK 100 000 Kč», "$5,000 Sign On Bonus"),
// ➤ a Czech premium or reward, or a dollar sum a bonus stands beside («Earn a $5,000 Bonus!», «Bonus $2,000»); not a pay a
// ➤ bonus comes on top of («€70K + bonus», «€60K + Bonus + Car», 9 November 2026).
const TITLE_BONUS = new RegExp(
  `${wholeWord(["joiningBonus"], { bare: true })}|${wholeWord(["titleBonus"])}|\\$\\s*[\\d.,]+\\s*k?\\s+bonus|(?<![\\p{L}])bonus\\s+(?:of\\s+)?(?:up\\s+to\\s+)?\\$`,
  "iu",
);

// ➤ The label may carry a word before or after it ("Starting salary", "Salary range", «Bruttojahresgehalt», «Salaire
// ➤ annuel brut») and stand without its colon when the figure or the currency follows it ("Salary £45,000 - £55,000"),
// ➤ as the offers' diary found in boards' texts (1 November 2026).
const LABEL = new RegExp(
  `(?:^|\\n|[.;•·|])[^\\p{L}\\p{N}\\n]{0,6}` +
    `(?:${anyWord(["gross", "payLabelBefore"])}\\s*(?:-\\s*)?)*${anyWord(["payLabel"])}${NOT_UNAGREED_MINIMUM}` +
    `(?:\\s+${anyWord(["gross", "payLabelAfter"])})*\\s*(?:\\([^)]{0,30}\\))?\\s*` +
    `(?:[:：]\\s*|${anyWord(["between", "labelToFigure"])}\\s+(?=${MONEY}|\\d)|(?=${MONEY}|\\d))([^\\n]{3,140})`,
  "giu",
);
// ➤ A label glued to the word before it, as a page that lost its lines writes it («Location: DublinSalary: €70,000»).
// ➤ Only the long labels: short ones («Pay», «Rate») end too many names.
const capitalised = (w: string) => w[0].toUpperCase() + w.slice(1);
const GLUED_LABEL = new RegExp(
  `(\\p{Ll})(${anyOf(
    words("payLabel")
      .filter((w) => w.length >= 6 && !w.includes(" "))
      .map(capitalised),
  )})(?=\\s*:)`,
  "gu",
);

// ════ One line ════

// ➤ The currency beside the figure read, when the line names two («£45,000 … EUR», «CHF 95,000 – 110,000 (EUR …)»): the
// ➤ one written just before it, else within it, else just after, however long its name («50 de mii de lei»); not the
// ➤ first of the list (DAA-21).
const startsAt = (rest: string, re: RegExp) =>
  rest.match(re)?.index === rest.length - rest.trimStart().length;
function currencyBeside(line: string, from: number, end: number) {
  const at = (a: number, b: number) =>
    CURRENCIES.flatMap(([re, c]) => {
      const m = line.slice(a, b).match(re);
      return m ? [{ c, i: m.index ?? 0 }] : [];
    });
  const before = at(Math.max(0, from - 6), from).sort((x, y) => y.i - x.i)[0];
  const inside = at(from, end).sort((x, y) => x.i - y.i)[0];
  const after = CURRENCIES.find(([re]) => startsAt(line.slice(end), re));
  return (
    (before || inside || at(end, end + 6).sort((x, y) => x.i - y.i)[0])?.c ??
    after?.[1]
  );
}
const A_CURRENCY_OR_CROWN = new RegExp(`${MONEY}|${CROWN}`, "iu");
const CURRENCY_END = new RegExp(`(?:${MONEY}|${CROWN})$`, "iu");
const CURRENCY_NEXT = new RegExp(`^\\s*(?:${MONEY}|${CROWN})`, "iu");
const stuckToWord = (before: string) =>
  /\p{L}$/u.test(before) && !CURRENCY_END.test(before);
const HOURS_NEXT = new RegExp(`^\\s*${anyWord(["hour"])}(?![\\p{L}])`, "iu");
// ➤ The band of a line («38-42.000 Kč»), or its one figure beside a currency, as [min, max, from, end, upTo]: upTo when
// ➤ the figure is a ceiling, read only when a pay word names it.
function figuresOf(
  line: string,
  named: boolean,
): [number, number, number, number, boolean] | null {
  const range = line.match(RANGE),
    k = range ? range[3] || range[6] : undefined;
  const low = range ? amountOf(range[1], range[2], range[3] || k) : 0,
    high = range ? amountOf(range[4], range[5], range[6] || k) : 0;
  // ➤ A range that writes its thousands once («38-42.000 Kč», «3-4.000 €») means both ends in thousands.
  const low1000 =
    range &&
    low < 1000 &&
    high >= 1000 &&
    low * 1000 <= high &&
    low * 2000 >= high
      ? low * 1000
      : low;
  // ➤ A band with no currency beside it, in a line that writes one figure with its currency, is no pay band: «SMIC à 2 000 €
  // ➤ … Référence : 2026-3332» is 2,000 € a month, not 2,026 to 3,332 (alliance-emploi.org, 9 November 2026). One written
  // ➤ in thousands is («RAL 30K - 35K, Ticket Restaurant 6,00€»).
  const at = range?.index ?? 0;
  const rangeEnd = at + (range?.[0].length ?? 0);
  const bare =
    range &&
    !A_CURRENCY_OR_CROWN.test(line.slice(Math.max(0, at - 6), rangeEnd + 6)) &&
    !CURRENCY_NEXT.test(line.slice(rangeEnd));
  // ➤ Two figures joined that are no band (the second smaller: «3.500 € und 30 Tage Urlaub») leave the first alone, and so
  // ➤ does a low end stuck to a word's end, a code's figure («Bezahlung nach LG2 - 15,46 € pro Stunde»), and a high end of
  // ➤ hours («€14,99 tot 40 uur per week»).
  const band =
    range &&
    high >= low1000 &&
    !(bare && !k && BESIDE.test(line)) &&
    !stuckToWord(line.slice(0, at)) &&
    !HOURS_NEXT.test(line.slice(rangeEnd));
  if (band) return [low1000, high, at, rangeEnd, false];
  const one = line.match(BESIDE) ?? (named ? line.match(THOUSANDS_ONE) : null);
  if (!one) return null;
  // ➤ A ceiling's word counts only before the figure: «bis» of a closing day after it is no ceiling (DAA-20).
  const from = one.index ?? 0,
    end = from + one[0].length;
  const upTo = CEILING.test(`${line.slice(0, end)} `);
  if (upTo && !named) return null;
  const amount = one[1]
    ? amountOf(one[1], one[2], one[3])
    : amountOf(one[4], one[5], one[6]);
  return [amount, amount, from, end, upTo];
}
// ➤ A pay read in words: its figures, currency and period ('' when none is named). Where a pay word or label names it
// ➤ (`named`), a ceiling alone is read too, and a band in thousands with no currency, the country's («Rango salarial: 28 -
// ➤ 35k», «Salario negociable dentro de la horquilla de entre 30-33k»).
// ➤ `cents` when a figure is written with them («min € 22,00 – max € 24,00»): the pay reader takes such a pay with no period
// ➤ for an hour's where it fits one.
export type TextPay = {
  min: number;
  max: number;
  currency: string;
  period: string;
  cents?: boolean;
};
const WITH_CENTS = /\d[.,]\d{2}(?!\d)/;
export function payInText(s: unknown, { named = false } = {}): TextPay | null {
  const line = String(s || "")
    .replace(TWICE, "")
    .replace(USD_SIGN, "$")
    .replace(NAMED_ENDS, "$1 – ")
    .replace(GLUED_HOUR, "$1")
    .replace(GLUED_PERIOD, "$1")
    .replace(FUNDS, " ");
  if (!line.trim() || NET.test(line) || STATISTIC.test(line)) return null;
  const currency =
    CURRENCIES.find(([re]) => re.test(line))?.[1] ??
    (named && inThousands(line) ? "" : undefined);
  if (currency === undefined || (currency === "USD" && OTHER_DOLLAR.test(line)))
    return null;
  const figures = figuresOf(line, named);
  if (!figures) return null;
  const [min, max, from, end, upTo] = figures;
  if (!(min >= 5) || max < min) return null;
  // ➤ The period written before the figure or within 40 characters after it: a second figure's period further on is its
  // ➤ own. Further on in the sentence too, when no other figure stands between («4,500 to 8,000 eur gross (and more in
  // ➤ exceptional cases) per month»: the month was lost, 9 November 2026).
  const further = line.slice(end, end + 120),
    stop = further.search(/\d/);
  const period =
    periodNear(line.slice(0, end + 40), from, end) ||
    periodNear(stop < 0 ? further : further.slice(0, stop), 0, 0);
  const near = currencyBeside(line, from, end);
  if (near === "USD" && OTHER_DOLLAR.test(line)) return null;
  // ➤ A ceiling is the top alone, its bottom 0 («bis zu 2.600 €»: «up to», as the owner chose for the fields, DAA-28).
  const pay = { min: upTo ? 0 : min, max, currency: near || currency };
  const cents = WITH_CENTS.test(line.slice(from, end)) ? { cents: true } : {};
  return {
    ...pay,
    period: TRAINING_YEAR.test(line) && period === "year" ? "" : period,
    ...cents,
  };
}

// ════ Sentences ════

// ➤ The sentences a pay is read in, without those whose only money is another country's dollar («CA$85,000 per year»):
// ➤ a reader handed the figure from its «$» on read it as US dollars (NO2-04).
const paySentences = (text: string) =>
  sentences(text).filter(
    (s) => !(OTHER_DOLLAR.test(s) && !A_CURRENCY.test(s.replace(/\$/g, ""))),
  );
// ➤ A period written just before the pay word («das monatliche Mindestgehalt von 4.061,00 EUR»), when the words after it name none.
// ➤ The pay word up to `to` is read with it: «mesačná mzda» and «hodinový plat» name their period with it.
const periodBefore = (pay: TextPay | null, s: string, at: number, to = at) =>
  pay && !pay.period
    ? { ...pay, period: periodIn(s.slice(Math.max(0, at - 30), to)) || "" }
    : pay;
// ➤ Where the first figure of money ends, the longest from where it starts: one with its currency, or one in thousands
// ➤ with its «k» («RAL 30K - 35K», «RAL da 28k fino a 36k€»).
const figureEnd = (str: string) => {
  const withCurrency = [...str.matchAll(FIGURE_RUN)].find((g) =>
    A_CURRENCY.test(g[0]),
  );
  const first = [
    withCurrency,
    str.match(THOUSANDS_BAND),
    str.match(THOUSANDS_ONE),
  ]
    .filter((m) => m != null)
    .map((m) => ({ from: m.index ?? 0, end: (m.index ?? 0) + m[0].length }))
    .sort((a, b) => a.from - b.from || b.end - a.end)[0];
  return first ? first.end : -1;
};
// ➤ Where the words before a pay word start, never inside a figure: «Évi 40 000 €» cut at «0 000 €» read nothing.
const windowStart = (s: string, at: number, len: number) => {
  const from = Math.max(0, at - len),
    figure = /\d[\d.,'\u00a0\u202f ]*$/.exec(s.slice(0, from));
  return figure && /^[\d.,'\u00a0\u202f ]*\d/.test(s.slice(from))
    ? figure.index
    : from;
};
// ➤ The words after a pay word, never cut inside a figure: a window cut at «£9» of "£93,000 to £112,500" read 9.
const windowAfter = (s: string, at: number, len: number) => {
  for (const g of s.slice(at, at + len + 60).matchAll(FIGURE_RUN))
    if (g.index < len && g.index + g[0].length > len)
      return s.slice(at, at + g.index + g[0].length);
  return s.slice(at, at + len);
};

// ➤ A sentence that names the pay and gives its figure within the words after it, with no label before it («Rémunération
// ➤ entre 32 000 et 37 000€ brut par an», «Salaris € 3.350 – € 5.100 p/m», «Een salaris van €16,50 per gewerkt uur»): read
// ➤ unless the sentence speaks of a bonus, a ceiling, an allowance, a company's figures or shares, whose sums are no pay.
// ➤ On the diary's sample of 56,565 adverts, 343 pays where label and title gave none (1 November 2026).
// ➤ A text flattened into one long run, as some agencies' blocks give it («…Unbefristete Einstellung Attraktive Vergütung
// ➤ ab 20 € Brutto pro Stunde Weihnachts- und Urlaubsgeld…»), is read the same way around each pay word: the words around it
// ➤ instead of the whole sentence.
const AROUND = 60;
// ➤ An allowance named before a pay's figure owns it («um subsídio de alojamento de 500 euros»); past the figure, words
// ➤ after its period are another item («1500 EUR/Mês Subsídio de refeição»), words before it are the figure's own.
const notPayUpTo = (s: string, to: number) => {
  const rest = s.slice(to);
  return (
    NOT_PAY.test(s.slice(0, to).replace(CEILING, " ")) ||
    (!periodIn(rest.slice(0, 16)) && notPayNext(rest))
  );
};
function payInSentences(text: string) {
  if (!moneyIn(text) || !PAY_WORD.test(text)) return null;
  for (const s of paySentences(text)) {
    if (STATISTIC.test(s) || NET.test(s)) continue;
    if (s.length <= 300) {
      const m = s.match(PAY_WORD);
      const after = m && windowAfter(s, m.index ?? 0, 120);
      if (!after || !moneyIn(after)) continue;
      const end = figureEnd(after);
      if (notPayUpTo(s, (m.index ?? 0) + (end < 0 ? after.length : end)))
        continue;
      const pay = periodBefore(
        payInText(after, { named: true }),
        s,
        m.index ?? 0,
        (m.index ?? 0) + m[0].length,
      );
      if (pay) return pay;
      continue;
    }
    for (const m of s.matchAll(new RegExp(PAY_WORD.source, "giu"))) {
      const after = windowAfter(s, m.index, 120);
      if (
        !A_CURRENCY.test(after) ||
        NOT_PAY.test(s.slice(Math.max(0, m.index - AROUND), m.index + 120))
      )
        continue;
      const pay = periodBefore(
        payInText(after),
        s,
        m.index,
        m.index + m[0].length,
      );
      if (pay) return pay;
    }
  }
  for (const s of paySentences(text))
    for (const m of STATISTIC.test(s) || NET.test(s)
      ? []
      : s.matchAll(new RegExp(PAY_WORD.source, "giu"))) {
      const pay = payAround(s, m);
      if (pay) return pay;
    }
  return null;
}

// ➤ A pay word's figure judged by its own words only, when no sentence gave a pay above: the words from the pay word to
// ➤ the first figure in a currency within 160 characters, and the figure's next word or two, must name no bonus, allowance,
// ➤ ceiling or company money (NOT_PAY); what a sentence offers besides does not count ("The annual pay range for the role is
// ➤ €150,000 - €200,000 OTE plus benefits and pre-IPO stock options", «La retribuzione annua lorda per questo ruolo … è
// ➤ compresa tra € 29.400 e € 36.500», «€18.48 en hierbij komt een ploegenpremie»). A figure just before the pay word is
// ➤ read too ("€70-100K salary + equity"). The report of 2 November 2026 counted 4,467 offers whose pay word and figure
// ➤ stood so apart.
const OFFERED_BESIDES = new RegExp(
  `\\s(?:\\+|${anyWord(["besides", "includes"])})\\s|[,;(+]`,
  "iu",
);
const notPayNext = (rest: string) =>
  NOT_PAY.test(rest.slice(0, 30).split(OFFERED_BESIDES)[0]);
function payAround(s: string, m: RegExpExecArray) {
  const after = windowAfter(s, m.index, 160),
    end = figureEnd(after);
  if (
    end >= 0 &&
    !NOT_PAY.test(s.slice(Math.max(0, m.index - 30), m.index + end)) &&
    !notPayNext(after.slice(end))
  ) {
    const pay = periodBefore(
      payInText(s.slice(m.index, m.index + end + 30)),
      s,
      m.index,
      m.index + m[0].length,
    );
    if (pay) return pay;
  }
  const from = windowStart(s, m.index, 30),
    before = s.slice(from, m.index);
  // ➤ Its period may stand before the figure («Évi 40 000 € és 50 000 € közötti fizetést»).
  return FIGURE_BEFORE.test(before) &&
    A_CURRENCY.test(before) &&
    !NOT_PAY.test(before)
    ? periodBefore(payInText(`${before}${m[0]}`), s, from)
    : null;
}

// ➤ A figure in a currency that the text calls gross, with no pay word beside it («€ 3.300 brutto / Monat», "EUR 2,000 to
// ➤ 2,500 gross per month", «3.400 - 5.000 EUR gross», «Brutto ab 3.000 €»): a pay all the same, the gross word within a
// ➤ few characters of the figure. Not when the sentence speaks of a bonus, an allowance or a company's money (NOT_PAY:
// ➤ "€1,200 Gross … to support relocation"), nor of a profit or a margin. The report of 2 November 2026 counted 5,087
// ➤ offers whose pay figure had no pay word beside it. A sentence that opens with a ceiling, after a label at most, is
// ➤ the pay's top («Hasta 35.000€ brutos anuales», «Tot €3.000 bruto per maand»); one further on is a bonus's or an
// ➤ allowance's («Prime jusqu'à 2 000 € brut»).
const opensWithCeiling = (s: string) =>
  CEILING.exec(s.replace(/^[^:]{0,30}:/, "").trimStart())?.index === 0;
// ➤ With no currency, a band or a figure in thousands called gross a year is the country's pay too («30-35K brutos
// ➤ anuales», «45-50k bruto anual»).
const A_YEAR_NEXT = new RegExp(`^\\s*(?:${PERIODS[0][0].source})`, "iu");
function grossInSentences(text: string) {
  if (!moneyIn(text) || !GROSS.test(text)) return null;
  for (const s of paySentences(text)) {
    const topOnly = opensWithCeiling(s);
    if (s.length > 300 || NOT_PAY.test(topOnly ? s.replace(CEILING, " ") : s))
      continue;
    if (BUSINESS_FIGURE.test(s) || A_JOINING_BONUS.test(s)) continue;
    for (const g of s.matchAll(new RegExp(GROSS.source, "giu"))) {
      const before = s.slice(Math.max(0, g.index - 35), g.index),
        after = s.slice(g.index + g[0].length, g.index + g[0].length + 35);
      if (!/\d[^\d]{0,22}$/u.test(before) && !/^[^\d]{0,18}\d/u.test(after))
        continue;
      const near = `${before}${g[0]}${after}`,
        yearly = !A_CURRENCY.test(near) && A_YEAR_NEXT.test(after);
      if (!A_CURRENCY.test(near) && !yearly) continue;
      const pay = payInText(near, { named: topOnly || yearly });
      if (pay) return pay;
    }
  }
  return null;
}

// ➤ A figure in a currency whose period follows it at once, with no pay word nor gross word beside it («Fulltime, €3000
// ➤ p/m!», "£28 - £30 per hour", «17,00 - 19,00 EUR pro Stunde», «13–15 €/h»): a pay too, unless the words around it name
// ➤ a bonus, an allowance, a budget, a benefit's sum or a price, or a ceiling is written before it («Salaris: tot €89.000
// ➤ bruto per jaar»). The free-label bench of 9 November 2026 found these missed on adverts whose source states the pay
// ➤ in a field of its own.
function periodInSentences(text: string) {
  if (!A_CURRENCY.test(text)) return null;
  for (const s of paySentences(text)) {
    if (
      s.length > 300 ||
      STATISTIC.test(s) ||
      NET.test(s) ||
      BUSINESS_FIGURE.test(s) ||
      A_JOINING_BONUS.test(s)
    )
      continue;
    for (const g of s.matchAll(FIGURE_RUN)) {
      if (!A_CURRENCY.test(g[0]) || !/\d/.test(g[0])) continue;
      // ➤ «€70,-» writes no cents.
      const end = g.index + g[0].length,
        after = s.slice(end, end + 16).replace(/^,-/, "");
      const words = after.split(/[,;(]/)[0],
        period = periodIn(words) ?? (weeksIn(words).length ? "week" : "");
      if (!period) continue;
      const around = s.slice(Math.max(0, g.index - 40), end + 40);
      // ➤ The figures after a ceiling are its own cases («tot € 17,16 per uur …, en op zondag zelfs € 30,38 per uur»).
      if (CEILING.test(` ${s.slice(Math.max(0, g.index - 14), g.index + 1)}`))
        break;
      if (NOT_PAY.test(around) || A_BENEFIT.test(around)) continue;
      const pay = payInText(`${g[0]} ${after}`);
      const [low, high] = SANE[period] || [5, Infinity];
      if (pay && pay.min >= low && pay.max <= high) return { ...pay, period };
    }
  }
  return null;
}

// ════ Lines of their own ════

// ➤ Italy's RAL (retribuzione annua lorda) names a gross pay a year, in euros, and is often written with no currency («RAL
// ➤ 33-45k», «RAL: 35.000», «RAL 39K + bonus»): its euro is written in when its figure reaches ten thousand. A RAL colour
// ➤ («RAL 7016», «RAL 9010», in painters' and fitters' adverts) is a four-figure number and stays no pay. The free-label
// ➤ bench, 9 November 2026.
const IN_THOUSANDS = String.raw`\d{2,3}(?:[.,]\d)?`;
const RAL_FIGURE = new RegExp(
  String.raw`(?<![\p{L}])(ral\s*:?\s*)(?=\d{2,3}[.,' ]?\d{3}(?!\d)|${IN_THOUSANDS}(?:\s?[-–]\s?${IN_THOUSANDS})?\s?k(?![\p{L}]))`,
  "giu",
);
const withRalEuros = (text: string) => text.replace(RAL_FIGURE, "$1€ ");
// ➤ A line that is a pay band alone, with its currency («$70,000-$80,000 USD», «€55k – €65k», «45.000 - 55.000 €
// ➤ p.a.»): a board's pay field written as text. Only a band of two figures, on a short line of its own or in a cell of
// ➤ a line of facts set apart by bars («Toulouse | CDI | 45K€ – 60K€»), neither a ceiling nor company money (the
// ➤ free-label bench, 9 November 2026).
const BAND_END = `(?:${MONEY})?\\s*\\d[\\d.,' ]*\\s*[kK]?\\s*(?:${MONEY})?`;
// ➤ Either may end with a note on it («selon profil», «je nach Erfahrung», "DOE").
const NOTES_TO_THE_END = `(?:[^\\p{L}\\d]*${anyWord(["payNote"])})*[^\\p{L}\\d]*$`;
const BAND_LINE = new RegExp(
  `^[^\\p{L}\\d€£$]*${BAND_END}\\s*${JOIN_WORD}\\s*${BAND_END}\\s*(?:${A_PERIOD}|${GROSS.source})?${NOTES_TO_THE_END}`,
  "iu",
);
// ➤ So is a floor alone on its line («💸 A partir de 32 K€», «Ab 50k € je nach Erfahrung»), of a thousand or more.
const FLOOR_LINE = new RegExp(
  `^[^\\p{L}\\d€£$]*${anyWord(["fromAmount"])}\\s+${BAND_END}\\s*(?:${A_PERIOD}|${GROSS.source})?${NOTES_TO_THE_END}`,
  "iu",
);
// ➤ A Czech monthly pay alone on its line («65.000 Kč», «45 000 Kč hrubého»), as Czech boards write their pay field into the
// ➤ text: one figure of a month's pay, nothing else on the line (the free-label bench, 9 November 2026).
const LONE_CZK = new RegExp(
  `^[^\\p{L}\\d]*(\\d{2,3})[ .\\u00a0]?(\\d{3})\\s*(?:kč|czk)(?:\\s*(?:${GROSS.source}|${PERIODS[1][0].source}))*[^\\p{L}\\d]*$`,
  "iu",
);
// ➤ Nor a band its neighbours call a budget, a project's or a company's money («€ 2.000 - € 5.000» over «per project
// ➤ budget»), nor a Czech sum its neighbour calls a bonus or a price («Náborový bonus», «Odměna za doporučení»).
const PROJECT_MONEY = wholeWordRe(["projectMoney"]);
const BONUS_OR_PRICE = new RegExp(
  `${wholeWord(["bonus", "joiningBonus"], { bare: true })}|${wholeWord(["titleBonus", "price"])}`,
  "iu",
);
function bandAlone(text: string) {
  const lines = text.split(/\n+| \| /);
  for (const [i, line] of lines.entries()) {
    const l = line.trim().replace(NAMED_ENDS, "$1 – ");
    const czk = l.length <= 40 && l.match(LONE_CZK),
      floor = FLOOR_LINE.test(l);
    if (
      !czk &&
      (l.length > 50 || !(BAND_LINE.test(l) || floor) || !A_CURRENCY.test(l))
    )
      continue;
    const around = `${lines[i - 1] || ""} ${lines[i + 1] || ""}`;
    if (
      NOT_PAY.test(around.replace(CEILING, " ")) ||
      A_BENEFIT.test(around) ||
      PROJECT_MONEY.test(around)
    )
      continue;
    if (czk) {
      const n = Number(czk[1] + czk[2]);
      if (n >= 15000 && n <= 300000 && !BONUS_OR_PRICE.test(around))
        return { min: n, max: n, currency: "CZK", period: "month" };
      continue;
    }
    const pay = payInText(l);
    if (pay && (pay.min < pay.max || (floor && pay.min >= 1000))) return pay;
  }
  return null;
}
// ➤ A Polish line with an employment band and a B2B one («UoP: 9 000 PLN – 12 500 PLN brutto | B2B: 65 PLN – 85 PLN / h»,
// ➤ «13 000 zł—17 000 zł (B2B)/ 11 000—15 000 zł brutto (UoP)»): the B2B part, an invoice net of VAT, is left out, so the
// ➤ employment band is read whole and with its own period (the pay comparison of 9 November 2026).
const B2B = /(?<![\p{L}])b2b(?![\p{L}])/iu;
const EMPLOYMENT = wholeWordRe(["employmentContract", "gross"], { bare: true });
const withoutB2B = (text: string) =>
  text
    .split("\n")
    .map((line: string) =>
      B2B.test(line) && EMPLOYMENT.test(line)
        ? line
            .split(/\s\|\s|(?<=\))\s*\/\s*|;\s/)
            .filter((part) => !B2B.test(part) || EMPLOYMENT.test(part))
            .join(" | ")
        : line,
    )
    .join("\n");

// ════ The advert ════

// ➤ A title's pay: the figures from its first figure or currency sign on. Not a ceiling alone, but a band joined by a
// ➤ ceiling's word is one («Mzda 30 000 až 40 000 Kč»).
function payInTitle(title: string) {
  if (
    !A_CURRENCY.test(title) ||
    CEILING.test(title.replace(RANGE, " ")) ||
    TITLE_BONUS.test(title)
  )
    return null;
  const pay = payInText(title.replace(/^[^€£$\d]*?(?=[€£$\d])/, ""));
  // ➤ A title's pay under a hundred with no period is an hour's («Elektricien €22», «Monteur €18-€22»): no month or year is
  // ➤ so small, and a title writes thousands with their «k». The pay reader guesses an hour only from cents, so these were
  // ➤ set aside (1,145 offers in the report of 2 November 2026).
  return pay && !pay.period && pay.max < 100 ? { ...pay, period: "hour" } : pay;
}
// ➤ The pay of a title, or of the first labelled pay line of a text that names figures, or of its first sentence that
// ➤ names the pay with its figure, or of a line that is a band alone. The first label that gives a pay, not merely the
// ➤ first one written: "Turnover rate: low" before "Salary: €50,000" must not hide it.
export function payOfText(title: unknown, text: unknown): TextPay | null {
  const inTitle = payInTitle(
    withoutBonusSums(String(title || "").replace(TWICE, "")),
  );
  if (inTitle) return inTitle;
  const body = withRalEuros(
    withoutB2B(
      withoutBonusSums(String(text || "").replace(TWICE, "")).replace(
        GLUED_LABEL,
        "$1 $2",
      ),
    ),
  );
  for (const m of body.matchAll(LABEL)) {
    const labelled = payInText(m[0], { named: true });
    if (labelled) return labelled;
  }
  return (
    payInSentences(body) ||
    grossInSentences(body) ||
    periodInSentences(body) ||
    bandAlone(body)
  );
}
