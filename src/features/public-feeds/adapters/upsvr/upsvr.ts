import * as cheerio from "cheerio";
import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { parseDay } from "../../../../shared/kit/dates.js";
import { plainText } from "../../../../shared/kit/text.js";
import { checkWholePass, publicFeed, withDetailPages } from "../../family.js";

// Slovakia: ÚPSVaR, the public employment service, through the list its own search draws
// (Služby zamestnanosti). Its robots.txt closes only the reply form; the portal publishes no terms
// of use. Its own offers only (those it shows from other portals are read at their source or not
// at all): a hundred a call, with title, employer, place and pay. Each new offer's own page adds
// its panels (work, contract, experience, languages, SK ISCO-08 code), read once and kept; the
// employer's panel, which names a contact person, is never read. An offer gone from a whole pass
// is closed.
const BASE = "https://www.sluzbyzamestnanosti.gov.sk";
const PAGE = 100;
const LIST_PAGES = 300;
// Own pages read a pass (the legacy read 800 of the offers its gate took).
export const DETAILS_A_PASS = 300;
// The search answers from two servers whose counts differ by thousands (one includes another
// portal's offers): a page from the other one shifts the list, so it is asked again.
const SAME_SERVER = 1000;
const SAME_SERVER_TRIES = 20;

export const listUrl = (page: number) =>
  `${BASE}/search/ponuky?zdrojPonuky=VPM&sort=OD_NAJNOVSICH&pageSize=${PAGE}&pageNr=${page}`;
export const offerUrl = (uuid: string) => `${BASE}/pracovne-ponuky/${uuid}`;

interface Listed {
  readonly uuid?: string;
  readonly nazovPracovnehoMiesta?: string;
  readonly priznakZdroj?: number | string;
  readonly miestoVykonuPrace?: string;
  readonly zakladnaMzda?: number | string;
  readonly zakladnaMzdaZaObdobie?: string;
  readonly zamestnavatelObchodneMeno?: string;
  readonly naposledyZmenene?: string;
}

export interface ListPage {
  readonly count: number;
  readonly uuids: readonly string[];
  readonly drafts: AdvertDraft[];
}

export function parseList(json: string): ListPage {
  const body = JSON.parse(json) as {
    pracovnePonuky?: unknown;
    countVPM?: number | string;
  } | null;
  const rows = Array.isArray(body?.pracovnePonuky)
    ? (body.pracovnePonuky as (Listed | null)[])
    : [];
  const drafts = rows.flatMap((row): AdvertDraft[] => {
    // Its own offers are 1 and 2; 3 is another portal's, shown with a link to it.
    if (
      !row?.uuid ||
      !row.nazovPracovnehoMiesta ||
      Number(row.priznakZdroj) === 3
    )
      return [];
    // "Bratislava-Petržalka - Bratislava V": the place, then its district.
    const place = plainText(
      (row.miestoVykonuPrace ?? "").split(" - ")[0] ?? "",
    );
    const wage = Number(row.zakladnaMzda);
    const draft: AdvertDraft = {
      source: "upsvr",
      sourceId: row.uuid,
      title: plainText(row.nazovPracovnehoMiesta),
      company: plainText(row.zamestnavatelObchodneMeno ?? ""),
      location: [place, "Slovensko"].filter(Boolean).join(", "),
      country: "sk",
      city: place,
      remote: false,
      url: offerUrl(row.uuid),
      description:
        wage > 0
          ? `Základná mzda: ${wage} € ${row.zakladnaMzdaZaObdobie === "HODINA" ? "za hodinu" : "mesačne"}`
          : "",
      occupationCodes: {},
      language: "sk",
    };
    const posted = parseDay(row.naposledyZmenene);
    if (posted) draft.posted = posted;
    return [draft];
  });
  return {
    count: Number(body?.countVPM) || 0,
    uuids: rows.flatMap((row) => (row?.uuid ? [row.uuid] : [])),
    drafts,
  };
}

