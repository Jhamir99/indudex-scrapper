import { describe, expect, it } from "vitest";
import { goldenNames } from "../../../test/companies/golden.js";
import { agenciesByShare, isAgency } from "./agencies.js";
import { companyKey } from "./company-key.js";

describe("agencies (companies FR-4)", () => {
  it.each([
    "Randstad",
    "Hays Professional Solutions",
    "Vivaldis Interim",
    "Vosg'intérim intérim",
    "Kracht Recruitment",
    "AXXON SELECTING ETT, S.L.",
    "Empresa del sector de Recursos Humans",
    "Dextron Personeel B.V.",
    "ARWA Personaldienstleistungen GmbH",
    "CARO Personal GmbH",
    "Piening Personal",
    "Müntener & Thomas Personal- und Unternehmensberatung AG",
    "Vertraulich, vermittelt von Rocksolid",
    "AMPLITUDE TRAVAIL TEMPORAIRE",
    "Tempo-Team",
    "Accent Jobs for People NV",
  ])("an agency: %s", (name) => {
    expect(isAgency(name)).toBe(true);
  });

  it.each([
    "Alstom",
    "Siemens AG",
    "Boston Consulting Group",
    "ALTEN Consulting Services GmbH",
    "Bettmann GmbH",
    "Personal Computer Repair Ltd",
    "Atlas Copco",
    "Mercadona",
    "",
  ])("an employer: %s", (name) => {
    expect(isAgency(name)).toBe(false);
  });

  it("reads every name of the legacy's golden set the same", async () => {
    const differ = (await goldenNames()).filter(
      ({ s, agency }) => isAgency(s) !== agency,
    );
    expect(differ.map(({ s }) => s)).toEqual([]);
  });
});

// An employer's adverts, so many of them for a client.
const adverts = (company: string, n: number, forClient: number) =>
  Array.from({ length: n }, (_, i) => ({
    company,
    agency: false,
    forClient: i < forClient,
  }));

describe("an agency by the share of its adverts for a client (the legacy's 7c2bf8df)", () => {
  it("flags every advert of an employer with five or more, a fifth of them for a client", () => {
    const all = [
      ...adverts("Tecdata Engineering S.L.", 10, 6),
      ...adverts("TECDATA ENGINEERING", 2, 0),
      ...adverts("Siemens AG", 40, 3),
      ...adverts("Morson", 3, 3),
    ];
    const flagged = agenciesByShare(all, companyKey);
    expect([
      flagged.size,
      ...[
        "Tecdata Engineering S.L.",
        "TECDATA ENGINEERING",
        "Siemens AG",
        "Morson",
      ].map((company) =>
        flagged.has(all.findIndex((advert) => advert.company === company))
          ? 1
          : 0,
      ),
    ]).toEqual([12, 1, 1, 0, 0]);
  });
});
