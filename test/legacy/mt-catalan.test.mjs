// The legacy's mt-catalan.test.mjs (JustJans/indudex@b0cd182), its imports pointed at this repo.
// Catalan's apostrophes and contractions on a translated title (builder/mt/catalan-spelling.ts).
import { test } from "vitest";
import assert from "node:assert/strict";
import { catalanSpelling } from "../../src/features/title-translation/method/catalan-spelling.ts";

test("«d'» only before a vowel, and the article joined to «a», «de», «per» (8 November 2026)", () => {
  assert.equal(catalanSpelling("Mecànic d'taller"), "Mecànic de taller");
  assert.equal(
    catalanSpelling("Cap d'obra per a el nostre equip"),
    "Cap d'obra per al nostre equip",
  );
  assert.equal(
    catalanSpelling("Responsable de els projectes a els tallers"),
    "Responsable dels projectes als tallers",
  );
  assert.equal(
    catalanSpelling("Electricista d'el sector"),
    "Electricista del sector",
  );
  assert.equal(
    catalanSpelling("Docents per a la preparació del examen"),
    "Docents per a la preparació de l'examen",
  );
  assert.equal(catalanSpelling("Tècnic en el àrea"), "Tècnic en l'àrea");
  assert.equal(catalanSpelling("A el nostre equip"), "Al nostre equip");
});

test("not before a semivowel, the word «i», an «h», a capital letter or a name", () => {
  assert.equal(catalanSpelling("Tècnic del iogurt"), "Tècnic del iogurt");
  assert.equal(
    catalanSpelling("Transferències cap al i des del Regne Unit"),
    "Transferències cap al i des del Regne Unit",
  );
  assert.equal(catalanSpelling("Tècnic de hardware"), "Tècnic de hardware");
  assert.equal(catalanSpelling("Enginyer d'R+D"), "Enginyer d'R+D");
  assert.equal(
    catalanSpelling("Electricista de servei per a Fyrstads El a Uddevalla"),
    "Electricista de servei per a Fyrstads El a Uddevalla",
  );
});
