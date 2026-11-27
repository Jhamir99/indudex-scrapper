import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "@hono/zod-openapi";
import { parse } from "yaml";
import { CONFIG_DIRECTORY } from "../../shared/config/load-config.js";
import { describeIssues } from "../../shared/config/data-file.js";

// The career sites' lists (career sites FR-1): the legacy's lists in config/, byte for byte with their keys, read once,
// synchronously, when the registry is built, and gathered as the legacy's `loadSites` and `loadCompanies` gather them.
//
// - Careers sites: careers.yml by hand, then hunted.yml, careers-found.yml and platform-sites.yml, marked found; the same
//   address twice is read once (the hand-kept entry first), and an address still holding its page's template is none.
// - Company boards: companies.yml by hand, then hunted.yml and companies-found.yml, marked found; the same platform and
//   slug twice is read once.
// - vendors.yml: a platform marked false is not read; a vendor (Workday, Oracle) only when marked true.
//
// The legacy also leaves out a site that is a job board by its host (`isBoardHost`): given as `isBoardHost` once the
// careers reader's helpers are here.

// The 28 board platforms, each name the key a company's entry carries its slug or address under; the vendors are read
// only when vendors.yml switches them on.
export const BOARD_PLATFORMS = [
  "greenhouse",
  "ashby",
  "lever",
  "smartrecruiters",
  "recruitee",
  "workable",
  "teamtailor",
  "personio",
  "bamboohr",
  "breezy",
  "homerun",
  "varbi",
  "traffit",
  "hirehive",
  "prospective",
  "flatchr",
  "zoho",
  "hibob",
  "emply",
  "pinpoint",
  "dvinci",
  "manatal",
  "hrmanager",
  "cornerstone",
  "talentadore",
  "easycruit",
  "workday",
  "oracle",
] as const;
export type BoardPlatform = (typeof BOARD_PLATFORMS)[number];
const VENDORS: ReadonlySet<string> = new Set(["workday", "oracle"]);

const Optional = z.string().min(1).optional();
// A careers site as the lists write it: its way in (host, sitemap, feed, listing or page) and how its vacancies are told
// apart; the legacy's reader reads the rest (rewrite, paged, html, ...), kept as written.
export const CareerSite = z.looseObject({
  // Some platform sites carry an empty name; the reader names them from their pages.
  name: z.string().optional(),
  host: Optional,
  sitemap: Optional,
  feed: Optional,
  listing: Optional,
  page: Optional,
  urls: z.array(z.string().min(1)).optional(),
  match: Optional,
  platform: Optional,
  country: Optional,
  lang: Optional,
  enabled: z.boolean().optional(),
});
export type CareerSite = z.infer<typeof CareerSite> & {
  readonly found?: boolean;
};

// A company's board: its name, its platform's key with its slug or address, and optionally its country and language.
export const CompanyBoard = z.looseObject({
  name: z.string().min(1),
  country: Optional,
  lang: Optional,
  enabled: z.boolean().optional(),
});
export type CompanyBoard = z.infer<typeof CompanyBoard> & {
  readonly found?: boolean;
};

const Vendors = z.record(z.string(), z.boolean());

export class CareerListError extends Error {
  override name = "CareerListError";
}

function readList<T extends z.ZodType>(
  directory: string,
  file: string,
  key: "sites" | "companies",
  entry: T,
): z.infer<T>[] {
  const parsed = parse(readFileSync(join(directory, file), "utf8")) as Record<
    string,
    unknown
  > | null;
  const result = z.array(entry).safeParse(parsed?.[key] ?? []);
  if (!result.success)
    throw new CareerListError(describeIssues(file, result.error));
  return result.data;
}

// The address a site is read through, which tells two entries apart (the legacy's `keyOf`).
export const siteAddress = (site: CareerSite): string =>
  site.feed ?? site.sitemap ?? site.listing ?? site.page ?? site.host ?? "";

// A board's platform and its slug, lower case: what tells two entries apart.
export function boardOf(
  company: CompanyBoard,
): { readonly platform: BoardPlatform; readonly slug: string } | undefined {
  for (const platform of BOARD_PLATFORMS) {
    const slug = company[platform];
    if (slug !== undefined && slug !== null && slug !== "")
      return { platform, slug: String(slug) };
  }
  return undefined;
}

export interface CareerLists {
  // Every site of the lists, each address once, the hand-kept list's first; `found` on the others.
  readonly allSites: readonly CareerSite[];
  // Those read: not paused, not on a platform vendors.yml switches off, not a job board's host.
  readonly sites: readonly CareerSite[];
  readonly allCompanies: readonly CompanyBoard[];
  // Those whose platform is read (vendors.yml); a paused one is kept here and shown paused, as the legacy's reader does.
  readonly companies: readonly CompanyBoard[];
  readonly vendors: Readonly<Record<string, boolean>>;
}

export function platformOn(
  platform: string,
  vendors: Readonly<Record<string, boolean>>,
): boolean {
  return (
    vendors[platform] !== false &&
    (!VENDORS.has(platform) || vendors[platform] === true)
  );
}

const TEMPLATE = /\$\{|\$%7B/i;

export function readCareerLists({
  directory = CONFIG_DIRECTORY,
  isBoardHost = () => false,
}: {
  readonly directory?: string;
  readonly isBoardHost?: (site: CareerSite) => boolean;
} = {}): CareerLists {
  const vendorsResult = Vendors.safeParse(
    parse(readFileSync(join(directory, "vendors.yml"), "utf8")) ?? {},
  );
  if (!vendorsResult.success)
    throw new CareerListError(
      describeIssues("vendors.yml", vendorsResult.error),
    );
  const vendors = vendorsResult.data;

  const hand = readList(directory, "careers.yml", "sites", CareerSite);
  const seen = new Set(hand.map(siteAddress));
  const allSites: CareerSite[] = [...hand];
  for (const file of ["hunted.yml", "careers-found.yml", "platform-sites.yml"])
    for (const site of readList(directory, file, "sites", CareerSite)) {
      const address = siteAddress(site);
      if (!address || seen.has(address) || TEMPLATE.test(address)) continue;
      seen.add(address);
      allSites.push({ ...site, found: true });
    }
  const sites = allSites.filter(
    (site) =>
      site.enabled !== false &&
      vendors[site.platform ?? ""] !== false &&
      siteAddress(site) !== "" &&
      !isBoardHost(site),
  );

  const handBoards = readList(
    directory,
    "companies.yml",
    "companies",
    CompanyBoard,
  );
  const key = (company: CompanyBoard) => {
    const board = boardOf(company);
    return board ? `${board.platform}:${board.slug.toLowerCase()}` : "";
  };
  const boards = new Set(handBoards.map(key));
  const allCompanies: CompanyBoard[] = [...handBoards];
  for (const file of ["hunted.yml", "companies-found.yml"])
    for (const company of readList(
      directory,
      file,
      "companies",
      CompanyBoard,
    )) {
      const k = key(company);
      if (!k || boards.has(k)) continue;
      boards.add(k);
      allCompanies.push({ ...company, found: true });
    }
  const companies = allCompanies.filter((company) => {
    const board = boardOf(company);
    return !board || platformOn(board.platform, vendors);
  });

  return { allSites, sites, allCompanies, companies, vendors };
}
