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
import { karrierenrw, pageUrl, parsePage } from "./karrierenrw.js";

const page = (pages: number, from: number) =>
  JSON.stringify({
    pages,
    items: [
      {
        uuid: `u${from}`,
        title: "Ingenieur (w/m/d)",
        jobtype: "joboffer",
        location: "Köln",
      },
      { uuid: `a${from}`, title: "Ausbildung", jobtype: "apprenticeship" },
    ],
  });

describe("karrierenrw (public-feeds FR-1)", () => {
  it("maps the saved page into valid adverts", async () => {
    expect(
      await checkAdapterContract(
        karrierenrw,
        await loadFixtureRoutes("karrierenrw"),
      ),
    ).toEqual([]);
  });

  it("maps a job offer and leaves other kinds out", () => {
    const { drafts } = parsePage(
      JSON.stringify({
        pages: 1,
        items: [
          {
            uuid: "0863c147",
            title: "Lehrkraft für besondere Aufgaben (w/m/d)",
            jobtype: "joboffer",
            authority: "Hochschule Niederrhein",
            location: "Mönchengladbach",
            published: "2026-11-16",
            deadline: "2026-11-29",
          },
          { uuid: "x", title: "Ausbildung", jobtype: "apprenticeship" },
        ],
      }),
    );
    expect(drafts).toEqual([
      expect.objectContaining({
        sourceId: "0863c147",
        company: "Hochschule Niederrhein",
        location: "Mönchengladbach, Nordrhein-Westfalen, Deutschland",
        url: "https://karriere.nrw/stellenausschreibung/0863c147",
        posted: "2026-11-16",
        expires: "2026-11-29",
      }),
    ]);
  });

  it("reads every page, skips one that fails, and fails when a tenth do not answer", async () => {
    const http = new FakeHttpClient();
    for (let n = 1; n <= 20; n++) http.route(pageUrl(n), page(20, n));
    http.route(pageUrl(7), new Error("down"));
    expect(await readDrafts(karrierenrw, fakeContext({ http }))).toHaveLength(
      19,
    );

    http.route(pageUrl(8), new Error("down"));
    http.route(pageUrl(9), new Error("down"));
    await expect(
      readDrafts(karrierenrw, fakeContext({ http })),
    ).rejects.toThrow("17 pages read of the 20 it counts");
  });
});
