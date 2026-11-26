import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "@hono/zod-openapi";
import { parse } from "yaml";
import { CONFIG_DIRECTORY } from "../../shared/config/load-config.js";
import { describeIssues } from "../../shared/config/data-file.js";
import { SourceId } from "../../shared/schemas/source.js";

// The portal list (job portals FR-2): config/portals.yml, the legacy's builder/config/portals.yml with its keys in
// camelCase and each switched-off entry's reason as data (`off`). Read once, synchronously, when the registry is built.

const Pattern = z.string().refine(
  (pattern) => {
    try {
      return new RegExp(pattern) instanceof RegExp;
    } catch {
      return false;
    }
  },
  { error: "a regular expression" },
);
const OneOrMore = z.union([
  z.string().min(1),
  z.array(z.string().min(1)).min(1),
]);

export const Portal = z.strictObject({
  name: z.string().min(1),
  host: z.string().regex(/^[a-z0-9.-]+$/, "a host name"),
  // The part's own name, when one host is read in parts (a sitemap per country).
  key: SourceId.optional(),
  // Switched off, and why (the rule in AGENTS.md, or a failed live pass).
  off: z.string().min(1).optional(),
  // Switched off by itself only, its domain still read another way.
  alone: z.boolean().optional(),
  country: z
    .string()
    .regex(/^[a-z]{2}$/)
    .optional(),
  lang: z.string().optional(),
  sitemap: OneOrMore.optional(),
  children: Pattern.optional(),
  match: Pattern.optional(),
  lists: OneOrMore.optional(),
  listPages: z.int().positive().optional(),
  pageParam: z.string().min(1).optional(),
  split: Pattern.optional(),
  splitUrl: z.string().min(1).optional(),
  keepDays: z.int().positive().optional(),
  readAll: z.boolean().optional(),
  layout: z.boolean().optional(),
  gapSeconds: z.number().positive().optional(),
  staleDays: z.int().positive().optional(),
  placeInTitle: z.boolean().optional(),
  employer: z.string().min(1).optional(),
  notEmployer: Pattern.optional(),
  townInEmployer: z.boolean().optional(),
  agency: z.boolean().optional(),
});
export type Portal = z.infer<typeof Portal>;

export const PortalList = z.strictObject({ portals: z.array(Portal) });

export const PORTALS_FILE = "portals.yml";

// The list as it stands in config/, every entry, switched off or not. A list that does not validate stops the crawl
// with the entry and the field at fault.
export function readPortalList(
  path = join(CONFIG_DIRECTORY, PORTALS_FILE),
): Portal[] {
  const parsed = PortalList.safeParse(parse(readFileSync(path, "utf8")));
  if (!parsed.success)
    throw new Error(describeIssues(PORTALS_FILE, parsed.error));
  return parsed.data.portals;
}

// The name an advert carries as its source: the part's own name, or the portal's host without "www".
export const sourceOf = (portal: Portal): string =>
  portal.key ?? portal.host.replace(/^www\./, "");
