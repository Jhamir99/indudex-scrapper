import { describe, expect, it } from "vitest";
import {
  behindCodes,
  byPlace,
  pieces,
  saintNames,
  withArticle,
  withTown,
} from "./pieces.js";

const knows = (name: string) => ["la garriga", "l'aldea"].includes(name);

describe("a place's pieces (FR-3)", () => {
  it("cuts a place where addresses are cut, without postcodes", () => {
    expect(pieces("08940 Cornellà de Llobregat, Barcelona provincia")).toEqual([
      "Cornellà de Llobregat",
      "Barcelona provincia",
    ]);
    expect(pieces("Terrassa, BARCELONA, ES")).toEqual([
      "Terrassa",
      "BARCELONA",
      "ES",
    ]);
    expect(pieces("17 - Le Mans")).toEqual(["Le Mans"]);
  });

  it("leaves out the words around a town that are not the town", () => {
    expect(
      [
        "Getafe Area",
        "Office Eschborn",
        "BLOIS PLANT",
        "Cambridge Science Park",
      ].flatMap(pieces),
    ).toEqual(["Getafe", "Eschborn", "BLOIS", "Cambridge"]);
  });

  it("tries a district after a hyphen as its town, but not a point of the compass", () => {
    expect(withTown("Ulm-Jungingen")).toEqual(["Ulm-Jungingen", "Ulm"]);
    expect(withTown("Noord-Brabant")).toEqual(["Noord-Brabant"]);
  });

  it("tries a French district small or great of its town as that town", () => {
    expect(withTown("Petit-Lancy")).toEqual(["Petit-Lancy", "Petit", "Lancy"]);
  });

  it("finds a town behind codes in capitals", () => {
    expect(behindCodes("OCONUS-UK-Warrington")).toBe("Warrington");
    expect(behindCodes("DE_Ulm")).toBe("Ulm");
    expect(behindCodes("GE-Hannover")).toBe("Hannover");
    expect(behindCodes("Hannover")).toBeUndefined();
  });

  it("spells a saint cut short in full (NOB-06)", () => {
    expect(saintNames("St Denis")).toEqual([
      "saint denis",
      "sankt denis",
      "sant denis",
      "san denis",
    ]);
    expect(saintNames("Sta. Perpètua de Mogoda")).toEqual([
      "santa perpetua de mogoda",
    ]);
    expect(saintNames("Stuttgart")).toEqual([]);
  });

  it("reads a German town by the place it lies by or on", () => {
    expect(byPlace("Ergolding bei Landshut")).toEqual({
      town: "Ergolding",
      word: "bei",
      near: "Landshut",
    });
    expect(byPlace("Weiden in der Oberpfalz")?.town).toBe("Weiden");
    expect(byPlace("Kernen im Remstal")?.word).toBe("im");
    expect(byPlace("Frankfurt")).toBeUndefined();
  });

  it("puts back an article Spain's register writes after the town", () => {
    expect(withArticle("Garriga, La", knows)).toBe("La Garriga");
    expect(withArticle("ALDEA, L'", knows)).toBe("L'ALDEA");
    expect(withArticle("Asturias, AS", knows)).toBe("Asturias, AS");
  });
});
