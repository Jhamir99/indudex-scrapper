// The legacy's test/mt-places.test.mjs (JustJans/indudex@ec79858), carried whole (legacy resync T009): its imports pointed at
// this repo.
// Towns kept as written (builder/mt/places.ts).
import { test } from "vitest";
import assert from "node:assert/strict";
import {
  isTown,
  placesIn,
  otherNames,
  townsBack,
} from "../../src/features/title-translation/method/places.ts";

test('a town counts after "in" and the like, or closing the title or a part of it', () => {
  assert.deepEqual(placesIn("Elektriker in Köln"), ["Köln"]);
  assert.deepEqual(placesIn("Lagerhelfer Essen"), ["Essen"]);
  assert.deepEqual(placesIn("Schweißer Weiden"), ["Weiden"]);
});

test("not with more words behind, nor as the end of a longer name", () => {
  assert.deepEqual(placesIn("Fahrer – Essen auf Rädern"), []);
  assert.deepEqual(placesIn("Monteur Huis ter Heide"), []);
});

test("job words that are also districts or heads of town names are not towns", () => {
  for (const t of [
    "Jefe de Ventas",
    "Ingeniero de Campo",
    "Operario de Línea",
    "Técnico de Corte",
    "Comercial Zona Norte",
    "Operador de Grúa Torre",
    "Jefe de Estación",
    "Chef de Quart",
    "Tècnic Industrial - Mestre",
    "Workshop Technician (Fleet)",
    "Elektriker Auch",
  ])
    assert.deepEqual(placesIn(t), [], t);
  assert.deepEqual(placesIn("Técnico en Vigo"), ["Vigo"]);
});

test("a town's article joined to the word before it is left as written", () => {
  const back = (out, town) => townsBack(out, { [town]: otherNames(town) });
  assert.equal(
    back("Electricista al Vendrell", "El Vendrell"),
    "Electricista al Vendrell",
  );
  assert.equal(
    back("Cap de planta del Prat de Llobregat", "El Prat de Llobregat"),
    "Cap de planta del Prat de Llobregat",
  );
  assert.equal(
    back("Electricista a Vendrell", "El Vendrell"),
    "Electricista a El Vendrell",
  );
});

test("a Dutch «'s-» and a bracket belong to the town's name", () => {
  assert.deepEqual(placesIn("Elektricien in 's-Hertogenbosch"), [
    "'s-Hertogenbosch",
  ]);
  assert.deepEqual(placesIn("Elektriker in Halle (Saale) - befristet"), [
    "Halle (Saale)",
  ]);
  const back = (out, town) => townsBack(out, { [town]: otherNames(town) });
  assert.equal(
    back("Electrician in Den Bosch", "'s-Hertogenbosch"),
    "Electrician in 's-Hertogenbosch",
  );
  assert.equal(
    back("Electrician in Frankfurt (Or)", "Frankfurt (Oder)"),
    "Electrician in Frankfurt (Oder)",
  );
});

test("a town Firefox renamed is written back, accents not counting", () => {
  assert.equal(
    townsBack("Electrician in Munich", { München: otherNames("München") }),
    "Electrician in München",
  );
  assert.equal(
    townsBack("Electricista en Malaga", { Málaga: otherNames("Málaga") }),
    "Electricista en Málaga",
  );
  assert.ok(otherNames("Wien").includes("Vienna"));
});

test("a town opening the title before a colon or a dash", () => {
  assert.deepEqual(
    placesIn("München: FachplanerIn Informations- und Sicherheitstechnik"),
    ["München"],
  );
  assert.deepEqual(placesIn("Köln – Elektriker"), ["Köln"]);
  assert.deepEqual(placesIn("Mobile: App Developer"), []);
});

test("a town written back over its Catalan name with a middle dot, not inside it (s113)", () => {
  assert.equal(
    townsBack("Mecànic d'automòbils a Brussel·les", {
      Brussels: otherNames("Brussels"),
    }),
    "Mecànic d'automòbils a Brussels",
  );
});

test("a town a cached translation renamed is written back as the title writes it (towns-back, 1 November 2026)", async () => {
  const { withTownsBack } =
    await import("../../src/features/title-translation/method/towns-back.ts");
  assert.equal(
    withTownsBack("Metallbauer in Köln", "Metaalbouwer in Keulen"),
    "Metaalbouwer in Köln",
  );
  assert.equal(
    withTownsBack("AI/ML Engineer, London", "Ingeniero de IA/ML, Londres"),
    "Ingeniero de IA/ML, London",
  );
  assert.equal(
    withTownsBack(
      "Carrossier Polyvalent Automobile - Liège",
      "Universeller Karosseriebauer Automobil - Lüttich",
    ),
    "Universeller Karosseriebauer Automobil - Liège",
  );
  assert.equal(
    withTownsBack("Elektriker (m/w/d)", "Electricista (h/m/d)"),
    "Electricista (h/m/d)",
  );
  assert.equal(withTownsBack("Metallbauer in Köln", ""), "");
});

test("a word is a town when a town of 15,000 people or more bears it, accents aside (TB2-12)", () => {
  assert.deepEqual(
    [
      "berlin",
      "Berlín",
      "łodz",
      "grua",
      "guia",
      "tecnico",
      "medias",
      "justicia",
    ].map(isTown),
    [true, true, true, false, false, false, false, false],
  );
});
