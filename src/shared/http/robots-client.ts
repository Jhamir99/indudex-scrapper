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

// What the crawler remembers of each host's robots.txt (shared/storage's FileRobotsMemory): its last answer, and since
// when it has not answered.
export interface RobotsMemory {
  heard(origin: string, text: string): Promise<void>;
  lastCopy(origin: string): Promise<string | undefined>;
  silentSince(origin: string, now: number): Promise<number>;
}

// A host whose robots.txt has not answered for this long, with no copy kept, is open (RFC 9309 2.3.1.4).
export const SILENT_OPEN_DAYS = 30;
const DAY_MS = 86_400_000;

// RFC 9309 2.5 lets a crawler stop reading a robots.txt after 500 KiB.
const ROBOTS_MAX_CHARACTERS = 500 * 1024;

// Asks each host's robots.txt before any request to it (FR-5). A file is fetched once per host for
// the life of this client, which is one run. A path it closes is never requested and fails as
// "disallowed". No robots.txt (a 4xx) allows everything; one that does not answer (timeout,
// network error, 5xx) is read from its last copy, as Google does, and with no copy allows nothing until it has been
// silent for thirty days, then everything; a server left alone (held, 429) allows nothing (RFC 9309 2.3.1.3 and
// 2.3.1.4; the legacy's 4fbb1c49). Without a memory, a silent robots.txt allows nothing.
export class RobotsClient {
  private readonly cache = new Map<string, Promise<Robots>>();
  // The rules already read, by origin: what a redirect's hop may wait for.
  private readonly read = new Map<string, Robots>();

  constructor(
    private readonly inner: Requester,
    private readonly options: {
      readonly botNames?: readonly string[];
      // Told each host's rules once they are read, e.g. to pace the host by its Crawl-delay.
      readonly onRobots?: (host: string, robots: Robots) => void;
      readonly memory?: RobotsMemory;
      readonly now?: () => number;
      // Who asks a redirect hop's robots.txt: not the paced client, whose lanes the request being redirected still
      // holds (a hop to another host on the same server waited for its own lane for ever: four jobs2web sites hung a
      // run on 28 November 2026). The legacy asked a hop's robots.txt with no gap too (builder/http.ts `mayGo`).
      readonly hopRequester?: Requester;
    } = {},
  ) {}

  async request(
    url: string,
    options?: HttpRequestOptions,
  ): Promise<HttpResponse> {
    await this.checkAllowed(url);
    // Each redirect is checked against its own host's robots.txt before it is followed (the operator's call of 27
    // November 2026: jcyl's dataset redirected to a host whose /api/ is closed).
    return this.inner.request(url, {
      ...options,
      checkHop: (next) => this.checkAllowed(next, true),
    });
  }

  private async checkAllowed(url: string, hop = false): Promise<void> {
    const robots = hop ? await this.hopRobots(url) : await this.robotsFor(url);
    if (!isAllowed(robots, robotsPath(url)))
      throw new HttpFailure("disallowed", addressForLog(url), 0);
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

  // A hop's rules: those already read, else its robots.txt asked outside the paced lanes; never a read still waiting
  // for a lane, which may wait behind the very request being redirected.
  private async hopRobots(url: string): Promise<Robots> {
    const { origin } = new URL(url);
    const known = this.read.get(origin);
    if (known) return known;
    if (!this.options.hopRequester) return this.robotsFor(url);
    const robots = await this.fetchRobots(origin, this.options.hopRequester);
    if (!this.cache.has(origin))
      this.cache.set(origin, Promise.resolve(robots));
    return robots;
  }

  private async fetchRobots(
    origin: string,
    requester: Requester = this.inner,
  ): Promise<Robots> {
    const { memory } = this.options;
    const read = (text: string) => {
      const robots = parseRobots(text, this.options.botNames ?? BOT_NAMES);
      this.read.set(origin, robots);
      this.options.onRobots?.(new URL(origin).hostname, robots);
      return robots;
    };
    let text: string;
    try {
      const response = await requester.request(`${origin}/robots.txt`);
      text = response.body.slice(0, ROBOTS_MAX_CHARACTERS);
    } catch (error) {
      if (!(error instanceof HttpFailure)) throw error;
      if (error.kind === "client-error") {
        await memory?.heard(origin, "");
        this.read.set(origin, ALLOW_ALL);
        return ALLOW_ALL;
      }
      if (!memory || error.kind === "held" || error.kind === "rate-limited")
        throw error;
      const copy = await memory.lastCopy(origin);
      if (copy !== undefined) return read(copy);
      const now = (this.options.now ?? Date.now)();
      if (
        now - (await memory.silentSince(origin, now)) >=
        SILENT_OPEN_DAYS * DAY_MS
      )
        return ALLOW_ALL;
      throw error;
    }
    await memory?.heard(origin, text);
    return read(text);
  }
}
