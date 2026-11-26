import { z } from "@hono/zod-openapi";
import type {
  AdapterContext,
  AdvertDraft,
  HttpRequestOptions,
} from "../crawl-core/ports.js";
import { withPageFacts } from "../crawl-core/page-facts.js";
import {
  countryNames,
  type CountryNames,
  placeCountry,
} from "../../shared/catalogues/country-names.js";
import { HttpFailure } from "../../shared/http/http-failure.js";
import { addressWords } from "../../shared/kit/address-words.js";
import { decodeEntities } from "../../shared/kit/entities.js";
import { jobPostings, wholeAdvert } from "../../shared/kit/job-posting.js";
import { guessPosting } from "../../shared/kit/layout.js";
import {
  looksLikeJob,
  parseSitemap,
  sitemapText,
  withScheme,
} from "../../shared/kit/sitemap.js";
import { oneLanguage, platformPosting } from "../../shared/kit/vacancy-page.js";
import {
  DESCRIPTION_LIMIT,
  type SourcePay,
} from "../../shared/schemas/advert.js";
import { languagesOfCountry } from "../../shared/words/country-languages.js";
import { PAGE_FACTS, PAGE_LAYOUTS } from "./page-layouts.js";
import { type Portal, sourceOf } from "./portal-list.js";

// One pass over one portal (job portals FR-3, FR-4, FR-5), the legacy's builder/adapters/portals.ts `readPortal`: the
// vacancy addresses its sitemaps (or list pages) name, each page of ours read once, read again when its sitemap's day
// moves or it failed fewer than three times, the never-read first, then the newest, at most 1,500 a pass. A page the
// listing no longer names has closed. The adverts read are the stored ones (`context.previous`); what is no advert (a
// page with none, a failure, a sitemap's day) lives in the source's memory.

export const PAGES_A_PASS = 1500;
const PAGE_TRIES = 3;
const FAILURES_A_PASS = 10;
const LISTS_EVERY_HOURS = 20;
const PAGES_A_LIST = 25;
const DAY_MS = 86_400_000;

// What the source remembers of each page it asked: the sitemap's day, whether it held no advert, how often it failed,
// and (with `keepDays`) the last day a listing of only its newest named it. A list portal's walk is kept for a day.
const PageMemory = z.object({
  lastmod: z.string().optional(),
  none: z.boolean().optional(),
  failed: z.number().optional(),
  seen: z.string().optional(),
});
type PageMemory = z.infer<typeof PageMemory>;
export const PortalMemory = z.object({
  pages: z.record(z.string(), PageMemory).default({}),
  listed: z.array(z.string()).optional(),
  listedAt: z.string().optional(),
});
export type PortalMemory = z.infer<typeof PortalMemory>;

// A vacancy as a page's block, layout or platform gives it, before it is an advert.
export interface PortalJob {
  title?: string;
  company?: string;
  location?: string;
  country?: string;
  description?: string;
  posted?: string | undefined;
  expires?: string | undefined;
  remote?: boolean;
  pay?: SourcePay | undefined;
  employmentType?: readonly string[];
  hours?: string;
  contract?: string;
  years?: number;
}

// The country of a vacancy: the portal's, else the one a locale at the start of its address names ("/de-at/jobs/…").
export function countryOf(portal: Portal, url: string): string {
  if (portal.country) return portal.country;
  try {
    return (
      /^\/[a-z]{2}[-_]([a-z]{2})(?:\/|$)/i
        .exec(new URL(url).pathname)?.[1]
        ?.toLowerCase() ?? ""
    );
  } catch {
    return "";
  }
}

// A page that the listing no longer names has closed, unless the portal lists only its newest (an RSS feed of twenty):
// then it stays `keepDays` after the listing last named it.
export function forgetUnlisted(
  pages: Record<string, PageMemory>,
  listing: ReadonlyMap<string, string>,
  keepDays: number | undefined,
  today: string,
): Set<string> {
  const oldest = keepDays
    ? new Date(Date.parse(`${today}T00:00:00Z`) - keepDays * DAY_MS)
        .toISOString()
        .slice(0, 10)
    : "";
  const forgotten = new Set<string>();
  for (const [url, page] of Object.entries(pages)) {
    if (listing.has(url)) {
      if (keepDays) page.seen = today;
      continue;
    }
    if (!keepDays || (page.seen ?? page.lastmod ?? "") < oldest) {
      delete pages[url];
      forgotten.add(url);
    }
  }
  return forgotten;
}

