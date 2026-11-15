import { addressForLog, HttpFailure } from "./http-failure.js";

export interface ErrorBudget {
  // Error answers a server may give within the window before it is asked nothing more.
  readonly errors: number;
  readonly windowMs: number;
}

// A 429 without Retry-After holds its server this long; a longer Retry-After is cut to 48 hours.
const RATE_LIMITED_DEFAULT_MS = 3_600_000;
const RATE_LIMITED_MAX_MS = 48 * 3_600_000;

interface ServerRecord {
  errorTimes: number[];
  heldUntil: number;
}

// Servers we must leave alone for a while (FR-5), as the legacy builder/lib/servers.mjs.
// Firewalls count error answers per server, whatever the site (fail2ban bans at five in ten
// minutes): after `errors` 4xx answers within the window, the server is asked nothing more until
// the oldest of them leaves the window. A 429 holds its server for as long as it asks.
// robots.txt's own answers do not count: a missing robots.txt is a normal 404.
export class ServerHolds {
  private readonly servers = new Map<string, ServerRecord>();

  constructor(private readonly budget: ErrorBudget) {}

  // Fails without a request while the server is held.
  check(server: string, url: string, now: number): void {
    const heldUntil = this.servers.get(server)?.heldUntil ?? 0;
    if (heldUntil > now)
      throw new HttpFailure(
        "held",
        addressForLog(url),
        0,
        undefined,
        heldUntil - now,
      );
  }

  record(server: string, url: string, error: unknown, now: number): void {
    if (!(error instanceof HttpFailure)) return;
    const record = this.recordOf(server);
    if (error.kind === "rate-limited") {
      const wait = Math.min(
        error.retryAfterMs ?? RATE_LIMITED_DEFAULT_MS,
        RATE_LIMITED_MAX_MS,
      );
      record.heldUntil = Math.max(record.heldUntil, now + wait);
      return;
    }
    if (
      error.kind !== "client-error" ||
      new URL(url).pathname === "/robots.txt"
    )
      return;
    const { errors, windowMs } = this.budget;
    record.errorTimes = record.errorTimes.filter((at) => at > now - windowMs);
    record.errorTimes.push(now);
    if (record.errorTimes.length >= errors) {
      const oldestCounted =
        record.errorTimes[record.errorTimes.length - errors]!;
      record.heldUntil = Math.max(record.heldUntil, oldestCounted + windowMs);
    }
  }

  private recordOf(server: string): ServerRecord {
    let record = this.servers.get(server);
    if (!record) {
      record = { errorTimes: [], heldUntil: 0 };
      this.servers.set(server, record);
    }
    return record;
  }
}
