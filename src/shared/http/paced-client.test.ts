import { describe, expect, it } from "vitest";
import type { HttpClient } from "../../features/crawl-core/ports.js";
import { FakeClock } from "../../../test/fakes/clock.js";
import type { HttpResponse } from "./fetch-client.js";
import { PacedClient, type PacedClientOptions } from "./paced-client.js";

interface Call {
  readonly url: string;
  readonly start: number;
  readonly end: number;
}

// A server that takes `durationMs` to answer and records when each request ran (in ms from the start).
function fakeServer(clock: FakeClock, durationMs = 0) {
  const origin = clock.now().getTime();
  const calls: Call[] = [];
  return {
    calls,
    async request(url: string): Promise<HttpResponse> {
      const start = clock.now().getTime() - origin;
      await clock.sleep(durationMs);
      calls.push({ url, start, end: clock.now().getTime() - origin });
      return { status: 200, url, headers: {}, body: "" };
    },
  };
}

const ADDRESSES: Record<string, string> = {
  "a.example.com": "10.0.0.1",
  "b.example.com": "10.0.0.2",
  "shared-1.example.com": "10.0.0.9",
  "shared-2.example.com": "10.0.0.9",
  "hosted-1.example.org": "185.162.28.10",
  "hosted-2.example.org": "185.162.31.200",
};

function paced(
  clock: FakeClock,
  server: ReturnType<typeof fakeServer>,
  options: Partial<PacedClientOptions> = {},
) {
  return new PacedClient(server, {
    clock,
    perHost: { gapMs: 3000, inFlight: 1 },
    perServer: { gapMs: 5000, inFlight: 1 },
    perProvider: { gapMs: 3000, inFlight: 1 },
    providers: { combell: ["185.162.28.0/22"] },
    resolve: async (host) => ADDRESSES[host],
    ...options,
  });
}

const startsOf = (calls: readonly Call[], host: string) =>
  calls
    .filter((call) => new URL(call.url).hostname === host)
    .map((call) => call.start)
    .toSorted((a, b) => a - b);

describe("PacedClient (FR-5)", () => {
  it("fits the crawl-core HttpClient port", () => {
    const clock = new FakeClock();
    const port: HttpClient = paced(clock, fakeServer(clock));
    expect(port).toBeInstanceOf(PacedClient);
  });

  it("keeps consecutive requests to one host at least the gap apart", async () => {
    const clock = new FakeClock();
    const server = fakeServer(clock);
    const client = paced(clock, server);

    await Promise.all(
      [1, 2, 3].map((n) => client.request(`https://a.example.com/${n}`)),
    );

    expect(startsOf(server.calls, "a.example.com")).toEqual([0, 3000, 6000]);
  });

  it("does not make different hosts wait for each other", async () => {
    const clock = new FakeClock();
    const server = fakeServer(clock);
    const client = paced(clock, server);

    await Promise.all([
      client.request("https://a.example.com/1"),
      client.request("https://b.example.com/1"),
      client.request("https://a.example.com/2"),
      client.request("https://b.example.com/2"),
    ]);

    expect(startsOf(server.calls, "a.example.com")).toEqual([0, 3000]);
    expect(startsOf(server.calls, "b.example.com")).toEqual([0, 3000]);
  });

  it("makes hosts on one server share its gap and one request at a time", async () => {
    const clock = new FakeClock();
    const server = fakeServer(clock, 1000);
    const client = paced(clock, server);

    // A server counts as shared once a second host has resolved to its address, as in the legacy.
    await client.request("https://shared-1.example.com/0");
    await client.request("https://shared-2.example.com/0");
    server.calls.length = 0;
    await Promise.all([
      client.request("https://shared-1.example.com/1"),
      client.request("https://shared-2.example.com/1"),
      client.request("https://shared-1.example.com/2"),
      client.request("https://shared-2.example.com/2"),
    ]);

    const calls = server.calls.toSorted((x, y) => x.start - y.start);
    for (let index = 1; index < calls.length; index++) {
      expect(
        calls[index]!.start - calls[index - 1]!.start,
      ).toBeGreaterThanOrEqual(5000);
      expect(calls[index]!.start).toBeGreaterThanOrEqual(calls[index - 1]!.end);
    }
    expect(calls).toHaveLength(4);
  });

  it("paces the hosts of a listed provider together", async () => {
    const clock = new FakeClock();
    const server = fakeServer(clock);
    const client = paced(clock, server);

    await Promise.all([
      client.request("https://hosted-1.example.org/1"),
      client.request("https://hosted-2.example.org/1"),
      client.request("https://a.example.com/1"),
    ]);

    const providerStarts = [
      ...startsOf(server.calls, "hosted-1.example.org"),
      ...startsOf(server.calls, "hosted-2.example.org"),
    ].toSorted((a, b) => a - b);
    expect(providerStarts).toEqual([0, 3000]);
    expect(startsOf(server.calls, "a.example.com")).toEqual([0]);
  });

  it("treats a host that does not resolve as its own server", async () => {
    const clock = new FakeClock();
    const server = fakeServer(clock);
    const client = paced(clock, server, { resolve: async () => undefined });

    await Promise.all([
      client.request("https://x.example.net/1"),
      client.request("https://y.example.net/1"),
    ]);

    expect(server.calls.map((call) => call.start)).toEqual([0, 0]);
  });

  it("widens a host's gap to its Crawl-delay, up to five minutes", async () => {
    const clock = new FakeClock();
    const server = fakeServer(clock);
    const client = paced(clock, server);
    client.slowHost("a.example.com", 10);
    client.slowHost("b.example.com", 3600);

    await Promise.all([
      client.request("https://a.example.com/1"),
      client.request("https://a.example.com/2"),
      client.request("https://b.example.com/1"),
      client.request("https://b.example.com/2"),
    ]);

    expect(startsOf(server.calls, "a.example.com")).toEqual([0, 10_000]);
    expect(startsOf(server.calls, "b.example.com")).toEqual([0, 300_000]);
  });

  it("frees the lanes when a request fails", async () => {
    const clock = new FakeClock();
    let calls = 0;
    const client = new PacedClient(
      {
        request: async (url) => {
          calls += 1;
          if (calls === 1) throw new Error("boom");
          return { status: 200, url, headers: {}, body: "" };
        },
      },
      {
        clock,
        perHost: { gapMs: 3000, inFlight: 1 },
        perServer: { gapMs: 5000, inFlight: 1 },
        perProvider: { gapMs: 3000, inFlight: 1 },
        resolve: async () => undefined,
      },
    );

    await expect(client.request("https://a.example.com/1")).rejects.toThrow(
      "boom",
    );
    await expect(
      client.request("https://a.example.com/2"),
    ).resolves.toMatchObject({
      status: 200,
    });
  });
});
