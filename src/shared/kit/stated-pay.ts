import { SOURCE_FIELD_LIMIT, type SourcePay } from "../schemas/advert.js";

// A pay as a source's fields give it, before it is tidied: sites and feeds fill them loosely
// (a number, a string, "" or 0 for none).
export interface RawPay {
  readonly min?: unknown;
  readonly max?: unknown;
  readonly currency?: unknown;
  readonly period?: unknown;
  readonly hoursPerWeek?: unknown;
  readonly partTime?: unknown;
}

const tidy = (value: string) => value.replace(/\s+/g, " ").trim();

// A figure as stated: a positive number, or the field's own words ("£35,000 - £40,000"), which
// the processor's pay reader reads. None, 0 or words too long to be a pay give nothing.
function figure(value: unknown): number | string | undefined {
  if (typeof value === "number")
    return Number.isFinite(value) && value > 0 ? value : undefined;
  if (typeof value !== "string") return undefined;
  const written = tidy(value);
  return written && written.length <= SOURCE_FIELD_LIMIT ? written : undefined;
}

function words(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  return tidy(String(value)).slice(0, SOURCE_FIELD_LIMIT) || undefined;
}

// The pay a source states, as the stored advert keeps it (pay FR-1): only what it gives, so the
// store's schema accepts it; nothing when it gives no figure.
export function statedPay(
  raw: RawPay | null | undefined,
): SourcePay | undefined {
  if (!raw) return undefined;
  const pay: SourcePay = {};
  const min = figure(raw.min);
  const max = figure(raw.max);
  if (min === undefined && max === undefined) return undefined;
  if (min !== undefined) pay.min = min;
  if (max !== undefined) pay.max = max;
  const currency = words(raw.currency);
  const period = words(raw.period);
  if (currency) pay.currency = currency;
  if (period) pay.period = period;
  const hours = Number(raw.hoursPerWeek);
  if (Number.isFinite(hours) && hours > 0 && hours <= 168)
    pay.hoursPerWeek = hours;
  if (raw.partTime === true) pay.partTime = true;
  return pay;
}
