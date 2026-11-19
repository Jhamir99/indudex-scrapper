import { describe, expect, it } from "vitest";
import { goldenNames } from "../../../test/companies/golden.js";
import { isAgency } from "./agencies.js";

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
