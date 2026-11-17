import type {
  HttpClient,
  HttpRequestOptions,
  HttpResponse,
} from "../../src/features/crawl-core/ports.js";

export interface RecordedRequest {
  readonly url: string;
  readonly options: HttpRequestOptions;
}

export type Route = string | Partial<HttpResponse> | Error;

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
    const answer = this.routes.get(url);
    if (answer === undefined) throw new Error(`no fake route for ${url}`);
    if (answer instanceof Error) throw answer;
    if (typeof answer === "string") {
      return { status: 200, url, headers: {}, body: answer };
    }
    return { status: 200, url, headers: {}, body: "", ...answer };
  }
}
