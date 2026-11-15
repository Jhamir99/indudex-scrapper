import { describe, expect, it } from "vitest";
import type { HttpClient } from "../../features/crawl-core/ports.js";
import { FakeHttpClient } from "../../../test/fakes/http-client.js";
import { HttpFailure } from "./http-failure.js";
import { RobotsClient } from "./robots-client.js";

const SITE = "https://jobs.example.com";

async function failureOf(promise: Promise<unknown>): Promise<HttpFailure> {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(HttpFailure);
  return error as HttpFailure;
}

const requested = (http: FakeHttpClient) => http.requests.map((r) => r.url);

describe("RobotsClient (FR-5)", () => {
  it("fits the crawl-core HttpClient port", () => {
    const port: HttpClient = new RobotsClient(new FakeHttpClient());
    expect(port).toBeInstanceOf(RobotsClient);
  });

  it("requests an allowed path after reading robots.txt", async () => {
    const http = new FakeHttpClient({
      [`${SITE}/robots.txt`]: "User-agent: *\nDisallow: /private\n",
      [`${SITE}/feed.xml`]: "<jobs/>",
    });
    const response = await new RobotsClient(http).request(`${SITE}/feed.xml`);
    expect(response.body).toBe("<jobs/>");
    expect(requested(http)).toEqual([`${SITE}/robots.txt`, `${SITE}/feed.xml`]);
  });

  it("never requests a disallowed path and reports it as disallowed", async () => {
    const http = new FakeHttpClient({
      [`${SITE}/robots.txt`]: "User-agent: *\nDisallow: /private\n",
      [`${SITE}/private/jobs.xml`]: "<jobs/>",
    });
    const failure = await failureOf(
      new RobotsClient(http).request(`${SITE}/private/jobs.xml?key=secret`),
    );
    expect(failure.kind).toBe("disallowed");
    expect(failure.message).toBe(
      `robots.txt disallows ${SITE}/private/jobs.xml`,
    );
    expect(requested(http)).toEqual([`${SITE}/robots.txt`]);
  });

  it("fetches robots.txt once per host per run", async () => {
    const other = "https://careers.example.org";
    const http = new FakeHttpClient({
      [`${SITE}/robots.txt`]: "User-agent: *\nDisallow: /private\n",
      [`${SITE}/a`]: "a",
      [`${SITE}/b`]: "b",
      [`${other}/robots.txt`]: "",
      [`${other}/c`]: "c",
    });
    const client = new RobotsClient(http);

    await Promise.all([
      client.request(`${SITE}/a`),
      client.request(`${SITE}/b`),
      client.request(`${other}/c`),
    ]);
    await failureOf(client.request(`${SITE}/private/x`));

    const robotsRequests = requested(http).filter((url) =>
      url.endsWith("/robots.txt"),
    );
    expect(robotsRequests).toEqual([
      `${SITE}/robots.txt`,
      `${other}/robots.txt`,
    ]);
  });

  it("allows everything when the site has no robots.txt", async () => {
    const http = new FakeHttpClient({
      [`${SITE}/robots.txt`]: new HttpFailure(
        "client-error",
        `${SITE}/robots.txt`,
        1,
        404,
      ),
      [`${SITE}/feed.xml`]: "<jobs/>",
    });
    await expect(
      new RobotsClient(http).request(`${SITE}/feed.xml`),
    ).resolves.toMatchObject({ body: "<jobs/>" });
  });

  it("requests nothing from a host whose robots.txt does not answer", async () => {
    const http = new FakeHttpClient({
      [`${SITE}/robots.txt`]: new HttpFailure(
        "server-error",
        `${SITE}/robots.txt`,
        3,
        503,
      ),
      [`${SITE}/feed.xml`]: "<jobs/>",
    });
    const client = new RobotsClient(http);

    const failure = await failureOf(client.request(`${SITE}/feed.xml`));
    expect(failure).toMatchObject({ kind: "server-error", status: 503 });
    await failureOf(client.request(`${SITE}/other.xml`));
    expect(requested(http)).toEqual([`${SITE}/robots.txt`]);
  });

  it("gives the host's crawl delay and sitemaps", async () => {
    const http = new FakeHttpClient({
      [`${SITE}/robots.txt`]:
        "User-agent: *\nCrawl-delay: 4\nSitemap: https://jobs.example.com/sitemap.xml\n",
    });
    const robots = await new RobotsClient(http).robotsFor(`${SITE}/any`);
    expect(robots.crawlDelay).toBe(4);
    expect(robots.sitemaps).toEqual(["https://jobs.example.com/sitemap.xml"]);
  });
});
