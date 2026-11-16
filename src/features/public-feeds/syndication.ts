import type { AdvertDraft } from "../crawl-core/ports.js";
import { parseDay } from "../../shared/kit/dates.js";
import { parseXml, pickAll, pickText } from "../../shared/kit/pick.js";
import { pageText, plainText } from "../../shared/kit/text.js";

// The vacancy feed of an Austrian applicant-tracking platform ("/Syndication/Xml"), published by
// the Bundesrechenzentrum and the City of Linz (legacy `parseSyndication`): each <job> with its
// title, place, texts, days and page. The person responsible and the contact are never read.
export interface SyndicationOptions {
  readonly source: string;
  // The employer: the feed itself does not name it.
  readonly company: string;
  // The place when the feed's <location> does not hold one (Linz writes "intern und extern").
  readonly city?: string;
}

const TEXT_ELEMENTS = [
  "description",
  "requirements",
  "cfAnstellungserfordernisse",
] as const;

const elementText = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "#text" in value)
    return String((value as { "#text": unknown })["#text"]);
  return "";
};

export function parseSyndication(
  xml: string,
  options: SyndicationOptions,
): AdvertDraft[] {
  return pickAll(parseXml(xml), "jobs.job").flatMap((job): AdvertDraft[] => {
    const subTitle = plainText(pickText(job, "subTitle"));
    const town = options.city ?? plainText(pickText(job, "location"));
    // With a fixed place the subtitle names the unit (or the company, when it is one);
    // otherwise it describes the job and goes with the text.
    const company =
      options.city === undefined || !subTitle
        ? options.company
        : / (GmbH|AG)$/.test(subTitle)
          ? subTitle
          : `${options.company}, ${subTitle}`;
    const texts = TEXT_ELEMENTS.flatMap((name) =>
      pickAll(job, name).map((value) => pageText(elementText(value))),
    );
    const draft: AdvertDraft = {
      source: options.source,
      sourceId: plainText(pickText(job, "id")),
      title: plainText(pickText(job, "name")),
      company,
      location: [town, "Österreich"].filter(Boolean).join(", "),
      country: "at",
      city: town,
      remote: false,
      url: plainText(pickText(job, "url")),
      description: [options.city === undefined ? subTitle : "", ...texts]
        .filter(Boolean)
        .join("\n"),
      occupationCodes: {},
      language: "de",
    };
    const posted = parseDay(pickText(job, "dateSinceOnline"));
    const expires = parseDay(pickText(job, "cfApplyEnd"));
    if (posted) draft.posted = posted;
    if (expires) draft.expires = expires;
    return draft.sourceId && draft.title ? [draft] : [];
  });
}
