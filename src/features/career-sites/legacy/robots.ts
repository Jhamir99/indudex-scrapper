// The legacy's builder/robots.ts as its readers ask it: a host's rules (what it closes, its Crawl-delay, the sitemaps
// it names) and whether an address may be read. Read here through the pass's polite client, our parser reading the file
// as the legacy's did; each host's file is asked once a run. The client refuses on its own what robots.txt closes, hop
// by hop: a reader that asks first skips a closed address without an error, as the legacy's did.
import { HttpFailure } from "../../../shared/http/http-failure.js";
import {
  ALLOW_ALL,
  isAllowed,
  parseRobots,
  robotsPath as pathOf,
  type Robots as Parsed,
} from "../../../shared/http/robots-rules.js";
import { passTools } from "./pass.js";

export { parseRobots };
// What the legacy's readers read of a host's rules: its sitemaps and its Crawl-delay (seconds), with our parsed rules.
export type Rules = {
  readonly sitemaps: readonly string[];
  readonly delay: number;
  readonly parsed: Parsed;
};
export type Robots = {
  rules: (url: string) => Promise<Rules>;
  may: (url: string) => Promise<boolean>;
};

const read = new Map<string, Promise<Rules>>();

async function fetchRules(origin: string): Promise<Rules> {
  let parsed: Parsed;
  try {
    const answer = await passTools().http.request(`${origin}/robots.txt`);
    parsed = parseRobots(answer.body.slice(0, 500 * 1024));
  } catch (error) {
    // No robots.txt (a 4xx) closes nothing; one that does not answer is a failed read.
    if (error instanceof HttpFailure && error.kind === "client-error")
      parsed = ALLOW_ALL;
    else throw error;
  }
  return { sitemaps: parsed.sitemaps, delay: parsed.crawlDelay, parsed };
}

const rulesFor = (url: string): Promise<Rules> => {
  const { origin } = new URL(url);
  let rules = read.get(origin);
  if (!rules) {
    rules = fetchRules(origin);
    read.set(origin, rules);
    rules.catch(() => read.delete(origin));
  }
  return rules;
};

export const allowed = (
  rules: Rules | null | undefined,
  path: string,
): boolean => !rules || isAllowed(rules.parsed, path);
export const robotsPath = (url: string): string => pathOf(url);

export const robotsOf = (_options: unknown = {}): Robots => ({
  rules: rulesFor,
  may: async (url) => {
    try {
      return allowed(await rulesFor(url), robotsPath(url));
    } catch {
      return false;
    }
  },
});
