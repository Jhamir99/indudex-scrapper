import { load } from "cheerio";
import type { AdvertDraft } from "../../../crawl-core/ports.js";
import {
  fromCapitals,
  pageText,
  plainText,
} from "../../../../shared/kit/text.js";
import { withoutContacts } from "../../contacts.js";
import { publicFeed } from "../../../crawl-core/feed-family.js";

// Lombardy, Province of Brescia: the offers of its job centres, all on one page of its job site,
// each card with its day, title, text, number and town. The province's legal notes release its
// data under CC BY 4.0, "per qualsiasi fine, anche commerciale" (read by the legacy on 10 October
// 2026); robots.txt sets no rule. A contact left in the text is not kept.
const BASE = "https://lavoro.provincia.brescia.it";
export const LIST = `${BASE}/offerte-di-lavoro-e-formazione/offerte-di-lavoro/`;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Its days read "Tue Nov 17 08:30:00 CET 2026" (Java's Date.toString) or "17-Nov-2026", as it
// pleases the site; a day before 2000 is a placeholder ("Thu Oct 23 10:17:00 CET 1969").
const JAVA_DAY = /^\w{3} (\w{3}) (\d{2}) [\d:]+ \w+ (\d{4})$/;
const SHORT_DAY = /^(\d{1,2})-(\w{3})-(\d{4})$/;

export function cardDay(text: string): string | undefined {
  const java = JAVA_DAY.exec(text.trim());
  const short = SHORT_DAY.exec(text.trim());
  const [day, month, year] = java
    ? [java[2], java[1], java[3]]
    : short
      ? [short[1], short[2], short[3]]
      : [];
  const number = MONTHS.indexOf(month ?? "") + 1;
  if (!day || !number || Number(year) < 2000) return undefined;
  return `${year}-${String(number).padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export function parseBrescia(html: string): AdvertDraft[] {
  const $ = load(html);
  return $(".cmp-card-latest-messages")
    .toArray()
    .flatMap((element): AdvertDraft[] => {
      const card = $(element);
      const link = card.find('a[href*="/dettaglio-offerta/"]').first();
      const href = link.attr("href") ?? "";
      const sourceId = /\/dettaglio-offerta\/(\d+)\/?$/.exec(href)?.[1];
      const title = fromCapitals(plainText(link.find("h4").html() ?? ""));
      if (!sourceId || !title) return [];
      // Its chips: the offer's number, then its town.
      const town =
        card
          .find(".chip-label")
          .toArray()
          .map((chip) => plainText($(chip).html() ?? ""))
          .find((chip) => chip && !/^\d+$/.test(chip)) ?? "";
      const draft: AdvertDraft = {
        source: "brescia",
        sourceId,
        title,
        company: "",
        location: [town, "Italia"].filter(Boolean).join(", "),
        country: "it",
        city: town,
        remote: false,
        url: new URL(href, BASE).href,
        description: withoutContacts(
          pageText(card.find("article").first().html() ?? ""),
        ),
        occupationCodes: {},
        language: "it",
      };
      const posted = cardDay(card.find("span.fw-normal").first().text());
      if (posted) draft.posted = posted;
      return [draft];
    });
}

export const brescia = publicFeed({
  definition: {
    id: "brescia",
    kind: "feed",
    licence: {
      name: "Provincia di Brescia, Settore Lavoro",
      short: "Provincia di Brescia",
      url: LIST,
      licence:
        "CC BY 4.0 (the province's legal notes); each offer links to its page",
      credit: "Provincia di Brescia - Settore Lavoro, CC BY 4.0",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  pages: [LIST],
  parse: parseBrescia,
});
