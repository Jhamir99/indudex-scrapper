import { describe, expect, it } from "vitest";
import {
  germanReading,
  lemma,
  matchableTitle,
  secondReading,
  spanishReading,
} from "./matchable-title.js";

describe("matchableTitle (gate FR-2)", () => {
  it("takes the gender marks off, French endings too, and apostrophes before the words are read", () => {
    expect(
      [
        "Conducteur(trice) Travaux Confirmé(e)",
        "Technicien·ne informatique",
        "Conducteur/trice de chantier",
        "Ingénieur(e) (H/F)",
        "Enginyer/a d'automatització (m/f)",
        "Ingeniero/a de Caminos",
      ].map(matchableTitle),
    ).toEqual([
      "conducteur travaux confirme",
      "technicien informatique",
      "conducteur de chantier",
      "ingenieur",
      "enginyer d automatitzacio",
      "ingeniero de caminos",
    ]);
  });

  it("reads the gender marks through zero-width spaces", () => {
    expect(matchableTitle("Process Engineer (m/\u200bd/\u200bf)")).toBe(
      matchableTitle("Process Engineer (m/d/f)"),
    );
  });

  it("writes a word for both genders once, and drops a reference number and a board's offer words", () => {
    expect(
      [
        "Técnico/Técnica de mantenimiento",
        "Oficial/Oficiala 1ª",
        "#1234 - Site Engineer (m/w/d)",
        "Oferta de empleo para Ingeniero civil",
      ].map(matchableTitle),
    ).toEqual([
      "tecnico de mantenimiento",
      "oficial 1ª",
      "site engineer",
      "ingeniero civil",
    ]);
  });

  it("reads a graduate scheme's engineer and the misspellings of «engineer»", () => {
    expect(
      ["Electrical Engineering Graduate", "Mooring & Subsea Enigneer"].map(
        matchableTitle,
      ),
    ).toEqual(["electrical graduate engineer", "mooring & subsea engineer"]);
  });
});

describe("the second reading (gate FR-2)", () => {
  it("reads plurals as singulars, keeping the words that are plurals of their own", () => {
    expect(
      [
        "engineers",
        "foremen",
        "facilities",
        "batteries",
        "switches",
        "process",
        "electronics",
        "systems",
      ].map(lemma),
    ).toEqual([
      "engineer",
      "foreman",
      "facilities",
      "battery",
      "switch",
      "process",
      "electronics",
      "systems",
    ]);
  });

  it("splits where the title lists or joins, and spells abbreviations out", () => {
    expect(
      [
        "Senior Project Engineers",
        "CAD-Designer",
        "Ingeniero técnico o industrial",
        "Calculator / Werkvoorbereider",
        "Snr Engr, Facilities",
      ].map(secondReading),
    ).toEqual([
      ["senior project engineer"],
      ["cad designer"],
      ["ingeniero tecnico", "industrial"],
      ["calculator", "werkvoorbereider"],
      ["senior engineer", "facilities"],
    ]);
  });
});

describe("the German reading (gate FR-2)", () => {
  it("drops the small words and reads plural and female endings as the singular", () => {
    expect(["elektroingenieure", "technikerin"].map(germanReading)).toEqual([
      ["elektroingenieur"],
      ["techniker"],
    ]);
  });

  it("closes a word a hyphen leaves open at every point, and lends the first piece's title", () => {
    const read = germanReading("vorarbeiter im strassen- und tiefbau");
    expect(read).toContain("vorarbeiter strassenbau");
    expect(read).toContain("vorarbeiter tiefbau");
    expect(germanReading("maschinen- und anlagenmonteure")).toContain(
      "maschinenmonteur",
    );
  });

  it("tries at most a word's last thirty letters (NOB-11)", () => {
    const long = `${"x".repeat(5000)}bau`;
    // 28 closings of the open word, each with the first piece's title lent: never thousands.
    expect(germanReading(`hoch- und ${long}`).length).toBeLessThanOrEqual(60);
  });
});

describe("the Spanish reading (gate FR-2)", () => {
  it("reads -es plurals and adds the «de» a role word's field leaves out", () => {
    expect(
      [
        "soldadores",
        "ingenieros civiles",
        "desarrolladores web",
        "tecnico calidad",
        "operario mantenimiento",
        "responsables",
        "tecnico en telecomunicaciones",
      ].map(spanishReading),
    ).toEqual([
      ["soldador"],
      ["ingeniero civil"],
      ["desarrollador web"],
      ["tecnico calidad", "tecnico de calidad"],
      ["operario mantenimiento", "operario de mantenimiento"],
      ["responsable"],
      ["tecnico en telecomunicacion"],
    ]);
  });
});
