import { lookup } from "node:dns/promises";
import type { HttpRequestOptions, HttpResponse } from "./fetch-client.js";
import { type ErrorBudget, ServerHolds } from "./server-holds.js";

interface Requester {
  request(url: string, options?: HttpRequestOptions): Promise<HttpResponse>;
}

interface Clock {
  now(): Date;
  sleep(milliseconds: number): Promise<void>;
}

export interface Pace {
  // The least time between the starts of two requests.
  readonly gapMs: number;
  // Requests at once.
  readonly inFlight: number;
}

export interface PacedClientOptions {
  readonly clock: Clock;
  readonly perHost: Pace;
  readonly perServer: Pace;
  readonly perProvider: Pace;
  // Provider name → IPv4 networks ("185.162.28.0/22").
  readonly providers?: Readonly<Record<string, readonly string[]>>;
  // The address a host name resolves to; undefined when it does not resolve.
  readonly resolve?: (host: string) => Promise<string | undefined>;
  readonly errorBudget: ErrorBudget;
}

// The longest Crawl-delay obeyed, as the legacy: a site asking for more is read at this pace.
const MOST_CRAWL_DELAY_MS = 300_000;

// One queue: requests start at least `gapMs` apart and at most `inFlight` run at once.
class Lane {
  private active = 0;
  private nextStartAt = 0;
  private readonly waiting: (() => void)[] = [];

  constructor(
    private gapMs: number,
    private readonly inFlight: number,
    private readonly clock: Clock,
  ) {}

  widenGap(gapMs: number): void {
    this.gapMs = Math.max(this.gapMs, gapMs);
  }

  async acquire(): Promise<void> {
    for (;;) {
      if (this.active >= this.inFlight) {
        await new Promise<void>((resume) => this.waiting.push(resume));
        continue;
      }
      const wait = this.nextStartAt - this.clock.now().getTime();
      if (wait > 0) {
        await this.clock.sleep(wait);
        continue;
      }
      this.active += 1;
      this.nextStartAt = this.clock.now().getTime() + this.gapMs;
      return;
    }
  }

  release(): void {
    this.active -= 1;
    this.waiting.shift()?.();
  }
}

const defaultResolve = async (host: string) => {
  try {
    return (await lookup(host)).address;
  } catch {
    return undefined;
  }
};

// Paces requests per host, per server and per hosting provider (FR-5), as the legacy's
// builder/lib/servers.mjs: many careers sites live on one machine (SAP's rmk12 carried 455
// employers' hosts on one address and stopped answering), so once two hosts resolve to one
// address they share that server's gap and its limit of requests at once. A host alone on its
// server keeps only its own pace. Every address in a listed provider's networks is paced as one.
export class PacedClient {
  private readonly hosts = new Map<string, Lane>();
  private readonly servers = new Map<string, Lane>();
  private readonly providerLanes = new Map<string, Lane>();
  private readonly hostsOnAddress = new Map<string, Set<string>>();
  private readonly addresses = new Map<string, Promise<string | undefined>>();
  private readonly networks: readonly {
    readonly provider: string;
    readonly network: number;
    readonly mask: number;
  }[];
  private readonly resolve: (host: string) => Promise<string | undefined>;
  private readonly holds: ServerHolds;

  constructor(
    private readonly inner: Requester,
    private readonly options: PacedClientOptions,
  ) {
    this.resolve = options.resolve ?? defaultResolve;
    this.holds = new ServerHolds(options.errorBudget);
    this.networks = Object.entries(options.providers ?? {}).flatMap(
      ([provider, networks]) =>
        networks.map((network) => {
          const [address = "", bits = "32"] = network.split("/");
          const mask = maskOf(Number(bits));
          return { provider, network: ipv4ToNumber(address)! & mask, mask };
        }),
    );
  }

  async request(
    url: string,
    options?: HttpRequestOptions,
  ): Promise<HttpResponse> {
    const host = new URL(url).hostname;
    // A host that does not resolve is its own server.
    const server = (await this.addressOf(host)) ?? host;
    this.holds.check(server, url, this.now());
    const lanes = await this.lanesFor(host);
    const held: Lane[] = [];
    try {
      // Always in the same order (provider, server, host), so two requests never wait on each other.
      for (const lane of lanes) {
        await lane.acquire();
        held.push(lane);
      }
      // The server may have been held while this request waited for its turn.
      this.holds.check(server, url, this.now());
      try {
        return await this.inner.request(url, options);
      } catch (error) {
        this.holds.record(server, url, error, this.now());
        throw error;
      }
    } finally {
      for (const lane of held.toReversed()) lane.release();
    }
  }

  private now(): number {
    return this.options.clock.now().getTime();
  }

  // A host's robots.txt can ask for a longer gap (Crawl-delay, in seconds).
  slowHost(host: string, crawlDelaySeconds: number): void {
    this.hostLane(host).widenGap(
      Math.min(crawlDelaySeconds * 1000, MOST_CRAWL_DELAY_MS),
    );
  }

  private async lanesFor(host: string): Promise<Lane[]> {
    const address = await this.addressOf(host);
    const lanes: Lane[] = [];
    if (address) {
      const provider = this.providerOf(address);
      if (provider)
        lanes.push(
          this.lane(this.providerLanes, provider, this.options.perProvider),
        );
      const hosts = this.hostsOnAddress.get(address) ?? new Set<string>();
      hosts.add(host);
      this.hostsOnAddress.set(address, hosts);
      if (hosts.size > 1)
        lanes.push(this.lane(this.servers, address, this.options.perServer));
    }
    lanes.push(this.hostLane(host));
    return lanes;
  }

  private addressOf(host: string): Promise<string | undefined> {
    let address = this.addresses.get(host);
    if (!address) {
      address = this.resolve(host);
      this.addresses.set(host, address);
    }
    return address;
  }

  private providerOf(address: string): string | undefined {
    const value = ipv4ToNumber(address);
    if (value === undefined) return undefined;
    return this.networks.find(
      ({ network, mask }) => (value & mask) >>> 0 === network >>> 0,
    )?.provider;
  }

  private hostLane(host: string): Lane {
    return this.lane(this.hosts, host, this.options.perHost);
  }

  private lane(lanes: Map<string, Lane>, key: string, pace: Pace): Lane {
    let lane = lanes.get(key);
    if (!lane) {
      lane = new Lane(pace.gapMs, pace.inFlight, this.options.clock);
      lanes.set(key, lane);
    }
    return lane;
  }
}

function ipv4ToNumber(address: string): number | undefined {
  const parts = address.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)
  )
    return undefined;
  return parts.reduce((value, part) => value * 256 + part, 0);
}

const maskOf = (bits: number) =>
  bits <= 0 ? 0 : (0xffffffff << (32 - Math.min(bits, 32))) >>> 0;
