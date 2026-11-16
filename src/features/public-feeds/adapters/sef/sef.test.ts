import { describe, expect, it } from "vitest";
import {
  checkAdapterContract,
  loadFixtureRoutes,
} from "../../../../../test/contract/adapter-contract.js";
import { parseSef, sef } from "./sef.js";

describe("sef (public-feeds FR-1)", () => {
  it("maps the saved offers into valid adverts", async () => {
    expect(
      await checkAdapterContract(sef, await loadFixtureRoutes("sef")),
    ).toEqual([]);
  });

  it("maps an offer: town and province, days, the text without contacts", () => {
    const [draft] = parseSef(
      JSON.stringify([
        {
          numeroOferta: "142026006539",
          descripcion: "TÉCNICO/A DE MANTENIMIENTO",
          urlDetalles: "https://sefoficinavirtual.carm.es/oferta?id=1",
          municipio: {
            municipio: "LOS ALCÁZARES",
            provincia: { provincia: "MURCIA" },
          },
          adicionales:
            "Funciones:<BR/>mantenimiento. CV a rrhh@empresa.es o 968 123 456",
          descNivelProfesional: "TÉCNICOS",
          mesesExperiencia: 12,
          fechaDeInicio: "16/11/2026",
          fechaDeFin: "04/12/2026",
        },
        { numeroOferta: "2", descripcion: "Sin enlace", urlDetalles: "" },
      ]),
    );
    expect(draft).toMatchObject({
      sourceId: "142026006539",
      title: "TÉCNICO/A DE MANTENIMIENTO",
      location: "Los Alcázares, Murcia, España",
      city: "Los Alcázares",
      posted: "2026-11-16",
      expires: "2026-12-04",
      description:
        "Funciones:\nmantenimiento. CV a o\nNivel profesional: TÉCNICOS\nExperiencia: 12 meses",
    });
  });
});
