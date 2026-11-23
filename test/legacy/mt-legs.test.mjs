// The legacy's mt-legs.test.mjs (JustJans/indudex@b0cd182), its imports pointed at this repo.
// A title through both legs (builder/mt/legs.mjs), with a stand-in for Firefox that answers from a table: which
// directions are asked, in what order, and what each leg is given.
import { test } from "vitest";
import assert from "node:assert/strict";
import { translateTitles } from "../../src/features/title-translation/legs.ts";

const TABLE = {
  "de-en": {
    Elektriker: "Electrician",
    "Elektriker – Köln": "Electrician – Köln",
  },
  "en-es": {
    Electrician: "Electricista",
    "Electrician – Köln": "Electricista – Köln",
  },
  "en-ca": {
    Electrician: "Electricista",
    "Electrician – Köln": "Electricista – Köln",
  },
};
const stand = (asked) => ({
  translate: async (pair, texts) => {
    asked.push(pair);
    return texts.map((t) => TABLE[pair]?.[t] ?? t);
  },
});

test("a German title goes into English first, then from that English into each language asked", async () => {
  const asked = [];
  const out = await translateTitles(
    "de",
    ["Elektriker"],
    { into: ["en", "es", "ca"] },
    stand(asked),
  );
  assert.deepEqual(Object.keys(out).sort(), ["ca", "en", "es"]);
  assert.equal(out.en[0], "Electrician");
  assert.equal(out.es[0], "Electricista");
  assert.equal(asked[0], "de-en");
  assert.ok(asked.includes("en-es") && asked.includes("en-ca"));
  assert.ok(!asked.includes("en-de"), "not into its own language");
});

test("an English title goes straight to the second leg", async () => {
  const asked = [];
  const out = await translateTitles(
    "en",
    ["Electrician"],
    { into: ["en", "es"] },
    stand(asked),
  );
  assert.deepEqual(Object.keys(out), ["es"]);
  assert.equal(out.es[0], "Electricista");
  assert.ok(asked.every((p) => p === "en-es"));
});

test("the offer's town is kept as written", async () => {
  const out = await translateTitles(
    "de",
    ["Elektriker Köln"],
    { cities: ["Köln"], into: ["en"] },
    stand([]),
  );
  assert.ok(out.en[0].includes("Köln"), out.en[0]);
});
