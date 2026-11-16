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
import { cyprus, occupationOptions, parseResults, SEARCH } from "./cyprus.js";

describe("cyprus (public-feeds FR-1, FR-7)", () => {
  it("maps the saved search into valid adverts", async () => {
    expect(
      await checkAdapterContract(cyprus, await loadFixtureRoutes("cyprus")),
    ).toEqual([]);
  });

  it("searches only our occupations and keeps the group each vacancy was found under", async () => {
    const http = new FakeHttpClient(await loadFixtureRoutes("cyprus"));
    const drafts = await readDrafts(cyprus, fakeContext({ http }));

    const posts = http.requests.filter(
      (request) => request.options.method === "POST",
    );
    expect(posts).toHaveLength(1);
    expect(
      new URLSearchParams(posts[0]?.options.body).get("OccupationCode"),
    ).toBe("580");
    expect(drafts).toHaveLength(3);
    expect(drafts[0]).toMatchObject({
      source: "cyprus",
      country: "cy",
      location: "Κύπρος",
      occupationCodes: { isco: "2142" },
      language: "el",
    });
    expect(drafts[0]?.url).toMatch(
      /^https:\/\/pescps\.dl\.mlsi\.gov\.cy\/CPSWeb\/candidate\/f006w1\?PK=\d+$/,
    );
  });

  it("maps a row: a Greek title in capitals as a sentence, its day", () => {
    const html = `<td id="7_VACANCY_ID_REF"><a href="./f006w1?PK=98929755">344312</a></td><td id="7_JOB_TITLE">ΠΟΛΙΤΙΚΟΣ ΜΗΧΑΝΙΚΟΣ</td><td id="7_VACANCY_CREATION_DATE">09/11/2026</td>JobMatching_numRows=1`;
    expect(parseResults(html, "2142")).toEqual({
      found: 1,
      drafts: [
        expect.objectContaining({
          sourceId: "344312",
          title: "Πολιτικος μηχανικος",
          posted: "2026-11-09",
        }),
      ],
    });
  });

  it("reads the occupation filter's options and fails when none is ours", async () => {
    expect(
      occupationOptions(
        '<select name="OccupationCode"><option value="580">2142 - Πολιτικοί μηχανικοί</option></select>',
      ),
    ).toEqual([{ value: "580", isco: "2142" }]);
    const http = new FakeHttpClient({
      [SEARCH]: '<select name="OccupationCode"></select>',
    });
    await expect(readDrafts(cyprus, fakeContext({ http }))).rejects.toThrow(
      "the search page lists none of our occupations",
    );
  });
});
