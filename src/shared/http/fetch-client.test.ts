import { describe, expect, it } from "vitest";
import type { HttpClient } from "../../features/crawl-core/ports.js";
import { FakeClock } from "../../../test/fakes/clock.js";
import { decodeBody, FetchClient, type FetchFunction } from "./fetch-client.js";
import { addressForLog, HttpFailure, parseRetryAfter } from "./http-failure.js";
import { RobotsClient } from "./robots-client.js";

const FEED = "https://jobs.example.com/feed.xml";

// A fake server: answers each call with the next reply in the list, and records the calls.
function fakeServer(
  ...replies: (Response | "hang" | "network-error" | (() => Response))[]
) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetch: FetchFunction = (url, init) => {
    calls.push({ url, init });
    const reply = replies[Math.min(calls.length, replies.length) - 1];
    if (reply === "network-error")
      return Promise.reject(new TypeError("fetch failed"));
    if (reply === "hang")
      return new Promise((_, reject) =>
        init.signal?.addEventListener("abort", () =>
          reject(init.signal?.reason),
        ),
      );
    return Promise.resolve(typeof reply === "function" ? reply() : reply!);
  };
  return { fetch, calls };
}

function client(fetch: FetchFunction, clock = new FakeClock()) {
  return new FetchClient({
    clock,
    fetch,
    userAgent: "IndudexBot/test",
    timeoutMs: 50,
  });
}

async function failureOf(promise: Promise<unknown>): Promise<HttpFailure> {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(HttpFailure);
  return error as HttpFailure;
}

describe("FetchClient (FR-3)", () => {
  it("fits the crawl-core HttpClient port", () => {
    const port: HttpClient = client(fakeServer(new Response("")).fetch);
    expect(port).toBeInstanceOf(FetchClient);
  });

  it("answers the body, status and headers of a good response", async () => {
    const server = fakeServer(
      new Response("<jobs/>", {
        status: 200,
        headers: { "Content-Type": "application/xml" },
      }),
    );
    const response = await client(server.fetch).request(FEED);

    expect(response).toMatchObject({
      status: 200,
      url: FEED,
      body: "<jobs/>",
      headers: { "content-type": "application/xml" },
    });
    expect(server.calls[0]?.init.headers).toMatchObject({
      "user-agent": "IndudexBot/test",
    });
  });

  it("answers a file's bytes untouched when asked for binary, and text otherwise", async () => {
    const pdf = new Uint8Array([
      0x25, 0x50, 0x44, 0x46, 0xff, 0xfe, 0x00, 0x80,
    ]);
    const reply = () =>
      new Response(pdf, { headers: { "Content-Type": "application/pdf" } });
    const file = await client(fakeServer(reply()).fetch).request(FEED, {
      binary: true,
    });
    expect(file.bytes).toEqual(pdf);
    expect(file.body).toBe("");
    const text = await client(fakeServer(reply()).fetch).request(FEED);
    expect(text.bytes).toBeUndefined();
  });

  it("answers every cookie the server sets", async () => {
    const headers = new Headers();
    headers.append("Set-Cookie", "JSESSIONID=a1; Path=/jobs; HttpOnly");
    headers.append("Set-Cookie", "ROUTE=n2; Path=/");
    const response = await client(
      fakeServer(new Response("", { headers })).fetch,
    ).request(FEED);
    expect(response.cookies).toEqual([
      "JSESSIONID=a1; Path=/jobs; HttpOnly",
      "ROUTE=n2; Path=/",
    ]);
  });

  it("sends a POST with its body and headers", async () => {
    const server = fakeServer(new Response("{}"));
    await client(server.fetch).request(FEED, {
      method: "POST",
      body: '{"page":1}',
      headers: { "content-type": "application/json" },
    });
    expect(server.calls[0]?.init).toMatchObject({
      method: "POST",
      body: '{"page":1}',
      headers: { "content-type": "application/json" },
    });
  });

  it("times out a slow response and retries it a limited number of times", async () => {
    const server = fakeServer("hang");
    const failure = await failureOf(client(server.fetch).request(FEED));
    expect(failure).toMatchObject({ kind: "timeout", attempts: 3 });
    expect(server.calls).toHaveLength(3);
  });

  it("retries a 5xx a limited number of times, waiting longer each time", async () => {
    const server = fakeServer(() => new Response("busy", { status: 503 }));
    const clock = new FakeClock();
    const start = clock.now().getTime();

    const failure = await failureOf(client(server.fetch, clock).request(FEED));

    expect(failure).toMatchObject({
      kind: "server-error",
      status: 503,
      attempts: 3,
    });
    expect(server.calls).toHaveLength(3);
    expect(clock.now().getTime() - start).toBe(1000 + 2000);
  });

  it("answers when a retry succeeds", async () => {
    const server = fakeServer(
      new Response("", { status: 502 }),
      "network-error",
      new Response("ok"),
    );
    const response = await client(server.fetch).request(FEED);
    expect(response.body).toBe("ok");
    expect(server.calls).toHaveLength(3);
  });

  it("does not retry a 4xx", async () => {
    const server = fakeServer(() => new Response("gone", { status: 404 }));
    const failure = await failureOf(client(server.fetch).request(FEED));
    expect(failure).toMatchObject({
      kind: "client-error",
      status: 404,
      attempts: 1,
    });
    expect(server.calls).toHaveLength(1);
  });

  it("does not retry a 429, and keeps how long the server asks to wait", async () => {
    const server = fakeServer(
      () =>
        new Response("", { status: 429, headers: { "Retry-After": "120" } }),
    );
    const failure = await failureOf(client(server.fetch).request(FEED));
    expect(failure).toMatchObject({
      kind: "rate-limited",
      status: 429,
      retryAfterMs: 120_000,
      attempts: 1,
    });
  });

  it("reports a network error after its retries", async () => {
    const server = fakeServer("network-error");
    const failure = await failureOf(client(server.fetch).request(FEED));
    expect(failure).toMatchObject({ kind: "network", attempts: 3 });
  });

  it("never puts the query string, where keys travel, in the failure", async () => {
    const server = fakeServer(() => new Response("", { status: 403 }));
    const failure = await failureOf(
      client(server.fetch).request(`${FEED}?app_key=secret123`),
    );
    expect(failure.message).not.toContain("secret123");
    expect(failure.url).toBe(FEED);
  });
});

