import { describe, expect, it } from "vitest";
import { withoutClutter, withoutPictures } from "./clutter.js";

// The legacy's examples (test/tidy-names.test.mjs); the phone numbers and the contact are made up.
describe("what a field carries that is no part of it", () => {
  it("takes pictures and lone marks off, keeps the trades' signs", () => {
    expect(
      [
        "🛠️ Électricien (H/F)",
        "🔧 Chef de chantier – CVC / Plomberie – Monaco",
        "Dessinateur projeteur --/",
        "👷‍♂️ Soudeur TIG 🇫🇷",
        "Electricien ★★★",
        "C++ Developer",
        "Senior .NET Engineer",
        "C# Developer",
        "R&D Engineer -",
      ].map(withoutPictures),
    ).toEqual([
      "Électricien (H/F)",
      "Chef de chantier – CVC / Plomberie – Monaco",
      "Dessinateur projeteur",
      "Soudeur TIG",
      "Electricien",
      "C++ Developer",
      "Senior .NET Engineer",
      "C# Developer",
      "R&D Engineer",
    ]);
  });

  it("takes markup, web addresses, phones, a contact after an arrow and placeholders off", () => {
    expect(
      [
        "Müntener & Thomas<br>Personal- und Unternehmensberatung AG",
        "Gebietsverkaufsleiter IT - www.meusburger.ch",
        "Betriebstechniker - Bei Interesse 0151-00000000",
        "deutschlandweit --> --> Kontakt +49 711 00000 00 00",
        "null null null 2000 Antwerpen, België",
        "-, Deutschland",
        "Bydgoszcz, KP, PL, _",
        "📍 Thun, Schweiz",
        "Electricista 2026",
        "Monteur (m/w/d) 40 Std.",
      ].map((field) => withoutClutter(field)),
    ).toEqual([
      "Müntener & Thomas Personal- und Unternehmensberatung AG",
      "Gebietsverkaufsleiter IT",
      "Betriebstechniker",
      "deutschlandweit",
      "2000 Antwerpen, België",
      "Deutschland",
      "Bydgoszcz, KP, PL",
      "Thun, Schweiz",
      "Electricista 2026",
      "Monteur (m/w/d) 40 Std.",
    ]);
  });

  it("in a title, takes a phone off only with its prefix or label: bare figures there are a pay", () => {
    expect(
      withoutClutter("Elektriker 40000-45000 € brutos", { phones: "labelled" }),
    ).toBe("Elektriker 40000-45000 € brutos");
    expect(
      withoutClutter("Elektriker - Tel 0151 0000 0000", { phones: "labelled" }),
    ).toBe("Elektriker");
  });
});
