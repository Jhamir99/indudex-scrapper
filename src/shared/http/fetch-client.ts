import {
  addressForLog,
  HttpFailure,
  type HttpFailureKind,
  parseRetryAfter,
} from "./http-failure.js";

// The parts of crawl-core's ports this client needs, by shape (shared code does not import features).
interface Clock {
  now(): Date;
  sleep(milliseconds: number): Promise<void>;
}

export interface HttpRequestOptions {
  readonly method?: "GET" | "POST";
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: string;
  // The answer is a file (a PDF), not text: it comes back as `bytes`, with an empty `body`.
  readonly binary?: boolean;
  // Asked before each redirect is followed, with the address it leads to: the robots client checks that hop's
  // robots.txt and throws to stop there. Without it, redirects are followed as fetch follows them.
  readonly checkHop?: (url: string) => Promise<void>;
  // The time an answer may take, its body included, when not the client's: a whole list in one answer (a feed, a
  // board's list) grows with the list (the legacy's LIST_WAIT_MS, two minutes).
  readonly timeoutMs?: number;
  // The gap the reader asks between two requests to this host from now on (a careers site with a long queue: a page a
  // second; a platform serving thousands of sites), read by the paced client. A host the settings pace on their own
  // keeps its gap, and robots.txt's Crawl-delay still wins.
  readonly gapMs?: number;
}

// Redirects a request follows at most, as fetch does.
const MOST_HOPS = 20;

export interface HttpResponse {
  readonly status: number;
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  // Every Set-Cookie the answer sent (`headers` keeps only one): the client keeps no cookies, so
  // a source whose server needs its session sends them back itself.
  readonly cookies?: readonly string[];
  readonly body: string;
  // The answer's bytes, only when the request asked for `binary`.
  readonly bytes?: Uint8Array;
}

export type FetchFunction = (
  url: string,
  init: RequestInit,
) => Promise<Response>;

export interface FetchClientOptions {
  readonly clock: Clock;
  // Says who we are, with a way to reach us (polite crawling).
  readonly userAgent: string;
  // An address a site's operator can write to, sent as the `From` header (RFC 9110, 10.1.2).
  readonly from?: string;
  // The headers that sign a request to an address (Web Bot Auth, bot-signature.ts), when the bot has its key: each hop of
  // a redirect is then its own signed request, since a signature names the host it goes to.
  readonly sign?: (url: string) => Readonly<Record<string, string>>;
  readonly timeoutMs?: number;
  readonly maxAttempts?: number;
  // The wait before the 2nd attempt; it grows by this much each time (1 s, 2 s...).
  readonly retryDelayMs?: number;
  readonly fetch?: FetchFunction;
}

// Legacy builder/http.mjs: three tries, 1 s then 2 s apart; 20 s for one answer.
const DEFAULTS = { timeoutMs: 20_000, maxAttempts: 3, retryDelayMs: 1000 };

// One request at a time with a time limit, retries for what may pass (timeouts, network errors,
// 5xx) and a typed failure for everything else. Pacing and robots.txt wrap around it.
export class FetchClient {
  private readonly settings: Required<
    Omit<FetchClientOptions, "fetch" | "from" | "sign">
  >;
  private readonly sign:
    ((url: string) => Readonly<Record<string, string>>) | undefined;
  private readonly identity: Readonly<Record<string, string>>;
  private readonly fetch: FetchFunction;

  constructor(options: FetchClientOptions) {
    this.settings = { ...DEFAULTS, ...options };
    this.identity = {
      "user-agent": options.userAgent,
      ...(options.from ? { from: options.from } : {}),
    };
    this.fetch = options.fetch ?? ((url, init) => globalThis.fetch(url, init));
    this.sign = options.sign;
  }