describe("addressForLog", () => {
  it("drops the query, the fragment and long tokens in the path", () => {
    expect(
      addressForLog(
        "https://api.example.com/v1/abcdefghijklmnopqrstuvwxyz012345/jobs?key=1#x",
      ),
    ).toBe("https://api.example.com/v1/[key]/jobs");
  });
});

describe("parseRetryAfter", () => {
  const now = new Date("2026-11-15T08:00:00Z");

  it("reads seconds and HTTP dates", () => {
    expect(parseRetryAfter("30", now)).toBe(30_000);
    expect(parseRetryAfter("Sun, 15 Nov 2026 08:01:00 GMT", now)).toBe(60_000);
    expect(parseRetryAfter(null, now)).toBeUndefined();
    expect(parseRetryAfter("soon", now)).toBeUndefined();
  });
});

describe("FetchClient identity (FR-5)", () => {
  it("sends the User-Agent and From on every request, retries and robots.txt included", async () => {
    const server = fakeServer(
      new Response("User-agent: *\nAllow: /"),
      new Response("", { status: 503 }),
      new Response("<jobs/>"),
    );
    const fetchClient = new FetchClient({
      clock: new FakeClock(),
      fetch: server.fetch,
      userAgent: "IndudexBot/test",
      from: "contact@indudex.example",
    });

    await new RobotsClient(fetchClient).request(FEED);

    expect(server.calls.map((call) => call.url)).toEqual([
      "https://jobs.example.com/robots.txt",
      FEED,
      FEED,
    ]);
    for (const call of server.calls) {
      expect(call.init.headers).toMatchObject({
        "user-agent": "IndudexBot/test",
        from: "contact@indudex.example",
      });
    }
  });

  it("sends no From header when none is set", async () => {
    const server = fakeServer(new Response(""));
    await client(server.fetch).request(FEED);
    expect(server.calls[0]?.init.headers).not.toHaveProperty("from");
  });
});

// Text in ISO-8859-2, where "š" is 0xB9.
const latin2 = (text: string) =>
  Uint8Array.from([...text].map((c) => (c === "š" ? 0xb9 : c.charCodeAt(0))));

describe("FetchClient charsets (public-feeds T024)", () => {
  it("decodes by the charset its Content-Type names", async () => {
    const server = fakeServer(
      new Response(latin2("zapošljavanje"), {
        headers: { "content-type": "text/plain; charset=ISO-8859-2" },
      }),
    );
    expect((await client(server.fetch).request(FEED)).body).toBe(
      "zapošljavanje",
    );
  });

  it("decodes by an XML declaration's encoding when the header names none", async () => {
    const xml =
      '<?xml version="1.0" encoding="iso-8859-2"?><title>zapošljavanje</title>';
    const server = fakeServer(
      new Response(latin2(xml), { headers: { "content-type": "text/xml" } }),
    );
    expect((await client(server.fetch).request(FEED)).body).toBe(xml);
  });

  it("reads UTF-8 when nothing names a charset, or an unknown one does", () => {
    const bytes = new TextEncoder().encode("Ísland");
    expect(decodeBody(bytes, null)).toBe("Ísland");
    expect(decodeBody(bytes, "text/html; charset=no-such-charset")).toBe(
      "Ísland",
    );
  });
});
