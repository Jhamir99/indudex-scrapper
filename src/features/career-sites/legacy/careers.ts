// ➤ Employers' own careers sites, read without an API: the sitemap names the vacancy pages,
// ➤ each page carries a schema.org JobPosting block (published for search engines; this
// ➤ reads it the same way), robots.txt is obeyed. Sites come from config/careers.yml (by
// ➤ hand), hunted.yml (the hunter) and careers-found.yml (the careers scout). One pass reads
// ➤ the list and the pages that are new; what it found is kept in the site's own file in the
// ➤ store (builder/store.ts), so the next pass costs one sitemap plus the new pages, and a
// ➤ vacancy that leaves the sitemap has closed and leaves the pile.
// The legacy's builder/adapters/careers.ts (JustJans/indudex@ec79858), copied (career sites T003): only its imports changed, and its lists read from config/. Its own
// comments keep their marks.
import { existsSync, readFileSync } from "fs";
import { createHash } from "crypto";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import yaml from "./yaml.js";
import {
  LIST_WAIT_MS,
  get,
  getItems,
  getText,
  type Failure,
  type GetOptions,
} from "./http.js";
import type { RawOffer } from "./adapter.js";
import type { TextPay } from "./raw-offer.js";
import { loadVendors } from "./boards.js";
import {
  parseSitemap,
  looksLikeJob,
  pathShape,
  jobPostings,
  wholeAdvert,
  jobLinks,
  nextLink,
  isBoardHost,
  careersHost,
  tenantHost,
  registrable,
  isFileAddress,
  genericName,
  pageName,
  hostName,
  type Posting,
  type Salary,
  type Sitemap,
} from "./crawl.js";
import { robotsOf } from "./robots.js";
import { sitemapText } from "./sitemap-text.js";
import { parseSuccessFactors } from "../argus/scan.js";
import { decodeEntities } from "../../../shared/kit/entities.js";
import { text, TEXT_KEPT } from "./page-text.js";
import { advertIsOurs, namesOurs, titleIsOurs } from "./ours.js";
import { idFor, sameAddress } from "./normalise.js";
import {
  guessPosting,
  isList,
  listPostings,
  readHeading,
  tldCountry,
} from "../../../shared/kit/layout.js";
import { withLabels } from "./labels.js";
import { crawlGapMs } from "./pace.js";
import type { hunterMemo } from "./hunt-memo.js";
import { messageOf } from "./message.js";
import { KEPT_DAYS, dayBefore } from "./time.js";

// ➤ A careers site as its list names it (config/careers.yml and the found lists), and what a pass works out for it.
export type Site = {
  name?: string;
  twin?: string; // ➤ the store key of another entry read through the same address (twinsOf)
  host?: string;
  feed?: string;
  sitemap?: string;
  listing?: string;
  page?: string;
  urls?: string[];
  match?: string;
  found?: boolean;
  enabled?: boolean;
  platform?: string;
  country?: string;
  lang?: string;
  hint?: string;
  layout?: boolean;
  rewrite?: unknown;
  paged?: string;
  per?: number;
  pages?: number;
  html?: string;
  bizneo?: boolean;
  read?: { url: string; parsed: Sitemap };
  known?: boolean;
  feeds?: boolean;
  alone?: boolean;
  moved?: boolean;
};
export type Job = Omit<Posting, "pay"> & {
  contract?: string;
  pay?: Salary | TextPay | null;
};
// ➤ An advert as the careers reader hands it on, with no codes of its own.
export type CareerOffer = Omit<RawOffer, "codes"> & {
  codes: Record<string, never>;
};
// ➤ One page of a site as its file keeps it: its advert (none when it carries none), and how it was read.
export type Page = {
  lastmod?: string;
  job?: Job | null;
  failed?: number;
  r?: number;
  l?: number;
  bz?: number;
  dj?: number;
  from?: string;
  left?: number; // ➤ on a list: the vacancies it linked that were still unread when its pass ended
};
export type Pages = Record<string, Page>;
// ➤ A site's own file in the store (builder/store.ts).
export type SiteStore = {
  resolved?: Record<string, Partial<Site>>;
  pages?: Pages;
  adverts?: unknown[];
  pass?: { ok?: boolean } | null;
  name?: string;
  collapsed?: number;
};
type Robots = ReturnType<typeof robotsOf>;
type Item = { url: string; lastmod: string };
type Listed = Item[] & { partial?: boolean; unread?: number };

export const id = "careers";
export const kind = "board";
export const licence = {
  name: "Employers' careers sites",
  short: "employer site",
  url: "https://schema.org/JobPosting",
  licence:
    "The employer's own page, read through its sitemap and the JobPosting block it publishes for search engines; robots.txt obeyed",
  credit: "",
  needsKey: false,
};

const ROOT = dirname(
  dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url))))),
);
const PAGES_A_SITE = 200; // ➤ vacancy pages read in one pass, when the budget allows
// ➤ A vacancy page that did not answer (a timeout, a server error) is tried again in the next
// ➤ passes, three in all, and a site with five such pages in one pass is left until the next
// ➤ one: Apache Nutch's defaults (db.fetch.retry.max, fetcher.max.exceptions.per.queue).
const PAGE_TRIES = 3;
const FAILURES_A_PASS = 5;
const COLLAPSED_PASSES = 3;
// ➤ A site whose vacancy pages never carry a JobPosting block (fifty answered, not one with it)
// ➤ is barren: a pass reads only a few new pages, in case it starts publishing the block, and
// ➤ the crawler comes back weekly (cadence_h.barren in config/crawl.yml). Crawlers read less
// ➤ often what brings nothing (docs/research/faster-runs.md).
const BARREN_PAGES = 50;
const BARREN_PROBE = 10;
export const isBarren = (pages: Pages | undefined): boolean => {
  const answered = Object.values(pages || {}).filter((p) => !p.failed);
  return answered.length >= BARREN_PAGES && !answered.some((p) => p.job);
};
// ➤ A site whose pages never carry the block (five read, none with one) is read from its layout
// ➤ (builder/lib/layout.ts) as one marked `layout` is; the pages read before without it are read
// ➤ again once, and a page read that way is marked (`l`).
const BLOCKLESS_PAGES = 5;
export const isBlockless = (pages: Pages | undefined): boolean => {
  const answered = Object.values(pages || {}).filter((p) => !p.failed);
  return (
    answered.length >= BLOCKLESS_PAGES &&
    !answered.some((p) => p.job && p.job.quality !== "guessed")
  );
};
const SITEMAP_CAP = 6; // ➤ child sitemaps read from an index, those named for vacancies aside
// ➤ Children named for vacancies read past that: Maven's 27 left 21 unread, 4,000 vacancies (24 November 2026). Sixty
// ➤ keep the pass within a found site's 400 s at three seconds a request.
const VACANCY_SITEMAPS = 60;
const LISTING_PAGES = 10; // ➤ pages of a listing followed through its "next" link
const PAGED_PAGES = 40; // ➤ pages of a listing numbered in a script (a platform's, ten or so vacancies each)
const ALIVE_PAGES_A_SITE = 2000; // ➤ pages one site keeps in its file (keepAlive says which)
const DESCRIPTION = TEXT_KEPT; // ➤ characters kept per advert, the whole advert as boards keep it: only the screens read them
// ➤ How pages are read (builder/lib/crawl.ts), as a number kept with each page. Version 2 reads
// ➤ the place from the street's field and the days sites write in words: a page read before
// ➤ that whose advert has no place or no day is read again, after the new pages, within the
// ➤ same budget, the ones without a place first. Version 3 (1 November 2026) reads a place written
// ➤ alone beside the heading and no longer takes a form's list of countries for one ("Aland
// ➤ Islands Albania Algeria…"): those pages are read again too. Version 4 (the same day) keeps the
// ➤ whole advert, not its first 1,500 characters: a page whose text was cut there is read again. Version 5 (the same
// ➤ day) reads a block's hours and experience: a page read from its block before its contract and hours were kept
// ➤ (30 October) is read again too, as only 5 to 8 % of the published pages kept them while 29 of 31 blocks state them;
// ➤ and it reads the facts a page writes as labelled fields (builder/lib/labels.ts, 32 of 117 pages read on 1 November),
// ➤ so a page with neither contract nor hours is read again whatever it was read from. Version 6 (the same day) reads a
// ➤ contract or working time shown as a field with no label («Vollzeit», «Permanent»): a page with neither is read again.
// ➤ Version 7 (the same day) takes the advert's text from its page when its block holds only part of it (wholeAdvert,
// ➤ builder/lib/crawl.ts): a page whose kept text is under 1,500 characters is read again (84,708 of the 340,101 shown).
// ➤ Version 8 (the same day) reads a page in the encoding it declares (builder/http.ts): only a page whose advert has
// ➤ letters lost as «�» is read again for it (10,780 stored adverts, job7.ch's «Z�rich» among them). Version 9 (23
// ➤ November 2026) knows a list of vacancies by its heading (readHeading, builder/lib/layout.ts): a page read from its
// ➤ layout whose title opens with a listing's word is read again, and goes or loses the word.
const READER = 9;
const unplaced = (job: Job): boolean =>
  !(job.location || job.country) ||
  /^Aland Islands|^Afghanistan\b/.test(job.location || "");
const cutShort = (job: Job): boolean =>
  String(job.description || "").length === 1500;
