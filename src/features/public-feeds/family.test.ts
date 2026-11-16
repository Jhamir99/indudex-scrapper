import { describe, expect, it } from "vitest";
import { FakeHttpClient } from "../../../test/fakes/http-client.js";
import {
  fakeDefinition,
  fakeDraft,
} from "../../../test/fakes/source-adapter.js";
import type { AdvertDraft } from "../crawl-core/ports.js";
import { publicFeed } from "./family.js";

const FEED = "https://feed.example/jobs.xml";

async function readAll(iterable: AsyncIterable<AdvertDraft>) {
  const drafts: AdvertDraft[] = [];
  for await (const draft of iterable) drafts.push(draft);
  return drafts;
}

describe("publicFeed family (FR-2)", () => {
  it("asks for the feed once and yields its mapped adverts", async () => {
    const http = new FakeHttpClient({ [FEED]: "<jobs>2</jobs>" });
    const logs: string[] = [];
    const adapter = publicFeed({
      definition: fakeDefinition("feed"),
      url: FEED,
      request: { headers: { accept: "application/xml" } },
      parse: (body) =>
        body === "<jobs>2</jobs>"
          ? [fakeDraft("feed", "1"), fakeDraft("feed", "2")]
          : [],
    });

    const drafts = await readAll(
      adapter.fetchAdverts({ http, credentials: {}, log: (m) => logs.push(m) }),
    );

    expect(drafts.map((draft) => draft.sourceId)).toEqual(["1", "2"]);
    expect(http.requests).toEqual([
      { url: FEED, options: { headers: { accept: "application/xml" } } },
    ]);
    expect(logs).toEqual(["2 adverts in the feed"]);
  });

  it("fails when the feed holds no advert", async () => {
    const http = new FakeHttpClient({ [FEED]: "<html>maintenance</html>" });
    const adapter = publicFeed({
      definition: fakeDefinition("feed"),
      url: FEED,
      parse: () => [],
    });

    await expect(
      readAll(adapter.fetchAdverts({ http, credentials: {}, log: () => {} })),
    ).rejects.toThrow("the feed holds no advert");
  });
});