const PAGE_FIELDS = [
  "Náplň práce",
  "Pracovný a mimopracovný pomer",
  "Prax",
  "Požadovaný stupeň vzdelania",
  "Cudzí jazyk",
  "Vodičské oprávnenie",
  "Všeobecné spôsobilosti",
  "Počítačové znalosti",
  "Odborné znalosti",
];

// The offer's panels as label → value, stopping before the employer's.
export function pageFields(html: string): Map<string, string> {
  const end = html.indexOf("Údaje o zamestnávateľovi");
  const $ = cheerio.load(end > 0 ? html.slice(0, end) : html);
  const fields = new Map<string, string>();
  for (const key of $("dt.vpm-data-panel__key").toArray()) {
    const label = plainText($(key).html() ?? "");
    const value = plainText(
      $(key).next("dd.vpm-data-panel__value").html() ?? "",
    );
    if (label && value && !fields.has(label)) fields.set(label, value);
  }
  return fields;
}

export function withPage(draft: AdvertDraft, html: string): AdvertDraft {
  const fields = pageFields(html);
  const lines = PAGE_FIELDS.flatMap((label) => {
    const value = fields.get(label);
    return value ? [`${label}: ${value}`] : [];
  });
  // "5153003 - Údržbár": SK ISCO-08 extends ISCO-08's unit group with three digits.
  const isco = /^(\d{4})\d*\s*-/.exec(
    fields.get("Profesia (SK ISCO-08)") ?? "",
  )?.[1];
  if (lines.length === 0 && !isco) return draft;
  return {
    ...draft,
    description: [draft.description, ...lines].filter(Boolean).join("\n"),
    ...(isco ? { occupationCodes: { isco } } : {}),
  };
}

function withKnown(draft: AdvertDraft, known: AdvertDraft): AdvertDraft {
  return {
    ...draft,
    description: known.description,
    occupationCodes: known.occupationCodes,
  };
}

async function* readUpsvr(context: AdapterContext): AsyncIterable<AdvertDraft> {
  let total = 0;
  const pageOf = async (page: number): Promise<ListPage> => {
    for (let tries = 0; tries < SAME_SERVER_TRIES; tries++) {
      const { body } = await context.http.request(listUrl(page), {
        headers: { accept: "application/json" },
      });
      // Its servers sometimes answer an empty or cut body: asked again, as a wrong server is.
      let answer: ListPage;
      try {
        answer = parseList(body);
      } catch {
        continue;
      }
      if (!total || Math.abs(answer.count - total) < SAME_SERVER) return answer;
    }
    throw new Error(
      `page ${page} kept coming unreadable or from the other server`,
    );
  };
  const listed = new Map<string, AdvertDraft>();
  const rowsSeen = new Set<string>();
  for (let page = 1; page <= LIST_PAGES; page++) {
    const answer = await pageOf(page);
    total ||= answer.count;
    for (const uuid of answer.uuids) rowsSeen.add(uuid);
    for (const draft of answer.drafts) listed.set(draft.sourceId, draft);
    if (answer.uuids.length === 0 || page * PAGE >= total) break;
  }
  checkWholePass(rowsSeen.size, total, "offers");
  yield* withDetailPages(listed.values(), context, {
    most: DETAILS_A_PASS,
    read: withPage,
    keep: withKnown,
  });
}

export const upsvr = publicFeed({
  definition: {
    id: "upsvr",
    kind: "feed",
    licence: {
      name: "Služby zamestnanosti, Ústredie práce, sociálnych vecí a rodiny",
      short: "ÚPSVaR",
      url: "https://www.sluzbyzamestnanosti.gov.sk/pracovne-ponuky",
      licence:
        "Slovakia's public employment service offers, read as its own search lists them; each offer links to its page there",
      credit: "Zdroj: Služby zamestnanosti (ÚPSVaR)",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  read: readUpsvr,
});
