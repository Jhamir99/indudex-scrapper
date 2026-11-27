import type { SourceAdapter } from "../crawl-core/ports.js";
import { boardSource, siteSource } from "./family.js";
import { hostOf, type Site } from "./legacy/careers.js";
import { isBoardHost } from "./legacy/crawl.js";
import { loadPortals } from "./legacy/portals.js";
import { switchedOff } from "./legacy/switched-off.js";
import {
  boardOf,
  type CareerLists,
  platformOn,
  readCareerLists,
} from "./lists.js";

// Career sites' public entry for the registry (career sites FR-1, FR-3, FR-12): a source for every entry of the lists,
// as the legacy's builder/sources.ts makes them. One its lists do not read stays in the status, switched off with its
// reason: paused in its list, on a platform config/vendors.yml switches off, a job board's host found among the
// employers, or under a name or domain a list switched off. A site the job portals' list names is read there, not
// here.

export { boardSourceId, careerDraft, siteSourceId } from "./family.js";
export { readCareerLists } from "./lists.js";

const VENDOR_OFF = (platform: string) =>
  `${platform} is switched off in config/vendors.yml (its robots.txt or its terms close it, or its leave is awaited)`;
const PAUSED = "paused in its list";
const BOARD_HOST =
  "a job board's host found among the employers, not read as one";
const SWITCHED_OFF = "its name or domain is switched off in a list";

export function careerAdapters(
  lists: CareerLists = readCareerLists({
    isBoardHost: (site) => isBoardHost(hostOf(site as Site)),
  }),
): SourceAdapter[] {
  const off = switchedOff();
  const portalHosts = new Set(
    loadPortals({ all: true }).map((portal) =>
      String(portal.host ?? "").replace(/^www\./, ""),
    ),
  );
  const out: SourceAdapter[] = [];
  const seen = new Set<string>();
  const add = (adapter: SourceAdapter) => {
    if (seen.has(adapter.definition.id)) return;
    seen.add(adapter.definition.id);
    out.push(adapter);
  };

  for (const company of lists.allCompanies) {
    const board = boardOf(company);
    if (!board) continue;
    const reason =
      company.enabled === false
        ? PAUSED
        : !platformOn(board.platform, lists.vendors)
          ? VENDOR_OFF(board.platform)
          : off.has(company as never)
            ? SWITCHED_OFF
            : undefined;
    add(boardSource(company, board.platform, reason));
  }
  for (const entry of lists.allSites) {
    const site = entry as Site;
    const host = hostOf(site);
    if (portalHosts.has(host)) continue;
    const reason =
      entry.enabled === false
        ? PAUSED
        : lists.vendors[entry.platform ?? ""] === false
          ? VENDOR_OFF(entry.platform ?? "")
          : isBoardHost(host)
            ? BOARD_HOST
            : off.has(site as never)
              ? SWITCHED_OFF
              : undefined;
    add(siteSource(entry, reason));
  }
  return out;
}
