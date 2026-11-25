import { describe, expect, it } from "vitest";
import {
  checkAdapterContract,
  loadFixtureRoutes,
} from "../../../../../test/contract/adapter-contract.js";
import {
  fakeContext,
  readDrafts,
} from "../../../../../test/fakes/source-adapter.js";
import { HttpFailure } from "../../../../shared/http/http-failure.js";
import type {
  AdvertDraft,
  HttpClient,
  SourceMemory,
} from "../../../crawl-core/ports.js";
import {
  adzuna,
  CALLS_A_DAY,
  CALLS_A_MONTH,
  categoriesOf,
  detailsUrl,
  planOf,
  toDraft,
} from "./adzuna.js";

const TODAY = "2026-11-17";

// A server that answers every search; `answer` decides by the address and the call's number.
function server(answer: (url: URL, call: number) => unknown) {
  const requests: URL[] = [];
  const http: HttpClient = {
    async request(url) {
      const address = new URL(url);
      requests.push(address);
      const reply = answer(address, requests.length);
      if (reply instanceof Error) throw reply;
      return { status: 200, url, headers: {}, body: JSON.stringify(reply) };
    },
  };
  return { http, requests };
}
const ad = (n: number, created = "2026-11-16T08:00:00Z") => ({
  id: String(n),
  title: `Ingeniero ${n}`,
  redirect_url: `https://www.adzuna.es/land/ad/${n}?se=x`,
  created,
});
async function run(
  answer: (url: URL, call: number) => unknown,
  fields: { memory?: SourceMemory; previous?: AdvertDraft[] } = {},
) {
  const { http, requests } = server(answer);
  let remembered: SourceMemory | undefined;
  const logged: string[] = [];
  const drafts = await readDrafts(
    adzuna,
    fakeContext({
      http,
      credentials: { ADZUNA_APP_ID: "the-id", ADZUNA_APP_KEY: "the-key" },
      today: TODAY,
      memory: fields.memory,
      previous: fields.previous ?? [],
      remember: (value) => {
        remembered = value;
      },
      log: (line) => logged.push(line),
    }),
  );
  return { drafts, requests, remembered, logged };
}
const asked = (requests: readonly URL[]) =>
  requests.map(
    (url) =>
      `${url.pathname.split("/")[4]} ${url.searchParams.get("category")} p${url.pathname.split("/")[6]} ${url.searchParams.get("max_days_old")}d`,
  );