// A vacancy page read as the portal reader reads it: its block (completed from the page), the portal's own layout, its
// platform's page or, for a portal marked `layout`, its HTML; then its labelled facts and the portal's own facts.
export function portalPage(
  portal: Portal,
  html: string,
  url: string,
  pageFacts: AdapterContext["pageFacts"],
): PortalJob | null {
  const block = jobPostings(html, url)[0];
  let job: PortalJob | null = null;
  if (block) {
    const whole = wholeAdvert(block, html);
    job = {
      title: whole.title,
      company: whole.company,
      location: whole.location,
      country: whole.country,
      description: whole.description,
      posted: whole.posted,
      expires: whole.validThrough,
      remote: whole.remote,
      pay: whole.pay,
      employmentType: whole.employmentType,
      ...(whole.hours ? { hours: whole.hours } : {}),
      ...(whole.years !== undefined ? { years: whole.years } : {}),
    };
  } else {
    const laid =
      PAGE_LAYOUTS[portal.host]?.(html, url) ??
      platformPosting(html, url) ??
      (portal.layout
        ? guessPosting(html, url, Date.now(), { known: Boolean(portal.match) })
        : null);
    if (laid)
      job = {
        ...(laid.title ? { title: laid.title } : {}),
        ...(laid.company ? { company: laid.company } : {}),
        ...(laid.location ? { location: laid.location } : {}),
        ...(laid.country ? { country: laid.country } : {}),
        description: laid.description ?? "",
        ...(laid.posted ? { posted: laid.posted } : {}),
        ...(laid.expires ? { expires: laid.expires } : {}),
        remote: Boolean(laid.remote),
        ...(laid.employmentType?.length
          ? { employmentType: laid.employmentType }
          : {}),
        ...(laid.hours ? { hours: laid.hours } : {}),
        ...(laid.contract ? { contract: laid.contract } : {}),
        ...(Number.isFinite(laid.years) ? { years: laid.years } : {}),
      };
  }
  if (!job) return null;
  job = withPageFacts(job, pageFacts(html));
  const facts = PAGE_FACTS[portal.host]?.(html);
  if (facts?.length)
    job.description = [job.description, ...facts].filter(Boolean).join("\n");
  return job;
}

// `placeInTitle`: the town a portal ends every title with is cut ("Ingénieur CVC F/H Bordeaux").
export function cutTown(title: string, location: string): string {
  const town = location.split(",")[0]?.trim() ?? "";
  return town && title.toLowerCase().endsWith(` ${town.toLowerCase()}`)
    ? title.slice(0, -town.length - 1).trim()
    : title;
}

// The advert a page gave, as the store keeps it; undefined when its country cannot be read (the store needs one). The
// day the listing gives stands in when the page names none. A portal that is one employer's careers site names it
// (`employer`); `notEmployer` empties a name standing where the employer is not said; an agency's portal names itself
// where its page names no employer; `townInEmployer` adds the town after a network's name.
export function toDraft(
  job: PortalJob,
  portal: Portal,
  url: string,
  listedDay: string,
  names?: CountryNames,
): AdvertDraft | undefined {
  // Some agencies end every title with a call to apply ("– Jetzt bewerben!"): it goes.
  const title = (job.title ?? "").replace(
    /\s*[–—-]\s*jetzt bewerben!?\s*$/i,
    "",
  );
  const named =
    portal.notEmployer &&
    new RegExp(portal.notEmployer, "i").test(job.company ?? "")
      ? ""
      : (job.company ?? "");
  const company =
    portal.employer || named || (portal.agency ? portal.name : "");
  const location = job.location ?? "";
  const town = portal.townInEmployer
    ? (location.split(",")[0]?.trim() ?? "")
    : "";
  // A block that writes its country by name («City of London, London, UK»), or none: the place is read as the legacy's
  // processor read places, with `placeCountry` (a name or a big town, else remote xx, else not stated zz), since the
  // store needs a country.
  const country =
    job.country ||
    countryOf(portal, url) ||
    (names ? placeCountry(location, names) : "");
  if (!/^[a-z]{2}$/.test(country)) return undefined;
  const posted = job.posted || listedDay || undefined;
  return {
    source: sourceOf(portal),
    sourceId: url,
    title: portal.placeInTitle ? cutTown(title, location) : title,
    company: town && company ? `${company} (${town})` : company,
    location,
    country,
    city: "",
    remote: Boolean(job.remote),
    url,
    description: (job.description ?? "").slice(0, DESCRIPTION_LIMIT),
    ...(posted ? { posted } : {}),
    ...(job.expires ? { expires: job.expires } : {}),
    occupationCodes: {},
    language: portal.lang || (languagesOfCountry(country)[0] ?? "en"),
    ...(job.pay ? { pay: job.pay } : {}),
    ...(job.employmentType?.length
      ? { employmentType: [...job.employmentType].slice(0, 10) }
      : {}),
    ...(job.hours ? { hours: job.hours.slice(0, 200) } : {}),
    ...(job.contract ? { contract: job.contract.slice(0, 200) } : {}),
    ...(job.years !== undefined ? { years: job.years } : {}),
  };
}

