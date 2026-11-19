import { z } from "@hono/zod-openapi";
import type { StoredAdvert } from "../../shared/schemas/advert.js";
import type { Rates } from "../../shared/rates/ecb.js";
import { PAY_PERIODS } from "./periods.js";
import { type CheckedPay, readPay } from "./read-pay.js";
import { payOfText } from "./text/pay-of-text.js";

// An advert's pay as the publication writes it (pay FR-8): the advert's own figures (low 0 for a
// ceiling a field states alone), its currency's ISO code and period, where it was read, and the
// top in euros a year for the filter (null for part time by the hour, day or week with no hours).
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

// A minimum the text states, as Austria's law asks adverts to: the only case where a text's pay
// above the field's is believed over it.
const STATED_MINIMUM =
  /mindest(?:gehalt|entgelt|lohn|grundgehalt)|kollektivvertraglich/i;

const sameKind = (a: CheckedPay, b: CheckedPay) =>
  a.currency === b.currency && a.period === b.period;

// What the pay reader reads of a stored advert.
export type PayInput = Pick<
  StoredAdvert,
  "country" | "title" | "description" | "pay"
>;

// The source's pay field; without one, or with one the pay reader sets aside (empty, 0, an hourly
// 14.73 «a year»), the pay its title or text writes: 502 adverts on a tenth of the legacy's store
// had such a field and a pay in their text (1 November 2026).
export function advertPay(advert: PayInput, rates: Rates): AdvertPay | null {
  const country = advert.country;
  const fromField = advert.pay
    ? readPay({ ...advert.pay, country }, rates)
    : null;
  const written = payOfText(advert.title, advert.description);
  const fromText = written ? readPay({ ...written, country }, rates) : null;
  // A field's pay wholly below the one its text writes, in the same currency and period, is a
  // site's template: 2,000–3,000 € a month in the data of Raiffeisen Software's advert, whose text
  // says «das monatliche Mindestgehalt von 4.061,00 EUR» (the owner's photo, 7 November 2026). The
  // text's pay is shown then, but only where the text states a minimum: elsewhere a higher pay in
  // the text was a ceiling («bis zu») or one with commission (3 of 30 on an eighth of the store,
  // where 108 fields were below their text's pay).
  const template =
    fromField !== null &&
    fromText !== null &&
    sameKind(fromField, fromText) &&
    fromText.low > fromField.high &&
    STATED_MINIMUM.test(advert.description);
  // A field that gives one figure where the text gives a band round it, in the same currency and
  // period, is one end of that band («Festgehalt pro Monat von 4.200,00 bis 5.000», 5,000 in the
  // field; «zwischen 4.100 Euro und 4.600», 4,100): the band is shown. The readers found a field's
  // lone end on 15 of the 49 pays they judged wrong (7 November 2026). A ceiling alone (low 0) is
  // such a lone end too.
  const band =
    fromField !== null &&
    fromText !== null &&
    sameKind(fromField, fromText) &&
    (!fromField.low || fromField.low === fromField.high) &&
    fromText.low < fromText.high &&
    fromText.low <= fromField.high &&
    fromField.high <= fromText.high;
  if (fromField && !template && !band) return { ...fromField, from: "field" };
  return fromText ? { ...fromText, from: "text" } : null;
}
