import { describe, expect, it } from "vitest";
import { gateCatalogues } from "../../../test/gate/catalogues.js";
import { readCatalogue } from "../../shared/catalogues/read-catalogue.js";
import {
  createGate,
  explainLine,
  GateDecision,
  type GateInput,
} from "./index.js";

const gate = createGate({
  ...(await gateCatalogues()),
  countries: await readCatalogue("countries"),
});

const advert = (fields: Partial<GateInput>): GateInput => ({
  title: "Mechanical Engineer",
  language: "en",
  occupationCodes: {},
  country: "es",
  url: "https://example.com/jobs/1",
  ...fields,
});

describe("the gate's decision (gate FR-7 to FR-10)", () => {
  it("keeps an advert of the vertical with its families and occupations", () => {
    const decision = gate.decide(advert({}));
    expect(decision).toEqual({
      kept: true,
      families: ["2144"],
      occupations: ["2144.1"],
      trade: false,
    });
    expect(GateDecision.parse(decision)).toEqual(decision);
    expect(gate.decide(advert({ title: "Electrician" }))).toMatchObject({
      kept: true,
      trade: true,
    });
  });

  it("gives the reason, in the legacy's order: the vertical, hygiene, Europe", () => {
    expect(
      [
        advert({ title: "Marketing Specialist" }),
        advert({ title: "Werkstudent Software Engineer" }),
        advert({ title: "Mechanical Engineer", country: "us" }),
        advert({ title: "Marketing Specialist", country: "us" }),
      ].map((one) => gate.decide(one)),
    ).toEqual([
      { kept: false, reason: "outside the vertical" },
      {
        kept: false,
        reason:
          "hygiene: title names a sales, recruiting, trainee, labourer, retail, operative or gig role",
      },
      { kept: false, reason: "outside Europe" },
      { kept: false, reason: "outside the vertical" },
    ]);
  });

  it("believes the source's code", () => {
    expect(
      gate.decide(
        advert({ title: "Sales Manager", occupationCodes: { isco: "2144" } }),
      ),
    ).toMatchObject({ kept: false, reason: expect.stringMatching(/^hygiene/) });
    expect(
      gate.decide(
        advert({
          title: "Mechanical Engineer",
          occupationCodes: { isco: "2431" },
        }),
      ),
    ).toEqual({ kept: false, reason: "outside the vertical" });
  });

  it("decides the same twice", () => {
    expect(gate.decide(advert({}))).toEqual(gate.decide(advert({})));
  });

  it("writes an explain line as the legacy did", () => {
    expect(
      explainLine("outside the vertical", {
        title: "Marketing Specialist",
        company: "Acme",
        location: "Madrid, España",
        source: "sne",
      }),
    ).toBe(
      "[outside the vertical] Marketing Specialist | Acme | Madrid, España (sne)",
    );
  });
});