const textOf = async (
  context: AdapterContext,
  url: string,
  options?: HttpRequestOptions,
): Promise<string> => (await context.http.request(url, options)).body;

// A request robots.txt closes is left alone, as the legacy's `robots.may` left it.
const disallowed = (error: unknown): boolean =>
  error instanceof HttpFailure && error.kind === "disallowed";

// The vacancies a portal's sitemaps list (three levels of index at most, each once; the children an index names that
// match `children`), each address kept when it has the portal's shape of a vacancy (`match`), else when it looks like
// one; and its list pages.
async function listed(
  portal: Portal,
  context: AdapterContext,
): Promise<Map<string, string>> {
  const take = portal.children ? new RegExp(portal.children) : null;
  const shape = portal.match ? new RegExp(portal.match) : null;
  const items = new Map<string, string>();
  const asked = new Set<string>();
  const read = async (url: string, depth = 0): Promise<void> => {
    if (asked.has(url) || depth > 3) return;
    asked.add(url);
    let xml: string;
    try {
      const answer = await context.http.request(url, { binary: true });
      xml = answer.bytes ? sitemapText(answer.bytes) : answer.body;
    } catch (error) {
      if (disallowed(error)) return;
      throw error;
    }
    const sitemap = parseSitemap(xml);
    if (sitemap.index) {
      for (const child of sitemap.items)
        if (!take || take.test(child.url))
          await read(withScheme(child.url), depth + 1);
      return;
    }
    for (const item of sitemap.items) {
      const address = withScheme(item.url);
      if (shape ? shape.test(address) : looksLikeJob(address))
        items.set(address, item.lastmod);
    }
  };
  for (const sitemap of [portal.sitemap ?? []].flat()) await read(sitemap);
  if (portal.lists) await listPages(portal, context, items, shape);
  return items;
}

// A portal with search pages instead of a sitemap (`lists`): each list page by page (`page=N`, or its `pageParam`) until
// a page names no vacancy the list has not shown yet, at most 25 pages or its `listPages`; with `split`, the sub-lists a
// list's first page links to are walked instead, each at `splitUrl`.
export const pagesOfList = (portal: Portal): number =>
  portal.listPages ?? PAGES_A_LIST;
async function listPages(
  portal: Portal,
  context: AdapterContext,
  items: Map<string, string>,
  shape: RegExp | null,
): Promise<void> {
  // A list without the shape of its vacancies listed nothing, and said nothing (the legacy's LEC-20).
  if (!shape)
    throw new Error(
      `${portal.name}: "lists" needs "match", the shape of its vacancies' addresses`,
    );
  const linksOf = (html: string, base: string): Set<string> => {
    const out = new Set<string>();
    for (const match of html.matchAll(/href=["']([^"'#]+)["']/gi)) {
      try {
        const url = new URL(decodeEntities(match[1] ?? ""), base).href;
        if (shape.test(url)) out.add(url);
      } catch {
        // Not an address.
      }
    }
    return out;
  };
  const walk = async (first: string): Promise<void> => {
    const seen = new Set<string>();
    for (let n = 1; n <= pagesOfList(portal); n++) {
      const url =
        n === 1
          ? first
          : `${first}${first.includes("?") ? "&" : "?"}${portal.pageParam ?? "page"}=${n}`;
      let html: string;
      try {
        html = await textOf(context, url);
      } catch (error) {
        if (disallowed(error)) return;
        throw error;
      }
      const fresh = [...linksOf(html, url)].filter((link) => !seen.has(link));
      if (!fresh.length) return;
      for (const link of fresh) {
        seen.add(link);
        items.set(link, "");
      }
    }
  };
  for (const list of [portal.lists ?? []].flat()) {
    if (!portal.split) {
      await walk(list);
      continue;
    }
    let html: string;
    try {
      html = await textOf(context, list);
    } catch (error) {
      if (disallowed(error)) continue;
      throw error;
    }
    for (const link of linksOf(html, list)) items.set(link, "");
    for (const sub of new Set(
      [...html.matchAll(new RegExp(portal.split, "g"))].map((match) =>
        (portal.splitUrl ?? "").replace("$1", match[1] ?? ""),
      ),
    ))
      await walk(sub);
  }
}

