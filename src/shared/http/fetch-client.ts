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
}

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
    Omit<FetchClientOptions, "fetch" | "from">
  >;
  private readonly identity: Readonly<Record<string, string>>;
  private readonly fetch: FetchFunction;

  constructor(options: FetchClientOptions) {
    this.settings = { ...DEFAULTS, ...options };
    this.identity = {
      "user-agent": options.userAgent,
      ...(options.from ? { from: options.from } : {}),
    };
    this.fetch = options.fetch ?? ((url, init) => globalThis.fetch(url, init));
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
    const { timeoutMs, clock } = this.settings;
    const fail = (
      kind: HttpFailureKind,
      status?: number,
      retryAfter?: number,
    ) => new HttpFailure(kind, addressForLog(url), attempt, status, retryAfter);

    const signal = AbortSignal.timeout(timeoutMs);
    try {
      const response = await this.fetch(url, {
        method: options.method ?? "GET",
        headers: { ...this.identity, ...options.headers },
        body: options.body,
        redirect: "follow",
        signal,
      });
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
    } catch {
      return fail(signal.aborted ? "timeout" : "network");
    }
  }
}

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
