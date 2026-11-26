import { describe, expect, it } from "vitest";
import { goldenTitles } from "../../../test/dedupe/golden.js";
import { shownTitle, withoutBoardTail, withoutCodes } from "./shown-title.js";

// The legacy's examples (test/tidy-names.test.mjs, test/builder.test.mjs).
describe("the title as published (dedupe FR-1)", () => {
  it("takes a board's tail after the title off, the title's own brackets stay", () => {
    expect(
      [
        "Maintenance Engineer. Job in Chichester, West Sussex LilyLifestyle Jobs",
        "Senior Design Engineer (Pipelines) (Golborne (WA3 3JD), Golborne (WA3 3JD), United Kingdom, Golborne ()",
        "Engineering Manager (Kentish Town (NW5 1TN), Kentish Town (NW5 1TN), United Kingdom, Kentish To)",
        "Site Engineer (Leeds)",
        "Projektarchitektin - Architektur Stellen",
      ].map(withoutBoardTail),
    ).toEqual([
      "Maintenance Engineer",
      "Senior Design Engineer (Pipelines)",
      "Engineering Manager",
      "Site Engineer (Leeds)",
      "Projektarchitektin",
    ]);
  });

  it("takes a Polish board's button and a recruiter's list off", () => {
    expect(
      [
        "Obserwuj ofertę Inżynier budowy (branża energetyczna)",
        "Mechanik Maszyn - Oświęcim - Talent Partners, Skuteczna Rekrutacja, Headhunter, Doradztwo Personalne, Oferty Pracy",
        "Talent Partners Manager",
      ].map(withoutBoardTail),
    ).toEqual([
      "Inżynier budowy (branża energetyczna)",
      "Mechanik Maszyn - Oświęcim",
      "Talent Partners Manager",
    ]);
  });

  it("takes a board's label opening the title off", () => {
    expect(
      [
        "Job | Engineer Risk Systems | Bruxelles",
        "Praca: Inżynier procesu",
        "Gesucht: Industrial Test Engineer",
        "Vacature | Werkvoorbereider Bouw",
        "Job Coach",
        "Offre d’emploi : Ingénieur d’application",
      ].map(withoutBoardTail),
    ).toEqual([
      "Engineer Risk Systems | Bruxelles",
      "Inżynier procesu",
      "Industrial Test Engineer",
      "Werkvoorbereider Bouw",
      "Job Coach",
      "Ingénieur d’application",
    ]);
  });

  it("takes the advert's own codes off, a rank, a year and C# stay", () => {
    expect(
      [
        "169. ##6497 Electricista Industrial",
        "70. Electricista Industrial Programador/a Maquinària PLC",
        "1. Offizier (m/w/d)",
        "Elektromonteur im Anlagenbau - ID:15080",
        "Entwickler Embedded Software / IoT | M/W/D – Ref: 2609",
        "Electricista de Punts de Recàrrega de Vehicles Elèctrics: 29110",
        "Enginyer/a DevOps_31001",
        "Meister / Techniker Elektro BeTec Bersenbrück #2026-59",
        "Graduate Programme: 2026",
        "C# Developer",
        "#6442# 167. Tècnic/a de Manteniment Electromecànic (Temporal)",
        "IT-Generalist - Top Rahmenbedingungen Referenznummer: 1026",
      ].map(withoutCodes),
    ).toEqual([
      "Electricista Industrial",
      "Electricista Industrial Programador/a Maquinària PLC",
      "1. Offizier (m/w/d)",
      "Elektromonteur im Anlagenbau",
      "Entwickler Embedded Software / IoT | M/W/D",
      "Electricista de Punts de Recàrrega de Vehicles Elèctrics",
      "Enginyer/a DevOps",
      "Meister / Techniker Elektro BeTec Bersenbrück",
      "Graduate Programme: 2026",
      "C# Developer",
      "Tècnic/a de Manteniment Electromecànic (Temporal)",
      "IT-Generalist - Top Rahmenbedingungen",
    ]);
  });

  it("takes a zero-width space and the gender mark it split off", () => {
    expect(shownTitle("Process Engineer - Metrology (m/​d/​f)")).toBe(
      "Process Engineer - Metrology",
    );
  });

  it("writes a title in decomposed accents composed, as its copies are", () => {
    expect(shownTitle("Técnico de mantenimiento")).toBe(
      "Técnico de mantenimiento",
    );
  });

  it("takes Argus's gender marks and pictures off, keeps a pay's figures", () => {
    expect(shownTitle("🔧 Elektroniker (w/m/div.) - ")).toBe("Elektroniker");
    expect(shownTitle("Technicien de maintenance H/F")).toBe(
      "Technicien de maintenance",
    );
    expect(shownTitle("Electricista 40000-45000 € brutos")).toBe(
      "Electricista 40000-45000 € brutos",
    );
  });

  it("cuts a title over 250 letters at its last word", () => {
    const title = `${"Elektroniker ".repeat(25)}Automatisierungstechnik`;
    const shown = shownTitle(title);
    expect(shown.length).toBeLessThanOrEqual(250);
    expect(title.startsWith(shown)).toBe(true);
    expect(shown.endsWith("Elektroniker")).toBe(true);
  });
});

describe("the titles' golden set", () => {
  it("publishes every title of a real store as the legacy did", async () => {
    const cases = await goldenTitles();
    expect(cases.length).toBeGreaterThan(4000);
    expect(
      cases.filter(({ s, t }) => shownTitle(s) !== t).map(({ s }) => s),
    ).toEqual([]);
  });
});

describe("a job offer's label in a title (the legacy's feee7668)", () => {
  it("leaves the title, opening it or as a part of its own, in the offers' languages", () => {
    expect(
      [
        "Job | Engineer Risk Systems | Bruxelles",
        "Praca: Inżynier procesu",
        "Gesucht: Industrial Test Engineer",
        "BFÚ – pracovní nabídka – Koordinátor/ka Open Science",
        "We’re hiring: Welder",
        "Oferta de treball - Tècnic de manteniment",
        "Job Engineer",
      ].map(withoutBoardTail),
    ).toEqual([
      "Engineer Risk Systems | Bruxelles",
      "Inżynier procesu",
      "Industrial Test Engineer",
      "BFÚ – Koordinátor/ka Open Science",
      "Welder",
      "Tècnic de manteniment",
      "Job Engineer",
    ]);
  });
});
