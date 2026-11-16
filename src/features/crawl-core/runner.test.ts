import { describe, expect, it } from "vitest";
import { InMemoryAdvertStore } from "../../../test/fakes/advert-store.js";
import { FakeClock } from "../../../test/fakes/clock.js";
import { FakeHttpClient } from "../../../test/fakes/http-client.js";
import {
  fakeDefinition,
  fakeDraft,
  FakeSourceAdapter,
} from "../../../test/fakes/source-adapter.js";
import { advertId, DESCRIPTION_LIMIT } from "../../shared/schemas/advert.js";
import type { AdvertStore } from "./ports.js";
import { FakeStopSwitch } from "../../../test/fakes/stop-switch.js";
import { HttpFailure } from "../../shared/http/http-failure.js";
import { TakedownList } from "./config/takedowns.js";
import type { Environment } from "./credentials.js";
import { runDue, runSource, runSources } from "./runner.js";

function setup() {
  const store = new InMemoryAdvertStore();
  const http = new FakeHttpClient();
  const logs: string[] = [];
  return { store, http, logs, log: (line: string) => logs.push(line) };
}

describe("runSource (FR-1, FR-2, FR-11)", () => {
  it("stores valid adverts with their stable id and their source's attribution", async () => {
    const { store, http, log } = setup();
    const adapter = new FakeSourceAdapter(fakeDefinition("brz"), [
      fakeDraft("brz", "1"),
      fakeDraft("brz", "2"),
    ]);

    const result = await runSource(adapter, { http, store, log });

    expect(result).toEqual({
      source: "brz",
      outcome: "stored",
      stored: 2,
      rejected: [],
      takenDown: 0,
      changed: true,
    });
    const stored = await store.readAdverts("brz");
    expect(stored.map((advert) => advert.id)).toEqual([
      advertId("brz", "1"),
      advertId("brz", "2"),
    ]);
    for (const advert of stored) {
      expect(advert.attribution).toEqual({
        licence: "CC BY 4.0",
        credit: "brz, CC BY 4.0",
      });
    }
  });

  it("stores an explicit null credit for a source that requires none", async () => {
    const { store, http, log } = setup();
    const definition = fakeDefinition("brz");
    const adapter = new FakeSourceAdapter(
      { ...definition, licence: { ...definition.licence, credit: null } },
      [fakeDraft("brz", "1")],
    );

    await runSource(adapter, { http, store, log });

    const [advert] = await store.readAdverts("brz");
    expect(advert?.attribution.credit).toBeNull();
  });

  it("counts an invalid advert with its reason, logs it and does not store it", async () => {
    const { store, http, logs, log } = setup();
    const adapter = new FakeSourceAdapter(fakeDefinition("brz"), [
      fakeDraft("brz", "1"),
      fakeDraft("brz", "2", { url: "http://brz.example/jobs/2" }),
      fakeDraft("brz", "3", { title: "  " }),
    ]);

    const result = await runSource(adapter, { http, store, log });

    expect(result.stored).toBe(1);
    expect(result.rejected).toEqual([
      { sourceId: "2", reason: "url: an https:// address" },
      { sourceId: "3", reason: expect.stringMatching(/^title: /) },
    ]);
    expect(await store.readAdverts("brz")).toHaveLength(1);
    expect(logs).toContain("brz: rejected 2: url: an https:// address");
  });

  it("rejects a contact field, so no person data reaches the store", async () => {
    const { store, http, log } = setup();
    const draft = { ...fakeDraft("brz", "1"), email: "someone@brz.example" };
    const adapter = new FakeSourceAdapter(fakeDefinition("brz"), [draft]);

    const result = await runSource(adapter, { http, store, log });

    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]?.reason).toContain("email");
    expect(await store.readAdverts("brz")).toEqual([]);
  });

  it("rejects an advert that claims another source", async () => {
    const { store, http, log } = setup();
    const adapter = new FakeSourceAdapter(fakeDefinition("brz"), [
      fakeDraft("other", "1"),
    ]);

    const result = await runSource(adapter, { http, store, log });

    expect(result.rejected).toEqual([
      { sourceId: "1", reason: 'source: "other" is not "brz"' },
    ]);
  });

  it("keeps the first of two adverts with the same source id", async () => {
    const { store, http, log } = setup();
    const adapter = new FakeSourceAdapter(fakeDefinition("brz"), [
      fakeDraft("brz", "1", { title: "First" }),
      fakeDraft("brz", "1", { title: "Second" }),
    ]);

    const result = await runSource(adapter, { http, store, log });

    expect(result.stored).toBe(1);
    expect(result.rejected).toEqual([
      { sourceId: "1", reason: "sourceId: repeated in the same read" },
    ]);
    const [advert] = await store.readAdverts("brz");
    expect(advert?.title).toBe("First");
  });

  it("caps a long description instead of rejecting the advert", async () => {
    const { store, http, log } = setup();
    const adapter = new FakeSourceAdapter(fakeDefinition("brz"), [
      fakeDraft("brz", "1", { description: "x".repeat(DESCRIPTION_LIMIT + 5) }),
    ]);

    await runSource(adapter, { http, store, log });

    const [advert] = await store.readAdverts("brz");
    expect(advert?.description).toHaveLength(DESCRIPTION_LIMIT);
  });

  it("hands the adapter its HTTP client, credentials and a log with the source's name", async () => {
    const { store, logs, log } = setup();
    const http = new FakeHttpClient({ "https://brz.example/feed": "<rss/>" });
    let seen: Readonly<Record<string, string>> = {};
    const adapter = new FakeSourceAdapter(fakeDefinition("brz"), [], {
      fetches: ["https://brz.example/feed"],
    });
    const original = adapter.fetchAdverts.bind(adapter);
    adapter.fetchAdverts = (context) => {
      seen = context.credentials;
      context.log("read the feed");
      return original(context);
    };

    await runSource(adapter, {
      http,
      store,
      log,
      credentials: { BRZ_KEY: "k" },
    });

    expect(http.requests.map((request) => request.url)).toEqual([
      "https://brz.example/feed",
    ]);
    expect(seen).toEqual({ BRZ_KEY: "k" });
    expect(logs).toContain("brz: read the feed");
  });

  it("calls nothing beyond the store: the adverts are stored as validated (FR-11)", async () => {
    const { http, log } = setup();
    const calls: string[] = [];
    const inner = new InMemoryAdvertStore();
    const store = new Proxy(inner, {
      get(target, property, receiver) {
        const value: unknown = Reflect.get(target, property, receiver);
        if (typeof value !== "function") return value;
        return (...args: unknown[]) => {
          calls.push(String(property));
          return (value as (...a: unknown[]) => unknown).apply(target, args);
        };
      },
    }) satisfies AdvertStore;
    const draft = fakeDraft("brz", "1", { title: "ELECTRICAL ENGINEER" });
    const adapter = new FakeSourceAdapter(fakeDefinition("brz"), [draft]);

    await runSource(adapter, { http, store, log });

    expect(calls).toEqual(["readAdverts", "replaceAdverts"]);
    const [stored] = await inner.readAdverts("brz");
    expect(stored).toEqual({
      ...draft,
      id: advertId("brz", "1"),
      attribution: { licence: "CC BY 4.0", credit: "brz, CC BY 4.0" },
      firstSeen: "2026-11-15",
    });
  });
});

