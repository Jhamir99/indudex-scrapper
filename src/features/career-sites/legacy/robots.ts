// The legacy's builder/robots.ts as its readers ask it. Here every request already goes through crawl-core's robots
// client, which refuses an address robots.txt closes (and checks each redirect's hop): a reader asking first is told
// yes, and the request itself is refused where the legacy's reader would have read nothing.
export type Rules = { delay?: number };
export type Robots = { rules: (url: string) => Promise<Rules> };
export const robotsOf = (_options: unknown = {}): Robots => ({
  rules: async () => ({}),
});
// The legacy's parser, re-exported by its builder/lib/crawl.ts for its tools: ours reads robots.txt alike.
export { parseRobots } from "../../../shared/http/robots-rules.js";
export const allowed = (_rules: unknown, _path: string): boolean => true;
export const robotsPath = (url: string): string => {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
};
