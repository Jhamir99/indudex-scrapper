// The legacy's test/mt-legs.test.mjs (JustJans/indudex@ec79858), carried whole (legacy resync T009): its imports pointed at
// this repo.
// A title through both legs (builder/mt/legs.ts), with a stand-in for Firefox that answers from a table: which
// directions are asked, in what order, and what each leg is given.
import { test } from "vitest";
import assert from "node:assert/strict";
import { translateTitles } from "../../src/features/title-translation/legs.ts";
import { brokenWords } from "../../src/features/title-translation/method/checks.ts";

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

// ➤ Firefox's en-es model broke «BFÚ» into «BF�ú» on the server (19 November 2026): part of a letter's bytes.
const BROKEN = "�";

test("a word whose letter Firefox broke is translated again behind a stand-in", async () => {
  const asked = [];
  const firefox = async (pair, texts) => {
    asked.push(...texts);
    return texts.map((t) =>
      t
        .replace(/^BFÚ/u, `BF${BROKEN}ú`)
        .replace("Open Science coordinator", "Coordinador de Open Science"),
    );
  };
  const out = await translateTitles(
    "en",
    ["BFÚ – Open Science coordinator"],
    { into: ["es"] },
    { translate: firefox },
  );
  assert.equal(out.es[0], "BFÚ – Coordinador de Open Science");
  assert.ok(
    !asked.at(-1).includes("BFÚ"),
    "asked again with the word behind a stand-in",
  );
});

test("a title whose broken letter cannot be traced back is shown as written", async () => {
  const firefox = async (pair, texts) =>
    texts.map(() => `Coordinador de Open Sci${BROKEN}nce`);
  const out = await translateTitles(
    "en",
    ["Open Science coordinator"],
    { into: ["es"] },
    { translate: firefox },
  );
  assert.equal(out.es[0], "Open Science coordinator");
});

test("the words Firefox broke are found in the title as it writes them", () => {
  assert.deepEqual(
    brokenWords("BFÚ – job offer", `BF${BROKEN}ú – oferta de trabajo`),
    ["BFÚ"],
  );
  assert.deepEqual(
    brokenWords("Analog / Mixed-Signal", `Analógico / Se${BROKEN}nsida Mixta`),
    [],
  );
  assert.deepEqual(
    brokenWords(`Z${BROKEN}rich`, `Z${BROKEN}rich`),
    [],
    "a letter the title itself lost is not Firefox’s",
  );
});
