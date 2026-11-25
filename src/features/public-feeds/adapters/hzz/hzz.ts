import { z } from "@hono/zod-openapi";
import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { parseDay } from "../../../../shared/kit/dates.js";
import { parseXml, pickAll, pickText } from "../../../../shared/kit/pick.js";
import { pageText, plainText } from "../../../../shared/kit/text.js";
import { publicFeed } from "../../../crawl-core/feed-family.js";

// Croatia: every vacancy the public employment service (HZZ) registers, as open data on
// data.gov.hr under the Croatian Open Licence: one RSS feed per county, in ISO-8859-2, refreshed
// hourly. Title, the day it was posted, the text with its field and closing day, and the link to
// the vacancy; no occupation code, so the title decides, downstream. A county that does not
// answer keeps what it gave last time (its advert ids live in the source's memory).
// The feeds' numbers follow the counties in alphabetical order.
export const COUNTIES = [
  "Bjelovarsko-bilogorska",
  "Brodsko-posavska",
  "Dubrovačko-neretvanska",
  "Grad Zagreb",
  "Istarska",
  "Karlovačka",
  "Koprivničko-križevačka",
  "Krapinsko-zagorska",
  "Ličko-senjska",
  "Međimurska",
  "Osječko-baranjska",
  "Požeško-slavonska",
  "Primorsko-goranska",
  "Sisačko-moslavačka",
  "Splitsko-dalmatinska",
  "Šibensko-kninska",
  "Varaždinska",
  "Virovitičko-podravska",
  "Vukovarsko-srijemska",
  "Zadarska",
  "Zagrebačka",
] as const;

export const feedUrl = (county: number) =>
  `https://burzarada.hzz.hr/rss/rsszup${county}.xml`;

// The advert ids each county's feed gave on its last answer.
export const HzzMemory = z.object({
  counties: z.record(z.string(), z.array(z.string())),
});

// The feed escapes its HTML, and the HTML its entities, sometimes several times over
// ("&amp;amp;amp;NBSP;"): unwrapped until no "&amp;" is left.
function unescaped(text: string): string {
  let out = text;
  while (/&amp;/i.test(out)) out = out.replace(/&amp;/gi, "&");
  return out.replace(/&nbsp;/gi, " ");
}

// A title or a town in capitals, as words: «SLAVONSKI BROD» → «Slavonski Brod».
const titleCase = (text: string) =>
  text === text.toUpperCase()
    ? text
        .toLowerCase()
        .replace(
          /(^|[\s-])(\p{L})/gu,
          (_, gap: string, letter: string) => gap + letter.toUpperCase(),
        )
    : text;
// A title in capitals, as a sentence.
const sentence = (text: string) =>
  text === text.toUpperCase()
    ? text.charAt(0) + text.slice(1).toLowerCase()
    : text;

export function parseHzz(xml: string, county: string): AdvertDraft[] {
  return pickAll(parseXml(xml), "rss.channel.item").flatMap(
    (item): AdvertDraft[] => {
      const title = sentence(
        plainText(unescaped(pickText(item, "title"))).replace(/^[-–\s]+/, ""),
      );
      const link = pickText(item, "link").replace(/^http:/, "https:");
      const code = /WebSifra=(\d+)/.exec(link)?.[1];
      if (!title || !code) return [];
      const text = pageText(unescaped(pickText(item, "description")));
      // «Mjesto rada: NOVALJA»: the town of the work, up to the next label.
      const town = titleCase(
        /Mjesto rada:\s*([^:,]+?)(?=\s*,|\s+[A-ZČĆŽŠĐ][a-zčćžšđ]+(?:\s+[a-zčćžšđ]+)*:|$)/
          .exec(text)?.[1]
          ?.trim() ?? "",
      );
      const draft: AdvertDraft = {
        source: "hzz",
        sourceId: code,
        title,
        company: "",
        location: [town || county, "Hrvatska"].filter(Boolean).join(", "),
        country: "hr",
        city: town,
        remote: false,
        url: link,
        description: text.replace(/^Opis posla:\s*/, ""),
        occupationCodes: {},
        language: "hr",
      };
      const posted = parseDay(pickText(item, "pubDate"));
      const expires = parseDay(/Rok za prijavu:\s*([\d.]+)/.exec(text)?.[1]);
      if (posted) draft.posted = posted;
      if (expires) draft.expires = expires;
      return [draft];
    },
  );
}

async function* readHzz(context: AdapterContext): AsyncIterable<AdvertDraft> {
  const parsed = HzzMemory.safeParse(context.memory);
  const before = parsed.success ? parsed.data.counties : {};
  const previous = new Map(
    context.previous.map((draft) => [draft.sourceId, draft]),
  );
  const counties: Record<string, string[]> = {};
  const seen = new Set<string>();
  let failed = 0;
  for (const [index, county] of COUNTIES.entries()) {
    let drafts: AdvertDraft[];
    try {
      drafts = parseHzz(
        (await context.http.request(feedUrl(index + 1))).body,
        county,
      );
    } catch (error) {
      // A county that did not answer keeps what it had; every county failing fails the pass.
      failed += 1;
      context.log(
        `${county}: ${error instanceof Error ? error.message : String(error)}`,
      );
      const ids = before[county] ?? [];
      counties[county] = ids;
      drafts = ids.flatMap((id) => previous.get(id) ?? []);
    }
    counties[county] ??= drafts.map((draft) => draft.sourceId);
    for (const draft of drafts) {
      if (seen.has(draft.sourceId)) continue;
      seen.add(draft.sourceId);
      yield draft;
    }
  }
  if (failed === COUNTIES.length) throw new Error("no county answered");
  context.remember({ counties });
  if (failed > 0) context.log(`${failed} counties kept from the last pass`);
}

export const hzz = publicFeed({
  definition: {
    id: "hzz",
    kind: "feed",
    licence: {
      name: "Hrvatski zavod za zapošljavanje, slobodna radna mjesta (data.gov.hr)",
      short: "HZZ",
      url: "https://data.gov.hr/ckan/dataset/slobodna-radna-mjesta-po-zupanijama-u-rh-i-eu",
      licence: "Otvorena dozvola (Croatian Open Licence)",
      credit: "Izvor: Hrvatski zavod za zapošljavanje, data.gov.hr",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  read: readHzz,
});
