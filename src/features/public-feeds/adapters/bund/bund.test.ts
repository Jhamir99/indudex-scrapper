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
import { bund } from "./bund.js";

describe("bund (public-feeds FR-1, FR-6)", () => {
  it("is ported disabled and flagged", () => {
    expect(bund.definition.disabledReason).toMatch(/asks prior consent/);
  });

  it("maps the documented format into valid adverts", async () => {
    expect(
      await checkAdapterContract(bund, await loadFixtureRoutes("bund")),
    ).toEqual([]);
  });

  it("maps an item and adds its page's facts, the newest first", async () => {
    const drafts = await readDrafts(
      bund,
      fakeContext({
        http: new FakeHttpClient(await loadFixtureRoutes("bund")),
      }),
    );
    expect(drafts[0]).toMatchObject({
      sourceId: "6661807",
      title: "Ingenieurin / Ingenieur (m/w/d) Elektrotechnik",
      company: "Bundesamt für Beispiele",
      city: "Cloppenburg",
      location: "Cloppenburg, Deutschland",
      posted: "2026-11-16",
      expires: "2026-11-30",
      description:
        "Arbeitszeit: Vollzeit oder Teilzeit\nAnstellungsdauer: Unbefristet\nBewerbungsfrist: 30.11.2026",
    });
    expect(drafts[1]).toMatchObject({
      sourceId: "B7506113A-2026-00005066-B",
      city: "Berlin",
      description: "",
    });
  });
});