const noContract = (job: Job): boolean =>
  !job.employmentType && !job.contract && !job.hours;
const shortText = (job: Job): boolean =>
  String(job.description || "").length < 1500;
const lostLetters = (job: Job): boolean =>
  /�/.test(`${job.title} ${job.company} ${job.location} ${job.description}`);
const listingTitle = (p: Page): boolean =>
  !!p.l && !!p.job && readHeading(p.job.title || "", "/").title !== p.job.title;
const toReadAgain = (p: Page | undefined): boolean =>
  !!p?.job &&
  (((p.r || 1) < 7 &&
    (unplaced(p.job) ||
      !p.job.posted ||
      cutShort(p.job) ||
      noContract(p.job) ||
      shortText(p.job))) ||
    ((p.r || 1) < 8 && lostLetters(p.job)) ||
    ((p.r || 1) < READER && listingTitle(p)));
// ➤ A page is read again only for an advert the last publication showed (builder/state/shown-ids.txt, written by
// ➤ builder/build-pile.ts), or for an advert of ours with no place yet, which a new reading may place and show: the rest
// ➤ are never shown, and reading them again only spent the pass. Of the 1,692,208 pages due to be read again on 1 November
// ➤ 2026, 307,871 were shown and 58,516 had no place and a title of ours; the other 78 % were neither, and the shown ones
// ➤ waited behind them (docs/research/faster-runs.md). Without the list (a store never published), all are read again.
const SHOWN = join(ROOT, "state", "shown-ids.txt");
let shownIds: Set<string> | null | undefined;
// ➤ The tests set the list themselves (null: none), so a server's own does not change what they read.
export const useShown = (ids: Set<string> | null | undefined): void => {
  shownIds = ids;
};
const shownNow = (): Set<string> | null => {
  if (shownIds === undefined) {
    try {
      shownIds = new Set(
        readFileSync(SHOWN, "utf8").split("\n").filter(Boolean),
      );
    } catch {
      shownIds = null;
    }
  }
  return shownIds;
};
// ➤ Whether the last publication showed an offer (every offer, when there is no list yet); the portals ask it too.
export const isShown = (id: string): boolean => {
  const shown = shownNow();
  return !shown || shown.has(id);
};
export const worthReadingAgain = (
  p: Page,
  url: string,
  site: Site,
  shown = shownNow(),
): boolean =>
  !shown ||
  shown.has(idFor(shownUrl(url, site))) ||
  (!!p.job && unplaced(p.job) && advertIsOurs(toRaw(p.job, site, url)));

// ➤ A site is a feed, a sitemap or a listing page to read; the careers scouts may only give
// ➤ a host and a few vacancy addresses seen, and the adapter then works out where to read
// ➤ from, in config (kept in the repository) and in state/found (what the server found on its
// ➤ own). The hand-made list (careers.yml) comes first, then the hunter's (hunted.yml) and
// ➤ the scout's (careers-found.yml), marked found; a site named earlier is left to that list.
const keyOf = (s: Site): string | undefined =>
  s.feed || s.sitemap || s.listing || s.page || s.host;

