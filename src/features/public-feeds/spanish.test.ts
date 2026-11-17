import { describe, expect, it } from "vitest";
import { townName } from "./spanish.js";

describe("townName", () => {
  it("writes a town in capitals as a name, with its particles in lower case", () => {
    expect(townName("SEVILLA LA NUEVA")).toBe("Sevilla la Nueva");
    expect(townName("SAN LORENZO DE EL ESCORIAL")).toBe(
      "San Lorenzo de El Escorial",
    );
    expect(townName("MADRID")).toBe("Madrid");
  });

  it("brings an article written after a comma to the front", () => {
    expect(townName("LINEA DE LA CONCEPCION, LA")).toBe(
      "La Linea de la Concepcion",
    );
    expect(townName("ROSA, LA")).toBe("La Rosa");
  });
});
