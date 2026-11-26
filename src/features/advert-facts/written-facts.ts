import {
  type Contract,
  contractCode,
  contractOfCode,
  type WorkingTime,
  workingTimeCode,
  workingTimeOfCode,
} from "./codes.js";
import { fieldText, labelledFacts, loneFacts, writtenFacts } from "./labels.js";

// What the labels reader (labels.ts, the legacy's builder/lib/labels.ts) gives the publication and the scrapper, and the
// agency-work rule of the legacy's builder/normalise.ts.

// What writtenFacts reads of an advert.
export interface WrittenAdvert {
  readonly title: string;
  readonly description: string;
  readonly source: string;
}

// Agency work as an advert states it: «im Rahmen der Arbeitnehmerüberlassung», or the word as a line or a field of its
// own («Vertragsart: Arbeitnehmerüberlassung»). A text that only mentions agency work, often to say it is none («keine
// Zeitarbeit») or as the agency's trade, does not count (half of 5,200 such texts on 7 November 2026).
const AGENCY_WORK =
  /im rahmen (?:der|einer) arbeitnehmer(?:ü|ue)berlassung|in arbeitnehmer(?:ü|ue)berlassung|^[ \t]*(?:(?:vertragsart|anstellungsart|beschäftigungsart|art der anstellung|anstellung|vertrag)[ \t]*:[ \t]*)?arbeitnehmer(?:ü|ue)berlassung[ \t]*$/imu;
const NOT_AGENCY_WORK = /kein\p{L}* (?:zeitarbeit|arbeitnehmer)/iu;
const STAY_WITH_CLIENT =
  /übernahme(?:option|möglichkeit|chance|garantie|perspektive)\p{L}*|option auf (?:eine )?übernahme|(?:möglichkeit|chance|aussicht)(?:en)? (?:auf|zur) (?:eine )?(?:direkte |feste )?übernahme/iu;

// A contract code made agency work when the text states it as such: «Unbefristet» is then the contract with the agency;
// with the option to stay where the text offers it; never where it says it is none («keine Zeitarbeit»). Only over
// none, a permanent or a temporary contract.
export const agencyWorkCode = (code: string, text: string): string =>
  /^(?:i|t\d*)?$/.test(code) &&
  AGENCY_WORK.test(text) &&
  !NOT_AGENCY_WORK.test(text)
    ? STAY_WITH_CLIENT.test(text)
      ? "eo"
      : "e"
    : code;

// An advert's contract and working time (publication FR-4): its source's fields first (`stated`, as the fact reader
// gives them), else what its text and title write; then agency work its text states. The legacy's normalise:
// `{ ...writtenFacts(raw, text), ...contractOf(raw) }`.
export function contractAndTime(
  advert: WrittenAdvert,
  stated: {
    readonly contract: Contract | null;
    readonly workingTime: WorkingTime | null;
  },
): {
  readonly contract: Contract | null;
  readonly workingTime: WorkingTime | null;
} {
  const fromFields = {
    ct: contractCode(stated.contract),
    wt: workingTimeCode(stated.workingTime),
  };
  const written = !fromFields.ct || !fromFields.wt ? writtenFacts(advert) : {};
  const ct = agencyWorkCode(
    fromFields.ct || written.ct || "",
    advert.description,
  );
  const wt = fromFields.wt || written.wt || "";
  return {
    contract: ct ? contractOfCode(ct) : null,
    workingTime: wt ? workingTimeOfCode(wt) : null,
  };
}

// What a vacancy's page says beside its block, for the scrapper's readers (job portals FR-3; the legacy's
// `withLabels`): the labelled fields first, a lone field where they say nothing, and the page's fields as lines, in which
// the pay and the last day are read.
export function factsOfPage(html: string): {
  contract?: string;
  hours?: string;
  years?: number;
  fields: string;
} {
  const labelled = labelledFacts(html);
  const lone = labelled.contract && labelled.hours ? {} : loneFacts(html);
  const contract = labelled.contract || lone.contract;
  const hours = labelled.hours || lone.hours;
  return {
    ...(contract ? { contract } : {}),
    ...(hours ? { hours } : {}),
    ...(Number.isFinite(labelled.years) ? { years: labelled.years } : {}),
    fields: fieldText(html)
      .split("|")
      .map((part) => part.trim())
      .filter(Boolean)
      .join("\n"),
  };
}
