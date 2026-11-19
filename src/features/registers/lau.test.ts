import { describe, expect, it } from "vitest";
import { placer, readLau } from "./lau.js";

const TABLE = [
  "NO\tNO074\t5428\tNordreisa/Ráisa/Raisi",
  "FR\tFRK26\t69381\tLyon 1er Arrondissement",
  "FR\tFRK26\t69123\tLyon",
  "FR\tFRK26\t69259\tVénissieux",
  "FR\tFRK25\t69999\tAilleurs",
  "ES\tES703\t38038\tSanta Cruz de Tenerife",
  "EL\tEL303\t1001\tAthína",
  "",
].join("\n");

describe("Eurostat's LAU table (companies FR-6)", () => {
  const place = placer(readLau(TABLE));

  it("places a municipality by its code, shown by its first name", () => {
    expect(place("no", "5428")).toEqual({ nuts: "NO074", town: "Nordreisa" });
    expect(place("gr", "1001")).toEqual({ nuts: "EL303", town: "Athína" });
  });

  it("writes the islands' units as the site codes their provinces", () => {
    expect(place("es", "38038")).toEqual({
      nuts: "ES70T",
      town: "Santa Cruz de Tenerife",
    });
  });

  it("places a code the table lacks by its département's commonest unit", () => {
    expect(place("fr", "69385")).toEqual({ nuts: "FRK26", town: "" });
    expect(place("fr", "01001")).toEqual({ nuts: "", town: "" });
    expect(place("xx", "1")).toEqual({ nuts: "", town: "" });
  });
});