// ➤ The site's name in the store: its host, and a hash when the list named an address, so two
// ➤ lists on one host stay apart.
export function siteKey(site: Site): string {
  const k = String(keyOf(site));
  if (!/^https?:\/\//.test(k)) return k.toLowerCase();
  try {
    return `${new URL(k).host.toLowerCase()}~${createHash("sha1").update(k).digest("hex").slice(0, 6)}`;
  } catch {
    return k.toLowerCase();
  }
}

// ➤ The host a site is read on: its own, else the one of the address it is read through (a site
// ➤ the hunter found may name only its sitemap, feed or listing).
export function hostOf(site: Site | null | undefined): string {
  for (const u of [
    site?.host && `https://${site.host}`,
    site?.sitemap,
    site?.feed,
    site?.listing,
    site?.page,
    ...(site?.urls || []),
  ]) {
    try {
      if (u) return new URL(u).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      /* the next one */
    }
  }
  return "";
}

const readSites = (f: string): Site[] =>
  ["config", "state/found"].flatMap((dir) => {
    const p = join(ROOT, ...dir.split("/"), f);
    return existsSync(p)
      ? ((yaml.load(readFileSync(p, "utf-8")) as { sites?: Site[] } | null)
          ?.sites ?? [])
      : [];
  });
// ➤ The sites a list switched off, in every list: what they name stays off by any other way in (builder/switched-off.ts).
export const offSites = (): Site[] =>
  ["careers.yml", "hunted.yml", "careers-found.yml", "platform-sites.yml"]
    .flatMap(readSites)
    .filter((s) => s.enabled === false);

// ➤ The hosts whose listings name three employers or more: a platform's, where each employer is a tenant.
export function hostsOfPlatforms(sites: Site[]): Set<string> {
  const names = new Map<string, Set<string>>();
  for (const s of sites) {
    if (!s.listing || !URL.canParse(s.listing)) continue;
    const host = new URL(s.listing).host;
    names.set(
      host,
      (names.get(host) ?? new Set<string>()).add(String(s.name || s.listing)),
    );
  }
  return new Set([...names].filter(([, n]) => n.size >= 3).map(([h]) => h));
}
// ➤ The hosts the lists read, and the domains with three hosts or more among them: a platform's, each host a tenant.
export function tenantDomains(hosts: Set<string>): Set<string> {
  const count = new Map<string, number>();
  for (const h of hosts)
    count.set(registrable(h), (count.get(registrable(h)) ?? 0) + 1);
  return new Set([...count].filter(([, n]) => n >= 3).map(([d]) => d));
}
// ➤ Worked out once a run: the lists do not change while it lasts.
let platforms: {
  hosts: Set<string>;
  read: Set<string>;
  tenants: Set<string>;
} | null = null;
const platformsOf = () => {
  if (platforms) return platforms;
  const sites = loadSites();
  const read = new Set(sites.map((s) => hostOf(s)).filter(Boolean));
  return (platforms = {
    hosts: hostsOfPlatforms(sites),
    read,
    tenants: tenantDomains(read),
  });
};
const platformHosts = (): Set<string> => platformsOf().hosts;

export function loadSites(): Site[] {
  const read = readSites;
  const hand = read("careers.yml");
  const seen = new Set(hand.map(keyOf));
  // ➤ Two lists on one host are two sources: each names its own way in (a sitemap per region, a
  // ➤ listing), and the pages one reads are often not the other's; the requests to the host
  // ➤ share its pace either way (builder/http.ts). Only the same address twice is read once, and
  // ➤ an address still holding its page's template ("${…}") is no address.
  const out = [...hand];
  for (const s of [
    ...read("hunted.yml"),
    ...read("careers-found.yml"),
    ...read("platform-sites.yml"),
  ]) {
    const k = keyOf(s);
    if (!k || seen.has(k) || /\$\{|\$%7B/i.test(k)) continue;
    seen.add(k);
    out.push({ ...s, found: true });
  }
  return sitesToRead(out);
}

// ➤ A site one list names by its host alone works its address out (resolve) and may land on the very address another list
// ➤ names: 338 sites, each page fetched twice a round (24 November 2026). Both entries stay, each with its name and match;
// ➤ each is told the other's store key and takes the pages the other already read (readSite's `shared`). `resolvedOf`
// ➤ gives what a site worked out, from its file in the store.
export function twinsOf(
  sites: Site[],
  resolvedOf: (s: Site) => Site | undefined,
): Map<Site, string> {
  const hostOnly = (s: Site) => !s.feed && !s.sitemap && !s.listing && !s.page;
  const byAddress = new Map(
    sites.filter((s) => !hostOnly(s)).map((s) => [keyOf(s), s]),
  );
  const hosts = new Set([...byAddress.values()].map(hostOf));
  const twins = new Map<Site, string>();
  for (const s of sites) {
    if (!hostOnly(s) || !hosts.has(hostOf(s))) continue;
    const r = resolvedOf(s),
      other = r && byAddress.get(keyOf({ ...r, host: undefined }));
    if (!other) continue;
    twins.set(s, siteKey(other));
    twins.set(other, siteKey(s));
  }
  return twins;
}

// ➤ A job board found among the employers (one that republishes others' adverts, or whose terms
// ➤ close it or ask leave), or a site on a platform vendors.yml switches off, is not read, and what
// ➤ it gave leaves the pile at the next publication.
export const sitesToRead = (sites: Site[], vendors = loadVendors()): Site[] =>
  sites.filter(
    (s) =>
      s.enabled !== false &&
      vendors[s.platform ?? ""] !== false &&
      keyOf(s) &&
      !isBoardHost(hostOf(s)),
  );

// ➤ An address that names a country outside Europe, as multinationals' careers sites write the
// ➤ place into it ("…-woodridge-illinois-usa-60517", "/en/india/bangalore/"). «La Cañada», a Spanish town, is no Canada (LEC-27).
export const FAR_AWAY =
  /(?:^|[-_/.])(?:usa|united-states|india|china|brazil|brasil|mexico|(?<!(?:^|[-_/.])la[-_/.])canada|japan|singapore|australia|philippines|malaysia|korea|vietnam|indonesia|argentina|colombia|chile|peru|south-africa|egypt|united-arab-emirates|saudi-arabia|thailand|taiwan|new-zealand|nigeria|kenya|pakistan|bangladesh)(?=[-_/.?]|$)/i;

// ➤ A site with more pages than its file keeps (`most`) keeps first the adverts of ours in Europe,
// ➤ then its other adverts in Europe, then those outside it, then the pages with no advert, the
// ➤ newest first in each: on Qualcomm's or Eaton's sites the newest are mostly American and Indian,
// ➤ and they pushed out the European ones read first.
const slugOf = (s: unknown): string =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-");
const OURS = 3; // ➤ keepAlive's rank of our own adverts in Europe
export function keepAlive(pages: Pages, most: number, cc = ""): void {
  const urls = Object.keys(pages);
  if (urls.length <= most) return;
  const rank = (u: string): number => {
    const job = pages[u]?.job;
    if (!job) return 0;
    if (FAR_AWAY.test(u) || FAR_AWAY.test(`-${slugOf(job.location)}-`))
      return 1;
    return titleIsOurs(job.title, cc) ? OURS : 2;
  };
  const ranked = new Map(urls.map((u) => [u, rank(u)]));
  urls.sort(
    (a, b) =>
      (ranked.get(b) ?? 0) - (ranked.get(a) ?? 0) ||
      String(pages[b]?.lastmod).localeCompare(String(pages[a]?.lastmod)),
  );
  // ➤ Our own adverts in Europe are never let go: the ceiling holds the site's others. Twenty sites kept 2,000 of ours
  // ➤ each and lost the rest (24 November 2026).
  for (const u of urls.slice(most)) if (ranked.get(u) !== OURS) delete pages[u];
}

// ➤ The addresses a scout saw that are a page's template, not a vacancy ("/job/R015/${each.url}").
const TEMPLATE = /%7B|[{}]|\$\(/i;

// ➤ The list a vacancy hangs from: its address without the vacancy, also when that ends in a
// ➤ slash ("/jobs/systems-engineer-2/") or keeps the vacancy's number in a folder of its own
// ➤ ("/job/R0159966/title" → "/job/").
export function listingGuess(url: string | undefined, origin: string): string {
  if (!url) return `${origin}/`;
  let guess = url.replace(/[?#].*$/, "").replace(/[^/]+\/?$/, "");
  for (let up = 0; up < 2; up++) {
    const last = (guess.match(/\/([^/]+)\/$/) || [])[1] || "";
    if (!/^[A-Za-z]{0,3}\d{3,}[A-Za-z0-9_-]*$/.test(last)) break;
    guess = guess.replace(/[^/]+\/$/, "");
  }
  return guess.length > origin.length + 1 ? guess : `${origin}/`;
}

// ➤ The path the vacancies a scout saw share ("/en/careers/jobs/"), from two addresses at least and never down to one
// ➤ vacancy's own folder: from one address alone, «/de/de/job/R0159966/» let Thales be read for that vacancy only
// ➤ (LEC-04, 1,122 sites). Empty when there is none.
export function vacanciesPath(urls: string[] = []): string {
  const paths = [
    ...new Set(
      urls
        .map((u) => {
          try {
            return new URL(u).pathname;
          } catch {
            return "";
          }
        })
        .filter(Boolean),
    ),
  ];
  if (paths.length < 2) return "";
  const parts = paths[0].split("/").slice(0, -1);
  while (
    parts.length > 1 &&
    /^[A-Za-z]{0,3}\d{3,}[A-Za-z0-9_-]*$/.test(parts.at(-1) ?? "")
  )
    parts.pop();
  for (let n = parts.length; n > 1; n--) {
    const prefix = parts.slice(0, n).join("/") + "/";
    if (paths.every((p) => p.startsWith(prefix))) return prefix;
  }
  return "";
}

// ➤ Where a host's vacancies are read from: the sitemaps its robots.txt names, else the
// ➤ usual sitemap addresses, else the listing the addresses seen hang from. Remembered. Every
// ➤ address tried is one robots.txt lets us read. `asked` (the hunter's, lib/hunt-memo.ts) says
// ➤ which sitemaps were asked before: 'known' is answered as known without a read, 'none' is
// ➤ skipped, one kept as read is looked through again without a second read.
// ➤ A server left alone as silent stops the search (`postponed`), so no way in is worked out wrong.
export async function resolve(
  site: Site,
  state: SiteStore,
  opts: GetOptions,
  robots: Robots = robotsOf(opts),
  asked: ReturnType<typeof hunterMemo> | null = null,
): Promise<Site> {
  if (site.feed || site.sitemap || site.page) return site;
  // ➤ A site the hunter found may name only its listing: its host is the listing's. Worked out again after a pass
  // ➤ that brought nothing, 2,169 such sites asked for the robots.txt of "https://undefined" and failed for good.
  if (!site.host) {
    try {
      site = {
        ...site,
        host: new URL(site.listing || site.urls?.[0] || "").host,
      };
    } catch {
      /* no address to read */
    }
  }
  // ➤ A listing the lists name is read as named until a pass brings nothing from it: it may be
  // ➤ one vacancy's page. The site is then worked out as any other, that page a vacancy it saw.
  if (site.listing) {
    const found = state.resolved?.[String(site.host)];
    if ((state.adverts || []).length)
      return found ? { ...site, ...found } : site;
    if (!state.pass) return site;
    // ➤ A tenant on a platform's host (three employers or more list vacancies there): the platform's front page and
    // ➤ sitemap are the other tenants', so the listing stays as named (hokify, gowork, eteach: 333 tenants, 5 h a week).
    // ➤ Its list may name where the platform moved it: CHECK-IN's banks, whose pages now name their helixjobs.com
    // ➤ host (103 of 125 silent ones, 24 November 2026). It is followed there, unless another list already reads it.
    if (platformHosts().has(String(site.host))) {
      const moved = site.moved
        ? ""
        : await movedTenant(String(site.listing), opts, robots);
      if (!moved) return site;
      const there = await resolve(
        { ...site, host: moved, listing: "", urls: [], match: "", moved: true },
        {},
        opts,
        robots,
        asked,
      );
      const way: Partial<Site> = { host: moved };
      if (there.feed) way.feed = there.feed;
      else if (there.sitemap) way.sitemap = there.sitemap;
      else way.listing = there.listing;
      (state.resolved ||= {})[String(site.host)] = way;
      return { ...site, ...way, match: "", read: there.read };
    }
    site = { ...site, listing: "", urls: [site.listing, ...(site.urls || [])] };
  }
  if (site.urls?.some((u) => TEMPLATE.test(u)))
    site = { ...site, urls: site.urls.filter((u) => !TEMPLATE.test(u)) };
  // ➤ The addresses the scout saw share a path ("/en/careers/jobs/"): only pages under it are
  // ➤ read, the rest of a big site's sitemap is not.
  if (!site.match && vacanciesPath(site.urls))
    site = { ...site, match: vacanciesPath(site.urls) };
  // ➤ A remembered way in is kept only while it works, and working means it brought adverts.
  // ➤ A site whose last pass brought nothing, or failed on the very address it remembers, is
  // ➤ worked out again from scratch, so a feed it has published since, a sitemap that has
  // ➤ moved, or a way of reading that did not exist when it was first looked at, all reach it
  // ➤ on the next pass instead of never.
  // ➤ A remembered listing that brings five adverts or fewer may be one vacancy's page, or a list
  // ➤ the site has since given a sitemap: it is worked out again.
  const worked =
    !!state.pass?.ok &&
    (state.adverts || []).length >
      (state.resolved?.[String(site.host)]?.listing ? 5 : 0);
  const known = worked ? state.resolved?.[String(site.host)] : null;
  if (known) return { ...site, ...known };
  const origin = `https://${site.host}`;
  // ➤ A host that does not answer its robots.txt at all is dead for the day: nothing may be read
  // ➤ on it (RFC 9309), and no sitemap is tried (each would wait its whole timeout).
  let rules;
  try {
    rules = await robots.rules(origin);
  } catch (e) {
    const err = e as Failure;
    throw Object.assign(new Error(`no answer (${err.message.slice(0, 60)})`), {
      postponed: err.postponed,
      until: err.until,
    });
  }
  // ➤ A front page that sends its careers to a host of their own (karriere.<domain>, jobs.<domain>) is followed there,
  // ➤ once: the vacancies are on that host, and its own sitemap names none (53 silent sites, 24 November 2026). Only a
  // ➤ site whose last pass brought nothing is asked; the hunter reads the front page itself.
  const moved =
    site.moved || asked || !state.pass
      ? ""
      : await careersHostOf(origin, opts, robots);
  if (moved) {
    const there = await resolve(
      { ...site, host: moved, listing: "", urls: [], match: "", moved: true },
      {},
      opts,
      robots,
      asked,
    );
    const way: Partial<Site> = { host: moved };
    if (there.feed) way.feed = there.feed;
    else if (there.sitemap) way.sitemap = there.sitemap;
    else way.listing = there.listing;
    (state.resolved ||= {})[String(site.host)] = way;
    return { ...site, ...way, match: "", read: there.read };
  }
  // ➤ A vacancies feed first, where the site publishes one: the whole list with its places and
  // ➤ its text in a single read, which is kinder to the site than a page per vacancy. The hunter
  // ➤ asks for its feed itself (`feeds: false`).
  for (const path of site.feeds === false ? [] : ["/jobs.xml", "/jobs.rss"]) {
    if (!(await robots.may(origin + path))) continue;
    try {
      const placed = await getItems(
        origin + path,
        { ...opts, guess: true },
        (xml) =>
          parseSuccessFactors(xml, "").filter((j) => j.url && j.location),
      );
      if (placed.length >= 3) {
        (state.resolved ||= {})[String(site.host)] = { feed: origin + path };
        return { ...site, feed: origin + path };
      }
    } catch (e) {
      if ((e as Failure).postponed) throw e; /* no feed there */
    }
  }
  // ➤ A big site names a sitemap per region ("/apac/en/", "/global/en/"): the one whose address
  // ➤ shares the path the vacancies seen are under is the one that holds them, and a sitemap
  // ➤ that names vacancies beats one that names anything else.
  const candidates = [...new Set([...rules.sitemaps, `${origin}/sitemap.xml`])]
    .sort(
      (a, b) =>
        (site.match && b.includes(site.match) ? 1 : 0) -
        (site.match && a.includes(site.match) ? 1 : 0),
    )
    .slice(0, 4);
  let elsewhere: { url: string; parsed: Sitemap } | null = null;
  for (const sm of candidates) {
    const was = asked?.get(sm);
    if (was === "known") return { ...site, sitemap: sm, known: true };
    if (was === "none" || (!was && !(await robots.may(sm)))) continue;
    if (!was) asked?.set(sm, "none");
    try {
      const parsed =
        was?.parsed ||
        parseSitemap(
          await getText(sm, { ...opts, guess: !rules.sitemaps.includes(sm) }),
        );
      if (!parsed.items.length) continue;
      asked?.set(sm, { parsed });
      // ➤ An index whose children are all elsewhere is not the one this site's vacancies were
      // ➤ seen under — but it may be where they have moved to, so it is held back rather than
      // ➤ thrown away, and used if nothing better answers.
      if (
        site.match &&
        parsed.index &&
        !parsed.items.some((i) => i.url.includes(site.match ?? ""))
      ) {
        elsewhere ||= { url: sm, parsed };
        continue;
      }
      (state.resolved ||= {})[String(site.host)] = { sitemap: sm };
      // ➤ What was just read goes along, so listed() does not read it a second time.
      return { ...site, sitemap: sm, read: { url: sm, parsed } };
    } catch (e) {
      if ((e as Failure).postponed) {
        asked?.forget(sm);
        throw e;
      } /* next */
    }
  }
  // ➤ Every sitemap named vacancies somewhere else: the site has moved them, and where they
  // ➤ are now beats where they used to be.
  if (elsewhere) {
    (state.resolved ||= {})[String(site.host)] = { sitemap: elsewhere.url };
    return { ...site, sitemap: elsewhere.url, match: "", read: elsewhere };
  }
  const guess = listingGuess((site.urls || [])[0], origin);
  // ➤ A guessed list that no longer answers is worth less than the front page, which still
  // ➤ names where the vacancies went.
  let listing = guess;
  if (guess !== `${origin}/`) {
    if (!(await robots.may(guess))) listing = `${origin}/`;
    else
      try {
        const r = await get(guess, { ...opts, guess: true });
        if (!r.ok) listing = `${origin}/`;
      } catch (e) {
        if ((e as Failure).postponed) throw e;
        listing = `${origin}/`;
      }
  }
  (state.resolved ||= {})[String(site.host)] = { listing };
  return { ...site, listing };
}

// ➤ Where a platform moved a tenant whose list brings nothing, when its page names one host on another platform.
async function movedTenant(
  listing: string,
  opts: GetOptions,
  robots: Robots,
): Promise<string> {
  if (!(await robots.may(listing))) return "";
  try {
    const { tenants, read } = platformsOf();
    return tenantHost(await getText(listing, opts), listing, tenants, read);
  } catch (e) {
    if ((e as Failure).postponed) throw e;
    return "";
  }
}

// ➤ Where a front page sends its careers, when that is another host of the same domain named for them.
async function careersHostOf(
  origin: string,
  opts: GetOptions,
  robots: Robots,
): Promise<string> {
  if (!(await robots.may(`${origin}/`))) return "";
  try {
    return careersHost(await getText(`${origin}/`, opts), `${origin}/`);
  } catch (e) {
    if ((e as Failure).postponed) throw e;
    return "";
  }
}

// ➤ The vacancy addresses a site lists: its sitemap, the children of its sitemap index, or
// ➤ the links on its listing page and the pages its "next" link leads to. A listing whose pages are
// ➤ numbered in a script (site.paged, "{n}" where the number goes) is read page by page instead;
// ➤ when the platform shows a fixed number a page (site.per), a page with fewer is the last.
// ➤ A site whose list runs longer than the usual pages names how many to follow (site.pages).
// ➤ The addresses the scout saw a vacancy at say what this site's vacancy pages look like.
const shapesOf = (site: Site): Set<string> =>
  new Set((site.urls || []).map(pathShape).filter(Boolean));
const pathOf = (url: string): string => {
  try {
    return new URL(url).pathname;
  } catch {
    return String(url);
  }
};

export async function listed(
  site: Site,
  opts: GetOptions,
  robots: Robots = robotsOf(opts),
): Promise<Listed> {
  const shapes = shapesOf(site);
  if (!site.sitemap) {
    const seen = new Set<string>();
    let url = site.listing;
    for (
      let page = 0;
      url && page < (site.pages || (site.paged ? PAGED_PAGES : LISTING_PAGES));
      page++
    ) {
      if (!(await robots.may(url))) break;
      let html: string;
      // ➤ A first page the server cannot give now (5xx, 429) is a failed read, and the site keeps
      // ➤ its adverts; one that is gone or refused (404, 403) lists nothing. A silent server ends
      // ➤ the pass however far it got. The first page may come read already (`site.html`, the hunter's).
      try {
        html = !page && site.html ? site.html : await getText(url, opts);
      } catch (e) {
        const err = e as Failure;
        if (
          !err.postponed &&
          (page ||
            (/^\d{3} for /.test(err.message) &&
              !/^(5\d\d|429) for /.test(err.message)))
        )
          break;
        throw e;
      }
      // ➤ A Bizneo list on the employer's own domain: what the layout guess read is read again once (`bz`).
      if (html.includes("assets.bizneo.com")) site.bizneo = true;
      const before = seen.size;
      for (const u of jobLinks(html, url, shapes, site.match)) seen.add(u);
      const next = site.paged
        ? site.paged.replace("{n}", String(page + 2))
        : nextLink(html, url);
      const full = !site.per || seen.size - before >= site.per;
      url = next && !seen.has(next) && seen.size > before && full ? next : "";
    }
    const found = [...seen];
    const under = site.match
      ? found.filter((u) => u.includes(site.match ?? ""))
      : found;
    return (under.length ? under : found.filter(looksLikeJob)).map((url) => ({
      url,
      lastmod: "",
    }));
  }
  let first: Sitemap,
    partial = false;
  if (!(await robots.may(site.sitemap))) return [];
  // ➤ A sitemap that is gone (404, 410) lists nothing; one that does not answer (5xx, 429, a cut)
  // ➤ is a failed read, and the site keeps its adverts.
  // ➤ A gzipped sitemap (sitemap.xml.gz) unpacked, as the portals' reader does (LEC-11).
  const sitemapOf = async (url: string): Promise<Sitemap> =>
    parseSitemap(
      /\.gz(?:$|\?)/.test(url)
        ? await sitemapText(url, { ...opts, timeoutMs: LIST_WAIT_MS })
        : await getText(url, { ...opts, timeoutMs: LIST_WAIT_MS }),
    );
  try {
    first =
      site.read?.url === site.sitemap
        ? site.read.parsed
        : await sitemapOf(site.sitemap);
  } catch (e) {
    if (/^(404|410) for /.test(messageOf(e))) return [];
    throw e;
  }
  let items = first.items,
    unread = 0;
  if (first.index) {
    items = [];
    // ➤ Children whose own path names vacancies first: on a "jobs." host all looked so, and KPN's seventh went unread.
    const named = (i: Item): boolean =>
      (site.match && i.url.includes(site.match)) ||
      /job|vacan|career|stellen|emploi|empleo|vacature/i.test(pathOf(i.url));
    const vacancies = first.items.filter(named).slice(0, VACANCY_SITEMAPS),
      others = first.items.filter((i) => !named(i)),
      children = [
        ...vacancies,
        ...others.slice(0, Math.max(0, SITEMAP_CAP - vacancies.length)),
      ];
    unread = first.items.length - children.length;
    let read = 0,
      failed: unknown = null;
    // ➤ An index inside the index is followed one level down, within the same cap of sitemaps read.
    for (const c of children) {
      if (!(await robots.may(c.url))) continue;
      try {
        const child = await sitemapOf(c.url);
        if (!child.index) items.push(...child.items);
        else
          for (const g of child.items.slice(0, SITEMAP_CAP))
            if (await robots.may(g.url))
              items.push(...(await sitemapOf(g.url)).items);
        read++;
      } catch (e) {
        if ((e as Failure).postponed) throw e;
        failed = e;
      }
    }
    // ➤ One child missing is one child missing; every child failing is a failed read.
    if (!read && failed) throw failed;
    partial = !!failed;
  }
  // ➤ A list read in part (a child that did not answer) closes nothing: what it would have named keeps its page (RAS-12).
  const jobbish = Object.assign(
    items.filter((i) => looksLikeJob(i.url) || shapes.has(pathShape(i.url))),
    { partial, unread },
  );
  if (!site.match) return jobbish;
  // ➤ The path was worked out from the addresses a scout happened to see; when nothing is under
  // ➤ it, the site has moved its vacancies and what looks like a vacancy is better than nothing.
  const under = items.filter((i) => i.url.includes(site.match ?? ""));
  return under.length ? Object.assign(under, { partial, unread }) : jobbish;
}

// ➤ A vacancy a site publishes in several languages, its address differing only in a language part
// ➤ ("/de/job/…/1116413", "/en/job/…/1116413", "?lang=fr"), is read once: Rheinmetall lists its
// ➤ 1,425 vacancies in the four languages its robots.txt leaves open, and three pages in four went
// ➤ to a translation. So is one listed under two spellings of its address (sameAddress: «/jobs/1/» and
// ➤ «http://www.…/jobs/1»). The address kept is one read already, else one in the site's language, else
// ➤ the first listed.
const LANGUAGES = new Set(
  "ca eu gl de en fr it es nl pl cs sk hu ro pt pt_br pt-br zh zh_cn zh-cn lt lv et fi sv da no nn nb ru tr el bg hr sl sr uk ja ko ar".split(
    " ",
  ),
);
const LANG_QUERY = ["lang", "locale", "language", "hl"];
// ➤ A language with its country is one too ("/de-at/", "/cs-cz/", "/en_GB/"): Brunel's portal lists each vacancy under
// ➤ its German, Austrian, Swiss and Czech sites (1 November 2026).
const isLanguage = (part: string): boolean => {
  const p = part.toLowerCase();
  return (
    LANGUAGES.has(p) ||
    (/^[a-z]{2}[-_][a-z]{2}$/.test(p) && LANGUAGES.has(p.slice(0, 2)))
  );
};
function languageKey(url: string): { key: string; lang: string } {
  try {
    const u = new URL(`https://${sameAddress(url)}`);
    const lang =
      LANG_QUERY.map((q) => u.searchParams.get(q)).find(Boolean) ||
      u.pathname.split("/").find(isLanguage) ||
      "";
    for (const q of LANG_QUERY) u.searchParams.delete(q);
    return {
      key:
        u.host +
        u.pathname
          .split("/")
          .map((p) => (isLanguage(p) ? "*" : p))
          .join("/") +
        u.search,
      lang: lang.toLowerCase(),
    };
  } catch {
    return { key: url, lang: "" };
  }
}
// ➤ Between two kept the same way, a language of Europe's before one of Asia's: MetLife lists its European vacancies in
// ➤ Japanese too, whose titles the trades' gate cannot read.
const FAR_LANGUAGE = /^(?:ja|zh|ko|ar)(?:$|[-_])/;
export function oneLanguage<I extends { url: string }>(
  items: I[],
  pages: Record<string, { job?: unknown }> = {},
  lang = "",
): I[] {
  const best = new Map<string, { item: I; rank: number }>();
  for (const i of items) {
    const { key, lang: l } = languageKey(i.url);
    // ➤ Catalan, then Spanish, before the rest, the data's order of priority (LEC-19).
    const rank =
      (pages[i.url]?.job ? 8 : 0) +
      (lang && l.startsWith(lang) ? 4 : 0) +
      (/^ca/.test(l) ? 2 : /^es/.test(l) ? 1 : 0) +
      (FAR_LANGUAGE.test(l) ? 0 : 1);
    if (rank > (best.get(key)?.rank ?? -1)) best.set(key, { item: i, rank });
  }
  const keep = new Set([...best.values()].map((b) => b.item));
  return items.filter((i) => keep.has(i));
}

// ➤ The vacancy pages of hosted platforms that carry no JobPosting block, read by their own
// ➤ layout. Factorial (builder/tools/platforms.ts): the title in the page's heading, then the
// ➤ way of working and the place in brackets ("Mixto (CABA, Buenos Aires, Argentina)"). CATS
// ➤ (catsone.com, agencies' careers pages): the title in the heading, the place first in its tags
// ➤ (<ul class="job-tags"><li>Heidelberg, BW</li>).
// ➤ A Softy page's data, as far as it is read.
type Softy = {
  offer?: {
    title?: string;
    locations?: { city?: string; country?: string }[];
    description_html?: string;
    searched_profile_html?: string;
  };
  company?: { social_reason?: string };
};
const FACTORIAL_MODES: Record<string, string> = {
  remoto: "remote",
  remote: "remote",
  mixto: "hybrid",
  hybrid: "hybrid",
  híbrido: "hybrid",
  presencial: "onsite",
  "on-site": "onsite",
  onsite: "onsite",
};
// ➤ A Softy careers site (French employers): on softy.pro, or on the employer's domain with Softy's
// ➤ files (sc.softy.pro) or the templates its page data names ("templates/main/offers").
// ➤ Off until vendors.yml turns it on, for the reader as for the hunter (LEC-09).
let vendors: Record<string, unknown> | undefined;
const softyOn = () => (vendors ??= loadVendors()).softy === true;
export function isSofty(url: string, html: unknown = ""): boolean {
  try {
    if (new URL(url).hostname.endsWith(".softy.pro")) return true;
  } catch {
    return false;
  }
  return /\/\/sc\.softy\.pro\/|"component":"templates\\?\/main\\?\/offers?"/.test(
    String(html || ""),
  );
}
export function platformPosting(html: unknown, url: string): Job | null {
  let host;
  try {
    host = new URL(url).hostname;
  } catch {
    return null;
  }
  const s = String(html || "");
  const cats = host.endsWith(".catsone.com");
  const talentsoft = host.endsWith(".talent-soft.com");
  const bizneo = s.includes("assets.bizneo.com");
  // ➤ Softy: the offer, its place and its texts in the page's data (Inertia's <script data-page="app">), no block.
  if (isSofty(url, s)) {
    let data: Softy | undefined;
    try {
      data = (
        JSON.parse(
          (s.match(/<script[^>]*data-page="app"[^>]*>([\s\S]*?)<\/script>/) ||
            [])[1] ?? "",
        ) as {
          props?: Softy;
        }
      ).props;
    } catch {
      return null;
    }
    const o = data?.offer,
      at = o?.locations?.[0] || {};
    if (!o?.title) return null;
    return {
      title: String(o.title).trim(),
      company: String(data?.company?.social_reason || "").trim(),
      location: [at.city, at.country].filter(Boolean).join(", "),
      country: "",
      url,
      description: text(
        [o.description_html, o.searched_profile_html]
          .filter(Boolean)
          .join("\n"),
      ).slice(0, DESCRIPTION),
      posted: "",
      expires: "",
      remote: false,
      mode: "",
      modeTag: "",
      pay: null,
    };
  }
  if (!host.endsWith(".factorialhr.com") && !cats && !talentsoft && !bizneo)
    return null;
  const title = decodeEntities(
    (s.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]?.replace(
      /<[^>]+>/g,
      " ",
    ) || "",
  )
    .replace(/\s+/g, " ")
    .trim();
  if (!title) return null;
  // ➤ Bizneo on the employer's own domain (jobs.izertis.com, jobs.experienceis.com): no JobPosting
  // ➤ block, each field a box named in its title attribute (<div title="Ubicación">…<span>Madrid</span>).
  if (bizneo) {
    const field = (names: string): string =>
      [
        ...(
          s.match(
            new RegExp(
              `title="(?:${names})"[^>]*>[\\s\\S]*?<div[^>]*>([\\s\\S]*?)</div>`,
              "i",
            ),
          )?.[1] || ""
        ).matchAll(/<span[^>]*>([^<]*)<\/span>/g),
      ]
        .map((m) => decodeEntities(m[1]).trim())
        .filter(Boolean)
        .join(" / ");
    const mode =
      FACTORIAL_MODES[
        field("Modalidad de trabajo|Modalitat de treball|Work modality")
          .toLowerCase()
          .split(/[\s/]+/)
          .find((w) => FACTORIAL_MODES[w]) ?? ""
      ] || "";
    const body = s.replace(
      /<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi,
      " ",
    );
    return {
      title,
      company: "",
      location: field("Ubicación|Ubicació|Location|Localização"),
      country: "",
      url,
      description: text(body.slice(body.search(/<h1[^>]*>/i))).slice(
        0,
        DESCRIPTION,
      ),
      posted: "",
      expires: "",
      remote: mode === "remote",
      mode,
      modeTag: "",
      pay: null,
    };
  }
  // ➤ Talentsoft: the offer's details in one block, each field's name and value in elements of their
  // ➤ own ("Localisation | France, Nouvelle Aquitaine, 33 - Mérignac"), no colon between them.
  if (talentsoft) {
    const body = s.replace(
      /<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi,
      " ",
    );
    const at = body.indexOf("contenu-ficheoffre"),
      from = at < 0 ? 0 : body.indexOf(">", at) + 1;
    const fields = decodeEntities(body.slice(from).replace(/<[^>]+>/g, " | "))
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .replace(/(?:\|\s*)+/g, "| ");
    const field = (names: string): string =>
      (fields.match(
        new RegExp(`\\|\\s*(?:${names})\\s*\\|\\s*([^|]{2,160}?)\\s*\\|`, "i"),
      ) || [])[1] || "";
    const place = field(
      "Localisation du poste|Localisation|Location|Lieu de travail|Arbeitsort|Ubicación",
    );
    // ➤ The employer and the first day it was shown, where the site names them (Choisir le service
    // ➤ public: "Organisme de rattachement", "Date de début de diffusion | 08/10/2026").
    const company = field(
      "Organisme de rattachement|Entité de rattachement|Employeur",
    ).trim();
    const shown = field(
      "Date de début de diffusion|Date de parution|Date de publication",
    ).match(/(\d{2})\/(\d{2})\/(\d{4})/);
    return {
      title,
      company,
      location: place,
      country: "",
      url,
      description: text(body.slice(from)).slice(0, DESCRIPTION),
      posted: shown ? `${shown[3]}-${shown[2]}-${shown[1]}` : "",
      expires: "",
      remote: false,
      mode: "",
      modeTag: "",
      pay: null,
    };
  }
  if (cats) {
    const place = decodeEntities(
      (s.match(/<ul class="job-tags">\s*<li>([^<]*)<\/li>/i) || [])[1] || "",
    ).trim();
    const body = s.replace(
      /<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi,
      " ",
    );
    const start = body.search(/<h1[^>]*>/i);
    return {
      title,
      company: "",
      location: place,
      country: "",
      url,
      description: text(body.slice(start)).slice(0, DESCRIPTION),
      posted: "",
      expires: "",
      remote: /\bremote\b/i.test(place),
      mode: "",
      modeTag: "",
      pay: null,
    };
  }
  const m = s.match(
    /<span class='inline-block align-middle mr-2 ml-2'>\s*([^<(]*?)\s*\(([^)<]+)\)\s*<\/span>/i,
  );
  const mode =
    FACTORIAL_MODES[
      String(m?.[1] || "")
        .trim()
        .toLowerCase()
    ] || "";
  const body = s.replace(
    /<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi,
    " ",
  );
  const start = body.search(/<h1[^>]*>/i);
  return {
    title,
    company: "",
    location: decodeEntities(m?.[2] || "").trim(),
    country: "",
    url,
    description: text(body.slice(start)).slice(0, DESCRIPTION),
    posted: "",
    expires: "",
    remote: mode === "remote",
    mode,
    modeTag: "",
    pay: null,
  };
}

// ➤ DirectEmployers' .jobs sites (AECOM Europe, Jacobs, Amgen…) draw each vacancy page by script
// ➤ from a file of its data on microsites.dejobs.org (ALL_JOBS), named by the 32-character code that ends the
// ➤ page's address ("/leeds-gbr/principal-process-engineer-water/2A48…/job/"). Their sitemaps list
// ➤ closed vacancies too, which that file marks with the day they left (deleted_at).
// ➤ A vacancy's data file on microsites.dejobs.org, as far as it is read.
type Dejobs = {
  title?: string;
  deleted_at?: unknown;
  job_type?: string;
  company?: string;
  city?: string;
  state?: string;
  country?: string;
  location?: string;
  html_description?: string;
  description?: string;
  date_new?: string;
  date_added?: string;
};
const DEJOBS =
  /^https?:\/\/([a-z0-9.-]+\.jobs)\/(?:[^?#]*\/)?([0-9a-f]{32})\/job\/?$/i;
export const dejobsData = (url: string): string => {
  const m = String(url).match(DEJOBS);
  return m
    ? `https://microsites.dejobs.org/ALL_JOBS/${m[2].toUpperCase()}.json`
    : "";
};
export function dejobsPosting(
  d: Dejobs | null | undefined,
  url: string,
): Job | null {
  if (!d || !d.title || d.deleted_at) return null;
  const mode = /hybrid/i.test(d.job_type || "")
    ? "hybrid"
    : /remote/i.test(d.job_type || "")
      ? "remote"
      : "";
  return {
    title: String(d.title).trim(),
    company: d.company || "",
    location:
      [d.city, d.state, d.country].filter(Boolean).join(", ") ||
      d.location ||
      "",
    country: "",
    url,
    description: text(d.html_description || d.description || "").slice(
      0,
      DESCRIPTION,
    ),
    posted: String(d.date_new || d.date_added || "").slice(0, 10),
    expires: "",
    remote: mode === "remote",
    mode,
    modeTag: "",
    pay: null,
  };
}

type JoinData = {
  props: {
    pageProps: {
      initialState: {
        jobs?: {
          items?: { title?: string; country?: { iso3166?: string } }[];
          pagination?: { pageCount?: number };
        };
        company?: { name?: string };
      };
    };
  };
};
// ➤ What a JOIN company page shows in its data: the company's name, its vacancies' titles and
// ➤ countries, and how many pages of them there are.
export function joinTitles(html: unknown): {
  company: string;
  items: { title: string; country: string }[];
  pages: number;
} {
  const m = String(html || "").match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
  );
  try {
    const state = (JSON.parse(m?.[1] ?? "") as JoinData).props.pageProps
      .initialState;
    const items = (state.jobs?.items || []).map((j) => ({
      title: String(j.title || ""),
      country: String(j.country?.iso3166 || "").toLowerCase(),
    }));
    return {
      company: String(state.company?.name || ""),
      items,
      pages: state.jobs?.pagination?.pageCount || 1,
    };
  } catch {
    return { company: "", items: [], pages: 0 };
  }
}

type Erecruiter = {
  Id?: string | number;
  Title?: string;
  Location?: string;
  PortalUrl?: string;
  UrlEncodedTitle?: string;
  SubTitle?: string;
  OnlineDateCorrected?: string;
};
// ➤ eRecruiter's portals (jobs.ktm.com, stellenangebote.vorarlberg.at, *.bewerberportal.at) draw their list by
// ➤ script from an array in the page ("Jobs":[{"Id":…,"Title":…,"Location":…}]), and the vacancy pages name no
// ➤ place: the list is read as the adverts, every vacancy at once.
export function erecruiterJobs(html: unknown, pageUrl: string): Job[] | null {
  const s = String(html || ""),
    at = s.indexOf('"Jobs":[');
  if (at < 0 || !s.includes('"TotalJobsCount"')) return null;
  let depth = 0,
    end = at + 7,
    inStr = false;
  for (; end < s.length; end++) {
    const c = s[end];
    if (inStr) {
      if (c === "\\") end++;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "[") depth++;
    else if (c === "]" && --depth === 0) break;
  }
  let jobs: Erecruiter[];
  try {
    jobs = JSON.parse(s.slice(at + 7, end + 1)) as Erecruiter[];
  } catch {
    return null;
  }
  const host = new URL(pageUrl).host;
  // ➤ Its day is Austria's midnight in milliseconds ("/Date(1792101600000)/" is 16 October): read at noon.
  const day = (v: unknown): string => {
    const ms = Number(String(v || "").match(/\d{10,}/)?.[0]);
    return ms ? new Date(ms + 12 * 3600e3).toISOString().slice(0, 10) : "";
  };
  return jobs
    .filter((j) => j.Id && j.Title)
    .map((j) => ({
      title: String(j.Title).trim(),
      company: "",
      location: String(j.Location || "")
        .replace(/\s*\|\s*/g, ", ")
        .trim(),
      country: "",
      url: `https://${j.PortalUrl || host}/Job/${j.Id}${j.UrlEncodedTitle ? `/${j.UrlEncodedTitle}` : ""}`,
      description: String(j.SubTitle || ""),
      posted: day(j.OnlineDateCorrected),
      expires: "",
      remote: false,
      mode: "",
      modeTag: "",
      pay: null,
    }));
}

// ➤ A site may publish one vacancy under several countries' paths ("/cn/zh/job/", "/global/en/job/"):
// ➤ `rewrite: [from, to]` shows the one a visitor should land on, the page read keeping its own address.
export const shownUrl = (url: string, site: Site | null | undefined): string =>
  Array.isArray(site?.rewrite) && site.rewrite.length === 2
    ? String(url).replace(site.rewrite[0], site.rewrite[1])
    : url;

// ➤ A Dutch careers site calls itself "Werken bij Actemium": the employer is the rest.
const employerOf = (name: unknown): string =>
  String(name || "").replace(
    /^\s*(?:kom\s+)?werken\s+bij\s+(?:de\s+|het\s+)?(?=\S)/i,
    "",
  );

export function toRaw(job: Partial<Job>, site: Site, url: string): CareerOffer {
  // ➤ An advert read from the layout with no country takes its domain's, never a platform's
  // ➤ (gestmax.fr hosts Belgian firms too).
  return {
    source: id,
    sourceId: url,
    title: job.title,
    company:
      [job.company, site.name].map(employerOf).find((n) => !genericName(n)) ||
      "",
    location: job.location,
    country:
      job.country ||
      site.country ||
      (job.quality === "guessed" && !site.platform ? tldCountry(url) : ""),
    city: "",
    remote: job.remote,
    mode: job.mode || "",
    modeTag: job.modeTag || "",
    pay: job.pay || null,
    url: shownUrl(url, site),
    description: job.description,
    posted: job.posted,
    expires: job.expires,
    codes: {},
    lang: site.lang || "",
    ...(job.employmentType?.length
      ? { employmentType: job.employmentType }
      : {}),
    ...(job.hours ? { hours: job.hours } : {}),
    ...(job.contract ? { contract: job.contract } : {}),
    ...(Number.isFinite(job.years) ? { years: job.years } : {}),
  };
}

// ➤ A site named only "Jobs" or "Karriere" (its feed's title, the hunter's guess from its address)
// ➤ takes the name its home page gives itself, read once and kept. A feed (SuccessFactors') is one
// ➤ employer's, so its address names it when its page does not; a site may be a job board, so it
// ➤ is named by its page or not at all.
async function nameSite(
  site: Site,
  store: SiteStore,
  opts: GetOptions,
  robots: Robots,
): Promise<string> {
  if (typeof store.name === "string") return store.name;
  let host;
  try {
    host =
      site.host ||
      new URL(site.feed || site.sitemap || site.listing || "").host;
  } catch {
    return "";
  }
  const fallback = site.feed ? hostName(host) : "";
  const home = `https://${host}/`;
  try {
    if (!(await robots.may(home))) return (store.name = fallback);
  } catch {
    return fallback;
  }
  try {
    return (store.name = pageName(await getText(home, opts)) || fallback);
  } catch {
    return fallback;
  }
}

// ➤ One pass over one site: where to read from, what it lists now, the pages that are new,
// ➤ and the whole list of adverts it has at this moment. `store` is the site's own file
// ➤ (`resolved` and `pages` are kept between passes); `budget` is what the run may still
// ➤ spend (`left` pages in all, `pagesASite` on this one); `until`, when to stop reading pages
// ➤ (the pages left are read in the next pass).
// ➤ A vacancy its sitemap last changed over a year ago is not read: the publication drops it, or shows it as new when its
// ➤ page names no day. Portals' lists are full of them: of 126,636 pages read on the 115 longest queues, 28,936 (24 November
// ➤ 2026). Only where the list has a day within the year too: a sitemap writing one old day on every address says nothing.
export const outdatedBy = (items: { lastmod?: string }[], now = Date.now()) => {
  const oldest = Date.parse(dayBefore(KEPT_DAYS, now)),
    at = (i: { lastmod?: string }) => Date.parse(i.lastmod || "");
  const dated = items.some((i) => at(i) >= oldest);
  return (i: { lastmod?: string }): boolean => dated && at(i) < oldest;
};
// ➤ Hosts that carry many of the sites read (JOIN's company pages).
const SHARED_HOSTS = new Set(["join.com"]);
export async function readSite(
  given: Site,
  store: SiteStore,
  budget: { left?: number; pagesASite?: number; gapMs?: number } = {},
  log: (line: string) => void = () => {},
  { until = Infinity, shared = {} }: { until?: number; shared?: Pages } = {},
) {
  // ➤ Three seconds between two requests to one employer's site (400 ms until 6 November 2026): a burst of pages faster
  // ➤ than two a second is what firewalls that share their bans take for a robot to report (docs/research/ip-bans.md).
  // ➤ A site with a long queue is read at the portals' second (`budget.gapMs`, builder/crawl.ts).
  const opts = {
    tries: 1,
    timeoutMs: given.found ? 6000 : 12000,
    gapMs: budget.gapMs ?? 3000,
  };
  const robots = robotsOf(opts);
  const site = await resolve(given, store, opts, robots);
  if (site.name && genericName(site.name))
    site.name = await nameSite(site, store, opts, robots);
  // ➤ A feed (SuccessFactors' jobs.xml) is the whole list with the adverts' text: one read.
  if (site.feed) {
    // ➤ A host that does not answer even its robots.txt fails the pass, and the adverts are kept:
    // ➤ SAP's rmk12 refused everyone on 11 October and 40 feeds lost 11,785 adverts as "none".
    await robots.rules(site.feed);
    if (!(await robots.may(site.feed)))
      return { adverts: [], listed: 0, fetched: 0, backlog: 0, blocks: true };
    const adverts = await getItems(
      site.feed,
      { ...opts, timeoutMs: LIST_WAIT_MS },
      (xml) =>
        parseSuccessFactors(xml, site.name || "").map((p) =>
          toRaw(
            {
              title: p.title,
              company: p.company || site.name,
              location: p.location,
              description: String(p._jd || "").slice(0, DESCRIPTION),
            },
            site,
            p.url,
          ),
        ),
    );
    return {
      adverts,
      listed: adverts.length,
      fetched: 1,
      backlog: 0,
      blocks: true,
    };
  }
  // ➤ A page that lists its vacancies with no page of their own (builder/lib/layout.ts), or an eRecruiter
  // ➤ list: one read.
  if (site.page) {
    await robots.rules(site.page);
    if (!(await robots.may(site.page)))
      return { adverts: [], listed: 0, fetched: 0, backlog: 0, blocks: true };
    const html = await getText(site.page, opts);
    const adverts = (
      erecruiterJobs(html, site.page) || listPostings(html, site.page)
    ).map((j) => toRaw(j, site, j.url));
    return {
      adverts,
      listed: adverts.length,
      fetched: 1,
      backlog: 0,
      blocks: true,
    };
  }
  const from = site.sitemap || site.listing || "";
  const host = new URL(from).origin;
  // ➤ The site's own robots.txt: silent, the pass stops here and the site waits for its next one.
  const rules = await robots.rules(host);
  // ➤ The gap its robots.txt asks for (Crawl-delay), up to five minutes (some ask a hundred seconds).
  if (rules.delay) opts.gapMs = crawlGapMs(rules.delay, opts.gapMs);
  // ➤ A platform that hosts thousands of the sites read answers for all of them: a page a second in all, not the three
  // ➤ seconds a company's own server is given (its robots.txt's gap still wins).
  if (SHARED_HOSTS.has(new URL(from).hostname.replace(/^www\./, "")))
    opts.gapMs = crawlGapMs(rules.delay, 1000);
  // ➤ Only web addresses, none of a job board or a Softy site still off, and no file no advert is written in: a sitemap
  // ➤ names what it likes, and another portal's page came out as the employer's advert (LEC-07, LEC-09).
  const listedRaw = await listed(site, opts, robots);
  const listedNowAll = Object.assign(
    listedRaw.filter((i) => {
      try {
        const u = new URL(i.url);
        return (
          /^https?:$/.test(u.protocol) &&
          !isBoardHost(u.hostname) &&
          (softyOn() || !u.hostname.endsWith(".softy.pro")) &&
          !isFileAddress(i.url)
        );
      } catch {
        return false;
      }
    }),
    { partial: listedRaw.partial },
  );
  const readable = await Promise.all(
    listedNowAll.map((i) => robots.may(i.url)),
  );
  const items = oneLanguage(
    listedNowAll.filter((_, n) => readable[n]),
    store.pages,
    site.lang,
  );
  const pages = (store.pages ||= {});
  // ➤ What the twin entry read of this list (twinsOf) is this entry's too, unless it holds a newer reading itself.
  for (const i of items) {
    const t = shared[i.url];
    if (
      t &&
      (!pages[i.url] ||
        (t.job && String(t.lastmod || "") > String(pages[i.url].lastmod || "")))
    )
      pages[i.url] = t;
  }
  const layout = site.layout || isBlockless(pages);
  const unread = (p: Page): boolean => layout && !p.job && !p.failed && !p.l;
  const outdated = outdatedBy(items);
  const wanted = items.filter((i) => {
    const p = pages[i.url];
    return (
      !outdated(i) &&
      (!p ||
        (p.failed && p.failed < PAGE_TRIES) ||
        (i.lastmod && p.lastmod && i.lastmod > p.lastmod))
    );
  });
  const canRead = Math.max(
    0,
    Math.min(
      isBarren(pages) && !Object.values(pages).some(unread)
        ? BARREN_PROBE
        : (budget.pagesASite ?? PAGES_A_SITE),
      budget.left ?? PAGES_A_SITE,
    ),
  );
  const listedNow = new Set(items.map((i) => i.url));
  const isWanted = new Set(wanted.map((i) => i.url));
  const again = Object.entries(pages)
    .filter(
      ([u, p]) =>
        ((toReadAgain(p) && worthReadingAgain(p, u, site)) ||
          unread(p) ||
          (site.bizneo &&
            !p.bz &&
            !p.failed &&
            (!p.job || p.job.quality === "guessed")) ||
          (!p.job && !p.dj && !p.failed && dejobsData(u))) &&
        !isWanted.has(u) &&
        (listedNow.has(u) || (p.from && listedNow.has(p.from))),
    )
    .sort(
      ([, a], [, b]) =>
        Number(!!b.job && unplaced(b.job)) - Number(!!a.job && unplaced(a.job)),
    )
    .map(([url, p]) => ({
      url,
      lastmod: p.lastmod,
      from: p.from || "",
      again: true,
    }));
  // ➤ A sitemap often names the careers page itself ("/jobs", "/kariera") and not the
  // ➤ vacancies on it. A page with no JobPosting block that links to several vacancy pages of
  // ➤ its own site is such a list, and those pages are read too: one step further, no more.
  // ➤ The pages whose address names a job of ours come first, then the newest, and last the ones
  // ➤ whose address names a country outside Europe (a multinational's "-austin-texas-usa-"): on a
  // ➤ site with more vacancies than a pass reads, ours in Europe are not left for later.
  const cc =
    site.country ||
    site.hint ||
    (new URL(from).hostname.match(/\.([a-z]{2})$/) || [])[1] ||
    "";
  const ours = new Set(
    wanted.filter((i) => namesOurs(i.url, cc)).map((i) => i.url),
  );
  const away = new Set(
    wanted.filter((i) => FAR_AWAY.test(i.url)).map((i) => i.url),
  );
  // ➤ A page the site shows with letters lost («Z�rich», «B�hler AG») is read again before the new ones: on a site with
  // ➤ more new pages than a pass reads, it never got its turn (job7.ch: 27,108 new, 272 shown titles broken, 8 November
  // ➤ 2026). Once each, the new reading marked with this reader; half the pass at most, the rest for new pages.
  const mend = again
    .filter((q) => {
      const job = pages[q.url]?.job;
      return !!job && lostLetters(job);
    })
    .slice(0, Math.ceil(canRead / 2));
  // ➤ A list the site names that led to vacancies is followed to every vacancy it links, within the pass's pages, and read
  // ➤ again in the next pass while some are left: sixty a pass, once, left 4,222 of the 9,820 vacancies on 107 such sites'
  // ➤ lists unread for good (24 November 2026). A list that led to sixty, the old ceiling, is taken to have more.
  const ledTo = new Map<string, number>();
  for (const p of Object.values(pages))
    if (p.from) ledTo.set(p.from, (ledTo.get(p.from) || 0) + 1);
  const lists = [...ledTo]
    .filter(
      ([u, n]) =>
        listedNow.has(u) &&
        !isWanted.has(u) &&
        !pages[u]?.job &&
        (pages[u]?.left || n === 60),
    )
    .map(([u]) => ({
      url: u,
      lastmod: pages[u]?.lastmod,
      from: "",
      again: true,
    }));
  const linkedBy = new Map<string, string[]>();
  const queue: {
    url: string;
    lastmod?: string;
    from: string;
    again?: boolean;
  }[] = [
    ...mend,
    ...lists,
    ...wanted
      .sort(
        (a, b) =>
          Number(away.has(a.url)) - Number(away.has(b.url)) ||
          Number(ours.has(b.url)) - Number(ours.has(a.url)) ||
          String(b.lastmod).localeCompare(String(a.lastmod)),
      )
      .map((i) => ({ url: i.url, lastmod: i.lastmod, from: "" })),
    ...again.filter(
      (q) => !mend.includes(q) && !lists.some((l) => l.url === q.url),
    ),
  ].slice(0, canRead);
  const seen = new Set([
    ...items.map((i) => i.url),
    ...queue.map((q) => q.url),
  ]);
  let fetched = 0,
    deeper = 0,
    failures = 0;
  const readNow = new Set();
  while (queue.length && fetched < canRead) {
    if (budget.left !== undefined && budget.left <= 0) break;
    if (Date.now() >= until) break;
    if (budget.left !== undefined) budget.left--;
    const q = queue.shift();
    if (!q) break;
    fetched++;
    readNow.add(q.url);
    try {
      // ➤ A DirectEmployers vacancy is read from its data file, not from its empty page.
      const data = dejobsData(q.url);
      let html = "",
        job: Job | null = null;
      if (data && (await robots.may(data)))
        job = dejobsPosting(
          JSON.parse(await getText(data, { ...opts, until })) as Dejobs,
          q.url,
        );
      else {
        html = await getText(q.url, { ...opts, until });
        job =
          softyOn() || !isSofty(q.url, html)
            ? jobPostings(html, q.url)[0] ||
              platformPosting(html, q.url) ||
              null
            : null;
        if (job) wholeAdvert(job, html);
      }
      const links = job || data ? [] : jobLinks(html, q.url, shapesOf(site));
      // ➤ A site marked `layout` has its pages read from their HTML, its lists of vacancies aside.
      if (!job && !data && layout && !isList(q.url, links))
        job = guessPosting(html, q.url, Date.now(), {
          known: !!site.match && q.url.includes(site.match),
        });
      // ➤ The contract, hours and years its page writes as labelled fields, where the block or layout gave none.
      if (job && html) withLabels(job, html);
      if (job?.description && job.description.length > DESCRIPTION)
        job.description = job.description.slice(0, DESCRIPTION);
      pages[q.url] = {
        lastmod: q.lastmod,
        job,
        r: READER,
        ...(layout ? { l: 1 } : {}),
        ...(site.bizneo ? { bz: 1 } : {}),
        ...(data ? { dj: 1 } : {}),
        ...(q.from ? { from: q.from } : {}),
      };
      if (!job && !q.from) {
        linkedBy.set(q.url, links);
        const linked = new Set(links),
          held = Object.keys(pages).filter((u) => pages[u].from === q.url);
        // ➤ A vacancy its list no longer links has closed, unless the list fell to a tenth of them at once (LEC-06).
        if (linked.size >= held.length / 10)
          for (const u of held) if (!linked.has(u)) delete pages[u];
        for (const u of links) {
          if (
            seen.has(u) ||
            (pages[u] &&
              !((pages[u].failed ?? 0) && (pages[u].failed ?? 0) < PAGE_TRIES))
          )
            continue;
          if (!(await robots.may(u))) continue;
          seen.add(u);
          deeper++;
          queue.push({ url: u, lastmod: "", from: q.url });
        }
      }
    } catch (e) {
      // ➤ A host that says "too many requests" is left alone until the next pass. A page that
      // ➤ is not there or not for us (404, 410, 403) is an answer: no advert. One that did not
      // ➤ answer is not a page without an advert, and is tried again.
      // ➤ A bot check in place of the page is the same: the pages had stay as they were; and so is
      // ➤ a server left alone as silent.
      const err = e as Failure,
        status = err.status ?? 0;
      if (status === 429 || err.wall || err.postponed) {
        readNow.delete(q.url);
        break;
      }
      // ➤ A page robots.txt closes, or that leads where no request goes, is answered too; a 403 on a page that had an
      // ➤ advert is not, as walls answer so (RAS-08): it keeps its advert.
      const answered =
        err.closes ||
        err.refused ||
        (status >= 400 &&
          status < 500 &&
          status !== 408 &&
          !(status === 403 && pages[q.url]?.job));
      // ➤ A page read again that does not answer keeps the advert it had; a Bizneo page that is gone
      // ➤ is marked read (`bz`), or every pass would ask for it again.
      // ➤ So does one read again for a newer day (LEC-05): a 503 took its advert off the site.
      if (!((q.again || pages[q.url]?.job) && !answered))
        pages[q.url] = {
          lastmod: q.lastmod,
          job: null,
          ...(answered
            ? site.bizneo
              ? { bz: 1 }
              : {}
            : { failed: (pages[q.url]?.failed || 0) + 1 }),
          ...(q.from ? { from: q.from } : {}),
        };
      if (!answered && ++failures >= FAILURES_A_PASS) break;
    }
  }
  for (const [u, links] of linkedBy)
    if (pages[u])
      pages[u].left = links.filter((l) => !pages[l]).length || undefined;
  // ➤ Alive: what the list still names, and what a page it still names led to. A list that falls at once to a tenth of the
  // ➤ adverts held, or none (a maintenance page served with 200: LEC-06), closes nothing for two passes; the third, it does.
  const held = Object.values(pages).filter((p) => p.job).length,
    collapsed = held >= 5 && listedNow.size < held / 10;
  if (collapsed) store.collapsed = (store.collapsed || 0) + 1;
  else delete store.collapsed;
  if (collapsed && (store.collapsed ?? 0) < COLLAPSED_PASSES)
    log(
      `careers: ${site.name || site.host}: its list fell from ${held} adverts to ${listedNow.size}; kept (${store.collapsed} of ${COLLAPSED_PASSES - 1})`,
    );
  else if (!listedNowAll.partial)
    for (const [u, p] of Object.entries(pages))
      if (!listedNow.has(u) && !(p.from && listedNow.has(p.from)))
        delete pages[u];
  keepAlive(pages, ALIVE_PAGES_A_SITE, cc);
  const adverts = Object.entries(pages).flatMap(([url, p]) =>
    p.job ? [toRaw(p.job, site, url)] : [],
  );
  if (!given.found || fetched)
    log(
      `careers: ${site.name || site.host}: ${items.length} listed${deeper ? ` (+${deeper} from its lists)` : ""}, ${fetched} pages read, ${adverts.length} adverts${listedRaw.unread ? `; ${listedRaw.unread} sitemaps of its index left unread` : ""}`,
    );
  // ➤ Whether this site publishes the block at all: a site that never does is a candidate for
  // ➤ the browser and the heuristic reader.
  const read = Object.values(pages).length;
  // ➤ A site whose pages were all left unread because the run had spent its budget has not
  // ➤ been read at all: it must come back at once, not tomorrow.
  const postponed = !!wanted.length && !fetched && (budget.left ?? 1) <= 0;
  // ➤ The pages it listed and could not read yet (not reached, or not answering and to be tried
  // ➤ again): while any are left, a page read for the first time may be old, so its day is not
  // ➤ taken for the day it appeared.
  const settled = (u: string): boolean => {
    const failed = pages[u]?.failed;
    return readNow.has(u) && (!failed || failed >= PAGE_TRIES);
  };
  const backlog = wanted.filter((i) => !settled(i.url)).length;
  return {
    adverts,
    listed: items.length,
    fetched,
    postponed,
    backlog,
    blocks: read ? Object.values(pages).some((p) => p.job) : true,
    barren: isBarren(pages),
    answered: Object.values(pages).filter((p) => !p.failed).length,
  };
}
