import { z } from "@hono/zod-openapi";
import type { StoredAdvert } from "../../shared/schemas/advert.js";
import type { Rates } from "../../shared/rates/ecb.js";
import { type Pay, readPay } from "./pay.js";
import { payOfText } from "./text-pay.js";

export const PAY_PERIODS = ["hour", "day", "week", "month", "year"] as const;
export type PayPeriod = (typeof PAY_PERIODS)[number];
const PERIOD_OF_LETTER: Readonly<Record<string, PayPeriod>> = {
  h: "hour",
  d: "day",
  w: "week",
  m: "month",
  y: "year",
};

// An advert's pay as the publication writes it (pay FR-8): the advert's own figures (low 0 for a ceiling a field states
// alone), its currency's ISO code and period, where it was read, and the top in euros a year for the filter (null for
// part time by the hour, day or week with no hours).
export const AdvertPay = z
  .strictObject({
    low: z.number().nonnegative(),
    high: z.number().positive(),
    currency: z.string().regex(/^[A-Z]{3}$/),
    period: z.enum(PAY_PERIODS),
    from: z.enum(["field", "text"]),
    yearlyEur: z.number().int().positive().nullable(),
  })
  .openapi("AdvertPay");
export type AdvertPay = z.infer<typeof AdvertPay>;

// What the pay reader reads of a stored advert.
export type PayInput = Pick<
  StoredAdvert,
  "country" | "title" | "description" | "pay"
>;

const asAdvertPay = (
  { p: [low, high, currency, letter], pa }: Pay,
  from: AdvertPay["from"],
): AdvertPay | null => {
  const period = PERIOD_OF_LETTER[letter];
  return period
    ? { low, high, currency, period, from, yearlyEur: pa ?? null }
    : null;
};

// The source's pay field, else the pay its title or text writes, as the legacy's normalise chooses between them
// (builder/normalise.ts, `toRecord`; its comments, kept below, say why).
export function advertPay(advert: PayInput, rates: Rates): AdvertPay | null {
  const country = advert.country;
  const text = advert.description;
  // ➤ A field's pay wholly below the one its text writes, in the same currency and period, is a site's template: 2,000–3,000
  // ➤ € a month in the data of Raiffeisen Software's advert, whose text says «das monatliche Mindestgehalt von 4.061,00 EUR»
  // ➤ (the owner's photo, 7 November 2026). The text's pay is shown then, but only where the text states a minimum, as
  // ➤ Austria's law asks: elsewhere a higher pay in the text was a ceiling («bis zu») or one with commission (3 of 30 on an
  // ➤ eighth of the store, where 108 fields were below their text's pay).
  const fromSource = advert.pay
    ? readPay({ ...advert.pay, country }, rates)
    : null;
  const written = payOfText(advert.title, text);
  const fromText = written ? readPay({ ...written, country }, rates) : null;
  const template =
    fromSource &&
    fromText &&
    fromText.p[2] === fromSource.p[2] &&
    fromText.p[3] === fromSource.p[3] &&
    fromText.p[0] > fromSource.p[1] &&
    /mindest(?:gehalt|entgelt|lohn|grundgehalt)|kollektivvertraglich/i.test(
      text,
    );
  // ➤ A field that gives one figure where the text gives a band round it, in the same currency and period, is one end of
  // ➤ that band («Festgehalt pro Monat von 4.200,00 bis 5.000», 5,000 in the field; «zwischen 4.100 Euro und 4.600»,
  // ➤ 4,100): the band is shown. The readers found a field's lone end on 15 of the 49 pays they judged wrong (7 November 2026).
  // ➤ A ceiling alone (min 0) is such a lone end too; a text's ceiling is no band round the field's figure.
  const band =
    fromSource &&
    fromText &&
    fromText.p[0] > 0 &&
    fromText.p[2] === fromSource.p[2] &&
    fromText.p[3] === fromSource.p[3] &&
    (!fromSource.p[0] || fromSource.p[0] === fromSource.p[1]) &&
    fromText.p[0] < fromText.p[1] &&
    fromText.p[0] <= fromSource.p[1] &&
    fromSource.p[1] <= fromText.p[1];
  if (fromSource && !template && !band) return asAdvertPay(fromSource, "field");
  return fromText ? asAdvertPay(fromText, "text") : null;
}