const HOUR = 3_600_000;

const noTakedowns = new TakedownList({
  sources: [],
  companies: [],
  adverts: [],
});

const rules = {
  cadenceHours: 24,
  unchangedMaxHours: 168,
  backoffHours: [24, 72, 168],
  parkAfterFailures: 6,
  parkedHours: 720,
};

function runSetup() {
  const clock = new FakeClock("2026-11-16T08:00:00Z");
  const store = new InMemoryAdvertStore(clock);
  const http = new FakeHttpClient();
  const logs: string[] = [];
  const stopSwitch = new FakeStopSwitch();
  const dependencies = {
    http,
    store,
    clock,
    rulesFor: (_source: string) => rules,
    takedowns: noTakedowns,
    stopSwitch,
    environment: {} as Environment,
    log: (line: string) => logs.push(line),
  };
  return { clock, store, http, logs, stopSwitch, dependencies };
}

describe("runSources: failure isolation and previous adverts (FR-3, FR-4)", () => {
  it("marks a throwing source failed with its reason and still runs the next one", async () => {
    const { store, dependencies } = runSetup();
    const broken = new FakeSourceAdapter(fakeDefinition("broken"), [], {
      failure: new Error("feed answered HTML"),
    });
    const healthy = new FakeSourceAdapter(fakeDefinition("healthy"), [
      fakeDraft("healthy", "1"),
    ]);

    const result = await runSources([broken, healthy], dependencies);

    expect(result.sources.map((source) => source.outcome)).toEqual([
      "failed",
      "stored",
    ]);
    expect(await store.readState("broken")).toMatchObject({
      status: "failed",
      reason: "feed answered HTML",
      consecutiveFailures: 1,
      nextDueAt: new Date(
        Date.parse("2026-11-16T08:00:00Z") + 24 * HOUR,
      ).toISOString(),
    });
    expect(await store.readState("healthy")).toMatchObject({
      status: "enabled",
      advertCount: 1,
    });
  });

  it("keeps the previous adverts unchanged when a source fails part way through its read", async () => {
    const { store, dependencies } = runSetup();
    await runSources(
      [new FakeSourceAdapter(fakeDefinition("brz"), [fakeDraft("brz", "1")])],
      dependencies,
    );
    const before = await store.readAdverts("brz");

    const failing = new FakeSourceAdapter(
      fakeDefinition("brz"),
      [fakeDraft("brz", "2"), fakeDraft("brz", "3")],
      {
        failure: new HttpFailure(
          "server-error",
          "https://brz.example/feed",
          3,
          503,
        ),
      },
    );
    const result = await runSources([failing], dependencies);

    expect(result.sources[0]).toMatchObject({
      outcome: "failed",
      reason:
        "server-error (HTTP 503) for https://brz.example/feed after 3 attempts",
    });
    expect(await store.readAdverts("brz")).toEqual(before);
    expect(await store.readState("brz")).toMatchObject({
      status: "failed",
      advertCount: 1,
    });
  });

  it("reports a read of zero adverts after some as a failure and deletes nothing", async () => {
    const { store, logs, dependencies } = runSetup();
    await runSources(
      [new FakeSourceAdapter(fakeDefinition("brz"), [fakeDraft("brz", "1")])],
      dependencies,
    );
    const before = await store.readAdverts("brz");

    const result = await runSources(
      [new FakeSourceAdapter(fakeDefinition("brz"), [])],
      dependencies,
    );

    expect(result.sources[0]).toMatchObject({
      outcome: "failed",
      reason: "read no adverts after 1: kept",
    });
    expect(logs).toContain("brz: failed: read no adverts after 1: kept");
    expect(await store.readAdverts("brz")).toEqual(before);
  });

  it("reports a read of zero adverts from a source that had none as an empty pass", async () => {
    const { store, logs, dependencies } = runSetup();

    const result = await runSources(
      [new FakeSourceAdapter(fakeDefinition("brz"), [])],
      dependencies,
    );

    expect(result.sources[0]?.outcome).toBe("empty");
    expect(logs).toContain("brz: read no adverts");
    expect(await store.readState("brz")).toMatchObject({
      status: "enabled",
      advertCount: 0,
    });
  });

  it("marks a source whose every advert fails validation as failed and keeps what it had", async () => {
    const { store, dependencies } = runSetup();
    await runSources(
      [new FakeSourceAdapter(fakeDefinition("brz"), [fakeDraft("brz", "1")])],
      dependencies,
    );
    const before = await store.readAdverts("brz");

    const changedFormat = new FakeSourceAdapter(fakeDefinition("brz"), [
      fakeDraft("brz", "1", { country: "Austria" }),
      fakeDraft("brz", "2", { country: "Austria" }),
    ]);
    const result = await runSources([changedFormat], dependencies);

    expect(result.sources[0]).toMatchObject({
      outcome: "failed",
      reason: "no valid advert: 2 rejected",
    });
    expect(await store.readAdverts("brz")).toEqual(before);
  });

  it("tells whether the set of adverts changed since the last read", async () => {
    const { dependencies } = runSetup();
    const read = (ids: string[]) =>
      runSources(
        [
          new FakeSourceAdapter(
            fakeDefinition("brz"),
            ids.map((id) => fakeDraft("brz", id)),
          ),
        ],
        dependencies,
      );

    expect((await read(["1", "2"])).sources[0]?.changed).toBe(true);
    expect((await read(["2", "1"])).sources[0]?.changed).toBe(false);
    expect((await read(["1", "3"])).sources[0]?.changed).toBe(true);
    expect((await read(["1"])).sources[0]?.changed).toBe(true);
  });

  it("never writes a credential's value into the reason", async () => {
    const { store, dependencies } = runSetup();
    const leaky = new FakeSourceAdapter(fakeDefinition("keyed"), [], {
      failure: new Error("refused https://api.example/?key=s3cr3t-value"),
    });

    const result = await runSource(leaky, {
      ...dependencies,
      credentials: { KEYED_KEY: "s3cr3t-value" },
    });

    expect(result.reason).toBe("refused https://api.example/?key=[credential]");
    expect(JSON.stringify(await store.readStates())).not.toContain("s3cr3t");
  });
});

