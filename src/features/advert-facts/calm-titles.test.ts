import { describe, expect, it } from "vitest";
import {
  calmTitle,
  shouting,
  spellingsOf,
  titleCalmer,
} from "./calm-titles.js";

// The legacy's own test (test/builder.test.mjs, "Titles written in capitals").
const teach = [
  "SAP Data Engineer",
  "IoT Engineer",
  "PLC Programmer",
  "Ingeniero de procesos",
].flatMap((title) => [title, title, title]);

describe("titles in capitals (FR-4)", () => {
  it("counts eight letters or more, seven in ten capitals", () => {
    expect(shouting("SENIOR PROCESS ENGINEER")).toBe(true);
    expect(shouting("Senior SAP Consultant")).toBe(false);
    expect(shouting("IT / HR")).toBe(false);
  });

  it("keeps acronyms as the other titles write them, brings the rest down with the short words small", () => {
    const calm = titleCalmer([...teach], new Set());
    expect(
      [
        "SAP DATA ENGINEER",
        "IOT AND PLC PROGRAMMER",
        "INGENIERO DE PROCESOS EN PLANTA",
        "TECHNIK ÚDRŽBY (m/ž)",
        "MANUFACTURING ENGINEER I",
        "Senior SAP Consultant",
        "IT / HR",
      ].map((title) => calm({ title, source: "brz" })),
    ).toEqual([
      "SAP Data Engineer",
      "IoT and PLC Programmer",
      "Ingeniero de Procesos en Planta",
      "Technik Údržby (m/ž)",
      "Manufacturing Engineer I",
      "Senior SAP Consultant",
      "IT / HR",
    ]);
  });

  it("keeps «(m/w/d)», «ß» and an elided article (NOA-10)", () => {
    const spellings = spellingsOf([
      "Techniker (m/w/d)",
      "Elektriker (m/w/d)",
      "Monteur (m/w/d)",
    ]);
    expect(
      [
        "ELEKTRIKER (M/W/D)",
        "CAP D'OBRA ELECTRICISTA",
        "MAßSCHNEIDER FÜR WERKSTATT",
      ].map((title) => calmTitle(title, spellings)),
    ).toEqual([
      "Elektriker (m/w/d)",
      "Cap d'Obra Electricista",
      "Maßschneider für Werkstatt",
    ]);
  });

  it("keeps the capitals of a source that asks its content not be altered (FUE-11)", () => {
    const calm = titleCalmer([...teach], new Set(["sne"]));
    expect(
      calm({ title: "TECNICO DE MANTENIMIENTO INDUSTRIAL", source: "sne" }),
    ).toBe("TECNICO DE MANTENIMIENTO INDUSTRIAL");
  });

  it("keeps a long word in capitals only when the titles nearly always write it so", () => {
    const spellings = spellingsOf([
      "STACKIT Engineer",
      "STACKIT Developer",
      "STACKIT Admin",
      "Systemes embarqués",
      "SYSTEMES Lead",
      "SYSTEMES Engineer",
      "Systemes Architect",
    ]);
    expect(spellings.get("STACKIT")).toBe("STACKIT");
    expect(spellings.get("SYSTEMES")).toBe("Systemes");
  });
});
