import { subscribe, unsubscribe } from "node:diagnostics_channel";
import type { HttpRequestOptions, HttpResponse } from "./fetch-client.js";

interface Requester {
  request(url: string, options?: HttpRequestOptions): Promise<HttpResponse>;
}

interface Clock {
  now(): Date;
  sleep(milliseconds: number): Promise<void>;
}

export interface ConnectionLimits {
  readonly clock: Clock;
  // Requests on their way at once, across every host.
  readonly maxOpen: number;
  // New connections a second, across every host.
  readonly newPerSecond: number;
}

// A request let through for a new connection holds its room this long, until its connection shows.
const HOLD_MS = 100;
const POLL_MS = 100;

// Caps what the scrapper sends in all (FR-5), as the legacy builder/http.mjs: the legacy's home
// router dropped every device's new connections at about 7 a second. New connections are counted
// as fetch opens them (`watchFetchConnections`), not guessed from the hosts asked: a redirect, a
// second connection to a busy host and a retry each open one too. A request that can reuse an idle
// connection to its origin opens nothing and waits for no room.
export class ConnectionGate {
  private active = 0;
  private readonly waiting: (() => void)[] = [];
  private readonly opens: number[] = [];
  private readonly letThrough: number[] = [];
  private readonly openTo = new Map<string, number>();
  private readonly busyTo = new Map<string, number>();

  constructor(
    private readonly inner: Requester,
    private readonly limits: ConnectionLimits,
  ) {}

  async request(
    url: string,
    options?: HttpRequestOptions,
  ): Promise<HttpResponse> {
    await this.takeSlot();
    const { origin } = new URL(url);
    try {
      if (!this.hasIdleConnection(origin)) await this.roomForNewConnection();
      this.add(this.busyTo, origin, 1);
      try {
        return await this.inner.request(url, options);
      } finally {
        this.add(this.busyTo, origin, -1);
      }
    } finally {
      this.releaseSlot();
    }
  }

  // A connection is about to open (fetch's "undici:client:beforeConnect").
  connectionStarting(): void {
    this.opens.push(this.now());
    // The room a let-through request held is now this connection: do not count it twice.
    this.letThrough.shift();
  }

  // A connection to an origin opened, or closed ("undici:client:connected", the socket's "close").
  connectionOpened(origin: string): void {
    this.add(this.openTo, origin, 1);
  }

  connectionClosed(origin: string): void {
    this.add(this.openTo, origin, -1);
  }

  private now(): number {
    return this.limits.clock.now().getTime();
  }

  private hasIdleConnection(origin: string): boolean {
    return (this.openTo.get(origin) ?? 0) > (this.busyTo.get(origin) ?? 0);
  }

  private async roomForNewConnection(): Promise<void> {
    const { newPerSecond, clock } = this.limits;
    // At a fraction of a connection a second, the window is long enough to hold one.
    const windowMs = Math.max(1000, 1000 / newPerSecond);
    const room = Math.max(1, (newPerSecond * windowMs) / 1000);
    for (;;) {
      const now = this.now();
      dropBefore(this.opens, now - windowMs);
      dropBefore(this.letThrough, now - HOLD_MS);
      if (this.opens.length + this.letThrough.length < room) {
        this.letThrough.push(now);
        return;
      }
      await clock.sleep(POLL_MS);
    }
  }

  private async takeSlot(): Promise<void> {
    while (this.active >= this.limits.maxOpen) {
      await new Promise<void>((resume) => this.waiting.push(resume));
    }
    this.active += 1;
  }

  private releaseSlot(): void {
    this.active -= 1;
    this.waiting.shift()?.();
  }

  private add(counts: Map<string, number>, origin: string, by: number): void {
    counts.set(origin, Math.max(0, (counts.get(origin) ?? 0) + by));
  }
}

function dropBefore(times: number[], limit: number): void {
  while (times.length > 0 && times[0]! <= limit) times.shift();
}

interface ConnectMessage {
  readonly connectParams?: {
    readonly protocol?: string;
    readonly hostname?: string;
    readonly port?: string | number;
  };
  readonly socket?: { once?(event: "close", listener: () => void): void };
}

// Feeds the gate from the connections Node's fetch (undici) really opens. Returns a function that
// stops listening.
export function watchFetchConnections(gate: ConnectionGate): () => void {
  const starting = () => gate.connectionStarting();
  const connected = (message: unknown) => {
    const { connectParams: params, socket } = message as ConnectMessage;
    if (!params?.protocol || !params.hostname) return;
    const port =
      params.port &&
      String(params.port) !== (params.protocol === "https:" ? "443" : "80")
        ? `:${params.port}`
        : "";
    const origin = `${params.protocol}//${params.hostname}${port}`;
    gate.connectionOpened(origin);
    socket?.once?.("close", () => gate.connectionClosed(origin));
  };
  subscribe("undici:client:beforeConnect", starting);
  subscribe("undici:client:connected", connected);
  return () => {
    unsubscribe("undici:client:beforeConnect", starting);
    unsubscribe("undici:client:connected", connected);
  };
}
