// The legacy's assertion kit (Argus v1.11.0's server-bot/test-harness.mjs) on Vitest: each `eq` and
// `ok` of a legacy test file is a test of its own, compared as the legacy compared, by JSON.
import { expect, test } from "vitest";

export function harness(name) {
  let n = 0;
  const ok = (cond, label) => {
    n++;
    test(`${name} ${n}: ${label}`, () => expect(Boolean(cond)).toBe(true));
  };
  const eq = (got, want, label) => {
    n++;
    test(`${name} ${n}: ${label}`, () =>
      expect(JSON.stringify(got)).toBe(JSON.stringify(want)));
  };
  return { ok, eq, done: () => undefined };
}
