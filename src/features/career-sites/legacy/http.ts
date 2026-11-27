import type { HttpClient } from "../../crawl-core/ports.js";
import { passTools, withPass } from "./pass.js";
import { HttpFailure } from "../../../shared/http/http-failure.js";
import { decodeEntities } from "../../../shared/kit/entities.js";

// The legacy's builder/http.ts as its readers call it (`get`, `getJson`, `getText`, `getItems`), on the polite client of
// the source being read: the pace, robots.txt, the server holds and the retries are crawl-core's. Bound for the length
// of one source's pass (`withHttp`). What the legacy's options asked of its own pace (`tries`, `robots`) is our client's to
// decide; a request's time limit (`timeoutMs`) and the gap it asks for its host (`gapMs`) are passed on. A bot check answered as a page fails as the
// legacy's did.

export type GetOptions = {
  headers?: Record<string, string>;
  gapMs?: number;
  tries?: number;
  timeoutMs?: number;
  method?: string;
  body?: string;
  robots?: boolean;
  guess?: boolean;
  until?: number;
};
export type Failure = Error & {
  status?: number;
  until?: number;
  postponed?: boolean;
  robots?: boolean;
  refused?: boolean;
  wall?: boolean;
  closes?: boolean;
  wholeSite?: boolean;
  tooBig?: boolean;
  cut?: boolean;
};
// A whole list in one answer (a feed, a sitemap, a board's list): two minutes, as the legacy waits.
export const LIST_WAIT_MS = 120_000;

// The client alone, for a reader that needs nothing else of the pass (the board readers' tests).
export const withHttp = <T>(
  http: HttpClient,
  run: () => Promise<T>,
): Promise<T> => withPass({ http }, run);
const client = (): HttpClient => passTools().http;

// A failure as the legacy's readers read it: an error answer says «404 for <address>», as its http.ts wrote it.
const asFailure = (error: unknown, url: string): unknown => {
  if (!(error instanceof HttpFailure)) return error;
  if (error.status) error.message = `${error.status} for ${forLog(url)}`;
  return Object.assign(error, {
    ...(error.status === undefined ? {} : { status: error.status }),
    ...(error.kind === "held" || error.kind === "rate-limited"
      ? { postponed: true, until: Date.now() + (error.retryAfterMs ?? 0) }
      : {}),
    ...(error.kind === "disallowed" ? { robots: true } : {}),
  });
};

async function request(url: string, options: GetOptions = {}) {
  try {
    return await client().request(url, {
      method: options.method === "POST" ? "POST" : "GET",
      ...(options.headers ? { headers: options.headers } : {}),
      ...(options.body === undefined ? {} : { body: options.body }),
      ...(options.timeoutMs ? { timeoutMs: options.timeoutMs } : {}),
      ...(options.gapMs ? { gapMs: options.gapMs } : {}),
    });
  } catch (error) {
    throw asFailure(error, url);
  }
}

// The Response the legacy's `get` gave: an error answer comes back as one, as its readers read `ok` and `status`.
export async function get(
  url: string,
  options?: GetOptions,
): Promise<Response> {
  try {
    const answer = await request(url, options);
    return new Response(answer.body, {
      status: answer.status,
      headers: answer.headers,
    });
  } catch (error) {
    if (error instanceof HttpFailure && error.status && error.status >= 400)
      return new Response("", { status: error.status });
    throw error;
  }
}

export async function getJson<T = unknown>(
  url: string,
  options?: GetOptions,
): Promise<T> {
  const answer = await request(url, {
    ...options,
    headers: { Accept: "application/json", ...options?.headers },
  });
  return JSON.parse(answer.body) as T;
}

// A bot check in place of the page: Imunify360's "One moment, please", SiteGround's captcha, Cloudflare's "Just a
// moment", Sucuri's, Imperva's, DataDome's. It answers 200 like a page; read as one, a site looks empty.
const WALL =
  /wsidchk|sgcaptcha|_cf_chl_opt|cf-browser-verification|sucuri_cloudproxy_js|_Incapsula_Resource|captcha-delivery\.com/;
export const isWall = (text: unknown, url: unknown = ""): boolean =>
  WALL.test(String(url)) || WALL.test(String(text || "").slice(0, 20_000));
const WALL_PAGE = 100_000;

export async function getText(
  url: string,
  options?: GetOptions,
): Promise<string> {
  const answer = await request(url, options);
  if (answer.body.length < WALL_PAGE && isWall(answer.body, answer.url))
    throw Object.assign(
      new Error(`${new URL(url).host} answers a bot check page`),
      { wall: true },
    );
  return answer.body;
}

// A feed of <item>s, read whole here (the client holds a body up to its own ceiling) and handed to `each`.
export async function getItems<T>(
  url: string,
  options: GetOptions | undefined,
  each: (items: string) => T[],
): Promise<T[]> {
  return each(await getText(url, options));
}

// Kept for the readers that name it: what an address may say in a log.
export const forLog = (url: string): string => {
  try {
    const u = new URL(url);
    return (
      u.origin + u.pathname.replace(/\/[A-Za-z0-9_-]{20,}(?=\/|$)/g, "/[key]")
    );
  } catch {
    return "an address";
  }
};
export { decodeEntities };
