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
import { MUNICIPALITIES, mpsv, toDraft, VACANCIES } from "./mpsv.js";

const units = new Set(["7214", "7212", "7412"]);

describe("mpsv (public-feeds FR-1, FR-7)", () => {
  it("maps the saved answers into valid adverts", async () => {
    expect(
      await checkAdapterContract(mpsv, await loadFixtureRoutes("mpsv")),
    ).toEqual([]);
  });

  it("keeps only our occupations, without CZ-ISCO's non-engineering 2141 groups", async () => {
    const drafts = await readDrafts(
      mpsv,
      fakeContext({
        http: new FakeHttpClient(await loadFixtureRoutes("mpsv")),
      }),
    );
    expect(drafts.map((draft) => draft.sourceId)).toEqual([
      "67257268",
      "67310780",
      "67310745",
    ]);
    expect(drafts[0]).toMatchObject({
      source: "mpsv",
      title: "Montéři kovových konstrukcí (m/ž)",
      company: "NICO CZ s.r.o.",
      location: "Jihlava, Česko",
      country: "cz",
      city: "Jihlava",
      url: "https://up.gov.cz/volna-mista-v-cr/-/vm/67257268",
      occupationCodes: { isco: "7214" },
      language: "cs",
    });
  });

  it("leaves out a vacancy not to be published", () => {
    const vacancy = {
      portalId: 1,
      zverejnovat: { id: "ZverejnovatVpm/ne" },
      profeseCzIsco: { id: "CzIsco/72140" },
      pozadovanaProfese: { cs: "Montér" },
    };
    expect(toDraft(vacancy, new Map(), units)).toBeUndefined();
    expect(
      toDraft(
        { ...vacancy, zverejnovat: { id: "ZverejnovatVpm/anoeu" } },
        new Map(),
        units,
      ),
    ).toMatchObject({ city: "", location: "Česko" });
  });

  it("states its hours from the kind of employment and the weekly hours (advert-facts FR-1)", () => {
    const vacancy = {
      portalId: 2,
      profeseCzIsco: { id: "CzIsco/72140" },
      pozadovanaProfese: { cs: "Montér" },
    };
    const hours = (fields: object) =>
      toDraft({ ...vacancy, ...fields }, new Map(), units)?.hours;
    expect(
      hours({ pracovnePravniVztahy: [{ id: "PracovnePravniVztah/plny" }] }),
    ).toBe("full time");
    expect(
      hours({
        pracovnePravniVztahy: [{ id: "PracovnePravniVztah/zkraceny" }],
        pocetHodinTydne: 20,
      }),
    ).toBe("part time 20 hours");
    expect(
      hours({
        pracovnePravniVztahy: [
          { id: "PracovnePravniVztah/plny" },
          { id: "PracovnePravniVztah/zkraceny" },
        ],
      }),
    ).toBeUndefined();
  });

  it("states its wage: a month in koruna, or an hour in the monthly fields (pay FR-1)", () => {
    const vacancy = {
      portalId: 1,
      profeseCzIsco: { id: "CzIsco/72140" },
      pozadovanaProfese: { cs: "Montér" },
      mesicniMzdaOd: 45000,
      mesicniMzdaDo: 60000,
      typMzdy: { id: "TypMzdy/mesic" },
    };
    const pay = (fields: object) =>
      toDraft({ ...vacancy, ...fields }, new Map(), units)?.pay;
    expect(pay({})).toEqual({
      min: 45000,
      max: 60000,
      currency: "CZK",
      period: "month",
    });
    expect(
      pay({
        mesicniMzdaOd: 250,
        mesicniMzdaDo: null,
        typMzdy: { id: "TypMzdy/hod" },
        pocetHodinTydne: 40,
      }),
    ).toEqual({
      min: 250,
      max: 250,
      currency: "CZK",
      period: "hour",
      hoursPerWeek: 40,
    });
    expect(pay({ typMzdy: null })).toBeUndefined();
  });

  it("still sends its adverts when the municipality list fails", async () => {
    const routes = await loadFixtureRoutes("mpsv");
    const http = new FakeHttpClient({
      [VACANCIES]: routes[VACANCIES]!,
      [MUNICIPALITIES]: new Error("down"),
    });
    const drafts = await readDrafts(mpsv, fakeContext({ http }));
    expect(drafts).toHaveLength(3);
    expect(drafts[0]?.city).toBe("");
  });
});
