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
import { linz } from "./linz.js";

describe("linz (public-feeds FR-1)", () => {
  it("maps the saved feed into valid adverts", async () => {
    expect(
      await checkAdapterContract(linz, await loadFixtureRoutes("linz")),
    ).toEqual([]);
  });

  it("places every vacancy in Linz and names the unit with the city", async () => {
    const [first] = await readDrafts(
      linz,
      fakeContext({
        http: new FakeHttpClient(await loadFixtureRoutes("linz")),
      }),
    );
    expect(first).toMatchObject({
      sourceId: "3137",
      title: "Jurist*in für die Rechtsvertretung Kinder und Jugendlicher",
      company: "Stadt Linz, Kinder- und Jugendhilfe",
      city: "Linz",
      location: "Linz, Österreich",
      url: "https://jobs.linz.at/job/3137?referrer=Homepage",
    });
  });
});
