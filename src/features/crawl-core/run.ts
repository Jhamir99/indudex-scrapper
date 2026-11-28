import { parseArgs } from "node:util";
import {
  ConnectionGate,
  watchFetchConnections,
} from "../../shared/http/connection-gate.js";
import { requestHeaders, signingKey } from "../../shared/http/bot-signature.js";
import { FetchClient } from "../../shared/http/fetch-client.js";
import { PacedClient } from "../../shared/http/paced-client.js";
import {
  RobotsClient,
  type RobotsMemory,
} from "../../shared/http/robots-client.js";
import type { CrawlConfig } from "./config/crawl-config.js";
import type { Clock, HttpClient, RatesKeeper, SourceAdapter } from "./ports.js";
import { refreshRates } from "./rates.js";
import {
  type RunDependencies,
  type RunResult,
  runDue,
  runOnly,
} from "./runner.js";

// The crawler as it introduces itself, naming the page that says what it is (legacy BOT_UA).
export const USER_AGENT =
  "Mozilla/5.0 (compatible; IndudexBot/1.0; +https://indudex.com/about/our-bot)";

// The project's contact address, sent as the `From` header (legacy CONTACT).
export const CONTACT_ADDRESS = "contact@indudex.com";

// The site that publishes the bot's key (legacy SITE_URL): `Signature-Agent` names it.
export const SIGNATURE_AGENT = "https://indudex.com";

// Each request signed with the bot's key when the environment holds one (BOT_SIGNING_KEY, legacy builder/http.ts
// `fetchSigned`): a CDN in front of a site (Cloudflare before Workday) lets a verified bot through. Without the key,
// nothing is signed. A key that cannot be read stops here: every request would go unsigned while the operator thinks
// otherwise (the legacy's RAS-25).
export function botSigner(
  environment: Readonly<Record<string, string | undefined>>,
): ((url: string) => Record<string, string>) | undefined {
  let key: ReturnType<typeof signingKey>;
  try {
    key = signingKey(environment["BOT_SIGNING_KEY"] || undefined);
  } catch (error) {
    throw new UsageError(
      `BOT_SIGNING_KEY in .env cannot be read (${error instanceof Error ? error.message : String(error)}): nothing is asked`,
    );
  }
  if (!key) return undefined;
  const agent = (environment["SITE_URL"] || SIGNATURE_AGENT).replace(/\/$/, "");
  return (url) => requestHeaders(url, key, agent);
}

export class UsageError extends Error {
  override name = "UsageError";
}

export interface CrawlArguments {
  // Runs only this source, due or not.
  readonly source?: string;
}

export function parseCrawlArguments(argv: readonly string[]): CrawlArguments {
  try {
    const { values } = parseArgs({
      // `pnpm crawl -- --source x` passes the "--" on.
      args: argv.filter((argument) => argument !== "--"),
      options: { source: { type: "string" } },
      strict: true,
      allowPositionals: false,
    });
    return values.source === undefined ? {} : { source: values.source };
  } catch (error) {
    throw new UsageError(
      `${error instanceof Error ? error.message : String(error)}\nusage: crawl [--source <id>]`,
    );
  }
}

export interface CrawlDependencies extends RunDependencies {
  // Where the ECB's rates are kept; without it, they are not asked for.
  readonly rates?: RatesKeeper;
}

// One crawl: the ECB's rates when due (pay FR-2), then the due sources, or the one asked for.
export async function crawl(
  argumentsGiven: CrawlArguments,
  adapters: readonly SourceAdapter[],
  dependencies: CrawlDependencies,
): Promise<RunResult> {
  const adapter = findAdapter(argumentsGiven, adapters);
  if (dependencies.rates)
    await refreshRates({ ...dependencies, rates: dependencies.rates });
  return adapter
    ? runOnly(adapter, dependencies)
    : runDue(adapters, dependencies);
}

// The adapter asked for, undefined for a run of the due sources, or a usage error.
function findAdapter(
  argumentsGiven: CrawlArguments,
  adapters: readonly SourceAdapter[],
): SourceAdapter | undefined {
  if (argumentsGiven.source === undefined) return undefined;
  const adapter = adapters.find(
    (a) => a.definition.id === argumentsGiven.source,
  );
  if (!adapter) {
    const known = adapters.map((a) => a.definition.id).toSorted();
    throw new UsageError(
      `unknown source "${argumentsGiven.source}"; registered: ${known.length > 0 ? known.join(", ") : "none"}`,
    );
  }
  return adapter;
}

// The polite client every adapter gets: robots.txt, then pacing by provider, server and host
// with the error budget, then the connection caps, then fetch with retries and timeouts (FR-5).
export function politeHttpClient(
  config: CrawlConfig,
  clock: Clock,
  robotsMemory?: RobotsMemory,
  sign?: (url: string) => Record<string, string>,
): { readonly http: HttpClient; readonly close: () => void } {
  const fetchClient = new FetchClient({
    clock,
    userAgent: USER_AGENT,
    from: CONTACT_ADDRESS,
    ...(sign ? { sign } : {}),
  });
  const gate = new ConnectionGate(fetchClient, {
    clock,
    ...config.connections,
  });
  const unwatch = watchFetchConnections(gate);
  const paced = new PacedClient(gate, {
    clock,
    perHost: config.pace.perHost,
    perServer: config.pace.perServer,
    perProvider: config.pace.perProvider,
    hostGaps: config.pace.hosts,
    providers: config.providers,
    errorBudget: {
      errors: config.errorBudget.errors,
      windowMs: config.errorBudget.windowMinutes * 60_000,
    },
  });
  const http = new RobotsClient(paced, {
    hopRequester: fetchClient,
    onRobots: (host, robots) => {
      if (robots.crawlDelay > 0) paced.slowHost(host, robots.crawlDelay);
    },
    ...(robotsMemory
      ? { memory: robotsMemory, now: () => clock.now().getTime() }
      : {}),
  });
  return { http, close: unwatch };
}