describe("adzuna (credentialed sources FR-6)", () => {
  it("maps the saved answers into valid adverts", async () => {
    expect(
      await checkAdapterContract(adzuna, await loadFixtureRoutes("adzuna")),
    ).toEqual([]);
  });

  it("passes the legacy's own cases (test/builder.test.mjs)", () => {
    const draft = toDraft(
      {
        id: 5178901,
        title: "Ingeniero de procesos",
        company: { display_name: "Acme SL" },
        location: {
          display_name: "Getafe, Madrid",
          area: ["España", "Comunidad de Madrid", "Madrid", "Getafe"],
        },
        redirect_url:
          "https://www.adzuna.es/land/ad/5178901?se=abc&utm_medium=api",
        description: "Se busca ingeniero con 3 años.",
        created: "2026-09-05T08:00:00Z",
      },
      "es",
    );
    expect([
      draft.title,
      draft.company,
      draft.location,
      draft.city,
      draft.country,
      draft.url,
      draft.posted,
      draft.language,
    ]).toEqual([
      "Ingeniero de procesos",
      "Acme SL",
      "Getafe, Madrid",
      "Getafe",
      "es",
      "https://www.adzuna.es/details/5178901",
      "2026-09-05",
      "es",
    ]);
    expect(detailsUrl("https://example.com/x", "1")).toBe(
      "https://example.com/x",
    );
    expect(categoriesOf("es")).toEqual([
      "engineering-jobs",
      "it-jobs",
      "maintenance-jobs",
      "manufacturing-jobs",
      "trade-construction-jobs",
    ]);
    expect(categoriesOf("de")).toEqual(["engineering-jobs", "it-jobs"]);
    expect(planOf("es", "maintenance-jobs", {}, false)).toEqual({
      fill: true,
      pages: 20,
      days: 30,
    });
    expect(
      planOf(
        "es",
        "maintenance-jobs",
        { "es/maintenance-jobs": "2026-10-17" },
        false,
      ),
    ).toEqual({ fill: false, pages: 4, days: 3 });
    expect(
      [
        planOf("es", "engineering-jobs", {}, false),
        planOf("de", "it-jobs", {}, false),
        planOf("gb", "it-jobs", {}, false),
      ].map((plan) => [plan.fill, plan.pages, plan.days]),
    ).toEqual([
      [false, 4, 3],
      [false, 10, 3],
      [false, 2, 3],
    ]);
    expect(planOf("es", "manufacturing-jobs", {}, true)).toEqual({
      fill: true,
      pages: 120,
      days: 30,
    });
  });

  it("keeps the employer's own pay, never Adzuna's estimate, with contract and hours", () => {
    const stated = toDraft(
      {
        ...ad(1),
        contract_type: "permanent",
        contract_time: "full_time",
        salary_min: 30000,
        salary_max: 36000,
        salary_is_predicted: "0",
      },
      "gb",
    );
    expect(stated).toMatchObject({
      contract: "permanent",
      hours: "full_time",
      pay: { min: 30000, max: 36000, currency: "GBP" },
    });
    const estimated = toDraft(
      { ...ad(2), salary_min: 30000, salary_is_predicted: "1" },
      "es",
    );
    expect(estimated.pay).toBeUndefined();
    expect(estimated.contract).toBeUndefined();
    expect(
      toDraft({ ...ad(3), salary_min: 30000, salary_is_predicted: 0 }, "es")
        .pay,
    ).toEqual({ min: 30000, max: 30000, currency: "EUR" });
  });

  it("reads Spain deep while it keeps fewer than a thousand, each new category once for its month, and remembers", async () => {
    const { requests, remembered } = await run(() => ({ results: [ad(1)] }));
    expect(asked(requests).slice(0, 7)).toEqual([
      "es engineering-jobs p1 30d",
      "es it-jobs p1 30d",
      "es maintenance-jobs p1 30d",
      "es manufacturing-jobs p1 30d",
      "es trade-construction-jobs p1 30d",
      "de engineering-jobs p1 3d",
      "de it-jobs p1 3d",
    ]);
    expect(requests).toHaveLength(5 + 9 * 2);
    expect(requests[0]?.searchParams.get("app_key")).toBe("the-key");
    expect(remembered).toEqual({
      day: TODAY,
      calls: 23,
      month: "2026-11",
      monthCalls: 23,
      filled: {
        "es/maintenance-jobs": TODAY,
        "es/manufacturing-jobs": TODAY,
        "es/trade-construction-jobs": TODAY,
      },
    });
  });

  it("asks the next page only after a full one, and drops adverts past thirty days", async () => {
    const { requests, drafts } = await run(
      (url) =>
        url.pathname.startsWith("/v1/api/jobs/de/search/") &&
        url.searchParams.get("category") === "engineering-jobs" &&
        url.pathname.endsWith("/1")
          ? {
              results: [
                ...Array.from({ length: 49 }, (_, n) => ad(100 + n)),
                ad(999, "2026-10-01T08:00:00Z"),
              ],
            }
          : { results: [ad(1)] },
      {
        previous: Array.from({ length: 1000 }, (_, n) => ({
          ...toDraft(ad(n), "es"),
        })),
      },
    );
    expect(asked(requests).filter((line) => line.startsWith("de "))).toEqual([
      "de engineering-jobs p1 3d",
      "de engineering-jobs p2 3d",
      "de it-jobs p1 3d",
    ]);
    // Spain keeps a thousand already: no deep read, four pages a day, its new categories still once whole.
    expect(asked(requests)[0]).toBe("es engineering-jobs p1 3d");
    expect(drafts.filter((draft) => draft.country === "de")).toHaveLength(49);
  });

  it("stays within the day's 200 calls and the month's 2,400", async () => {
    const day = await run(() => ({ results: [ad(1)] }), {
      memory: {
        day: TODAY,
        calls: CALLS_A_DAY - 3,
        month: "2026-11",
        monthCalls: 100,
        filled: {},
      },
    });
    expect(day.requests).toHaveLength(3);
    const month = await run(() => ({ results: [ad(1)] }), {
      memory: {
        day: "2026-11-16",
        calls: CALLS_A_DAY,
        month: "2026-11",
        monthCalls: CALLS_A_MONTH - 2,
        filled: {},
      },
    });
    expect(month.requests).toHaveLength(2);
    expect(month.remembered).toMatchObject({
      day: TODAY,
      calls: 2,
      monthCalls: CALLS_A_MONTH,
    });
  });

  it("stops at the first too many requests, and logs another failure without the keys", async () => {
    const limited = await run((_, call) =>
      call === 2
        ? new HttpFailure("rate-limited", "https://api.adzuna.com/x", 1, 429)
        : { results: [ad(1)] },
    );
    expect(limited.requests).toHaveLength(2);
    expect(limited.logged.some((line) => line.includes("rate-limited"))).toBe(
      true,
    );
    const failing = await run((_, call) =>
      call === 3
        ? new HttpFailure("server-error", "https://api.adzuna.com/x", 3, 502)
        : { results: [ad(1)] },
    );
    expect(failing.logged[0]).toBe(
      "es maintenance-jobs p1: server-error (HTTP 502)",
    );
    expect(failing.logged.join("\n")).not.toMatch(/the-key|the-id/);
    // A category that failed is not taken as read whole.
    expect(
      (failing.remembered as { filled: Record<string, string> }).filled,
    ).not.toHaveProperty("es/maintenance-jobs");
  });

  it("is ported flagged: its terms and its robots.txt keep it off whatever keys are set", () => {
    expect(adzuna.definition).toMatchObject({
      kind: "via",
      credentialVariables: ["ADZUNA_APP_ID", "ADZUNA_APP_KEY"],
      licence: { credit: "Jobs by Adzuna" },
    });
    expect(adzuna.definition.disabledReason).toMatch(/licence agreement/);
    expect(adzuna.definition.disabledReason).toMatch(/robots\.txt/);
  });
});
