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
import { ifgat, SEARCH } from "./ifgat.js";

describe("ifgat (public-feeds FR-1)", () => {
  it("maps the saved search into valid adverts", async () => {
    expect(
      await checkAdapterContract(ifgat, await loadFixtureRoutes("ifgat")),
    ).toEqual([]);
  });

  it("maps a dataset: the post after the unit, the body and its town, the body's page", async () => {
    const [draft] = await readDrafts(
      ifgat,
      fakeContext({
        http: new FakeHttpClient(await loadFixtureRoutes("ifgat")),
      }),
    );
    expect(draft).toMatchObject({
      title: expect.stringMatching(/^Gehobener Verwaltungsdienst in Teilbes/),
      company:
        "Land Kärnten, Bildungsdirektion für Kärnten - Abteilung Präs/2 - Budget, Wirtschaft und Recht",
      city: "Klagenfurt am Wörthersee",
      location: "Klagenfurt am Wörthersee, Österreich",
      url: "https://www.ktn.gv.at/Service/Stellenausschreibungen/Details?id=182",
      posted: "2026-04-30",
    });
    expect(SEARCH).toContain("ifg-stellenausschreibungen");
  });
});
