import { sentences } from "../../../shared/kit/sentences.js";
import { payInText, type TextPay } from "./pay-in-text.js";
import {
  CEILING,
  GROSS,
  isNet,
  OTHER_DOLLAR,
  periodIn,
  STATISTIC,
} from "./patterns.js";

// The readers that find a pay in a text with no labelled pay line (legacy `builder/text-pay.mjs`),
// each giving its figures to `payInText`.

// A sentence that names the pay and gives its figure within the words after it, with no label
// before it («Rémunération entre 32 000 et 37 000€ brut par an», «Salaris € 3.350 – € 5.100 p/m»,
// «Een salaris van €16,50 per gewerkt uur»): read unless the sentence speaks of a bonus, a
// ceiling, an allowance, a company's figures or shares, whose sums are no pay. On the diary's
// sample of 56,565 adverts, 343 pays where label and title gave none (1 November 2026).
// German pay in any compound of Lohn, Gehalt or Vergütung («Lohn ab 18,00 € / h»,
// «Einstiegslohn», «Bruttomonatslohn», «Ausbildungsvergütung»), «Entlohnung» and
// «Entgeltgruppe»: of 214 pays the readers found missing, 45 were read (7 November 2026). A
// figure in a currency must follow, so «Lohnbuchhaltung» or «Gehaltsabrechnung» alone say nothing.
const PAY_WORD =
  /(?<![\p{L}])(?:salary|salaries|salaire|rémunération|remuneration|\p{L}*gehalt|(?!mindestlohn(?!\s+(?:laut|lt\.?|gemäß|gem\.?|nach)\s+(?:kv|kollektivvertrag)))\p{L}*lohn|gehalts\p{L}*|verdienst|bezahlung|\p{L}*loon|beloning|verloning|pay range|pay band|pay scale|base pay|annual pay|hourly pay|pay rate|stundensatz|mindestentgelt|\p{L}*vergütung|stagevergoeding|\p{L}*verguetung|\p{L}*entlohnung|entgelt|entgeltgruppe|lehrlingsentschädigung|sueldo|salario|retribución|retribucion|compensation|\p{L}*salaris(?:sen)?|salaris(?:range|indicatie|schaal|niveau|pakket)|loon|stipendio|retribuzione|compenso|remuneraci[oó]n|retribuci[oó]|salari|sal[aá]rio|remunera[cç][aã]o|wynagrodzenie|zarobki|ohodnocen\p{L}*|stawk\p{L}*|plat|mzda|\p{L}*lön|\p{L}*løn|\p{L}*lønn|\p{L}*palkka|palkkaus|palkkahaitari|\p{L}*entgelt|wage|wages|ote)(?![\p{L}])/iu;
const PAY_WORDS = new RegExp(PAY_WORD.source, "giu");
export const NOT_PAY =
  /(?<![\p{L}])(?:bonus|up to|jusqu|bis zu|hasta|budget|revenue|turnover|chiffre d.affaires|umsatz|million|millions|mio|mrd|billion|funding|raised|investment|per km|kilometer|allowance|voucher|vouchers|tickets?|meal|repas|essens|zuschuss|subsidy|referral|relocation|equity|stock|shares|budżet|budzet)(?![\p{L}])/iu;
export const A_CURRENCY =
  /€|£|\$|\beur\b|\beuros?\b|\busd\b|\bchf\b|\bpln\b|zł|kč|\bczk\b|\bgbp\b/i;

// The sentences a pay is read in, without those whose only money is another country's dollar
// («CA$85,000 per year»): a reader handed the figure from its «$» on read it as US dollars
// (NO2-04).
const paySentences = (text: string) =>
  sentences(text).filter(
    (sentence) =>
      !(
        OTHER_DOLLAR.test(sentence) &&
        !A_CURRENCY.test(sentence.replace(/\$/g, ""))
      ),
  );

