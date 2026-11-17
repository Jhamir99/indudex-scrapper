import { describe, expect, it } from "vitest";
import {
  checkAdapterContract,
  loadFixtureRoutes,
} from "../../../../../test/contract/adapter-contract.js";
import { FakeHttpClient } from "../../../../../test/fakes/http-client.js";
import {
  fakeContext,
  fakeDraft,
  readDrafts,
} from "../../../../../test/fakes/source-adapter.js";
import type { SourceMemory } from "../../../crawl-core/ports.js";
import {
  feedUrl,
  netempregos,
  NEWEST,
  parseFeed,
  sliceOf,
} from "./netempregos.js";

const item = (id: string) =>
  `<item><title>Técnico ${id}</title><link>https://www.net-empregos.com/${id}/tecnico/</link><description><![CDATA[<b>Zona: </b>Lisboa<br><b>Data: </b>10-11-2026<br><b>Descrição: </b>x]]></description></item>`;
const feed = (...ids: string[]) =>
  `<rss><channel>${ids.map(item).join("")}</channel></rss>`;

function pass(
  http: FakeHttpClient,
  memory: SourceMemory | undefined,
  previous = [] as ReturnType<typeof fakeDraft>[],
) {
  let remembered: SourceMemory | undefined;
  return readDrafts(
    netempregos,
    fakeContext({
      http,
      memory,
      previous,
      today: "2026-11-16",
      remember: (value) => (remembered = value),
    }),
  ).then((drafts) => ({ drafts, remembered }));
}

describe("netempregos (public-feeds FR-1, FR-6)", () => {
  it("is ported disabled and flagged", () => {
    expect(netempregos.definition.disabledReason).toMatch(
      /terms forbid any commercial end/,
    );
  });

  it("maps the documented feed format into valid adverts", async () => {
    expect(
      await checkAdapterContract(
        netempregos,
        await loadFixtureRoutes("netempregos"),
      ),
    ).toEqual([]);
  });

  it("maps an item: employer, district, day, text and category; anywhere and abroad", async () => {
    const xml = (await loadFixtureRoutes("netempregos"))[NEWEST] as string;
    const [porto, anywhere, abroad] = parseFeed(xml);
    expect(porto).toMatchObject({
      sourceId: "9100001",
      title: "Técnico de Manutenção Industrial",
      company: "Exemplo Indústria, Lda",
      city: "Porto",
      location: "Porto, Portugal",
      posted: "2026-11-09",
      description:
        "Manutenção preventiva e corretiva de equipamentos.\nExperiência com PLC.\nEngenharia ( Mecânica )",
    });
    expect(anywhere).toMatchObject({ city: "", location: "Portugal" });
    expect(abroad).toMatchObject({ city: "", location: "Angola" });
  });

  it("reads the next sixth of the categories each pass", async () => {
    const http = new FakeHttpClient({ [NEWEST]: feed("1") });
    const { remembered } = await pass(http, { slice: 0, offers: {} });
    expect(remembered).toMatchObject({ slice: 1 });
    expect(http.requests.map((r) => r.url)).toEqual([
      ...sliceOf(1).map(feedUrl),
      NEWEST,
    ]);
  });

  it("closes an offer a category feed with room no longer holds, keeps others 30 days", async () => {
    const category = feedUrl(sliceOf(1)[0]!);
    const http = new FakeHttpClient({
      [NEWEST]: feed("1"),
      [category]: feed("2"),
    });
    const memory = {
      slice: 0,
      offers: {
        "3": { listing: category, full: false },
        "4": { listing: feedUrl(99), full: false },
      },
    };
    const previous = [
      fakeDraft("netempregos", "3", { posted: "2026-11-10" }),
      fakeDraft("netempregos", "4", { posted: "2026-11-10" }),
      fakeDraft("netempregos", "5", { posted: "2026-10-01" }),
    ];

    const { drafts, remembered } = await pass(http, memory, previous);

    expect(drafts.map((d) => d.sourceId)).toEqual(["2", "1", "4"]);
    expect(remembered).toMatchObject({
      offers: { "2": { listing: category, full: false } },
    });
  });

  it("fails when no feed answers", async () => {
    await expect(pass(new FakeHttpClient(), undefined)).rejects.toThrow(
      "no feed answered",
    );
  });
});
