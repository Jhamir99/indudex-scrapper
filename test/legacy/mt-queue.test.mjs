// The legacy's mt-queue.test.mjs (JustJans/indudex@b0cd182), its imports pointed at this repo.
// The translator's run without its engine (TRA-10): the queue grouped and handed out, a failing chunk done in halves,
// what leaves the queue, the cache merge with a cut file, and the method's own steps on hostile titles, in time.
import { test } from "vitest";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  afterUnended,
  answersOf,
  groupQueue,
  inHalves,
  nextChunk,
} from "../../src/features/title-translation/queue.ts";
import { NOTHING } from "./translate-shim.mjs";
import { before } from "../../src/features/title-translation/method/method.ts";

const MODELS = new Set(["de-en", "fr-en", "en-es", "en-ca", "nb-en"]);
const w = (t, lang, into = ["ca", "es"]) => ({ t, lang, into });

test("a run never ended: one title alone is set aside, several go last one at a time", () => {
  const one = afterUnended(["Elektriker"], new Set());
  assert.deepEqual(
    [one.stuck, [...one.setAside], one.goLast.size],
    ["Elektriker", ["Elektriker"], 0],
  );
  assert.equal(
    afterUnended(["Elektriker"], new Set(["Elektriker"])).stuck,
    null,
    "already aside: nothing new",
  );
  const many = afterUnended(["a", "b"], new Set());
  assert.deepEqual([many.stuck, [...many.goLast]], [null, ["a", "b"]]);
});

test("the queue in groups by language, the most offered first whatever their group", () => {
  const queue = [
    w("Technicien de maintenance", "fr"),
    w("Elektriker", "de"),
    w("Mécanicien", "fr"),
    w("Elektriker", "no"),
    w("Sähköasentaja", "fi"),
    w("Welder", "en", ["en", "es", "de"]),
  ];
  const { groups, noModel } = groupQueue(queue, MODELS, { size: 2 });
  assert.equal(noModel, 1, "Finnish has no model into English");
  assert.deepEqual(
    [...groups.keys()],
    ["fr|ca,es", "de|ca,es", "nb|ca,es", "en|es"],
  );
  const order = [];
  for (let next; (next = nextChunk(groups));)
    order.push(next.chunk.map((x) => x.t));
  assert.deepEqual(order, [
    ["Technicien de maintenance", "Mécanicien"],
    ["Elektriker"],
    ["Elektriker"],
    ["Welder"],
  ]);
});

test("a title of a chunk a run never ended goes last, alone", () => {
  const queue = [w("a", "fr"), w("b", "fr"), w("c", "fr")];
  const { groups } = groupQueue(queue, MODELS, {
    goLast: new Set(["a"]),
    size: 10,
  });
  const order = [];
  for (let next; (next = nextChunk(groups));)
    order.push(next.chunk.map((x) => x.t));
  assert.deepEqual(order, [["b", "c"], ["a"]]);
});

test("a chunk the engine fails on is done in halves, and a title failing alone gets nothing", async () => {
  const items = ["a", "b", "c", "d", "e"].map((t) => ({ t }));
  const failed = [];
  // The engine fails on any batch of more than two, and on «d» alone.
  const engine = async (part) => {
    if (part.length > 2 || part.some((x) => x.t === "d"))
      throw new Error("aborted");
    return { es: part.map((x) => x.t.toUpperCase()) };
  };
  const out = await inHalves(engine, items, ["es"], (e, part) =>
    failed.push(part.length),
  );
  assert.deepEqual(out.es, ["A", "B", "C", "", "E"]);
  assert.deepEqual(failed, [5, 3, 2, 1]);
});

test("a title leaves the queue only answered in every language; one translated as itself is NOTHING", () => {
  const got = answersOf(
    ["Python Developer", "Elektriker"],
    { es: ["python developer", "Electricista"], ca: ["", "Electricista"] },
    ["es", "ca"],
  );
  assert.deepEqual(got.found, {
    es: [
      ["Python Developer", NOTHING],
      ["Elektriker", "Electricista"],
    ],
    ca: [["Elektriker", "Electricista"]],
  });
  assert.deepEqual([got.answered, got.unanswered], [["Elektriker"], 1]);
});

test("the merge adds to a cache, and a cache cut short stops it with the file kept", () => {
  const dir = mkdtempSync(join(tmpdir(), "mt-merge-"));
  const cache = join(dir, "titles-es.json");
  const merge = (input) =>
    spawnSync(
      process.execPath,
      ["src/features/title-translation/merge.ts", cache],
      { input: JSON.stringify(input) },
    );
  writeFileSync(cache, JSON.stringify({ Elektriker: "Electricista" }));
  assert.equal(merge([["Schweißer", "Soldador"]]).status, 0);
  assert.deepEqual(JSON.parse(readFileSync(cache, "utf8")), {
    Elektriker: "Electricista",
    Schweißer: "Soldador",
  });
  writeFileSync(cache, '{"Elektriker": "Electri');
  assert.notEqual(merge([["Monteur", "Montador"]]).status, 0);
  assert.equal(
    readFileSync(cache, "utf8"),
    '{"Elektriker": "Electri',
    "the cut file is not written over",
  );
});

test("the method's own steps end in time on hostile titles", () => {
  const hostile = [
    "a".repeat(20_000),
    "🔧".repeat(2000) + " Elektriker",
    "((((((((((((((((((((Elektriker))))))))))))))))))))".repeat(50),
    "Monteur - ".repeat(500),
    "Techniker/in (m/w/d) ".repeat(300),
    "- – — | / , . ; : ".repeat(300),
    "Lf 253155 - maintenance worker and mechanical maintenance worker ".repeat(
      40,
    ),
  ];
  for (const pair of ["de-en", "en-es", "en-ca", "es-en"]) {
    for (const t of hostile) {
      // The first time a pattern meets a text it is compiled, a second or more: the second time is counted, which a
      // pattern that backtracks without end would spend again.
      before(pair, t);
      const at = performance.now();
      before(pair, t);
      const ms = performance.now() - at;
      assert.ok(ms < 1000, `${pair} ${t.slice(0, 30)}: ${Math.round(ms)} ms`);
    }
  }
}, 120_000);
