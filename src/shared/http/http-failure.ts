// How a request can end without a usable answer. The runner records the kind as the source's reason.
export type HttpFailureKind =
  | "timeout" // no complete answer within the time limit
  | "network" // DNS, refused or reset connection, TLS
  | "client-error" // a 4xx answer: the request itself is wrong or not allowed
  | "rate-limited" // 429: the server asks us to wait
  | "server-error" // a 5xx answer
  | "disallowed" // robots.txt closes the address: it was never requested
  | "held"; // its server is left alone for a while (error budget, 429): it was never requested

export class HttpFailure extends Error {
  override name = "HttpFailure";

  constructor(
    readonly kind: HttpFailureKind,
    // The address as it may be logged: without query string, where keys travel.
    readonly url: string,
    readonly attempts: number,
    readonly status?: number,
    // How long to wait: a 429's Retry-After, or what is left of a server's hold.
    readonly retryAfterMs?: number,
  ) {
    super(
      kind === "disallowed"
        ? `robots.txt disallows ${url}`
        : kind === "held"
          ? `server held for ${url}, back in ${Math.ceil((retryAfterMs ?? 0) / 60_000)} min`
          : `${kind}${status ? ` (HTTP ${status})` : ""} for ${url} after ${attempts} attempt${attempts === 1 ? "" : "s"}`,
    );
  }

  get retryable(): boolean {
    return (
      this.kind === "timeout" ||
      this.kind === "network" ||
      this.kind === "server-error"
    );
  }
}

// An address safe to write in a log or a source's status: no query string, no fragment, and
// no long token in the path (some APIs carry the key there).
export function addressForLog(url: string): string {
  try {
    const parsed = new URL(url);
    return (
      parsed.origin +
      parsed.pathname.replace(/\/[A-Za-z0-9_-]{20,}(?=\/|$)/g, "/[key]")
    );
  } catch {
    return "an invalid address";
  }
}

// Retry-After as seconds or as an HTTP date.
export function parseRetryAfter(
  header: string | null,
  now: Date,
): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(header);
  return Number.isNaN(date) ? undefined : Math.max(0, date - now.getTime());
}