const feedSource = (id: string) =>
  new FakeSourceAdapter(fakeDefinition(id), [fakeDraft(id, "1")], {
    fetches: [`https://${id}.example/feed`],
  });

const slowerForSlow = (id: string) =>
  id === "slow" ? { ...rules, cadenceHours: 72 } : rules;

describe("runDue: scheduling (FR-3, FR-6)", () => {
  it("runs only the due sources, in a stable order, and leaves the others without a request", async () => {
    const { clock, store, http, dependencies } = runSetup();
    for (const id of ["daily", "slow", "fresh"]) {
      http.route(`https://${id}.example/feed`, "<rss/>");
    }
    const daily = feedSource("daily");
    const slow = feedSource("slow");
    const fresh = feedSource("fresh");
    const deps = { ...dependencies, rulesFor: slowerForSlow };

    await runDue([slow, daily], deps);
    http.requests.length = 0;
    clock.advance(25 * HOUR);

    const result = await runDue([slow, fresh, daily], deps);

    expect(result.sources.map((source) => source.source)).toEqual([
      "fresh",
      "daily",
    ]);
    expect(http.requests.map((request) => request.url)).toEqual([
      "https://fresh.example/feed",
      "https://daily.example/feed",
    ]);
    expect(slow.runs).toBe(1);
    expect((await store.readState("slow"))?.lastRunAt).toBe(
      "2026-11-16T08:00:00.000Z",
    );
  });

  it("gives a failed source the next wait of the backoff", async () => {
    const { clock, store, dependencies } = runSetup();
    const broken = new FakeSourceAdapter(fakeDefinition("broken"), [], {
      failure: new Error("down"),
    });

    await runDue([broken], dependencies);
    expect((await store.readState("broken"))?.nextDueAt).toBe(
      "2026-11-17T08:00:00.000Z",
    );

    clock.advance(23 * HOUR);
    await runDue([broken], dependencies);
    expect(broken.runs).toBe(1);

    clock.advance(1 * HOUR);
    await runDue([broken], dependencies);
    expect(broken.runs).toBe(2);
    expect(await store.readState("broken")).toMatchObject({
      status: "failed",
      consecutiveFailures: 2,
      nextDueAt: "2026-11-20T08:00:00.000Z",
    });
  });

  it("makes no request for a parked source until its period ends", async () => {
    const { clock, store, http, dependencies } = runSetup();
    await store.writeState("parked", {
      status: "parked",
      reason: "down",
      parkedUntil: "2026-12-16T08:00:00.000Z",
      lastRunAt: "2026-11-16T08:00:00.000Z",
      advertCount: 3,
      consecutiveFailures: 6,
      unchangedPasses: 0,
      nextDueAt: "2026-12-16T08:00:00.000Z",
    });
    http.route("https://parked.example/feed", "<rss/>");
    const parked = new FakeSourceAdapter(
      fakeDefinition("parked"),
      [fakeDraft("parked", "1")],
      { fetches: ["https://parked.example/feed"] },
    );

    clock.advance(29 * 24 * HOUR);
    await runDue([parked], dependencies);
    expect(http.requests).toEqual([]);

    clock.advance(24 * HOUR);
    await runDue([parked], dependencies);
    expect(http.requests).toHaveLength(1);
    expect(await store.readState("parked")).toMatchObject({
      status: "enabled",
      consecutiveFailures: 0,
    });
  });
});

