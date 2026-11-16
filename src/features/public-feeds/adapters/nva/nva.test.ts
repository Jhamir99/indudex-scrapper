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
import {
  CATALOGUE,
  cityOf,
  newestCsv,
  nva,
  parseCsv,
  parseNva,
} from "./nva.js";

describe("nva (public-feeds FR-1)", () => {
  it("maps the saved answers into valid adverts", async () => {
    expect(
      await checkAdapterContract(nva, await loadFixtureRoutes("nva")),
    ).toEqual([]);
  });

  it("maps a row's fields", async () => {
    const drafts = await readDrafts(
      nva,
      fakeContext({ http: new FakeHttpClient(await loadFixtureRoutes("nva")) }),
    );
    expect(drafts).toHaveLength(3);
    expect(drafts[0]).toEqual({
      source: "nva",
      sourceId: "261110-138",
      title: "SĒTNIEKS",
      company: "",
      location: "Riekstu iela 2, Lielvārde, Ogres nov., Latvija",
      country: "lv",
      city: "Lielvārde",
      remote: false,
      url: "https://cvvp.nva.gov.lv/#/pub/vakances/468950380",
      description: "Izglītība / Zinātne",
      posted: "2026-11-10",
      expires: "2026-12-01",
      occupationCodes: {},
      language: "lv",
    });
  });

  it("reads quoted fields, doubled quotes and line breaks in quotes", () => {
    expect(parseCsv('﻿a,b\r\n"x, y","say ""hi""\nthere"\n')).toEqual([
      ["a", "b"],
      ["x, y", 'say "hi"\nthere'],
    ]);
    expect(
      cityOf("Stadiona iela 10, Ozolnieki, Ozolnieku pag., Jelgavas nov."),
    ).toBe("Ozolnieki");
  });

  it("reports a file without one of its columns as a changed format", () => {
    expect(() => parseNva("Vakances_Nr,Vieta\n1,Rīga\n")).toThrow(
      /NVA's file has no /,
    );
  });

  it("takes the newest CSV of the catalogue and fails without one", async () => {
    const catalogue = JSON.stringify({
      result: {
        resources: [
          {
            format: "CSV",
            url: "https://data.gov.lv/old.csv",
            last_modified: "2026-11-14",
          },
          {
            format: "CSV",
            url: "https://data.gov.lv/new.csv",
            last_modified: "2026-11-15",
          },
          {
            format: "XLSX",
            url: "https://data.gov.lv/new.xlsx",
            last_modified: "2026-11-16",
          },
        ],
      },
    });
    expect(newestCsv(catalogue)).toBe("https://data.gov.lv/new.csv");
    const http = new FakeHttpClient({
      [CATALOGUE]: '{"result":{"resources":[]}}',
    });
    await expect(readDrafts(nva, fakeContext({ http }))).rejects.toThrow(
      "no CSV in the NVA catalogue entry",
    );
  });
});
