import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { parseDay } from "../../../../shared/kit/dates.js";
import { parseXml, pickAll, pickText } from "../../../../shared/kit/pick.js";
import { plainText } from "../../../../shared/kit/text.js";
import { publicFeed, withDetailPages } from "../../family.js";

// Germany's public service: the vacancies of federal, state and local administrations that the
// federal portal service.bund.de publishes as an RSS feed. DISABLED AND FLAGGED (public-feeds
// FR-6): its imprint asks prior consent to copy its texts, so it is off until that consent is
// given, as in the legacy since 15 November 2026. Never read so far: its fixtures are built from
// the format the legacy documents. The feed carries the latest 500 (two or three days); each names
// its employer, place and the day its publication ends, so a vacancy seen before stays until that
// day (a month when none is named). Each vacancy's page adds its facts («Kurzinfo»); its robots.txt
// asks 30 s between pages (pace.hosts), so a pass reads at most 20.
export const FEED =
  "https://www.service.bund.de/Content/Globals/Functions/RSSFeed/RSSGenerator_Stellen.xml";
export const PAGES_A_PASS = 20;

// "Arbeitgeber: <strong>…</strong>" in an item's description.
const named = (html: string, label: string) =>
  plainText(
    new RegExp(`${label}:\\s*<strong>([^<]*)</strong>`).exec(html)?.[1] ?? "",
  );

export function parseBund(xml: string): AdvertDraft[] {
  return pickAll(parseXml(xml), "rss.channel.item").flatMap(
    (item): AdvertDraft[] => {
      const title = plainText(pickText(item, "title"));
      const url = pickText(item, "link").replace(/#.*$/, "");
      // The vacancy's file name ("6661807.html", "B7506113A-2026-00005066-B.html").
      const code = /\/Stellenangebote\/.+\/([A-Za-z0-9-]+)\.html$/.exec(
        url,
      )?.[1];
      if (!title || !code || !url.startsWith("https://")) return [];
      const html = pickText(item, "description");
      // "49661 Cloppenburg": the town without its postcode.
      const town = named(html, "Ort").replace(/^\d{5}\s+/, "");
      const draft: AdvertDraft = {
        source: "bund",
        sourceId: code,
        title,
        company: named(html, "Arbeitgeber"),
        location: [town, "Deutschland"].filter(Boolean).join(", "),
        country: "de",
        city: town,
        remote: false,
        url,
        description: "",
        occupationCodes: {},
        language: "de",
      };
      const posted = parseDay(pickText(item, "pubDate"));
      const expires = parseDay(
        named(html, "Veröffentlichungsende") || named(html, "Bewerbungsfrist"),
      );
      if (posted) draft.posted = posted;
      if (expires) draft.expires = expires;
      return [draft];
    },
  );
}

// A vacancy's page: its facts as fields between the Kurzinfo markers, written into the text
// (working time, length of employment, deadline).
export function withPage(draft: AdvertDraft, html: string): AdvertDraft {
  const box =
    html
      .split("<!--Kurzinfo einfügen-->")[1]
      ?.split("<!--Kurzinfo ende-->")[0] ?? "";
  const facts = [
    ...box.matchAll(/<dt>([^<]+)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g),
  ].map(
    ([, label, value]) =>
      `${plainText(label ?? "")}: ${plainText(value ?? "")}`,
  );
  if (facts.length === 0) return draft;
  const deadline = parseDay(
    /Bewerbungsfrist: (.*)/.exec(facts.join("\n"))?.[1],
  );
  return {
    ...draft,
    description: facts.join("\n"),
    ...(!draft.expires && deadline ? { expires: deadline } : {}),
  };
}

const withKnown = (draft: AdvertDraft, known: AdvertDraft): AdvertDraft => ({
  ...draft,
  description: known.description,
  ...(!draft.expires && known.expires ? { expires: known.expires } : {}),
});

async function* readBund(context: AdapterContext): AsyncIterable<AdvertDraft> {
  // The newest first, so the pages read in a pass are those of the newest vacancies.
  const listed = parseBund((await context.http.request(FEED)).body).toSorted(
    (a, b) => (b.posted ?? "").localeCompare(a.posted ?? ""),
  );
  yield* withDetailPages(listed, context, {
    most: PAGES_A_PASS,
    read: withPage,
    keep: withKnown,
  });
}

export const bund = publicFeed({
  definition: {
    id: "bund",
    kind: "feed",
    licence: {
      name: "service.bund.de, Stellenangebote im öffentlichen Dienst (RSS)",
      short: "service.bund.de",
      url: "https://www.service.bund.de/Content/DE/Service/RSS/rss_node.html",
      licence:
        "The federal portal's public RSS feed of public-service vacancies",
      credit: "Quelle: service.bund.de",
    },
    needsCredentials: false,
    credentialVariables: [],
    disabledReason:
      "its imprint asks prior consent to copy its texts; enable it only once service.bund.de gives it",
  },
  read: readBund,
  keepUnlisted: true,
});
