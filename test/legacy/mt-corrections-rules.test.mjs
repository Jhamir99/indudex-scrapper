// The legacy's mt-corrections-rules.test.mjs (JustJans/indudex@b0cd182), its imports pointed at this repo.
// Every correction rule at work in at least one title, and the titles they must leave alone (TB2-02): a rule broken,
// or one added with no case, fails here. The cases are in test/fixtures/mt-corrections.json.
import { test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import {
  RULES,
  correct,
} from "../../src/features/title-translation/method/corrections.ts";

const { fires, keeps } = JSON.parse(
  readFileSync(
    new URL(
      "../fixtures/title-translation/mt-corrections.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const ruleName = (i) => `rule ${i} (${RULES[i][0]}: ${RULES[i][2]})`;

test("each case comes out as written", () => {
  for (const [target, title, out, right] of fires)
    assert.equal(correct(title, out, target), right, `${target}: ${title}`);
});

test("every rule changes at least one case", () => {
  const fired = new Set();
  for (const [target, title, out] of fires) correct(title, out, target, fired);
  const idle = RULES.map((_, i) => i).filter((i) => !fired.has(i));
  assert.deepEqual(
    idle.map(ruleName),
    [],
    "rules with no case in test/fixtures/mt-corrections.json",
  );
});

test("titles the rules must leave alone stay as they are", () => {
  for (const [target, title, out] of keeps)
    assert.equal(correct(title, out, target), out, `${target}: ${title}`);
});
