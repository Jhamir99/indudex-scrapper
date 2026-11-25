import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ntfyNotifier } from "./ntfy.js";
import { clock, dayAndClock, lasting, number, plural } from "./spanish.js";
import { Told } from "./told.js";

let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "ntfy-"));
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

interface Sent {
  readonly url: URL;
  readonly body: string;
}
// A stand-in ntfy.sh: answers with the statuses given, in turn, then 200.
const ntfy = (...statuses: number[]) => {
  const sent: Sent[] = [];
  const fetch = (async (url: string, init: RequestInit) => {
    sent.push({ url: new URL(url), body: String(init.body) });
    return new Response("", { status: statuses.shift() ?? 200 });
  }) as typeof globalThis.fetch;
  return { sent, fetch };
};
const afternoon = new Date(2026, 10, 25, 18, 40, 12);
const night = new Date(2026, 10, 25, 23, 5, 0);
const logPath = () => join(directory, "logs", "alerts.log");

describe("a notice (FR-7)", () => {
  it("posts the message as the body, the title, priority and tags in the query", async () => {
    const { sent, fetch } = ntfy();
    await ntfyNotifier({
      topic: "indudex-secret",
      logPath: logPath(),
      fetch,
      now: () => afternoon,
    }).notify({
      title: "Indudex: ha fallado la publicación",
      message: "pile shrank by a third\nwaits a day",
    });
    expect(sent).toHaveLength(1);
    const [{ url, body }] = sent as [Sent];
    expect(url.origin + url.pathname).toBe("https://ntfy.sh/indudex-secret");
    expect(url.searchParams.get("title")).toBe(
      "Indudex: ha fallado la publicación",
    );
    expect(url.searchParams.get("priority")).toBe("3");
    expect(url.searchParams.get("tags")).toBe("warning");
    expect(body).toBe("pile shrank by a third\nwaits a day");
    expect(await readFile(logPath(), "utf8")).toBe(
      "[2026-11-25 18:40:12] Indudex: ha fallado la publicación: pile shrank by a third waits a day\n",
    );
  });

  it("arrives silent for a problem over and for news", async () => {
    const { sent, fetch } = ntfy();
    const notifier = ntfyNotifier({
      topic: "t",
      logPath: logPath(),
      fetch,
      now: () => afternoon,
    });
    await notifier.notify({ title: "a", message: "b", kind: "ok" });
    await notifier.notify({ title: "c", message: "d", kind: "info" });
    expect(sent.map(({ url }) => url.searchParams.get("priority"))).toEqual([
      "2",
      "2",
    ]);
    expect(sent.map(({ url }) => url.searchParams.get("tags"))).toEqual([
      "white_check_mark",
      "information_source",
    ]);
  });

  it("arrives silent between 22:00 and 09:00, even a problem", async () => {
    for (const [at, priority] of [
      [night, "2"],
      [new Date(2026, 10, 26, 8, 59), "2"],
      [new Date(2026, 10, 26, 9, 0), "3"],
      [new Date(2026, 10, 26, 21, 59), "3"],
    ] as const) {
      const { sent, fetch } = ntfy();
      await ntfyNotifier({
        topic: "t",
        logPath: logPath(),
        fetch,
        now: () => at,
      }).notify({ title: "a", message: "b" });
      expect(sent[0]?.url.searchParams.get("priority")).toBe(priority);
    }
  });

  it("tries again, 20 s apart, and notes a notice it could not send without failing", async () => {
    const { sent, fetch } = ntfy(500, 500, 500, 500);
    const waits: number[] = [];
    await ntfyNotifier({
      topic: "indudex-secret",
      logPath: logPath(),
      fetch,
      now: () => afternoon,
      sleep: async (milliseconds) => {
        waits.push(milliseconds);
      },
    }).notify({ title: "a", message: "b" });
    expect(sent).toHaveLength(4);
    expect(waits).toEqual([20_000, 20_000, 20_000]);
    const log = await readFile(logPath(), "utf8");
    expect(log).toContain("  not sent: HTTP 500\n");
    expect(log).not.toContain("indudex-secret");
  });

  it("stops trying once one goes through", async () => {
    const { sent, fetch } = ntfy(502);
    await ntfyNotifier({
      topic: "t",
      logPath: logPath(),
      fetch,
      now: () => afternoon,
      sleep: async () => {},
    }).notify({ title: "a", message: "b" });
    expect(sent).toHaveLength(2);
  });

  it("is only written to the log with no topic", async () => {
    const { sent, fetch } = ntfy();
    await ntfyNotifier({
      topic: " ",
      logPath: logPath(),
      fetch,
      now: () => afternoon,
    }).notify({ title: "Indudex está parado", message: "STOP" });
    expect(sent).toHaveLength(0);
    expect(await readFile(logPath(), "utf8")).toBe(
      "[2026-11-25 18:40:12] Indudex está parado: STOP\n  not sent: no NTFY_TOPIC in .env\n",
    );
  });
});

describe("the notices' words (FR-10)", () => {
  it("writes numbers, times and lengths as Spain does", () => {
    expect(number(41935)).toBe("41.935");
    expect(plural(1, "fuente", "fuentes")).toBe("1 fuente");
    expect(plural(1200, "fuente", "fuentes")).toBe("1.200 fuentes");
    expect(clock(afternoon)).toBe("18:40");
    expect(dayAndClock(new Date(2026, 2, 5, 7, 3))).toBe("07:03 del 5/3");
    expect(lasting(40)).toBe("40 s");
    expect(lasting(48 * 60 + 5)).toBe("48 min");
    expect(lasting(3600 + 5 * 60)).toBe("1 h 5 min");
  });
});

describe("what was told", () => {
  it("keeps a flag per problem, with the time it was set", async () => {
    const told = new Told(join(directory, "told"));
    expect(await told.has("failed-crawl")).toBe(false);
    expect(await told.names()).toEqual([]);
    await told.set("failed-crawl", afternoon);
    await told.set("ok-publish");
    expect(await told.has("failed-crawl")).toBe(true);
    expect((await told.since("failed-crawl"))?.getTime()).toBe(
      afternoon.getTime(),
    );
    expect(await told.names()).toEqual(["failed-crawl", "ok-publish"]);
    await told.clear("failed-crawl");
    await told.clear("never-set");
    expect(await told.names()).toEqual(["ok-publish"]);
  });
});
