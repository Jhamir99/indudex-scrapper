import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  checkAdapterContract,
  loadFixtureRoutes,
} from "../../../../../test/contract/adapter-contract.js";
import { FakeHttpClient } from "../../../../../test/fakes/http-client.js";
import {
  fakeContext,
  readDrafts,
} from "../../../../../test/fakes/source-adapter.js";
import { HttpFailure } from "../../../../shared/http/http-failure.js";
import type { SourceMemory } from "../../../crawl-core/ports.js";
import { CALLS_A_DAY, jooble, keysOf, parseJobs, toDraft } from "./jooble.js";

const TODAY = "2026-11-17";
const SEARCH_TEXT = await readFile(
  new URL("../../../../../test/fixtures/jooble/search.json", import.meta.url),
  "utf8",
);
const SEARCH = { jobs: parseJobs(SEARCH_TEXT) };
const job = (n: number) => ({
  id: n,
  title: `Ingeniero ${n}`,
  link: `https://jooble.org/desc/${n}`,
  updated: "2026-11-15T00:00:00.0000000",
});

// Runs the source with a server that answers each search; returns its drafts, requests, memory and log.
async function run(
  credentials: Record<string, string>,
  answer: (
    body: { keywords: string; location: string; page: number },
    call: number,
  ) => unknown,
  memory?: SourceMemory,
) {
  const http = new FakeHttpClient();
  let calls = 0;
  const route = (options: { body?: string }) => {
    calls++;
    const reply = answer(JSON.parse(options.body ?? "{}"), calls);
    return reply instanceof Error ? reply : JSON.stringify(reply);
  };
  for (const key of ["k", "K1", "K2", "secret-key"])
    http.route(`https://jooble.org/api/${key}`, route);
  let remembered: SourceMemory | undefined;
  const logged: string[] = [];
  const drafts = await readDrafts(
    jooble,
    fakeContext({
      http,
      credentials,
      today: TODAY,
      memory,
      remember: (value) => {
        remembered = value;
      },
      log: (line) => logged.push(line),
    }),
  );
  return { drafts, http, remembered, logged };
}

