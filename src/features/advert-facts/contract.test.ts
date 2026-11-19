import { describe, expect, it } from "vitest";
import { contractKind, contractOf, oneOf, workingTime } from "./contract.js";

// The legacy's test/contract.test.mjs, values the sources wrote (30 October 2026).
describe("the contract a source's field names (FR-2)", () => {
  it.each([
    ["Contracte laboral indefinit", "i"],
    ["Contracte laboral temporal (6 mesos)", "t6"],
    ["Contracte mercantil (només ofertes)", "a"],
    ["Vaste job", "i"],
    ['Interim met optie "vast werk"', "eo"],
    ["Tijdelijke job (met optie vast)", "to"],
    ["Tijdelijke job (niet via uitzendkantoren)", "t"],
    ["Interim Job (uitsluitend voor uitzendkantoren)", "e"],
    ["Vaste job bij het uitzendkantoor", "i"],
    ["Zelfstandige activiteit", "a"],
    ["Overeenkomst alternerende opleiding", "p"],
    ["Flexijob", "t"],
    ["Dienstenchequebaan", ""],
    ["Durée indéterminée", "i"],
    ["Intérimaire avec option sur durée indéterminée", "eo"],
    ["Journalier (occasionnel ou saisonnier)", "t"],
    ["CDI Intérimaire", "i"],
    ["Intérim", "e"],
    ["Profession libérale", "a"],
    ["Vanlig anställning · 6 månader eller längre", ""],
    ["Vanlig anställning · Tills vidare", "i"],
    ["Behovsanställning", "t"],
    ["Een tijdelijk contract met uitzicht op een vast dienstverband", "to"],
    ["CDI / CDD", ""],
    ["CDD de 6 mois, possibilité de CDI", "t6"],
    ["CDD de 3 ans", "t36"],
    ["Regular", "i"],
    ["Regular travel to customer sites", ""],
  ])("reads «%s» as %j", (value, kind) => {
    expect(contractKind(value)).toBe(kind);
  });

  it("reads Adzuna's «contract» as not permanent, an applicant-tracking system's as freelance", () => {
    expect(contractKind("contract", "adzuna")).toBe("t");
    expect(contractKind("contract", "ashby")).toBe("a");
    expect(contractKind("permanent", "adzuna")).toBe("i");
  });
});

describe("the working time a source's field names (FR-2)", () => {
  it.each([
    ["Jornada completa", "c"],
    ["Jornada intensiva", ""],
    ["Jornada parcial (20 hores - jornada setmanal)", "p20"],
    ["Jornada parcial (1 hores - jornada setmanal)", "p"],
    ["Jornada parcial (5 hores - jornada diaria)", "p25"],
    ["Temps plein", "c"],
    ["Non renseigné", ""],
    ["full-or-part-time", ""],
    ["Completa o parcial", ""],
    ["Teilzeit (20h)", "p20"],
    ["Beperkte tewerkstelling <13 uren/week", "p13"],
    ["32 - 40 uur per week", "c"],
    ["20 - 24 Stunden pro Woche", "p"],
    ["zwischen 30 und 35 Stunden pro Woche", "c"],
    ["de 30 a 35 horas semanales", "c"],
    ["36 tot 40 uur per week;", "c"],
    ["36 tot 40 uur", "c"],
    ["20 à 25 heures par semaine", "p"],
    ["8 bis 10 Stunden", ""],
    ["9 to 5", ""],
    ["Pensum 100%", "c"],
    ["80%", "p"],
    ["38,5 Std./Woche", "c"],
  ])("reads «%s» as %j", (value, time) => {
    expect(workingTime(value)).toBe(time);
  });
});

describe("one value of a list", () => {
  it("is the kind they share, with its figure when only one is given", () => {
    expect(oneOf(["t", "t12"])).toBe("t12");
    expect(oneOf(["t6", "t12"])).toBe("t");
    expect(oneOf(["i", "t"])).toBe("");
    expect(oneOf([])).toBe("");
  });
});

const advert = (fields: {
  contract?: string;
  hours?: string;
  employmentType?: string[];
}) => ({ source: "careers", ...fields });

describe("an advert's contract and working time (FR-2)", () => {
  it("reads an adapter's fields", () => {
    expect(
      contractOf(
        advert({
          contract: "Contracte laboral temporal (3 mesos)",
          hours: "Jornada completa",
        }),
      ),
    ).toEqual({
      contract: { kind: "temporary", months: 3 },
      workingTime: { kind: "full" },
    });
  });

  it("reads a JobPosting's list: both named, the hours alone, a site's own words", () => {
    expect(
      contractOf(advert({ employmentType: ["FULL_TIME", "TEMPORARY"] })),
    ).toEqual({
      contract: { kind: "temporary" },
      workingTime: { kind: "full" },
    });
    expect(contractOf(advert({ employmentType: ["FULL_TIME"] }))).toEqual({
      contract: null,
      workingTime: { kind: "full" },
    });
    expect(
      contractOf(advert({ employmentType: ["Permanent", "Vollzeit"] })),
    ).toEqual({
      contract: { kind: "permanent" },
      workingTime: { kind: "full" },
    });
    expect(
      contractOf(advert({ employmentType: ["Regular Full-Time"] })),
    ).toEqual({
      contract: { kind: "permanent" },
      workingTime: { kind: "full" },
    });
  });

  it("says nothing for a list of two kinds or hours", () => {
    expect(
      contractOf(advert({ employmentType: ["FULL_TIME", "PART_TIME"] })),
    ).toEqual({
      contract: null,
      workingTime: null,
    });
  });

  it("reads the working day the Spanish sources state with its word", () => {
    expect(
      contractOf({
        source: "sae",
        contract: "Laboral fijo discontinuo",
        hours: "Jornada parcial mañana",
      }),
    ).toEqual({
      contract: { kind: "permanent" },
      workingTime: { kind: "part" },
    });
  });

  it("says nothing without the fields, whatever the text", () => {
    expect(contractOf(advert({}))).toEqual({
      contract: null,
      workingTime: null,
    });
  });
});