// One pass: the adverts of the pages still listed (those read before and those read now), the backlog reported.
export async function* readPortal(
  portal: Portal,
  context: AdapterContext,
): AsyncIterable<AdvertDraft> {
  const parsed = PortalMemory.safeParse(context.memory);
  const memory: PortalMemory = parsed.success ? parsed.data : { pages: {} };
  const names = await countryNames();
  const pages = memory.pages;

  // Search pages (hundreds of them) are walked once a day; the passes between read what that walk listed.
  let items: Map<string, string>;
  const walkedAt = Date.parse(memory.listedAt ?? "");
  if (
    portal.lists &&
    memory.listed &&
    Date.parse(`${context.today}T12:00:00Z`) - walkedAt <
      LISTS_EVERY_HOURS * 3_600_000
  )
    items = new Map(memory.listed.map((url) => [url, ""]));
  else {
    items = await listed(portal, context);
    if (portal.lists) {
      memory.listed = [...items.keys()];
      memory.listedAt = new Date().toISOString();
    }
  }

  // The adverts read before, by their page's address.
  const known = new Map(
    context.previous.map((draft) => [draft.sourceId, draft]),
  );
  // A vacancy listed under several of the portal's languages or countries is read once.
  const once = new Set(
    oneLanguage(
      [...items.keys()].map((url) => ({ url })),
      Object.fromEntries([...known.keys()].map((url) => [url, { job: {} }])),
      portal.lang ?? "",
    ).map((item) => item.url),
  );
  // Deleting the key at hand while walking a Map is safe.
  for (const url of items.keys()) if (!once.has(url)) items.delete(url);
  for (const url of known.keys())
    if (!pages[url]) pages[url] = { lastmod: items.get(url) ?? "" };
  const forgotten = forgetUnlisted(
    pages,
    items,
    portal.keepDays,
    context.today,
  );
  for (const url of forgotten) known.delete(url);

  const wanted = [...items]
    .filter(([url, lastmod]) => {
      const page = pages[url];
      const read =
        page &&
        !(page.failed && page.failed < PAGE_TRIES) &&
        !(lastmod && page.lastmod && lastmod > page.lastmod);
      if (read) return false;
      return (
        portal.readAll ||
        context.isOurs(addressWords(url), countryOf(portal, url))
      );
    })
    .toSorted(
      ([a, dayA], [b, dayB]) =>
        Number(Boolean(pages[a])) - Number(Boolean(pages[b])) ||
        dayB.localeCompare(dayA),
    );

  let fetched = 0;
  let failures = 0;
  for (const [url, lastmod] of wanted) {
    if (fetched >= PAGES_A_PASS || !context.pageBudget.take()) break;
    fetched++;
    try {
      const html = await textOf(context, url);
      const job = portalPage(portal, html, url, context.pageFacts);
      const draft = job ? toDraft(job, portal, url, lastmod, names) : undefined;
      pages[url] = { lastmod, ...(draft ? {} : { none: true }) };
      if (draft) known.set(url, draft);
      else known.delete(url);
    } catch (error) {
      if (disallowed(error)) {
        fetched--;
        continue;
      }
      if (
        error instanceof HttpFailure &&
        (error.kind === "rate-limited" || error.kind === "held")
      )
        break;
      // A 408 is no answer; a page that answers 4xx otherwise has closed. A page read again that does not answer keeps
      // its advert.
      const answered =
        error instanceof HttpFailure &&
        error.kind === "client-error" &&
        error.status !== 408;
      const failed = (pages[url]?.failed ?? 0) + 1;
      if (answered) {
        pages[url] = { lastmod, none: true };
        known.delete(url);
      } else {
        pages[url] = {
          ...pages[url],
          lastmod: pages[url]?.lastmod ?? lastmod,
          failed,
        };
        if (++failures >= FAILURES_A_PASS) break;
      }
    }
  }

  // `staleDays`: a board that keeps its old vacancies, their end day moved forward, shows those posted in that many days.
  const fresh = (draft: AdvertDraft): boolean =>
    !portal.staleDays ||
    !draft.posted ||
    Date.parse(draft.posted) >=
      Date.parse(`${context.today}T00:00:00Z`) - portal.staleDays * DAY_MS;
  // What is left known is still listed, or kept its `keepDays` after the listing last named it.
  const adverts = [...known.values()];
  context.backlog(Math.max(0, wanted.length - fetched));
  context.remember(memory);
  context.log(
    `${items.size} listed, ${wanted.length} of ours to read, ${fetched} read, ${adverts.length} adverts`,
  );
  yield* adverts.filter(fresh);
}
