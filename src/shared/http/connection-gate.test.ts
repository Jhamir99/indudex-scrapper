import { describe, expect, it } from "vitest";
import type { HttpClient } from "../../features/crawl-core/ports.js";
import { FakeClock } from "../../../test/fakes/clock.js";
import { channel } from "node:diagnostics_channel";
import { ConnectionGate, watchFetchConnections } from "./connection-gate.js";
import type { HttpResponse } from "./fetch-client.js";

// A fetch with a connection pool: a request opens a connection when its origin has no idle one,
// and keeps it open afterwards. Records every open and how many requests ran at once.
function pooledServer(clock: FakeClock, durationMs: number) {
  const origin = clock.now().getTime();
  const idle = new Map<string, number>();
  const opens: number[] = [];
  let active = 0;
  let mostActive = 0;
  let gate: ConnectionGate | undefined;
  return {
    opens,
    mostActive: () => mostActive,
    attach(attached: ConnectionGate) {
      gate = attached;
    },
    async request(url: string): Promise<HttpResponse> {
      const site = new URL(url).origin;
      active += 1;
      mostActive = Math.max(mostActive, active);
      if ((idle.get(site) ?? 0) > 0) {
        idle.set(site, idle.get(site)! - 1);
      } else {
        gate?.connectionStarting();
        opens.push(clock.now().getTime() - origin);
        gate?.connectionOpened(site);
      }
      await clock.sleep(durationMs);
      idle.set(site, (idle.get(site) ?? 0) + 1);
      active -= 1;
      return { status: 200, url, headers: {}, body: "" };
    },
  };
}

function gated(clock: FakeClock, durationMs: number, maxOpen = 16) {
  const server = pooledServer(clock, durationMs);
  const gate = new ConnectionGate(server, { clock, maxOpen, newPerSecond: 2 });
  server.attach(gate);
  return { gate, server };
}

describe("ConnectionGate (FR-5)", () => {
  it("fits the crawl-core HttpClient port", () => {
    const clock = new FakeClock();
    const port: HttpClient = gated(clock, 0).gate;
    expect(port).toBeInstanceOf(ConnectionGate);
  });

  it("never opens more new connections a second than configured", async () => {
    const clock = new FakeClock();
    const { gate, server } = gated(clock, 500);

    await Promise.all(
      Array.from({ length: 20 }, (_, n) =>
        gate.request(`https://site-${n}.example.com/jobs`),
      ),
    );

    expect(server.opens).toHaveLength(20);
    for (const open of server.opens) {
      const inOneSecond = server.opens.filter(
        (other) => other >= open && other < open + 1000,
      );
      expect(inOneSecond.length).toBeLessThanOrEqual(2);
    }
  });

  it("never has more requests on their way than configured", async () => {
    const clock = new FakeClock();
    const { gate, server } = gated(clock, 5000, 4);

    // Warm one connection per site so no request waits for a new one.
    for (let n = 0; n < 10; n++)
      await gate.request(`https://s${n}.example.com/`);
    await Promise.all(
      Array.from({ length: 10 }, (_, n) =>
        gate.request(`https://s${n}.example.com/jobs`),
      ),
    );

    expect(server.mostActive()).toBe(4);
  });

  it("lets a request reuse an idle connection without waiting for room", async () => {
    const clock = new FakeClock();
    const { gate, server } = gated(clock, 0);
    const start = clock.now().getTime();

    await gate.request("https://a.example.com/1");
    await gate.request("https://b.example.com/1");
    // Two connections opened this second: a third new one would wait, a reused one does not.
    await gate.request("https://a.example.com/2");
    expect(clock.now().getTime() - start).toBe(0);
    expect(server.opens).toEqual([0, 0]);

    await gate.request("https://c.example.com/1");
    expect(clock.now().getTime() - start).toBeGreaterThanOrEqual(1000);
  });

  it("frees its slot when a request fails", async () => {
    const clock = new FakeClock();
    const gate = new ConnectionGate(
      {
        request: async () => {
          throw new Error("boom");
        },
      },
      { clock, maxOpen: 1, newPerSecond: 2 },
    );
    await expect(gate.request("https://a.example.com/")).rejects.toThrow(
      "boom",
    );
    await expect(gate.request("https://a.example.com/")).rejects.toThrow(
      "boom",
    );
  });
});

describe("watchFetchConnections", () => {
  it("counts the connections fetch reports, and stops when asked", async () => {
    const clock = new FakeClock();
    const server = pooledServer(clock, 0);
    const gate = new ConnectionGate(server, {
      clock,
      maxOpen: 16,
      newPerSecond: 1,
    });
    const stop = watchFetchConnections(gate);
    const closeListeners: (() => void)[] = [];
    const socket = {
      once: (_: "close", listener: () => void) => closeListeners.push(listener),
    };

    try {
      // As undici reports a connection to https://a.example.com.
      channel("undici:client:beforeConnect").publish({});
      channel("undici:client:connected").publish({
        connectParams: {
          protocol: "https:",
          hostname: "a.example.com",
          port: "",
        },
        socket,
      });
    } finally {
      stop();
    }
    channel("undici:client:beforeConnect").publish({});

    // The reported connection is idle: a request to its origin goes at once even though the
    // second's single new connection is spent; one to another origin waits for the next second.
    const start = clock.now().getTime();
    await gate.request("https://a.example.com/jobs");
    expect(clock.now().getTime() - start).toBe(0);

    closeListeners.forEach((close) => close());
    await gate.request("https://a.example.com/jobs");
    expect(clock.now().getTime() - start).toBeGreaterThanOrEqual(1000);
  });
});
