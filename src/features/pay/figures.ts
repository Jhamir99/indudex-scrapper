import { namedCurrency } from "./currencies.js";
import { type PayPeriod, periodOf } from "./periods.js";

// A figure: a number, or one written for people the way sources write it: "45000", "45.000",
// "45,000", "45 000", "45'000", "3.772,00", "45.000,-", "45k", with its currency's sign or code
// beside it ("€ 45.000", "45000 EUR", "45 000 kr"), which names the currency ("$" names none: it
// is several). A separator followed by exactly three digits groups thousands, always the same one;
// the other sign, followed by one or two digits, gives the cents. Mixed or doubtful grouping
// ("1.234,567"), a word beside the figure ("75000 OTE", "ab 3.000") or a negative figure is not
// read, rather than read wrong.
export interface Figure {
  readonly value: number;
  readonly currency: string;
  readonly cents: boolean;
  // Written with a «k» for its thousands.
  readonly thousands?: boolean;
  // Written with a «$», which names no currency.
  readonly dollar?: boolean;
}

const NO_FIGURE: Figure = { value: 0, currency: "", cents: false };

// The «K» of «Kč» is no thousands (the legacy's DAA-22).
const FIGURE =
  /^([^\d\s]*)\s*(\d[\d.,' ’]*?)\s*([kK](?!\p{L}))?\s*([^\d\s]*)$/u;
const GROUPED = /^(\d{1,3}([., '’])\d{3}(?:\2\d{3})*)(?:(?!\2)[.,](\d{1,2}))?$/;
const PLAIN = /^\d+(?:[.,](\d+))?$/;

export function figureOf(text: string, country: string): Figure {
  const match = FIGURE.exec(text);
  if (!match || (match[1] && match[4])) return NO_FIGURE;
  const sign = match[1] || match[4] || "";
  const dollar = sign === "$";
  const currency = sign && !dollar ? namedCurrency(sign, country) : "";
  if (sign && !dollar && !currency) return NO_FIGURE;
  const digits = (match[2] ?? "").trim();
  if (match[3])
    return /^\d+(?:[.,]\d+)?$/.test(digits)
      ? {
          value: Math.round(Number(digits.replace(",", ".")) * 1000),
          currency,
          cents: false,
          thousands: true,
          dollar,
        }
      : NO_FIGURE;
  const grouped = GROUPED.exec(digits);
  if (grouped)
    return {
      value: Number(
        (grouped[1] ?? "").replace(/\D/g, "") +
          (grouped[3] ? `.${grouped[3]}` : ""),
      ),
      currency,
      cents: Boolean(grouped[3]),
      dollar,
    };
  const plain = PLAIN.exec(digits);
  return plain
    ? {
        value: Math.round(Number(digits.replace(",", ".")) * 100) / 100,
        currency,
        cents: Boolean(plain[1] && plain[1].length <= 2),
        dollar,
      }
    : NO_FIGURE;
}

// A pay field as written: one figure, or a range in one field ("£35,000 - £40,000", "35.000 bis
// 45.000 €"), with its period's words after it ("£27,000 p.a.", "£13.40 per hour", "16,20 p/u"),
// which name the period, and a remark in brackets at its end ("(depending on experience)") left
// aside.
export interface PayField {
  readonly low: number;
  readonly high: number;
  readonly currency: string;
  readonly period: PayPeriod | "";
  readonly cents: boolean;
  readonly dollar?: boolean;
}

const NO_FIELD: PayField = {
  low: 0,
  high: 0,
  currency: "",
  period: "",
  cents: false,
};

const RANGE_JOIN = /\s*[-–—]\s*(?=\D{0,4}\d)|\s+(?:to|bis|tot|à|a)\s+/i;

export function fieldOf(value: unknown, country: string): PayField {
  if (typeof value === "number") {
    if (!(value > 0 && Number.isFinite(value))) return NO_FIELD;
    const rounded = Math.round(value * 100) / 100;
    return {
      low: rounded,
      high: rounded,
      currency: "",
      period: "",
      cents: !Number.isInteger(value),
    };
  }
  const code = country.toLowerCase();
  // «45.000,- EUR» writes no cents before its currency either (DAA-22).
  let written = String(value ?? "")
    .replace(/[   ]/g, " ")
    .replace(/\s*\([^()]*\)\s*$/, "")
    .trim()
    .replace(/[.,][-–]$/, "")
    .replace(/(\d)[.,][-–](?=\s*[^\d\s]+$)/, "$1");
  if (!/\d/.test(written) || /^-\s*\d/.test(written)) return NO_FIELD;
  let period: PayPeriod | "" = "";
  const glued = /^(.*\d.*?)\s*((?:p\s*)?\/\s*[a-z.]+)$/i.exec(written);
  if (glued && periodOf(glued[2])) {
    period = periodOf(glued[2]);
    written = glued[1] ?? "";
  }
  const words = written.split(" ");
  for (let k = Math.min(3, words.length - 1); k >= 1 && !period; k--) {
    const named = periodOf(words.slice(-k).join(" "));
    if (named) {
      period = named;
      written = words
        .slice(0, -k)
        .join(" ")
        .replace(/[.,][-–]$/, "");
    }
  }
  const parts = written.split(RANGE_JOIN).filter((part) => part.trim());
  if (parts.length > 2 || (parts.length === 2 && !/\d/.test(parts[0] ?? "")))
    return NO_FIELD;
  const [first = NO_FIGURE, second = first] = parts.map((part) =>
    figureOf(part.trim(), code),
  );
  if (
    !first.value ||
    !second.value ||
    (first.currency && second.currency && first.currency !== second.currency)
  )
    return NO_FIELD;
  // «35-45k» writes its thousands once, at the end (DAA-22).
  const low =
    second.thousands && !first.thousands && first.value < 1000
      ? first.value * 1000
      : first.value;
  return {
    low,
    high: second.value,
    currency: first.currency || second.currency,
    period,
    cents: first.cents || second.cents,
    dollar: Boolean(first.dollar || second.dollar),
  };
}
