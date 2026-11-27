// ➤ What a list switched off (enabled: false: its terms close it, it asks leave, or the owner paused it) stays off by
// ➤ every other way in: another host of the same registered domain, the employer's board on a platform, or a way in
// ➤ the hunter finds later (RAS-03, LEC-03: Siemens, Delaware, Mercedes-Benz and DPG Media were read again so). A
// ➤ platform's domain is no employer's: an ATS's, or one that hosts three employers or more (hr4you.org, bizneo.cloud).
// The legacy's builder/switched-off.ts (JustJans/indudex@ec79858), copied (career sites T004): only its imports changed, and the portals read from config/portals.yml. Its own
// comments keep their marks.
import { ATS, loadCompanies, type Company } from "./boards.js";
import { hostOf, loadSites, offSites, type Site } from "./careers.js";
import { loadPortals } from "./portals.js";
import { registrable } from "./crawl.js";

// ➤ What is asked about: a site, a company's board or a hunter's find.
type Entry = Site & { ats?: string } & Record<string, unknown>;

const fold = (s: unknown): string =>
  String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
const hostIn = (address: unknown): string => {
  const u = String(address);
  try {
    return new URL(
      /^https?:/.test(u) ? u : `https://${u}`,
    ).hostname.toLowerCase();
  } catch {
    return "";
  }
};
const platformDomains = (): Set<string> =>
  new Set(
    Object.values(ATS)
      .map((a) => {
        try {
          return registrable(hostIn(a.url("x", 0)));
        } catch {
          return "";
        }
      })
      .filter(Boolean),
  );
// ➤ A board's own host, when its slug is an address (a Teamtailor on the employer's domain).
const boardHost = (c: Record<string, unknown>): string => {
  const k = Object.keys(ATS).find((x) => c[x]);
  return k && /^https?:\/\//.test(String(c[k])) ? hostIn(c[k]) : "";
};

// ➤ { domains, names, has(entry) }: the registered domains and the employers' names switched off, and whether an entry
// ➤ (a site, a board or a hunter's find) is one of them.
const domainOf = (h: unknown): string =>
  registrable(String(h || "").replace(/^www\./, ""));
function sharedDomains(sites: Site[]): Set<string> {
  const shared = platformDomains(),
    named = new Map<string, Set<string>>();
  for (const s of sites) {
    const d = domainOf(hostOf(s));
    if (!d) continue;
    const names = named.get(d) ?? new Set<string>();
    named.set(d, names.add(fold(s.name)));
  }
  for (const [d, n] of named) if (n.size >= 3) shared.add(d);
  return shared;
}

// ➤ An entry marked `alone` is off by itself only: a copy of a source read elsewhere, or a page that is no list of
// ➤ vacancies; its employer stays readable by its other ways in (Booking.com, KTM). A portal too: Solid.Jobs' pages
// ➤ are off because its API is read, and jobs.stellenmarkt.de because www.stellenmarkt.de is, yet both shut their whole
// ➤ domain from 14 November 2026 (1,766 and 7,586 adverts).
export function switchedOff() {
  const sites = offSites().filter((s) => !s.alone),
    companies = loadCompanies().filter((c) => c.enabled === false),
    portals = loadPortals({ all: true }).filter(
      (p) => p.enabled === false && !p.alone,
    );
  const shared = sharedDomains([...loadSites(), ...sites]);
  const hosts = [
    ...sites.filter((s) => !s.platform).map(hostOf),
    ...companies.map(boardHost),
    ...portals.map((p) => String(p.host || "")),
  ];
  const domains = new Set(
    hosts.map(domainOf).filter((d) => d && !shared.has(d)),
  );
  const names = new Set(
    [...sites, ...companies].map((x) => fold(x.name)).filter(Boolean),
  );
  const has = (entry: Entry | Company): boolean => {
    if (names.has(fold(entry.name))) return true;
    const host =
      entry.ats || Object.keys(ATS).some((k) => entry[k])
        ? boardHost(entry)
        : hostOf(entry);
    return !!host && domains.has(domainOf(host));
  };
  return { domains, names, has };
}
