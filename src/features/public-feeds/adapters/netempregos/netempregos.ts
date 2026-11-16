import { z } from "@hono/zod-openapi";
import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { parseDay } from "../../../../shared/kit/dates.js";
import { parseXml, pickAll, pickText } from "../../../../shared/kit/pick.js";
import { pageText, plainText } from "../../../../shared/kit/text.js";
import { publicFeed, UNDATED_OPEN_DAYS } from "../../family.js";

// Portugal: Net-Empregos, the country's biggest job site, through the RSS feeds its robots.txt
// names to crawlers. DISABLED AND FLAGGED (public-feeds FR-6): its terms forbid any commercial end,
// so it waits for the leave the operator asks, as in the legacy since 27 October 2026. Ported from
// the legacy so that enabling it is one line; never read so far, so its fixture is built from the
// format the legacy documents, not saved from the site.
// Its newest feed holds the thousand newest offers, under a day of them; each category's feed
// the five hundred newest of it, a sixth of the categories read each pass. An offer is kept 30 days
// from its day, or until a category feed that had room no longer holds it.
const BASE = "https://www.net-empregos.com";
export const NEWEST = `${BASE}/rss.asp`;
export const feedUrl = (category: number) => `${BASE}/rss.asp?cat=${category}`;
export const SLICES = 6;
// A category feed this long may have dropped older offers that are still open.
const FULL = 500;
export const CATEGORIES = [
  1, 5, 6, 8, 9, 11, 12, 14, 15, 16, 18, 19, 22, 23, 24, 26, 28, 29, 30, 32, 34,
  35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 49, 50, 51, 52, 53, 54,
  55, 56, 57, 58,
] as const;

export const sliceOf = (slice: number) =>
  CATEGORIES.filter((_, index) => index % SLICES === slice % SLICES);

// The slice read last, and the category feed each offer was seen in and whether it was full.
export const NetEmpregosMemory = z.object({
  slice: z.number().int().nonnegative(),
  offers: z.record(
    z.string(),
    z.object({ listing: z.string(), full: z.boolean() }),
  ),
});
type Listing = { readonly listing: string; readonly full: boolean };

// «Porto»; «( Todas as Zonas )», anywhere in Portugal; «Estrangeiro - Angola», abroad (not ours to
// place: left to the processor, the country unknown here so the Portuguese one stands).
export function placeOfZone(
  zone: string,
): Pick<AdvertDraft, "city" | "location"> {
  const text = zone.trim();
  if (!text || /todas as zonas/i.test(text))
    return { city: "", location: "Portugal" };
  const abroad = /^estrangeiro\s*-\s*(.+)$/i.exec(text)?.[1]?.trim();
  if (abroad) return { city: "", location: abroad };
  if (/estrangeiro/i.test(text)) return { city: "", location: "" };
  return { city: text, location: `${text}, Portugal` };
}

// An item's description is HTML: «<b>Empresa: </b>…<br><b>Categoria: </b>…<br><b>Zona: </b>…
// <br><b>Data: </b>9-10-2026<br><br><b>Descrição: </b>…».
const labelled = (html: string, label: string) =>
  plainText(
    new RegExp(`${label}:\\s*</b>([\\s\\S]*?)(?:<br|$)`, "i").exec(html)?.[1] ??
      "",
  );

export function parseFeed(xml: string): AdvertDraft[] {
  return pickAll(parseXml(xml), "rss.channel.item").flatMap(
    (item): AdvertDraft[] => {
      const url = pickText(item, "link");
      const sourceId = /\.com\/(\d+)\//.exec(url)?.[1];
      const title = plainText(pickText(item, "title"));
      if (!sourceId || !title || !url.startsWith("https://")) return [];
      const html = pickText(item, "description");
      const text =
        /Descri[^:]*:\s*<\/b>([\s\S]*?)(?:<a\s|$)/i.exec(html)?.[1] ?? "";
      const draft: AdvertDraft = {
        source: "netempregos",
        sourceId,
        title,
        company: plainText(pickText(item, "dc:creator")),
        ...placeOfZone(labelled(html, "Zona")),
        country: "pt",
        remote: false,
        url,
        description: [pageText(text), labelled(html, "Categoria")]
          .filter(Boolean)
          .join("\n"),
        occupationCodes: {},
        language: "pt",
      };
      const posted = parseDay(labelled(html, "Data"));
      if (posted) draft.posted = posted;
      return [draft];
    },
  );
}

async function* readNetEmpregos(
  context: AdapterContext,
): AsyncIterable<AdvertDraft> {
  const parsed = NetEmpregosMemory.safeParse(context.memory);
  const memory = parsed.success
    ? parsed.data
    : { slice: SLICES - 1, offers: {} };
  const slice = (memory.slice + 1) % SLICES;
  const now = new Map<string, AdvertDraft>();
  const listings = new Map<string, Listing>();
  const readNow = new Set<string>();
  const read = async (url: string) => {
    try {
      const drafts = parseFeed((await context.http.request(url)).body);
      readNow.add(url);
      return drafts;
    } catch (error) {
      context.log(
        `${url}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  };
  // The category feeds first, so an offer seen in both keeps its category (what tells it closed).
  for (const category of sliceOf(slice)) {
    const url = feedUrl(category);
    const drafts = await read(url);
    for (const draft of drafts) {
      now.set(draft.sourceId, draft);
      listings.set(draft.sourceId, {
        listing: url,
        full: drafts.length >= FULL,
      });
    }
  }
  for (const draft of await read(NEWEST)) {
    if (now.has(draft.sourceId)) continue;
    now.set(draft.sourceId, draft);
    const was = memory.offers[draft.sourceId];
    if (was) listings.set(draft.sourceId, was);
  }
  if (readNow.size === 0) throw new Error("no feed answered");

  // One seen before and gone: closed if a category feed read now had room and no longer holds
  // it; else kept 30 days from its day.
  const oldest = new Date(`${context.today}T00:00:00Z`);
  oldest.setUTCDate(oldest.getUTCDate() - UNDATED_OPEN_DAYS);
  const oldestDay = oldest.toISOString().slice(0, 10);
  const kept = context.previous.filter((draft) => {
    if (now.has(draft.sourceId)) return false;
    const was = memory.offers[draft.sourceId];
    if (was && readNow.has(was.listing) && !was.full) return false;
    return (draft.posted ?? context.today) >= oldestDay;
  });
  for (const draft of kept) {
    const was = memory.offers[draft.sourceId];
    if (was) listings.set(draft.sourceId, was);
  }
  context.remember({ slice, offers: Object.fromEntries(listings) });
  context.log(
    `${readNow.size} feeds read, ${now.size} offers seen, ${kept.length} kept`,
  );
  yield* now.values();
  yield* kept;
}

export const netempregos = publicFeed({
  definition: {
    id: "netempregos",
    kind: "portal",
    licence: {
      name: "Net-Empregos",
      short: "Net-Empregos",
      url: "https://www.net-empregos.com/",
      licence:
        "Read from the RSS feeds its robots.txt names, each offer linking to Net-Empregos",
      credit: "via Net-Empregos",
    },
    needsCredentials: false,
    credentialVariables: [],
    disabledReason:
      "its terms forbid any commercial end; enable it only once Net-Empregos gives leave",
  },
  read: readNetEmpregos,
});
