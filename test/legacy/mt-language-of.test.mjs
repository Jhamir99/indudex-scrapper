// The legacy's mt-language-of.test.mjs (JustJans/indudex@b0cd182), its imports pointed at this repo.
// Titles in another language than their country's (builder/mt/language-of.ts).
import { test } from "vitest";
import assert from "node:assert/strict";
import { languageOf } from "../../src/features/title-translation/language-of.ts";

test("told by the letters only that language writes", () => {
  assert.equal(languageOf("Pracownik produkcji - obsługa linii i windy"), "pl");
  assert.equal(languageOf("Svářeč metodou TIG – nerezová ocel"), "cs");
  assert.equal(languageOf("Villanyszerelő - Vollzeit"), "hu");
  assert.equal(languageOf("Programator CNC mașini de frezat (Fanuc)"), "ro");
});

test("German, French, Dutch and Spanish titles are left alone", () => {
  for (const t of [
    "Kfz-Mechatroniker (m/w/d) in München",
    "Technicien de maintenance – Rhône-Alpes",
    "Contrôleur qualité",
    "Onderhoudstechnieker",
    "Técnico de mantenimiento en León",
    "Façadier",
    "Ingeniero de caminos",
  ])
    assert.equal(languageOf(t), null, t);
});

test("a French title on an offer filed as Dutch goes to French", () => {
  assert.equal(languageOf("technicien de maintenance - 2 équipes", "nl"), "fr");
  assert.equal(languageOf("Mécanicien poids-lourds", "nl"), "fr");
  assert.equal(languageOf("Soudeur | Journée | Veurne", "nl"), "fr");
  for (const t of [
    "Onderhoudstechnieker",
    "Junior Robot Programmeur | Start je carrière in robotica",
    "Automonteur (écht familiebedrijf!!) Sint-Oedenrode",
    "Data Engineer | Azure",
  ])
    assert.equal(languageOf(t, "nl"), null, t);
  assert.equal(languageOf("technicien de maintenance", "fr"), null);
});

test("a Catalan title on an offer filed as Spanish goes to Catalan", () => {
  assert.equal(
    languageOf("Muntador/a en fusteria metàl·lica i alumini", "es"),
    "ca",
  );
  assert.equal(
    languageOf("Adjunt Responsable de Producció - Sector Químic", "es"),
    "ca",
  );
  for (const t of [
    "Técnico de mantenimiento en León",
    "Oficial de 1ª electricista",
    "Jefe de obra para la construcción",
  ])
    assert.equal(languageOf(t, "es"), null, t);
});

test("a French title on a Swiss or Luxembourg offer filed as German goes to French", () => {
  for (const t of [
    "Chargé de projets industriels",
    "Programmeur-Régleur CN",
    "Monteur-Mécanique",
    "Mécatronicien CFC",
  ])
    assert.equal(languageOf(t, "de", "ch"), "fr", t);
  for (const t of [
    "Betriebsingenieur Netzwerke - Karriere bei BKW",
    "Polymechaniker oder Décolleteur für Kurzdreher",
    "Data Engineer",
  ])
    assert.equal(languageOf(t, "de", "ch"), null, t);
  assert.equal(
    languageOf("Chargé de projets industriels", "de", "de"),
    null,
    "not on a German offer",
  );
});

test("the English every language borrows counts for neither side, and each part of a hyphenated word counts", () => {
  for (const t of [
    "Développeur Front-End",
    "Soudeur semi-auto",
    "Coffreur-Ferrailleur",
  ])
    assert.equal(languageOf(t, "nl"), "fr", t);
  for (const t of ["Senior Software Engineer", "Monteur Elektrotechniek"])
    assert.equal(languageOf(t, "nl"), null, t);
});

test("a Spanish title on an offer filed as Catalan is Spanish; a Catalan one stays Catalan (9 November 2026)", () => {
  for (const t of [
    "Técnico/a de Gas y Calderas en Lleida",
    "Operario/a de Mantenimiento Hotel - Sant Cugat",
    "Jefe/a de Obra",
    "Delineante Oficina Técnica",
    "Mecánicos/as Hidráulicos/as (Sector Naval)",
  ])
    assert.equal(languageOf(t, "ca", "es"), "es", t);
  for (const t of [
    "Mecànic/a de Maquinària Agrícola i Industrial",
    "Tècnic/a Electromedicina",
    "Electricista",
    "Lampista Oficial de Primera",
    "Operari de manteniment",
    "Cap d'obra",
    "Comercial",
  ])
    assert.equal(languageOf(t, "ca", "es"), null, t);
});
