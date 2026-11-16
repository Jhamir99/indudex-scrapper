import type { AdvertDraft } from "../../../crawl-core/ports.js";
import { plainText } from "../../../../shared/kit/text.js";
import { publicFeed } from "../../family.js";

// Brandenburg: the Land's careers portal (its ministries, districts and towns), through the list
// its own page draws (/api/offers, every offer in one answer). robots.txt closes only /admin and
// the imprint holds no clause on copying or bots. An offer gone from a pass is closed.
const BASE = "https://karriere-in-brandenburg.de";
export const OFFERS = `${BASE}/api/offers`;
export const offerUrl = (id: string | number) =>
  `${BASE}/stellenangebote/${id}`;

// An epoch in seconds as the day it is in Berlin.
const berlinDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
export function dayInBerlin(seconds: unknown): string | undefined {
  const value = Number(seconds);
  return value > 0 ? berlinDay.format(new Date(value * 1000)) : undefined;
}

interface Row {
  readonly id?: string | number;
  readonly title?: string;
  readonly city?: string;
  readonly employer?: string;
  readonly onlineDate?: number | string;
  // The closing day; "0" when none is set (standing calls).
  readonly vacancyDate?: number | string;
}

export function parseBrandenburg(json: string): AdvertDraft[] {
  const parsed: unknown = JSON.parse(json);
  const rows = Array.isArray(parsed) ? (parsed as (Row | null)[]) : [];
  return rows.flatMap((row): AdvertDraft[] => {
    if (!row?.id || !row.title) return [];
    // "Forst (Lausitz)/Baršć (Łužyca)": the German name, before the Sorbian one.
    const city = plainText((row.city ?? "").split("/")[0] ?? "");
    const draft: AdvertDraft = {
      source: "brandenburg",
      sourceId: String(row.id),
      title: plainText(row.title),
      company: plainText(row.employer ?? ""),
      location: [city, "Brandenburg", "Deutschland"].filter(Boolean).join(", "),
      country: "de",
      city,
      remote: false,
      url: offerUrl(row.id),
      description: "",
      occupationCodes: {},
      language: "de",
    };
    const posted = dayInBerlin(row.onlineDate);
    const expires = dayInBerlin(row.vacancyDate);
    if (posted) draft.posted = posted;
    if (expires) draft.expires = expires;
    return [draft];
  });
}

export const brandenburg = publicFeed({
  definition: {
    id: "brandenburg",
    kind: "feed",
    licence: {
      name: "Karriereportal des Landes Brandenburg",
      short: "Karriere in Brandenburg",
      url: "https://karriere-in-brandenburg.de/stellenangebote",
      licence:
        "The Land of Brandenburg's public-service vacancies, read as its own portal lists them; each links to its page there",
      credit: "Quelle: karriere-in-brandenburg.de",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  pages: [OFFERS],
  request: { headers: { accept: "application/json" } },
  parse: parseBrandenburg,
});
