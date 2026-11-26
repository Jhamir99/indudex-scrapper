// The legacy's test/mt-ukrainian.test.mjs (JustJans/indudex@ec79858), carried whole (legacy resync T009): its imports pointed at
// this repo.
// Into Ukrainian (builder/mt/method.ts): the stand-ins Firefox keeps in Latin letters, the towns it would write in
// Cyrillic kept as names, and the English or code names it leaves in front of the job put after it.
import { test } from "vitest";
import assert from "node:assert/strict";
import {
  before,
  lostNames,
  ukrainianOrder,
} from "../../src/features/title-translation/method/method.ts";

test("a lost name goes behind a stand-in Firefox keeps in Latin letters into Ukrainian", () => {
  const { text, info } = before(
    "en-uk",
    "Electrician in Holten",
    "",
    "",
    "Elektricien in Holten",
  );
  const again = lostNames(text, "Електрик в Холтен", info, false, "en-uk");
  assert.ok(
    again &&
      /(?<![\p{L}])Nokia(?![\p{L}])/u.test(again.text) &&
      !/Kafka/.test(again.text),
    JSON.stringify(again),
  );
  assert.deepEqual(
    again.put.find(([stand]) => stand === "Nokia"),
    ["Nokia", "Holten"],
  );
});

test("a town the title it came from writes the same is kept as a name into Ukrainian, not into the others", () => {
  const names = (pair) =>
    before(
      pair,
      "Maintenance technician in Zevenbergen",
      "",
      "",
      "Onderhoudsmonteur in Zevenbergen",
    ).info.names;
  assert.ok(names("en-uk").includes("Zevenbergen"));
  assert.ok(!names("en-pl").includes("Zevenbergen"));
  assert.ok(
    !before(
      "en-uk",
      "Senior Vendor Specialist",
      "",
      "",
      "Senior Vendor Specialist",
    ).info.names.includes("Vendor"),
    'only after "in", "region" or "near"',
  );
});

test("an English or code name left in front of the job goes after it", () => {
  assert.equal(ukrainianOrder("TIG Зварювальник"), "Зварювальник TIG");
  assert.equal(
    ukrainianOrder("Досвідчений C# .NET Розробник – CDI Nancy"),
    "Досвідчений розробник C# .NET – CDI Nancy",
  );
  assert.equal(
    ukrainianOrder("Fullstack Java & Cloud Розробник - Bordeaux"),
    "Розробник Fullstack Java & Cloud - Bordeaux",
  );
  assert.equal(
    ukrainianOrder("Middle Інженер"),
    "Middle Інженер",
    "a level said in English stays in front",
  );
  assert.equal(
    ukrainianOrder("ІТ системний адміністратор – Windows в Baunatal"),
    "ІТ системний адміністратор – Windows в Baunatal",
    "not a preposition",
  );
});

test("a title with a capital on every word keeps the capitals Ukrainian writes", () => {
  assert.equal(
    ukrainianOrder(
      "Головний Менеджер З Продуктів – Управління Зміною Баз Даних (Віддалено, US)",
    ),
    "Головний менеджер з продуктів – Управління зміною баз даних (Віддалено, US)",
  );
  assert.equal(
    ukrainianOrder("Керівник будівництва – ОВіК і сантехніка Berlin"),
    "Керівник будівництва – ОВіК і сантехніка Berlin",
  );
});
