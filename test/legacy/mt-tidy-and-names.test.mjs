// The legacy's test/mt-tidy-and-names.test.mjs (JustJans/indudex@ec79858), carried whole (legacy resync T009): its imports pointed at
// this repo.
// ➤ What the translator's tests ran without checking (TB2-20): the English made ready for the second leg, every cache
// ➤ walked by towns-back, a town of several words, company names ending in a legal form's letters, and town names
// ➤ through the Catalan spelling.
import { test } from "vitest";
import assert from "node:assert/strict";
import {
  sentenceCaseEn,
  tidyEnglish,
} from "../../src/features/title-translation/method/english-tidy.ts";
import {
  backAll,
  withTownsBack,
} from "../../src/features/title-translation/method/towns-back.ts";
import {
  companyCore,
  companySpan,
} from "../../src/features/title-translation/method/companies.ts";
import {
  apostrophes,
  besideTowns,
  catalanSpelling,
} from "../../src/features/title-translation/method/catalan-spelling.ts";

test("the English for the second leg: the level off, an acronym apart, the dash after the job", () => {
  assert.deepEqual(
    tidyEnglish(
      [
        "Senior Electrician Munich",
        "TIG-Welder Pipeline Construction",
        "Electrician",
      ],
      ["Senior", "", ""],
      "both",
    ),
    [
      "Electrician – Munich",
      "TIG welder – pipeline construction",
      "Electrician",
    ],
  );
  assert.deepEqual(
    tidyEnglish(["Work Planner Foundation Technology"], [], "dash"),
    ["Work Planner – Foundation Technology"],
  );
  assert.deepEqual(
    tidyEnglish(["Work Planner Foundation Technology"], [], "case"),
    ["Work planner Foundation technology"],
  );
});

test("Title Case lowered where English titles write the word small, names and acronyms kept", () => {
  assert.equal(
    sentenceCaseEn("Senior Java Developer Assembly Technician"),
    "Senior Java developer assembly technician",
  );
  assert.equal(sentenceCaseEn("SAP HANA Consultant"), "SAP HANA consultant");
});

test("towns-back walks a whole cache, changes only the translations that renamed a town, and says which", () => {
  const cache = new Map([
    ["Metallbauer in Köln", "Metaalbouwer in Keulen"],
    ["Elektriker", "Elektricien"],
  ]);
  const { fixed, shown } = backAll(cache);
  assert.equal(fixed, 1);
  assert.deepEqual(
    [...cache.values()],
    ["Metaalbouwer in Köln", "Elektricien"],
  );
  assert.match(shown[0], /Keulen → Metaalbouwer in Köln$/);
});

test("a town of several words is written back whole", () => {
  assert.equal(
    withTownsBack(
      "Elektriker Frankfurt am Main",
      "Electricista Fráncfort del Meno",
    ),
    "Electricista Frankfurt am Main",
  );
});

test("a company's legal form comes off only as a word of its own; the title keeps it with the name", () => {
  assert.deepEqual(
    ["Rimasa", "Tecnisa SA", "Ibersa, S.L.", "Atlas Copco GmbH & Co. KG"].map(
      companyCore,
    ),
    ["Rimasa", "Tecnisa", "Ibersa", "Atlas Copco"],
  );
  assert.equal(
    companySpan("Elektriker bei Tecnisa SA in Berlin", "Tecnisa SA"),
    "Tecnisa SA",
  );
  assert.equal(companySpan("Mechaniker bei Rimasa", "Rimasa"), "Rimasa");
});

test("town names keep their spelling through the Catalan steps; the «de» before them takes its apostrophe", () => {
  const spell = (t) => apostrophes(catalanSpelling(t));
  assert.equal(
    spell("Electricista de Torrejón de Ardoz"),
    "Electricista de Torrejón d'Ardoz",
    "without the town kept",
  );
  assert.equal(
    besideTowns(
      "Electricista de Torrejón de Ardoz",
      ["Torrejón de Ardoz"],
      spell,
    ),
    "Electricista de Torrejón de Ardoz",
  );
  assert.equal(
    besideTowns("Tècnic de Alcalá de Henares", ["Alcalá de Henares"], spell),
    "Tècnic d'Alcalá de Henares",
  );
  assert.equal(
    besideTowns("Operari a El Ejido", ["El Ejido"], spell),
    "Operari a El Ejido",
  );
  assert.equal(
    catalanSpelling("Tècnic a El Prat de Llobregat"),
    "Tècnic a El Prat de Llobregat",
  );
});