  async request(
    url: string,
    options: HttpRequestOptions = {},
  ): Promise<HttpResponse> {
    const { maxAttempts, retryDelayMs, clock } = this.settings;
    let failure: HttpFailure | undefined;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (failure) await clock.sleep(retryDelayMs * (attempt - 1));
      const outcome = await this.attempt(url, options, attempt);
      if (!(outcome instanceof HttpFailure)) return outcome;
      failure = outcome;
      if (!failure.retryable) break;
    }
    throw failure;
  }

  private async attempt(
    url: string,
    options: HttpRequestOptions,
    attempt: number,
  ): Promise<HttpResponse | HttpFailure> {
    const { clock } = this.settings;
    const timeoutMs = options.timeoutMs ?? this.settings.timeoutMs;
    const fail = (
      kind: HttpFailureKind,
      status?: number,
      retryAfter?: number,
    ) => new HttpFailure(kind, addressForLog(url), attempt, status, retryAfter);

    const signal = AbortSignal.timeout(timeoutMs);
    try {
      const response = await this.followed(url, options, signal);
      if (!response.ok) {
        // Let the error answer go, or its connection stays taken.
        await response.body?.cancel().catch(() => {});
        // A 429, and a 503 that says when to come back, hold the server as asked (RFC 9110 10.2.3; the legacy's
        // 27c645f1).
        const retryAfter = response.headers.get("retry-after");
        if (
          response.status === 429 ||
          (response.status === 503 && retryAfter !== null)
        )
          return fail(
            "rate-limited",
            response.status,
            parseRetryAfter(retryAfter, clock.now()),
          );
        return fail(
          response.status >= 500 ? "server-error" : "client-error",
          response.status,
        );
      }
      // The time limit covers reading the body too.
      const bytes = new Uint8Array(await response.arrayBuffer());
      return {
        status: response.status,
        url: response.url || url,
        headers: Object.fromEntries(response.headers),
        cookies: response.headers.getSetCookie(),
        ...(options.binary
          ? { body: "", bytes }
          : { body: decodeBody(bytes, response.headers.get("content-type")) }),
      };
    } catch (error) {
      // A hop the robots client stopped fails as it said.
      if (error instanceof HttpFailure) return error;
      return fail(signal.aborted ? "timeout" : "network");
    }
  }

  // The answer, its redirects followed: by fetch, or one by one when each hop is to be checked first. A 303, and a 301
  // or 302 to a POST, go on as a GET without the body, as fetch does.
  private async followed(
    url: string,
    options: HttpRequestOptions,
    signal: AbortSignal,
  ): Promise<Response> {
    let headers: Record<string, string> = {
      ...this.identity,
      ...options.headers,
    };
    if (!options.checkHop && !this.sign)
      return this.fetch(url, {
        method: options.method ?? "GET",
        headers,
        body: options.body,
        redirect: "follow",
        signal,
      });
    let at = url;
    let method = options.method ?? "GET";
    let body = options.body;
    for (let hop = 0; ; hop++) {
      const response = await this.fetch(at, {
        method,
        headers: { ...headers, ...this.sign?.(at) },
        body,
        redirect: "manual",
        signal,
      });
      const location = response.headers.get("location");
      if (
        response.status < 300 ||
        response.status > 399 ||
        response.status === 304 ||
        !location
      )
        return response.url ? response : withUrl(response, at);
      await response.body?.cancel().catch(() => {});
      if (hop >= MOST_HOPS) throw new Error("too many redirects");
      const next = new URL(location, at).href;
      await options.checkHop?.(next);
      // A request's credentials stay behind on another origin, as fetch leaves them.
      if (new URL(next).origin !== new URL(at).origin)
        headers = Object.fromEntries(
          Object.entries(headers).filter(([name]) => !PRIVATE.test(name)),
        );
      if (
        response.status === 303 ||
        ((response.status === 301 || response.status === 302) &&
          method === "POST")
      ) {
        method = "GET";
        body = undefined;
      }
      at = next;
    }
  }
}

const PRIVATE = /^(authorization|cookie|proxy-authorization)$/i;

// A response with the address it came from, where the fetch function gave none.
const withUrl = (response: Response, url: string): Response =>
  Object.defineProperty(response, "url", { value: url });

// A body as text: in the charset its Content-Type names, else the one an XML declaration names
// (feeds in ISO-8859-2 or windows-1252 often say so only there), else UTF-8. An unknown charset
// falls back to UTF-8.
export function decodeBody(
  bytes: Uint8Array,
  contentType: string | null,
): string {
  const declared =
    /charset\s*=\s*"?([\w.:-]+)/i.exec(contentType ?? "")?.[1] ??
    /^\s*<\?xml[^>]*\bencoding\s*=\s*["']([\w.:-]+)["']/i.exec(
      new TextDecoder("latin1").decode(bytes.subarray(0, 200)),
    )?.[1] ??
    "utf-8";
  let decoder: TextDecoder;
  try {
    decoder = new TextDecoder(declared);
  } catch {
    decoder = new TextDecoder("utf-8");
  }
  return decoder.decode(bytes);
}