describe("runDue: gates (FR-5, FR-7, FR-8, FR-9)", () => {
  it("neither collects nor keeps adverts covered by a takedown, stored ones included", async () => {
    const { clock, store, dependencies } = runSetup();
    await runSources(
      [
        new FakeSourceAdapter(fakeDefinition("brz"), [
          fakeDraft("brz", "1"),
          fakeDraft("brz", "2", { company: "Takedown AG" }),
          fakeDraft("brz", "3"),
        ]),
      ],
      dependencies,
    );
    const takedowns = new TakedownList({
      sources: [],
      companies: [{ name: "TAKEDOWN ag", reason: "employer's request" }],
      adverts: [
        {
          url: "https://brz.example/jobs/3/?utm_source=x",
          reason: "employer's request",
        },
      ],
    });

    // Not due yet: the stored adverts still go at the start of the run.
    clock.advance(HOUR);
    await runDue([new FakeSourceAdapter(fakeDefinition("brz"))], {
      ...dependencies,
      takedowns,
    });
    expect((await store.readAdverts("brz")).map((a) => a.sourceId)).toEqual([
      "1",
    ]);

    clock.advance(24 * HOUR);
    const result = await runDue(
      [
        new FakeSourceAdapter(fakeDefinition("brz"), [
          fakeDraft("brz", "1"),
          fakeDraft("brz", "2", { company: "Takedown AG" }),
          fakeDraft("brz", "3"),
          fakeDraft("brz", "4"),
        ]),
      ],
      { ...dependencies, takedowns },
    );
    expect(result.sources[0]).toMatchObject({
      outcome: "stored",
      stored: 2,
      takenDown: 2,
    });
    expect((await store.readAdverts("brz")).map((a) => a.sourceId)).toEqual([
      "1",
      "4",
    ]);
  });

  it("disables a taken-down source and removes its stored adverts", async () => {
    const { store, http, dependencies } = runSetup();
    await runSources(
      [new FakeSourceAdapter(fakeDefinition("brz"), [fakeDraft("brz", "1")])],
      dependencies,
    );
    http.route("https://brz.example/feed", "<rss/>");
    const adapter = new FakeSourceAdapter(fakeDefinition("brz"), [], {
      fetches: ["https://brz.example/feed"],
    });
    const takedowns = new TakedownList({
      sources: [{ id: "brz", reason: "publisher's request" }],
      companies: [],
      adverts: [],
    });

    const result = await runDue([adapter], { ...dependencies, takedowns });

    expect(result.sources[0]).toMatchObject({
      outcome: "disabled",
      reason: "taken down: publisher's request",
    });
    expect(http.requests).toEqual([]);
    expect(await store.readAdverts("brz")).toEqual([]);
    expect(await store.readState("brz")).toMatchObject({
      status: "disabled",
      reason: "taken down: publisher's request",
    });
  });

  it("starts nothing and changes nothing while the stop switch is active", async () => {
    const { store, http, stopSwitch, dependencies } = runSetup();
    await runSources(
      [new FakeSourceAdapter(fakeDefinition("brz"), [fakeDraft("brz", "1")])],
      dependencies,
    );
    const adverts = structuredClone(store.adverts);
    const states = structuredClone(store.states);
    stopSwitch.active = true;
    const adapter = new FakeSourceAdapter(fakeDefinition("other"), [], {
      fetches: ["https://other.example/feed"],
    });

    const result = await runDue([adapter], {
      ...dependencies,
      takedowns: new TakedownList({
        sources: [{ id: "brz", reason: "publisher's request" }],
        companies: [],
        adverts: [],
      }),
    });

    expect(result).toEqual({ sources: [], stopped: true });
    expect(adapter.runs).toBe(0);
    expect(http.requests).toEqual([]);
    expect(store.adverts).toEqual(adverts);
    expect(store.states).toEqual(states);
  });

  it("sends no request and runs no source once the flag appears during a run, and stores nothing of the cut read", async () => {
    const { store, http, stopSwitch, dependencies } = runSetup();
    await runSources(
      [
        new FakeSourceAdapter(fakeDefinition("first"), [
          fakeDraft("first", "1"),
        ]),
      ],
      dependencies,
    );
    const adverts = structuredClone(store.adverts);
    const states = structuredClone(store.states);
    http.route("https://first.example/page-1", "<rss/>");
    http.route("https://first.example/page-2", "<rss/>");
    http.route("https://second.example/feed", "<rss/>");
    const flagAfterFirstRequest = {
      request: async (url: string) => {
        const answer = await http.request(url);
        stopSwitch.active = true;
        return answer;
      },
    };
    const first = new FakeSourceAdapter(
      fakeDefinition("first"),
      [fakeDraft("first", "2")],
      {
        fetches: [
          "https://first.example/page-1",
          "https://first.example/page-2",
        ],
      },
    );
    const second = new FakeSourceAdapter(fakeDefinition("second"), [], {
      fetches: ["https://second.example/feed"],
    });

    const result = await runSources([first, second], {
      ...dependencies,
      http: flagAfterFirstRequest,
    });

    expect(result.stopped).toBe(true);
    expect(result.sources.map((s) => s.outcome)).toEqual(["stopped"]);
    expect(http.requests.map((r) => r.url)).toEqual([
      "https://first.example/page-1",
    ]);
    expect(second.runs).toBe(0);
    expect(store.adverts).toEqual(adverts);
    expect(store.states).toEqual(states);
  });

  it("keeps a source without its credentials disabled, with zero requests, until they are set", async () => {
    const { store, http, dependencies } = runSetup();
    http.route("https://keyed.example/api", "{}");
    const keyed = new FakeSourceAdapter(
      fakeDefinition("keyed", {
        needsCredentials: true,
        credentialVariables: ["KEYED_APP_KEY"],
      }),
      [fakeDraft("keyed", "1")],
      { fetches: ["https://keyed.example/api"] },
    );

    const result = await runDue([keyed], dependencies);

    expect(result.sources[0]).toMatchObject({
      outcome: "disabled",
      reason: "missing credentials: KEYED_APP_KEY",
    });
    expect(keyed.runs).toBe(0);
    expect(http.requests).toEqual([]);
    expect(await store.readState("keyed")).toMatchObject({
      status: "disabled",
      reason: "missing credentials: KEYED_APP_KEY",
      nextDueAt: null,
    });

    await runDue([keyed], {
      ...dependencies,
      environment: { KEYED_APP_KEY: "value" },
    });

    expect(keyed.runs).toBe(1);
    expect(await store.readState("keyed")).toMatchObject({
      status: "enabled",
      advertCount: 1,
    });
  });

  it("ends a source blocked by robots.txt as disallowed and keeps its adverts", async () => {
    const { store, dependencies } = runSetup();
    await runSources(
      [new FakeSourceAdapter(fakeDefinition("brz"), [fakeDraft("brz", "1")])],
      dependencies,
    );
    const before = await store.readAdverts("brz");
    const blocked = new FakeSourceAdapter(fakeDefinition("brz"), [], {
      failure: new HttpFailure("disallowed", "https://brz.example/feed", 0),
    });

    const result = await runSources([blocked], dependencies);

    expect(result.sources[0]).toMatchObject({
      outcome: "disallowed",
      reason: "robots.txt disallows https://brz.example/feed",
    });
    expect(await store.readState("brz")).toMatchObject({
      status: "disallowed",
      reason: "robots.txt disallows https://brz.example/feed",
      consecutiveFailures: 1,
      nextDueAt: "2026-11-17T08:00:00.000Z",
    });
    expect(await store.readAdverts("brz")).toEqual(before);
  });
});
