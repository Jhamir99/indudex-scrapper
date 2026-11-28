import { describe, expect, it } from "vitest";
import type { HttpClient } from "../../features/crawl-core/ports.js";
import { FakeHttpClient } from "../../../test/fakes/http-client.js";
import { HttpFailure } from "./http-failure.js";
import { PacedClient } from "./paced-client.js";
import { RobotsClient, type RobotsMemory } from "./robots-client.js";

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

describe("RobotsClient onRobots", () => {
  it("tells each host's rules once they are read", async () => {
    const http = new FakeHttpClient({
      [`${SITE}/robots.txt`]: "User-agent: *\nCrawl-delay: 7\n",
      [`${SITE}/a`]: "a",
    });
    const told: [string, number][] = [];
    const client = new RobotsClient(http, {
      onRobots: (host, robots) => told.push([host, robots.crawlDelay]),
    });
    await client.request(`${SITE}/a`);
    expect(told).toEqual([["jobs.example.com", 7]]);
  });
});

// A robots.txt memory in a map, as FileRobotsMemory keeps it on disk.
function memoryOf(
  copies: Record<string, string> = {},
  silent: Record<string, number> = {},
) {
  const kept = new Map(Object.entries(copies));
  const memory: RobotsMemory = {
    heard: async (origin, text) => {
      kept.set(origin, text);
      delete silent[origin];
    },
    lastCopy: async (origin) => kept.get(origin),
    silentSince: async (origin, now) => (silent[origin] ??= now),
  };
  return { memory, kept, silent };
}
const silentRobots = () =>
  new HttpFailure("server-error", `${SITE}/robots.txt`, 3, 503);
const DAY = 86_400_000;

describe("a silent robots.txt (RFC 9309 2.3.1.4, the legacy's 4fbb1c49)", () => {
  it("keeps each answer, and reads a silent one from its last copy", async () => {
    const { memory, kept } = memoryOf();
    await new RobotsClient(
      new FakeHttpClient({
        [`${SITE}/robots.txt`]: "User-agent: *\nDisallow: /private\n",
        [`${SITE}/feed.xml`]: "<jobs/>",
      }),
      { memory },
    ).request(`${SITE}/feed.xml`);
    expect(kept.get(SITE)).toBe("User-agent: *\nDisallow: /private\n");

    const client = new RobotsClient(
      new FakeHttpClient({
        [`${SITE}/robots.txt`]: silentRobots(),
        [`${SITE}/feed.xml`]: "<jobs/>",
      }),
      { memory },
    );
    await expect(client.request(`${SITE}/feed.xml`)).resolves.toMatchObject({
      body: "<jobs/>",
    });
    expect((await failureOf(client.request(`${SITE}/private/x`))).kind).toBe(
      "disallowed",
    );
  });

  it("closes a host with no copy until it has been silent thirty days, then opens it", async () => {
    const http = new FakeHttpClient({
      [`${SITE}/robots.txt`]: silentRobots(),
      [`${SITE}/feed.xml`]: "<jobs/>",
    });
    const start = Date.parse("2026-11-01T00:00:00Z");
    const { memory, silent } = memoryOf();
    await failureOf(
      new RobotsClient(http, { memory, now: () => start }).request(
        `${SITE}/feed.xml`,
      ),
    );
    expect(silent[SITE]).toBe(start);
    await failureOf(
      new RobotsClient(http, { memory, now: () => start + 29 * DAY }).request(
        `${SITE}/feed.xml`,
      ),
    );
    await expect(
      new RobotsClient(http, { memory, now: () => start + 30 * DAY }).request(
        `${SITE}/feed.xml`,
      ),
    ).resolves.toMatchObject({ body: "<jobs/>" });
  });

  it("never reads a copy past a server left alone", async () => {
    const { memory } = memoryOf({ [SITE]: "" });
    const http = new FakeHttpClient({
      [`${SITE}/robots.txt`]: new HttpFailure("held", `${SITE}/robots.txt`, 0),
      [`${SITE}/feed.xml`]: "<jobs/>",
    });
    expect(
      (
        await failureOf(
          new RobotsClient(http, { memory }).request(`${SITE}/feed.xml`),
        )
      ).kind,
    ).toBe("held");
  });
});

describe("a redirect to another host (the operator's call of 27 November 2026)", () => {
  it("checks each hop against its own host's robots.txt", async () => {
    const OTHER = "https://data.example.org";
    const robots = new FakeHttpClient({
      [`${SITE}/robots.txt`]: "User-agent: *\nAllow: /\n",
      [`${OTHER}/robots.txt`]: "User-agent: *\nDisallow: /api/\n",
    });
    // An inner client whose answer redirects to the other host's API, as jcyl's dataset did.
    const inner = {
      request: async (
        url: string,
        options?: { checkHop?: (next: string) => Promise<void> },
      ) => {
        if (url.endsWith("/robots.txt")) return robots.request(url);
        await options?.checkHop?.(`${OTHER}/api/export.json`);
        return { status: 200, url, headers: {}, body: "[]" };
      },
    };
    const failure = await failureOf(
      new RobotsClient(inner).request(`${SITE}/dataset.json`),
    );
    expect(failure.kind).toBe("disallowed");
    expect(failure.message).toBe(
      `robots.txt disallows ${OTHER}/api/export.json`,
    );
  });

  it("asks a hop's robots.txt outside the lanes its redirected request holds, so a hop on the same server never waits for ever", async () => {
    const A = "https://a.jobs2web.example";
    const B = "https://b.jobs2web.example";
    const clock = {
      now: () => new Date(),
      sleep: (ms: number) => new Promise<void>((wake) => setTimeout(wake, ms)),
    };
    const answers: Record<string, string> = {
      [`${A}/robots.txt`]: "User-agent: *\nAllow: /\n",
      [`${B}/robots.txt`]: "User-agent: *\nAllow: /\n",
    };
    const asked: string[] = [];
    // The network: a page of A redirects to B, both hosts on one server.
    const network = {
      request: async (
        url: string,
        options?: { checkHop?: (next: string) => Promise<void> },
      ) => {
        asked.push(url);
        if (answers[url])
          return { status: 200, url, headers: {}, body: answers[url]! };
        await options?.checkHop?.(`${B}/job/1`);
        return {
          status: 200,
          url: `${B}/job/1`,
          headers: {},
          body: "<html></html>",
        };
      },
    };
    const paced = new PacedClient(network, {
      clock,
      perHost: { gapMs: 0, inFlight: 1 },
      perServer: { gapMs: 0, inFlight: 1 },
      perProvider: { gapMs: 0, inFlight: 1 },
      errorBudget: { errors: 3, windowMs: 600_000 },
      resolve: async () => "10.0.0.7",
    });
    const client = new RobotsClient(paced, { hopRequester: network });
    // B is known on the server first (its robots.txt not read yet), so A's page holds the server's lane.
    await paced.request(`${B}/robots.txt`);
    asked.length = 0;
    const read = client.request(`${A}/job/1`);
    const late = new Promise((done) => setTimeout(() => done("hung"), 2000));
    expect(await Promise.race([read.then((r) => r.status), late])).toBe(200);
    expect(asked).toEqual([`${A}/robots.txt`, `${A}/job/1`, `${B}/robots.txt`]);
  });
});
