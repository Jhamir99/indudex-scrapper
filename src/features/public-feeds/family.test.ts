import { describe, expect, it } from "vitest";
import { FakeHttpClient } from "../../../test/fakes/http-client.js";
import {
  fakeContext,
  fakeDefinition,
  fakeDraft,
  readDrafts,
} from "../../../test/fakes/source-adapter.js";
import { HttpFailure } from "../../shared/http/http-failure.js";
import { publicFeed, stillOpen } from "./family.js";

const FEED = "https://feed.example/jobs.xml";
const PAGE_1 = "https://feed.example/jobs?category=1";
const PAGE_2 = "https://feed.example/jobs?category=2";

// Each page's body names its source ids: "1,2".
const parseIds = (body: string) =>
  body ? body.split(",").map((id) => fakeDraft("feed", id)) : [];

describe("publicFeed family (FR-2)", () => {
  it("asks for the feed once and yields its mapped adverts", async () => {
    const http = new FakeHttpClient({ [FEED]: "1,2" });
    const logs: string[] = [];
    const adapter = publicFeed({
      definition: fakeDefinition("feed"),
      pages: [FEED],
      request: { headers: { accept: "application/xml" } },
      parse: parseIds,
    });

    const drafts = await readDrafts(
      adapter,
      fakeContext({ http, log: (m) => logs.push(m) }),
    );

    expect(drafts.map((draft) => draft.sourceId)).toEqual(["1", "2"]);
    expect(http.requests).toEqual([
      { url: FEED, options: { headers: { accept: "application/xml" } } },
    ]);
    expect(logs).toEqual(["2 adverts in the feed"]);
  });

  it("fails when the feed holds no advert", async () => {
    const http = new FakeHttpClient({ [FEED]: "" });
    const adapter = publicFeed({
      definition: fakeDefinition("feed"),
      pages: [FEED],
      parse: parseIds,
    });

    await expect(readDrafts(adapter, fakeContext({ http }))).rejects.toThrow(
      "the feed holds no advert",
    );
  });

  it("reads every page and yields an advert listed twice once", async () => {
    const http = new FakeHttpClient({ [PAGE_1]: "1,2", [PAGE_2]: "2,3" });
    const adapter = publicFeed({
      definition: fakeDefinition("feed"),
      pages: [PAGE_1, PAGE_2],
      parse: parseIds,
    });

    const drafts = await readDrafts(adapter, fakeContext({ http }));

    expect(drafts.map((draft) => draft.sourceId)).toEqual(["1", "2", "3"]);
  });

  it("fails on a failing page unless failed pages are skipped", async () => {
    const refused = new HttpFailure("client-error", PAGE_1, 1, 403);
    const http = new FakeHttpClient({ [PAGE_1]: refused, [PAGE_2]: "3" });
    const definition = fakeDefinition("feed");
    const strict = publicFeed({
      definition,
      pages: [PAGE_1, PAGE_2],
      parse: parseIds,
    });
    const lenient = publicFeed({
      definition,
      pages: [PAGE_1, PAGE_2],
      parse: parseIds,
      skipFailedPages: true,
    });
    const logs: string[] = [];

    await expect(readDrafts(strict, fakeContext({ http }))).rejects.toBe(
      refused,
    );
    const drafts = await readDrafts(
      lenient,
      fakeContext({ http, log: (m) => logs.push(m) }),
    );
    expect(drafts.map((draft) => draft.sourceId)).toEqual(["3"]);
    expect(logs[0]).toBe(`skipped a page: ${refused.message}`);
  });

  it("fails when no page answers, even when failed pages are skipped", async () => {
    const http = new FakeHttpClient({ [PAGE_1]: new Error("down") });
    const adapter = publicFeed({
      definition: fakeDefinition("feed"),
      pages: [PAGE_1],
      parse: parseIds,
      skipFailedPages: true,
    });

    await expect(readDrafts(adapter, fakeContext({ http }))).rejects.toThrow(
      "no page of the feed answered",
    );
  });

  it("keeps earlier adverts no longer listed while they are open", async () => {
    const http = new FakeHttpClient({ [FEED]: "1" });
    const adapter = publicFeed({
      definition: fakeDefinition("feed"),
      pages: [FEED],
      parse: parseIds,
      keepUnlisted: true,
    });
    const previous = [
      fakeDraft("feed", "1", { title: "Old title" }),
      fakeDraft("feed", "open", { expires: "2026-11-16" }),
      fakeDraft("feed", "closed", { expires: "2026-11-15" }),
      fakeDraft("feed", "recent", { posted: "2026-10-17" }),
      fakeDraft("feed", "stale", { posted: "2026-10-16" }),
    ];

    const drafts = await readDrafts(
      adapter,
      fakeContext({ http, previous, today: "2026-11-16" }),
    );

    expect(drafts.map((draft) => [draft.sourceId, draft.title])).toEqual([
      ["1", "Electrical engineer 1"],
      ["open", "Electrical engineer open"],
      ["recent", "Electrical engineer recent"],
    ]);
  });
});

describe("stillOpen", () => {
  it("drops an earlier advert without a posted day or last day", () => {
    const { posted: _posted, ...undated } = fakeDraft("feed", "undated");
    expect(stillOpen([undated], new Map(), "2026-11-16")).toEqual([]);
  });
});