describe("jooble (credentialed sources FR-4)", () => {
  it("maps the saved answer into valid adverts", async () => {
    expect(
      await checkAdapterContract(jooble, await loadFixtureRoutes("jooble")),
    ).toEqual([]);
  });

  it("asks each country's three words, newest first, and maps each job", async () => {
    const { drafts, http, remembered } = await run(
      { JOOBLE_KEY: "k" },
      () => SEARCH,
    );
    expect(http.requests).toHaveLength(20 * 3);
    expect(http.requests[0]).toMatchObject({
      url: "https://jooble.org/api/k",
      options: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
    });
    expect(
      http.requests
        .slice(0, 4)
        .map((request) => JSON.parse(request.options.body ?? "")),
    ).toEqual([
      { keywords: "ingeniero", location: "Spain", page: 1 },
      { keywords: "técnico", location: "Spain", page: 1 },
      { keywords: "desarrollador", location: "Spain", page: 1 },
      { keywords: "engenheiro", location: "Portugal", page: 1 },
    ]);
    expect(remembered).toEqual({ day: TODAY, calls: 60 });
    // The same jobs answer every search here: the last country's reading stands, as the legacy's.
    expect(drafts.map((draft) => draft.sourceId)).toEqual([
      "-7000000000000000001",
      "-7000000000000000002",
    ]);
  });

  it("keeps each 19-digit id exactly", () => {
    expect(parseJobs(SEARCH_TEXT).map((one) => one.id)).toEqual([
      "-7000000000000000001",
      "-7000000000000000002",
      "-7000000000000000003",
      "-7000000000000000004",
    ]);
    expect(parseJobs("null")).toEqual([]);
  });

  it("maps a job as the legacy did", () => {
    expect(toDraft(SEARCH.jobs[0], "es")).toEqual({
      source: "jooble",
      sourceId: "-7000000000000000001",
      title: "Ingeniero de procesos",
      company: "Ebro Componentes SL",
      location: "Zaragoza",
      country: "es",
      city: "",
      remote: false,
      url: "https://jooble.org/desc/-7000000000000000001",
      description:
        "...buscamos un ingeniero de procesos para planta de automoción...",
      posted: "2026-11-14",
      occupationCodes: {},
      language: "es",
    });
    expect(toDraft({ id: 1 }, "fi").language).toBe("en");
  });

  it("asks the second page only after a full first one", async () => {
    const { http } = await run({ JOOBLE_KEYS: "es=K1" }, (body) =>
      body.keywords === "ingeniero" && body.page === 1
        ? { jobs: Array.from({ length: 20 }, (_, n) => job(n)) }
        : { jobs: [job(99)] },
    );
    expect(
      http.requests.map(
        (request) => JSON.parse(request.options.body ?? "").page,
      ),
    ).toEqual([1, 2, 1, 1]);
  });

  it("asks only the countries with a key when Jooble gives one per country", async () => {
    expect(keysOf({ JOOBLE_KEYS: "es=K1, de=K2,bad" })).toEqual({
      one: "",
      perCountry: { es: "K1", de: "K2" },
    });
    const { http } = await run({ JOOBLE_KEYS: "es=K1,de=K2" }, () => SEARCH);
    expect([...new Set(http.requests.map((request) => request.url))]).toEqual([
      "https://jooble.org/api/K1",
      "https://jooble.org/api/K2",
    ]);
    expect([
      ...new Set(
        http.requests.map(
          (request) => JSON.parse(request.options.body ?? "").location,
        ),
      ),
    ]).toEqual(["Spain", "Germany"]);
  });

  it("spends only what is left of the day's 200 calls", async () => {
    const { http, remembered } = await run({ JOOBLE_KEY: "k" }, () => SEARCH, {
      day: TODAY,
      calls: CALLS_A_DAY - 5,
    });
    expect(http.requests).toHaveLength(5);
    expect(remembered).toEqual({ day: TODAY, calls: CALLS_A_DAY });
    const yesterday = await run({ JOOBLE_KEY: "k" }, () => SEARCH, {
      day: "2026-11-16",
      calls: CALLS_A_DAY,
    });
    expect(yesterday.http.requests).toHaveLength(60);
  });

  it("stops at the first too many requests, and goes on past another failure without logging the key", async () => {
    const limited = await run({ JOOBLE_KEY: "k" }, (_, call) =>
      call === 3
        ? new HttpFailure(
            "rate-limited",
            "https://jooble.org/api/[key]",
            1,
            429,
          )
        : SEARCH,
    );
    expect(limited.http.requests).toHaveLength(3);
    expect(
      limited.logged.some((line) => /rate-limited, the rest waits/.test(line)),
    ).toBe(true);
    const failing = await run({ JOOBLE_KEY: "secret-key" }, (_, call) =>
      call === 1
        ? new HttpFailure("server-error", "https://jooble.org/api/x", 3, 503)
        : SEARCH,
    );
    expect(failing.http.requests).toHaveLength(60);
    expect(failing.logged[0]).toBe("es ingeniero p1: server-error (HTTP 503)");
    expect(failing.logged.join("\n")).not.toContain("secret-key");
  });

  it("keeps only adverts of the last thirty days", async () => {
    const { drafts } = await run({ JOOBLE_KEY: "k" }, () => SEARCH);
    expect(drafts.map((draft) => draft.posted)).toEqual([
      "2026-11-14",
      "2026-11-02",
    ]);
  });

  it("is an intermediary read with one of its two keys", () => {
    expect(jooble.definition).toMatchObject({
      kind: "via",
      credentialVariables: [["JOOBLE_KEY", "JOOBLE_KEYS"]],
      licence: { credit: "via Jooble" },
    });
  });
});
