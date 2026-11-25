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
import { activeAds, FEED, nav } from "./nav.js";

const entry = (
  uuid: string,
  status: string,
  fields: Record<string, string> = {},
) => ({
  date_modified: "2026-11-12T08:15:00Z",
  _feed_entry: { uuid, status, title: "Elektriker", ...fields },
});

describe("nav (credentialed sources FR-3)", () => {
  it("maps the saved feed into valid adverts", async () => {
    expect(
      await checkAdapterContract(nav, await loadFixtureRoutes("nav")),
    ).toEqual([]);
  });

  it("follows next_url with the token, and asks the first page for six months", async () => {
    const http = new FakeHttpClient(await loadFixtureRoutes("nav"));
    const drafts = await readDrafts(
      nav,
      fakeContext({
        http,
        credentials: { NAV_TOKEN: "a-token" },
        today: "2026-11-17",
      }),
    );
    expect(http.requests.map((request) => request.url)).toEqual([
      FEED,
      `${FEED}/2f6a1c3e-0000-4000-8000-000000000002`,
    ]);
    expect(http.requests[0]?.options?.headers).toEqual({
      Authorization: "Bearer a-token",
      "If-Modified-Since": "Mon, 18 May 2026 00:00:00 GMT",
    });
    expect(http.requests[1]?.options?.headers).toEqual({
      Authorization: "Bearer a-token",
    });
    expect(drafts.map((draft) => [draft.title, draft.city])).toEqual([
      ["Elektriker", "Sør-Odal"],
      ["Automasjonstekniker", ""],
    ]);
    expect(drafts[0]).toMatchObject({
      source: "nav",
      sourceId: "6b1d2e3f-1111-4aaa-8bbb-000000000001",
      company: "Fjordkraft Elektro AS",
      location: "Sør-Odal, Norway",
      country: "no",
      url: "https://arbeidsplassen.nav.no/stillinger/stilling/6b1d2e3f-1111-4aaa-8bbb-000000000001",
      posted: "2026-11-12",
      language: "no",
      description: "",
    });
    expect(drafts[1]?.location).toBe("Norway");
  });

  it("keeps the last state of each ad: an ad that turned inactive leaves at once", () => {
    expect(
      activeAds([
        entry("a", "ACTIVE"),
        entry("b", "ACTIVE"),
        entry("a", "INACTIVE"),
        entry("c", "INACTIVE"),
        entry("c", "ACTIVE", { municipal: "NORD-AURDAL" }),
        entry("d", "ACTIVE", { title: " " }),
      ]).map((ad) => [ad.sourceId, ad.city]),
    ).toEqual([
      ["b", ""],
      ["c", "Nord-Aurdal"],
    ]);
  });

  it("passes the legacy's own case (test/builder.test.mjs)", () => {
    const ads = activeAds([
      {
        date_modified: "2026-10-01T10:00:00+02:00",
        _feed_entry: {
          uuid: "a",
          status: "ACTIVE",
          title: "Elektriker",
          businessName: "Acme AS",
          municipal: "BERGEN",
        },
      },
      {
        date_modified: "2026-10-02T10:00:00+02:00",
        _feed_entry: {
          uuid: "b",
          status: "ACTIVE",
          title: "Ingeniør",
          businessName: "Bcme AS",
          municipal: "OSLO",
        },
      },
      {
        date_modified: "2026-10-03T10:00:00+02:00",
        _feed_entry: {
          uuid: "b",
          status: "INACTIVE",
          title: "",
          businessName: "",
          municipal: "",
        },
      },
    ]);
    expect([ads.length, ads[0]?.title, ads[0]?.location, ads[0]?.url]).toEqual([
      1,
      "Elektriker",
      "Bergen, Norway",
      "https://arbeidsplassen.nav.no/stillinger/stilling/a",
    ]);
  });

  it("is a keyed feed, read with NAV_TOKEN", () => {
    expect(nav.definition).toMatchObject({
      kind: "feed",
      needsCredentials: true,
      credentialVariables: ["NAV_TOKEN"],
    });
  });

  it("reports an empty feed as a failure", async () => {
    expect(
      await checkAdapterContract(nav, {
        [FEED]: JSON.stringify({ items: [] }),
      }),
    ).toEqual(["fixture read: failed the feed holds no advert"]);
  });
});