// A text flattened into one long run, as some agencies' blocks give it («…Unbefristete
// Einstellung Attraktive Vergütung ab 20 € Brutto pro Stunde Weihnachts- und Urlaubsgeld…»), is
// read the same way around each pay word: the words around it instead of the whole sentence.
const AROUND = 60;
const LONG_SENTENCE = 300;

// A period written just before the pay word («das monatliche Mindestgehalt von 4.061,00 EUR»),
// when the words after it name none.
function periodBefore(
  pay: TextPay | null,
  sentence: string,
  at: number,
): TextPay | null {
  return pay && !pay.period
    ? {
        ...pay,
        period: periodIn(sentence.slice(Math.max(0, at - 30), at)) ?? "",
      }
    : pay;
}

// A figure in a currency, alone or a range, and where the first one in a run of words ends.
const FIGURE_RUN =
  /(?:(?:€|£|\$|\b(?:eur|euros?|usd|gbp|chf|pln|czk|sek|nok|dkk)\b|kč|zł)\s*)?\d(?:[\d.,'’  ]*\d)?(?:,-)?(?:\s*[kK](?![\p{L}]))?(?:\s*(?:€|£|\$|\b(?:eur|euros?|usd|gbp|chf|pln|czk|sek|nok|dkk)\b|kč|zł))?(?:\s*(?:-|–|—|t\/m|t\.e\.m\.?|to|bis|à|a|ed|e|y|und|and|tot|till|tra|et|do|až)\s*(?:€|£|\$|\b(?:eur|euros?|usd|gbp|chf|pln)\b)?\s*\d(?:[\d.,'’  ]*\d)?(?:,-)?(?:\s*[kK](?![\p{L}]))?)?(?:\s*(?:€|£|\$|\b(?:eur|euros?|usd|gbp|chf|pln|czk|sek|nok|dkk)\b|kč|zł))?/giu;

function figureEnd(text: string): number {
  for (const run of text.matchAll(FIGURE_RUN))
    if (A_CURRENCY.test(run[0])) return run.index + run[0].length;
  return -1;
}

// The words after a pay word, never cut inside a figure: a window cut at «£9» of "£93,000 to
// £112,500" read 9.
function windowAfter(sentence: string, at: number, length: number): string {
  for (const run of sentence.slice(at, at + length + 60).matchAll(FIGURE_RUN))
    if (run.index < length && run.index + run[0].length > length)
      return sentence.slice(at, at + run.index + run[0].length);
  return sentence.slice(at, at + length);
}

export function payInSentences(text: string): TextPay | null {
  if (!A_CURRENCY.test(text) || !PAY_WORD.test(text)) return null;
  for (const sentence of paySentences(text)) {
    if (STATISTIC.test(sentence) || isNet(sentence)) continue;
    if (sentence.length <= LONG_SENTENCE) {
      if (NOT_PAY.test(sentence)) continue;
      const match = PAY_WORD.exec(sentence);
      const after = match && windowAfter(sentence, match.index, 120);
      if (match && after && A_CURRENCY.test(after)) {
        const pay = periodBefore(payInText(after), sentence, match.index);
        if (pay) return pay;
      }
      continue;
    }
    for (const match of sentence.matchAll(PAY_WORDS)) {
      const after = windowAfter(sentence, match.index, 120);
      if (
        !A_CURRENCY.test(after) ||
        NOT_PAY.test(
          sentence.slice(Math.max(0, match.index - AROUND), match.index + 120),
        )
      )
        continue;
      const pay = periodBefore(payInText(after), sentence, match.index);
      if (pay) return pay;
    }
  }
  for (const sentence of paySentences(text)) {
    if (STATISTIC.test(sentence) || isNet(sentence)) continue;
    for (const match of sentence.matchAll(PAY_WORDS)) {
      const pay = payAround(sentence, match);
      if (pay) return pay;
    }
  }
  return null;
}

