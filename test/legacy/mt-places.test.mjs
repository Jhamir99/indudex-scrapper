// The legacy's mt-places.test.mjs (JustJans/indudex@b0cd182), its imports pointed at this repo.
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

// The legacy's towns-back test (builder/mt/towns-back.mjs, a tool over the caches) is out of this feature's scope.

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
