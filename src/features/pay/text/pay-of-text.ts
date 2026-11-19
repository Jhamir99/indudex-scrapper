import { payInText, type TextPay } from "./pay-in-text.js";
import { CEILING, LABEL, TWICE } from "./patterns.js";
import {
  bandAlone,
  grossInSentences,
  payInSentences,
  periodInSentences,
  ralPay,
} from "./readers.js";

// The pay an advert writes in its title ("Software Engineer — €60k-€120k /yr + equity") or on a
// labelled line of its text («Rémunération : De 34 000 € à 50 000 € brut par an», "Salary: £45,000
// - £52,000 per annum"), when its source has no pay field: the figures, the currency and the
// period, given to the pay reader (`readPay`), which checks them against each country's minimum
// wage. A net pay is not read (the site shows gross), nor a ceiling alone ("up to"), nor words
// without figures ("selon profil", "competitive"). Legacy `builder/text-pay.mjs`.

// A Czech title's sum that is a bonus for joining, not the pay («NÁBOROVÝ PŘÍSPĚVEK 100 000 Kč»,
// «náborový bonus»). An English one's figure that is the bonus itself («$5,000 Sign On Bonus»,
// «Earn a $5,000 Bonus!», «Bonus $2,000»), not a pay a bonus comes on top of («€70K + bonus», «€60K
// + Bonus + Car», 9 November 2026).
const TITLE_BONUS =
  /(?<![\p{L}])(?:příspěv\p{L}*|prispev\p{L}*|náborov\p{L}*|naborov\p{L}*|prémi\p{L}*|odměn\p{L}*|(?:sign[\s-]*on|signing|joining|welcome|referral|retention|relocation)\s+bonus\p{L}*)(?![\p{L}])|\$\s*[\d.,]+\s*k?\s+bonus|(?<![\p{L}])bonus\s+(?:of\s+)?(?:up\s+to\s+)?\$/iu;
const TITLE_MONEY = /[€£$]|\b(?:eur|gbp|usd|chf|pln|czk)\b|kč|zł/i;

// A Polish line with an employment band and a B2B one («UoP: 9 000 PLN – 12 500 PLN brutto | B2B:
// 65 PLN – 85 PLN / h», «13 000 zł—17 000 zł (B2B)/ 11 000—15 000 zł brutto (UoP)»): the B2B part,
// an invoice net of VAT, is left out, so the employment band is read whole and with its own period
// (the pay comparison of 9 November 2026).
const B2B = /(?<![\p{L}])b2b(?![\p{L}])/iu;
const EMPLOYMENT =
  /(?<![\p{L}])(?:uop|brutto|umow\p{L}* o prac\p{L}*)(?![\p{L}])/iu;
const withoutB2B = (text: string) =>
  text
    .split("\n")
    .map((line) =>
      B2B.test(line) && EMPLOYMENT.test(line)
        ? line
            .split(/\s\|\s|(?<=\))\s*\/\s*|;\s/)
            .filter((part) => !B2B.test(part) || EMPLOYMENT.test(part))
            .join(" | ")
        : line,
    )
    .join("\n");

// A label glued to the word before it, as a page that lost its lines writes it («Location:
// DublinSalary: €70,000-€80,000»).
const GLUED_LABEL =
  /(\p{Ll})(Salary|Salaire|Gehalt|Salario|Sueldo|Salaris|Compensation|Rémunération)(?=\s*:)/gu;
const LABELS = new RegExp(LABEL.source, "giu");

// The pay of a title, or of the first labelled pay line of a text that names figures, or of its
// first sentence that names the pay with its figure (legacy `payOfText`).
export function payOfText(
  titleGiven: string,
  textGiven: string,
): TextPay | null {
  const title = titleGiven.replace(TWICE, "");
  const text = withoutB2B(
    textGiven.replace(TWICE, "").replace(GLUED_LABEL, "$1 $2"),
  );
  const inTitle =
    TITLE_MONEY.test(title) && !CEILING.test(title) && !TITLE_BONUS.test(title)
      ? payInText(title.replace(/^[^€£$\d]*?(?=[€£$\d])/, ""))
      : null;
  // A title's pay under a hundred with no period is an hour's («Elektricien €22», «Monteur
  // €18-€22»): no month or year is so small, and a title writes thousands with their «k». The pay
  // reader guesses an hour only from cents, so these were set aside (1,145 offers in the report of
  // 2 November 2026).
  if (inTitle && !inTitle.period && inTitle.max < 100)
    return { ...inTitle, period: "hour" };
  if (inTitle) return inTitle;
  // The label read with its figures: «Salaire annuel», «Jahresgehalt» name the period. The first
  // label that gives a pay, not merely the first one written: "Turnover rate: low" before
  // "Salary: €50,000" must not hide it.
  for (const match of text.matchAll(LABELS)) {
    const labelled = payInText(match[0]) ?? ralPay(match[0]);
    if (labelled) return labelled;
  }
  return (
    payInSentences(text) ??
    grossInSentences(text) ??
    periodInSentences(text) ??
    bandAlone(text)
  );
}