// A pay word's figure judged by its own words only, when no sentence gave a pay above: the words
// from the pay word to the first figure in a currency within 160 characters, and the figure's
// next word or two, must name no bonus, allowance, ceiling or company money; what a sentence
// offers besides does not count ("The annual pay range for the role is €150,000 - €200,000 OTE
// plus benefits and pre-IPO stock options", «La retribuzione annua lorda per questo ruolo … è
// compresa tra € 29.400 e € 36.500»). A figure just before the pay word, two words apart at most,
// is read too ("€70-100K salary + equity", «70-90k€ annual salary», "€3,000 monthly base
// salary"). The report of 2 November 2026 counted 4,467 offers whose pay word and figure stood so
// apart.
const OFFERED_BESIDES =
  /\s(?:\+|plus|and|und|et|y|e|sowie|zzgl\.?|inkl\.?|including|inklusive)\s|[,;(+]/i;
const notPayNext = (rest: string) =>
  NOT_PAY.test(rest.slice(0, 30).split(OFFERED_BESIDES)[0] ?? "");
const FIGURE_BEFORE =
  /\d\s*[kK]?\s*(?:€|£|\$|\beur\b|\beuros?\b|\busd\b|\bgbp\b|\bchf\b|\bpln\b|\bczk\b|kč|zł)?\s*(?:\p{L}+\s+){0,2}$/iu;

function payAround(sentence: string, match: RegExpExecArray): TextPay | null {
  const after = windowAfter(sentence, match.index, 160);
  const end = figureEnd(after);
  if (
    end >= 0 &&
    !NOT_PAY.test(
      sentence.slice(Math.max(0, match.index - 30), match.index + end),
    ) &&
    !notPayNext(after.slice(end))
  ) {
    const pay = periodBefore(
      payInText(sentence.slice(match.index, match.index + end + 30)),
      sentence,
      match.index,
    );
    if (pay) return pay;
  }
  const before = sentence.slice(Math.max(0, match.index - 30), match.index);
  return FIGURE_BEFORE.test(before) &&
    A_CURRENCY.test(before) &&
    !NOT_PAY.test(before)
    ? payInText(`${before}${match[0]}`)
    : null;
}

// A figure in a currency that the text calls gross, with no pay word beside it («€ 3.300 brutto /
// Monat», "EUR 2,000 to 2,500 gross per month", «3.400 - 5.000 EUR gross», «Brutto ab 3.000 €»):
// a pay all the same, the gross word within a few characters of the figure. Not when the sentence
// speaks of a bonus, an allowance or a company's money ("€1,200 Gross … to support relocation"),
// nor of a profit or a margin. The report of 2 November 2026 counted 5,087 offers whose pay figure
// had no pay word beside it.
export const NOT_GROSS_PAY =
  /(?<![\p{L}])(?:profit|margin|marge|revenue|sales|ventas|fatturato|umsatz)(?![\p{L}])/iu;
const GROSS_WORDS = new RegExp(GROSS.source, "giu");

export function grossInSentences(text: string): TextPay | null {
  if (!A_CURRENCY.test(text) || !GROSS.test(text)) return null;
  for (const sentence of paySentences(text)) {
    if (
      sentence.length > LONG_SENTENCE ||
      NOT_PAY.test(sentence) ||
      NOT_GROSS_PAY.test(sentence)
    )
      continue;
    for (const gross of sentence.matchAll(GROSS_WORDS)) {
      const before = sentence.slice(Math.max(0, gross.index - 35), gross.index);
      const after = sentence.slice(
        gross.index + gross[0].length,
        gross.index + gross[0].length + 35,
      );
      if (!/\d[^\d]{0,22}$/u.test(before) && !/^[^\d]{0,18}\d/u.test(after))
        continue;
      const pay = payInText(`${before}${gross[0]}${after}`);
      if (pay) return pay;
    }
  }
  return null;
}

// A figure in a currency whose period follows at once, with no pay word nor gross word beside the
// figure («Fulltime, €3000 p/m!», "£28 - £30 per hour", «17,00 - 19,00 EUR pro Stunde», «13–15 €/h»):
// a pay too, unless the words around it name a bonus, an allowance, a budget or a benefit's sum,
// or a price («Tarife ab 9,99 € pro Monat»: under 400 a month, over 150 an hour, the pay reader's
// minimum wages set aside the rest). The free-label bench of 9 November 2026 found these missed on
// adverts whose source states the pay in a field of its own.
export const A_BENEFIT =
  /(?<![\p{L}])(?:\p{L}*zuschuss|\p{L}*zulage|\p{L}*pauschale|\p{L}*erstattung|\p{L}*vergoeding|tegemoetkoming|\p{L}*toeslag|indemnit\p{L}*|primes?|ch[eè]ques?|abonnement\p{L}*|gym|fitness|internet|phone|telefoon|handy|parking|parkeren|childcare|kinderopvang|kita|jobrad|deutschlandticket|lunch|mittagessen|kantine|stipend|training|formation|opleiding\p{L}*|weiterbildung|learning|courses?|cursus|tips?|trinkgeld|fooi|km|kilomet\p{L}*|mileage|reis\p{L}*|travel|spesen|expenses|onkosten|per diem|tagegeld|hotel|provision|commission|commissie|provisie|tarife?|tariff?s?|abo|preis|price|prix|precio|prezzo|prijs|kosten|cost|costs|fee|fees|gebühr\p{L}*|wohnung|miete|unterkunft|housing|accommodation|huisvesting|logement|alojamiento|leasing\p{L}*|lease|kinderbetreuung|urlaubsgeld|weihnachtsgeld|vakantiegeld|rimborso|rimborsi|spese|reimbursement\p{L}*|remboursement\p{L}*)(?![\p{L}])/iu;
const SANE: Readonly<Record<string, readonly [number, number]>> = {
  hour: [5, 150],
  day: [30, 2000],
  week: [150, 5000],
  month: [400, 30_000],
  year: [5000, 1_000_000],
};

export function periodInSentences(text: string): TextPay | null {
  if (!A_CURRENCY.test(text)) return null;
  for (const sentence of paySentences(text)) {
    if (
      sentence.length > LONG_SENTENCE ||
      STATISTIC.test(sentence) ||
      isNet(sentence) ||
      NOT_GROSS_PAY.test(sentence)
    )
      continue;
    for (const run of sentence.matchAll(FIGURE_RUN)) {
      if (!A_CURRENCY.test(run[0]) || !/\d/.test(run[0])) continue;
      // «€70,-» writes no cents; «£15.36ph» its hour glued to the figure.
      const end = run.index + run[0].length;
      const after = sentence.slice(end, end + 16).replace(/^,-/, "");
      const period = /^\s?ph(?![\p{L}])/iu.test(after)
        ? "hour"
        : periodIn(after.split(/[,;(]/)[0] ?? "");
      if (!period) continue;
      const around = sentence.slice(Math.max(0, run.index - 40), end + 40);
      // Nor a ceiling written before it («Salaris: tot €89.000 bruto per jaar»).
      if (
        NOT_PAY.test(around) ||
        A_BENEFIT.test(around) ||
        CEILING.test(
          ` ${sentence.slice(Math.max(0, run.index - 14), run.index + 1)}`,
        )
      )
        continue;
      const pay = payInText(`${run[0]} ${after}`);
      const [low, high] = SANE[period] ?? [5, Number.POSITIVE_INFINITY];
      if (pay && pay.min >= low && pay.max <= high) return { ...pay, period };
    }
  }
  return null;
}

// Italy's RAL (retribuzione annua lorda) names a gross pay a year, in euros, and is often written
// with no currency («RAL 33-45k», «RAL: 35.000»): read so when its figure reaches ten thousand. A
// RAL colour («RAL 7016», «RAL 9010», in painters' and fitters' adverts) is a four-figure number and
// stays no pay. The free-label bench, 9 November 2026.
const RAL = /(?<![\p{L}])ral(?![\p{L}])/iu;
export function ralPay(line: string): TextPay | null {
  if (!RAL.test(line) || A_CURRENCY.test(line)) return null;
  const pay = payInText(line.replace(RAL, "RAL €"));
  return pay && pay.min >= 10_000 ? { ...pay, period: "year" } : null;
}

// A line that is a pay band alone, with its currency («$70,000-$80,000 USD», «€55k – €65k»,
// «45.000 - 55.000 € p.a.»): a board's pay field written as text. Only a band of two figures, on a
// short line of its own, neither a ceiling nor company money (the free-label bench, 9 November
// 2026).
const BAND_LINE =
  /^[^\p{L}\d€£$]*(?:€|£|\$|eur|gbp|usd|chf)?\s*\d[\d.,' ]*\s*[kK]?\s*(?:€|£|\$|eur|gbp|usd|chf)?\s*(?:-|–|—|to)\s*(?:€|£|\$|eur|gbp|usd|chf)?\s*\d[\d.,' ]*\s*[kK]?\s*(?:€|£|\$|eur|gbp|usd|chf)?\s*(?:\/\s*(?:year|yr|month|mo|hour|hr|h)|per (?:year|annum|month|hour)|a year|annually|p\.?\s?a\.?|brutto|gross)?(?:[^\p{L}\d]*(?:doe|depending on experience|plus benefits|\+ ?benefits|\+ ?bonus|pro rata|negotiable))*[^\p{L}\d]*$/iu;
// A Czech monthly pay alone on its line («65.000 Kč», «45 000 Kč hrubého»), as Czech boards write
// their pay field into the text: one figure of a month's pay, nothing else on the line (the
// free-label bench, 9 November 2026).
const LONE_CZK =
  /^[^\p{L}\d]*(\d{2,3})[ . ]?(\d{3})\s*(?:kč|czk)(?:\s*(?:hrubého|brutto|měsíčně|\/\s*měs(?:íc)?\.?))?[^\p{L}\d]*$/iu;
// Nor a band its neighbours call a budget, a project's or a company's money («€ 2.000 - € 5.000»
// over «per project budget»).
const PROJECT_MONEY =
  /(?<![\p{L}])(?:project\p{L}*|projet\p{L}*|proyecto\p{L}*|projekt\p{L}*|arr|mrr|revenue|umsatz)(?![\p{L}])/iu;
// Nor a Czech sum its neighbour calls a bonus («Náborový bonus», «Odměna za doporučení»).
const CZECH_BONUS =
  /(?<![\p{L}])(?:bonus\p{L}*|náborov\p{L}*|prémi\p{L}*|odměn\p{L}*|příspěv\p{L}*|cena|ceny)(?![\p{L}])/iu;

export function bandAlone(text: string): TextPay | null {
  const lines = text.split(/\n+/);
  for (const [index, raw] of lines.entries()) {
    const line = raw.trim();
    const czk = line.length <= 40 ? LONE_CZK.exec(line) : null;
    if (
      !czk &&
      (line.length > 50 || !BAND_LINE.test(line) || !A_CURRENCY.test(line))
    )
      continue;
    const around = `${lines[index - 1] ?? ""} ${lines[index + 1] ?? ""}`;
    if (
      NOT_PAY.test(around.replace(CEILING, " ")) ||
      A_BENEFIT.test(around) ||
      PROJECT_MONEY.test(around)
    )
      continue;
    if (czk) {
      const amount = Number((czk[1] ?? "") + (czk[2] ?? ""));
      if (amount >= 15_000 && amount <= 300_000 && !CZECH_BONUS.test(around))
        return { min: amount, max: amount, currency: "CZK", period: "month" };
      continue;
    }
    const pay = payInText(line);
    if (pay && pay.min < pay.max) return pay;
  }
  return null;
}
