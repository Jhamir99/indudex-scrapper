import type { HttpRequestOptions, HttpResponse } from "./fetch-client.js";
import { addressForLog, HttpFailure } from "./http-failure.js";
import {
  ALLOW_ALL,
  BOT_NAMES,
  isAllowed,
  parseRobots,
  type Robots,
  robotsPath,
} from "./robots-rules.js";

interface Requester {
  request(url: string, options?: HttpRequestOptions): Promise<HttpResponse>;
}

// RFC 9309 2.5 lets a crawler stop reading a robots.txt after 500 KiB.
const ROBOTS_MAX_CHARACTERS = 500 * 1024;

// Asks each host's robots.txt before any request to it (FR-5). A file is fetched once per host for
// the life of this client, which is one run. A path it closes is never requested and fails as
// "disallowed". No robots.txt (a 4xx) allows everything; one that does not answer (timeout,
// network error, 5xx, 429) allows nothing, and every request to that host fails as robots.txt did
// (RFC 9309 2.3.1.3 and 2.3.1.4).
export class RobotsClient {
  private readonly cache = new Map<string, Promise<Robots>>();

  constructor(
    private readonly inner: Requester,
    private readonly options: {
      readonly botNames?: readonly string[];
      // Told each host's rules once they are read, e.g. to pace the host by its Crawl-delay.
      readonly onRobots?: (host: string, robots: Robots) => void;
    } = {},
  ) {}

  async request(
    url: string,
    options?: HttpRequestOptions,
  ): Promise<HttpResponse> {
    const robots = await this.robotsFor(url);
    if (!isAllowed(robots, robotsPath(url)))
      throw new HttpFailure("disallowed", addressForLog(url), 0);
    return this.inner.request(url, options);
  }

  // The rules for an address's host, for pacing (Crawl-delay) and sitemaps too.
  robotsFor(url: string): Promise<Robots> {
    const { origin } = new URL(url);
    let robots = this.cache.get(origin);
    if (!robots) {
      robots = this.fetchRobots(origin);
      this.cache.set(origin, robots);
    }
    return robots;
  }

  private async fetchRobots(origin: string): Promise<Robots> {
    try {
      const response = await this.inner.request(`${origin}/robots.txt`);
      const robots = parseRobots(
        response.body.slice(0, ROBOTS_MAX_CHARACTERS),
        this.options.botNames ?? BOT_NAMES,
      );
      this.options.onRobots?.(new URL(origin).hostname, robots);
      return robots;
    } catch (error) {
      if (error instanceof HttpFailure && error.kind === "client-error")
        return ALLOW_ALL;
      throw error;
    }
  }
}
