import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkAdapterContract,
  FIXTURES_DIRECTORY,
  loadFixtureRoutes,
} from "../../../../../test/contract/adapter-contract.js";
import { madrid, parseMadrid } from "./madrid.js";

// A table row of the list: its cells, then its link cell.
const row = (cells: string[], link: string) =>
  `<tr>${cells.map((cell) => `<td><span>${cell}</span></td>`).join("")}<td>${link}</td></tr>`;

describe("madrid (public-feeds FR-1)", () => {
  it("maps the saved answers into valid adverts", async () => {
    expect(
      await checkAdapterContract(madrid, await loadFixtureRoutes("madrid")),
    ).toEqual([]);
  });

  it("maps a row: the occupation as its title, as the list writes it, and its facts as a sentence", async () => {
    const drafts = parseMadrid(
      await readFile(join(FIXTURES_DIRECTORY, "madrid", "offers.html"), "utf8"),
    );
    expect(drafts).toHaveLength(4);
    expect(drafts[0]).toMatchObject({
      sourceId: "132026009479",
      title: "ORDENANZAS",
      company: "",
      city: "Madrid",
      location: "Madrid, Comunidad de Madrid, España",
      country: "es",
      language: "es",
      posted: "2026-10-14",
      description: "Ocupación: Ordenanzas",
      url: "https://oficinavirtualempleo.comunidad.madrid/AreaPublica/Ofertas/DetalleOferta/?id=212ff3db-5c13-46d3-b33f-e0a9e4832735&uag=134cc861-64ef-e811-a2cc-005056b54806",
    });
    expect(drafts[1]).toMatchObject({
      title: "MÉDICOS, MEDICINA GENERAL",
      city: "Sevilla la Nueva",
    });
  });

  it("leaves out a row with no page or no post", () => {
    const detail =
      '<a href="/AreaPublica/Ofertas/DetalleOferta/?id=1">Detalle</a>';
    const html = `<table>${row(["1", "", "", "14/10/2026", "", "MADRID"], detail)}${row(["2", "", "TORNEROS", "14/10/2026", "", "MADRID"], "")}</table>`;
    expect(parseMadrid(html)).toEqual([]);
  });
});
