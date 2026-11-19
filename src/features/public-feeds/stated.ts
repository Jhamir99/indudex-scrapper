import { SOURCE_FIELD_LIMIT } from "../../shared/schemas/advert.js";
import type { AdvertDraft } from "../crawl-core/ports.js";

export interface Stated {
  readonly contract?: string | undefined;
  readonly hours?: string | undefined;
  readonly employmentType?: readonly (string | undefined)[] | undefined;
  readonly years?: number | undefined;
}

type StatedFields = Partial<
  Pick<AdvertDraft, "contract" | "hours" | "employmentType" | "years">
>;

const words = (value: string | undefined) =>
  value?.replace(/\s+/g, " ").trim().slice(0, SOURCE_FIELD_LIMIT) ?? "";

// The contract, hours, employment types and years a source states in fields of their own, for a
// draft (advert-facts FR-1): only those it gives, tidied and capped to fit the store.
export function stated(fields: Stated): StatedFields {
  const out: StatedFields = {};
  const contract = words(fields.contract);
  const hours = words(fields.hours);
  const types = [
    ...new Set((fields.employmentType ?? []).map(words).filter(Boolean)),
  ].slice(0, 10);
  if (contract) out.contract = contract;
  if (hours) out.hours = hours;
  if (types.length) out.employmentType = types;
  if (
    fields.years !== undefined &&
    Number.isFinite(fields.years) &&
    fields.years >= 0 &&
    fields.years <= 60
  )
    out.years = fields.years;
  return out;
}
