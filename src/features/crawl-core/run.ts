import { parseArgs } from "node:util";
import {
  ConnectionGate,
  watchFetchConnections,
} from "../../shared/http/connection-gate.js";
import { FetchClient } from "../../shared/http/fetch-client.js";
import { PacedClient } from "../../shared/http/paced-client.js";
import { RobotsClient } from "../../shared/http/robots-client.js";
import type { CrawlConfig } from "./config/crawl-config.js";
import type { Clock, HttpClient, SourceAdapter } from "./ports.js";
import {
  type RunDependencies,
  type RunResult,
  runDue,
  runOnly,
} from "./runner.js";

// The crawler as it introduces itself, naming the page that says what it is (legacy BOT_UA).
export const USER_AGENT =
  "Mozilla/5.0 (compatible; IndudexBot/1.0; +https://indudex.com/about/our-bot)";

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

// One crawl: the due sources, or the one asked for.
export async function crawl(
  argumentsGiven: CrawlArguments,
  adapters: readonly SourceAdapter[],
  dependencies: RunDependencies,
): Promise<RunResult> {
  if (argumentsGiven.source === undefined)
    return runDue(adapters, dependencies);
  const adapter = adapters.find(
    (a) => a.definition.id === argumentsGiven.source,
  );
  if (!adapter) {
    const known = adapters.map((a) => a.definition.id).toSorted();
    throw new UsageError(
      `unknown source "${argumentsGiven.source}"; registered: ${known.length > 0 ? known.join(", ") : "none"}`,
    );
  }
  return runOnly(adapter, dependencies);
}

// The polite client every adapter gets: robots.txt, then pacing by provider, server and host
// with the error budget, then the connection caps, then fetch with retries and timeouts (FR-5).
export function politeHttpClient(
  config: CrawlConfig,
  clock: Clock,
): { readonly http: HttpClient; readonly close: () => void } {
  const fetchClient = new FetchClient({ clock, userAgent: USER_AGENT });
  const gate = new ConnectionGate(fetchClient, {
    clock,
    ...config.connections,
  });
  const unwatch = watchFetchConnections(gate);
  const paced = new PacedClient(gate, {
    clock,
    ...config.pace,
    providers: config.providers,
    errorBudget: {
      errors: config.errorBudget.errors,
      windowMs: config.errorBudget.windowMinutes * 60_000,
    },
  });
  const http = new RobotsClient(paced, {
    onRobots: (host, robots) => {
      if (robots.crawlDelay > 0) paced.slowHost(host, robots.crawlDelay);
    },
  });
  return { http, close: unwatch };
}
