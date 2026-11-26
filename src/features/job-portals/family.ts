import type { SourceAdapter } from "../crawl-core/ports.js";
import { readPortal } from "./portal.js";
import { type Portal, readPortalList, sourceOf } from "./portal-list.js";

// A source per enabled portal of config/portals.yml (job portals FR-2), read as search engines read it.
export function portalSource(portal: Portal): SourceAdapter {
  return {
    definition: {
      id: sourceOf(portal),
      kind: "portal",
      licence: {
        name: portal.name,
        short: portal.name,
        url: `https://${portal.host}/`,
        licence:
          "Read as search engines read it: robots.txt obeyed, each advert linking to the portal",
        credit: `via ${portal.name}`,
      },
      needsCredentials: false,
      credentialVariables: [],
    },
    fetchAdverts: (context) => readPortal(portal, context),
  };
}

export const portalAdapters = (
  portals: readonly Portal[] = readPortalList(),
): SourceAdapter[] => portals.filter((portal) => !portal.off).map(portalSource);

// A second between two pages of a portal (the legacy's), or the portal's own longer gap; robots.txt's Crawl-delay widens
// it in the polite client.
export const PORTAL_GAP_MS = 1000;
export function portalHostGaps(
  portals: readonly Portal[] = readPortalList(),
): Record<string, number> {
  return Object.fromEntries(
    portals
      .filter((portal) => !portal.off)
      .map((portal) => [
        portal.host,
        Math.max(PORTAL_GAP_MS, (portal.gapSeconds ?? 0) * 1000),
      ]),
  );
}
