import type {
  HttpClient,
  HttpRequestOptions,
  HttpResponse,
} from "../../src/features/crawl-core/ports.js";

export interface RecordedRequest {
  readonly url: string;
  readonly options: HttpRequestOptions;
}

export type Answer = string | Partial<HttpResponse> | Error;
// An answer, or a function that answers each request by what it asks (an API that takes its query
// in a POST body at one address).
export type Route = Answer | ((options: HttpRequestOptions) => Answer);

// Answers from a table of addresses; an address not in it fails, so no test reaches the network.
export class FakeHttpClient implements HttpClient {
  readonly requests: RecordedRequest[] = [];
  private readonly routes: Map<string, Route>;

  constructor(routes: Record<string, Route> = {}) {
    this.routes = new Map(Object.entries(routes));
  }

  route(url: string, answer: Route): void {
    this.routes.set(url, answer);
  }

  async request(
    url: string,
    options: HttpRequestOptions = {},
  ): Promise<HttpResponse> {
    this.requests.push({ url, options });
    const route = this.routes.get(url);
    if (route === undefined) throw new Error(`no fake route for ${url}`);
    const answer = typeof route === "function" ? route(options) : route;
    if (answer instanceof Error) throw answer;
    if (typeof answer === "string") {
      return { status: 200, url, headers: {}, body: answer };
    }
    return { status: 200, url, headers: {}, body: "", ...answer };
  }
}
