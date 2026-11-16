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
import { COUNTIES, feedUrl, hzz, parseHzz } from "./hzz.js";

const item = (code: string, title: string, description: string) =>
  `<item><title>${title}</title><pubDate>01.11.2026</pubDate><description>${description}</description><link>http://burzarada.hzz.hr/RadnoMjesto_Ispis.aspx?WebSifra=${code}</link></item>`;
const feed = (...items: string[]) =>
  `<?xml version="1.0"?><rss><channel>${items.join("")}</channel></rss>`;

function everyCounty(answer: string | Error): FakeHttpClient {
  const http = new FakeHttpClient();
  for (let county = 1; county <= COUNTIES.length; county++)
    http.route(feedUrl(county), answer);
  return http;
}

describe("hzz (public-feeds FR-1)", () => {
  it("maps the saved feed into valid adverts", async () => {
    expect(
      await checkAdapterContract(hzz, await loadFixtureRoutes("hzz")),
    ).toEqual([]);
  });

  it("maps an item: a title in capitals as a sentence, the town, the days, the text unescaped", () => {
    const [draft] = parseHzz(
      feed(
        item(
          "167920178",
          "- ELEKTROTEHNIČAR - M/Ž",
          "Opis posla: &amp;lt;P&amp;gt;Održavanje&amp;amp;amp;NBSP;postrojenja&amp;lt;/P&amp;gt;, Kategorija: ELEKTROTEHNIKA, Rok za prijavu: 16.11.2026, Mjesto rada: SLAVONSKI BROD, Općina: SLAVONSKI BROD",
        ),
      ),
      "Brodsko-posavska",
    );
    expect(draft).toEqual({
      source: "hzz",
      sourceId: "167920178",
      title: "Elektrotehničar - m/ž",
      company: "",
      location: "Slavonski Brod, Hrvatska",
      country: "hr",
      city: "Slavonski Brod",
      remote: false,
      url: "https://burzarada.hzz.hr/RadnoMjesto_Ispis.aspx?WebSifra=167920178",
      description: expect.stringMatching(
        /^Održavanje postrojenja\n, Kategorija: ELEKTROTEHNIKA, Rok za prijavu/,
      ),
      posted: "2026-11-01",
      expires: "2026-11-16",
      occupationCodes: {},
      language: "hr",
    });
  });

  it("leaves out an item without a title", () => {
    expect(parseHzz(feed(item("1", "", "Opis posla: x")), "Zadarska")).toEqual(
      [],
    );
  });

  it("keeps a county's last adverts when its feed does not answer, and remembers each county's", async () => {
    const http = everyCounty(feed());
    http.route(
      feedUrl(1),
      feed(item("11", "TEHNIČAR", "Opis posla: x, Mjesto rada: BJELOVAR")),
    );
    http.route(feedUrl(2), new Error("down"));
    let remembered: SourceMemory | undefined;
    const drafts = await readDrafts(
      hzz,
      fakeContext({
        http,
        memory: { counties: { "Brodsko-posavska": ["22"] } },
        previous: [fakeDraft("hzz", "22"), fakeDraft("hzz", "gone")],
        remember: (value) => {
          remembered = value;
        },
      }),
    );
    expect(drafts.map((d) => d.sourceId)).toEqual(["11", "22"]);
    expect(remembered).toMatchObject({
      counties: {
        "Bjelovarsko-bilogorska": ["11"],
        "Brodsko-posavska": ["22"],
        Zadarska: [],
      },
    });
  });

  it("fails when no county answers", async () => {
    await expect(
      readDrafts(hzz, fakeContext({ http: everyCounty(new Error("down")) })),
    ).rejects.toThrow("no county answered");
  });
});
