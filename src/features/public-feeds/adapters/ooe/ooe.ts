import type { AdvertDraft } from "../../../crawl-core/ports.js";
import { parseDay } from "../../../../shared/kit/dates.js";
import { pageText, plainText } from "../../../../shared/kit/text.js";
import { withoutContacts } from "../../contacts.js";
import { publicFeed } from "../../../crawl-core/feed-family.js";

// Upper Austria: the Land's own vacancies, from the API of its careers portal ("Offene Jobs"),
// which the Land publishes on data.gv.at under CC BY 4.0. One call answers every offer; each links
// to its page in the portal (an address after "#/"). Its contact lists are never read, and
// contacts in its texts are cut out.
export const API =
  "https://e-gov.ooe.gv.at/ipapm/services/frontend/v1/extern/ausschreibung";
export const offerUrl = (id: string | number) =>
  `https://www.land-oberoesterreich.gv.at/525548.htm#/${id}`;

interface Call {
  readonly id?: string | number;
  readonly ausschreibungsTitel?: string;
  readonly job?: {
    readonly titel?: string;
    readonly dienstort?: string;
    readonly dienststelle?: string;
  } | null;
  readonly dienststelleAbweichend?: string;
  readonly arbeitszeit?: string;
  readonly besetzungstermin?: string;
  readonly berufsfeldTagList?: readonly string[];
  readonly voraussetzung?: string;
  readonly zusatzInfo?: string;
  readonly weitereInformationen?: string;
  readonly beginnAusschreibung?: string;
  readonly bewerbungsfrist?: string;
}

export function parseOoe(json: string): AdvertDraft[] {
  const parsed: unknown = JSON.parse(json);
  const calls = Array.isArray(parsed) ? (parsed as (Call | null)[]) : [];
  return calls.flatMap((call): AdvertDraft[] => {
    if (!call?.id) return [];
    // The call's own title names the post ("Amtsärztin oder Amtsarzt"); the short one is often a
    // category ("entgeltliches Praktikum"). A file number after a line break is no part of it.
    const long = plainText(
      (call.ausschreibungsTitel ?? "").split(/<br\s*\/?>/i)[0] ?? "",
    );
    const title =
      long && long.length <= 160 ? long : plainText(call.job?.titel ?? "");
    if (!title) return [];
    const town = plainText(call.job?.dienstort ?? "");
    const unit = plainText(
      call.dienststelleAbweichend || call.job?.dienststelle || "",
    );
    const text = [
      call.arbeitszeit,
      call.besetzungstermin,
      (call.berufsfeldTagList ?? []).join(", "),
      call.voraussetzung,
      call.zusatzInfo,
      call.weitereInformationen,
    ]
      .map((part) => pageText(part ?? ""))
      .filter(Boolean)
      .join("\n");
    const draft: AdvertDraft = {
      source: "ooe",
      sourceId: String(call.id),
      title,
      company: ["Land Oberösterreich", unit].filter(Boolean).join(", "),
      location: [town, "Oberösterreich", "Österreich"]
        .filter(Boolean)
        .join(", "),
      country: "at",
      city: town,
      remote: false,
      url: offerUrl(call.id),
      description: withoutContacts(text),
      occupationCodes: {},
      language: "de",
    };
    const posted = parseDay(call.beginnAusschreibung);
    const expires = parseDay(call.bewerbungsfrist);
    if (posted) draft.posted = posted;
    if (expires) draft.expires = expires;
    return [draft];
  });
}

export const ooe = publicFeed({
  definition: {
    id: "ooe",
    kind: "feed",
    licence: {
      name: "Land Oberösterreich, Karriereportal",
      short: "Land Oberösterreich",
      url: "https://www.land-oberoesterreich.gv.at/525548.htm",
      licence:
        "CC BY 4.0, through data.gv.at; each offer links to the Land's careers portal",
      credit: "Land Oberösterreich, CC BY 4.0 (data.gv.at)",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  pages: [API],
  request: { headers: { accept: "application/json" } },
  parse: parseOoe,
});
