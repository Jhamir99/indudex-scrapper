import { publicFeed } from "../../../crawl-core/feed-family.js";
import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { titleCase } from "../../../../shared/kit/text.js";

// Norway: every job ad on arbeidsplassen.no, through NAV's public job feed (pam-stilling-feed), which anyone may use
// after accepting its terms by e-mail (arbeidsplassen.nav.no/vilkar-api); NAV then sends a token, kept in `.env` as
// NAV_TOKEN. The feed is a log of changes: the last six months of it (no ad stays open longer) are read in one pass,
// about 380 pages, and the last state of each ad decides. The terms ask that an ad marked inactive leave the site at
// once and that changes be applied: the feed is read every hour (config/crawl.yml). Title, employer and municipality
// from the feed; the ad itself on arbeidsplassen.no. The legacy's builder/adapters/nav.ts.

const BASE = "https://pam-stilling-feed.nav.no";
export const FEED = `${BASE}/api/v1/feed`;
const PAGES_AT_MOST = 1000;
const SIX_MONTHS_DAYS = 183;

interface Entry {
  readonly uuid?: string;
  readonly status?: string;
  readonly municipal?: string;
  readonly title?: string;
  readonly businessName?: string;
  readonly sistEndret?: string;
}
interface Item {
  readonly _feed_entry?: Entry;
  readonly title?: string;
  readonly date_modified?: string;
}
interface Page {
  readonly items?: readonly Item[];
  readonly next_url?: string | null;
}

// The ads still open, from the feed's items: the last item of each ad is its state. (`_feed_entry` is NAV's own name
// for the item's ad, read by its key.)
export function activeAds(items: readonly Item[]): AdvertDraft[] {
  const last = new Map<string, { item: Item; entry: Entry }>();
  for (const item of items) {
    const entry = item["_feed_entry"];
    if (entry?.uuid) last.set(entry.uuid, { item, entry });
  }
  const ads: AdvertDraft[] = [];
  for (const { item, entry } of last.values()) {
    if (entry.status !== "ACTIVE") continue;
    const title = (entry.title || item.title || "").trim();
    if (!title) continue;
    const town =
      entry.municipal && entry.municipal !== "?"
        ? titleCase(entry.municipal)
        : "";
    ads.push({
      source: "nav",
      sourceId: entry.uuid ?? "",
      title,
      company: (entry.businessName ?? "").trim(),
      location: [town, "Norway"].filter(Boolean).join(", "),
      country: "no",
      city: town,
      remote: false,
      url: `https://arbeidsplassen.nav.no/stillinger/stilling/${entry.uuid}`,
      description: "",
      posted: (item.date_modified || entry.sistEndret || "").slice(0, 10),
      occupationCodes: {},
      language: "no",
    });
  }
  return ads;
}

async function* read(context: AdapterContext): AsyncIterable<AdvertDraft> {
  const authorization = `Bearer ${context.credentials["NAV_TOKEN"]}`;
  const since = new Date(
    Date.parse(`${context.today}T00:00:00Z`) - SIX_MONTHS_DAYS * 86_400_000,
  ).toUTCString();
  const items: Item[] = [];
  let url: string | null = FEED;
  let pages = 0;
  while (url && pages < PAGES_AT_MOST) {
    const answer = await context.http.request(url, {
      headers:
        pages === 0
          ? { Authorization: authorization, "If-Modified-Since": since }
          : { Authorization: authorization },
    });
    const page = JSON.parse(answer.body) as Page;
    items.push(...(page.items ?? []));
    pages++;
    url = page.next_url ? new URL(page.next_url, BASE).href : null;
  }
  const ads = activeAds(items);
  context.log(`${pages} pages, ${ads.length} ads open`);
  yield* ads;
}

export const nav = publicFeed({
  definition: {
    id: "nav",
    kind: "feed",
    licence: {
      name: "NAV, arbeidsplassen.no (pam-stilling-feed)",
      short: "NAV",
      url: "https://arbeidsplassen.nav.no/vilkar-api",
      licence: "NAV's terms for the job feed",
      credit: "Kilde: NAV, arbeidsplassen.no",
    },
    needsCredentials: true,
    credentialVariables: ["NAV_TOKEN"],
  },
  read,
});
