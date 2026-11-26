import { describe, expect, it } from "vitest";
import { gateCatalogues } from "../../../test/gate/catalogues.js";
import { readCatalogue } from "../../shared/catalogues/read-catalogue.js";
import { addressWords } from "../../shared/kit/address-words.js";
import {
  createGate,
  createTitleReader,
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
  description: "",
  ...fields,
});

describe("a closed advert (closed adverts FR-3)", () => {
  const closed = "Let op! Deze vacature is niet meer actief.";

  it("is left out as closed after the families and hygiene, before Europe", () => {
    expect(gate.decide(advert({ description: closed }))).toEqual({
      kept: false,
      reason: "closed",
    });
    expect(
      gate.decide(
        advert({
          title: "Technische/r Zeichner/in – bereits besetzt",
          language: "de",
          country: "de",
        }),
      ),
    ).toEqual({ kept: false, reason: "closed" });
    expect(gate.decide(advert({ description: closed, country: "us" }))).toEqual(
      { kept: false, reason: "closed" },
    );
  });

  it("keeps the earlier reasons of an advert outside the vertical or failing hygiene", () => {
    expect(
      gate.decide(advert({ title: "Bakery assistant", description: closed })),
    ).toEqual({ kept: false, reason: "outside the vertical" });
    const hygiene = gate.decide(
      advert({
        title: "Mechanical Engineer position filled",
        description: closed,
      }),
    );
    expect(hygiene.kept).toBe(false);
    expect(!hygiene.kept && hygiene.reason.startsWith("hygiene")).toBe(true);
  });

  it("reads only the top of the text", () => {
    expect(
      gate.decide(
        advert({
          description: `${"We build turbines. ".repeat(120)}${closed}`,
        }),
      ).kept,
    ).toBe(true);
  });
});

describe("a job in no one country (the legacy's xx and zz)", () => {
  it("lets a remote job (xx) and a country not stated (zz) through, and keeps one outside Europe out", () => {
    expect(gate.decide(advert({ country: "xx" })).kept).toBe(true);
    expect(gate.decide(advert({ country: "zz" })).kept).toBe(true);
    expect(gate.decide(advert({ country: "us" }))).toEqual({
      kept: false,
      reason: "outside Europe",
    });
  });
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

describe("the gate's reading for the scrapper (job portals FR-4)", () => {
  it("reads only the vacancy pages whose address names a job of ours (the legacy's namesOurs cases)", async () => {
    const isOurs = createTitleReader(await gateCatalogues());
    const namesOurs = (url: string, country: string) =>
      isOurs(addressWords(url), country);
    expect([
      namesOurs(
        "https://justjoin.it/job-offer/kyp-ai-devops-engineer-katowice-devops",
        "pl",
      ),
      namesOurs(
        "https://www.stellenanzeigen.de/job/erzieher-in-bzw-kinderpfleger-in-m-w-d-martinsried-16422684/",
        "de",
      ),
      namesOurs(
        "https://emploi.batiactu.com/offre-emploi/aia-ingenierie-ingenieur-cvc-f-h-bordeaux-926181.php",
        "fr",
      ),
      namesOurs(
        "https://emploi.batiactu.com/offre-emploi/delegation-ile-de-france-normandie-chauffeur-camion-benne-93-f-h-livry-gargan-930765.php",
        "fr",
      ),
    ]).toEqual([true, false, true, false]);
  });
});
