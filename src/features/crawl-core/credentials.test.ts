import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { fakeDefinition } from "../../../test/fakes/source-adapter.js";
import {
  checkCredentials,
  variablesMissingFromExample,
} from "./credentials.js";

const keyed = fakeDefinition("keyed", {
  needsCredentials: true,
  credentialVariables: ["KEYED_APP_ID", "KEYED_APP_KEY"],
});

describe("checkCredentials (FR-9)", () => {
  it("is ready for a source that needs no credentials", () => {
    expect(checkCredentials(fakeDefinition("open"), {})).toEqual({
      ready: true,
      credentials: {},
    });
  });

  it("hands over the values when every variable is set", () => {
    const check = checkCredentials(keyed, {
      KEYED_APP_ID: "id-value",
      KEYED_APP_KEY: "key-value",
      UNRELATED: "x",
    });
    expect(check).toEqual({
      ready: true,
      credentials: { KEYED_APP_ID: "id-value", KEYED_APP_KEY: "key-value" },
    });
  });

  it("reports a missing or blank variable by name, never with a value", () => {
    const check = checkCredentials(keyed, {
      KEYED_APP_ID: "secret-id-value",
      KEYED_APP_KEY: "  ",
    });
    expect(check).toEqual({
      ready: false,
      missing: ["KEYED_APP_KEY"],
      reason: "missing credentials: KEYED_APP_KEY",
    });
    expect(JSON.stringify(check)).not.toContain("secret-id-value");
  });

  it("becomes ready once the variable is provided, with no other change", () => {
    expect(checkCredentials(keyed, {}).ready).toBe(false);
    expect(
      checkCredentials(keyed, { KEYED_APP_ID: "a", KEYED_APP_KEY: "b" }).ready,
    ).toBe(true);
  });
});

const jooble = fakeDefinition("jooble", {
  needsCredentials: true,
  credentialVariables: [["JOOBLE_KEY", "JOOBLE_KEYS"]],
});

describe("checkCredentials with alternatives (FR-9)", () => {
  it("is ready with either alternative and hands over only the ones set", () => {
    expect(checkCredentials(jooble, { JOOBLE_KEY: "one" })).toEqual({
      ready: true,
      credentials: { JOOBLE_KEY: "one" },
    });
    expect(checkCredentials(jooble, { JOOBLE_KEYS: "es=a,de=b" })).toEqual({
      ready: true,
      credentials: { JOOBLE_KEYS: "es=a,de=b" },
    });
  });

  it("is disabled when none is set, naming them all", () => {
    expect(checkCredentials(jooble, { JOOBLE_KEY: " " })).toEqual({
      ready: false,
      missing: ["one of JOOBLE_KEY, JOOBLE_KEYS"],
      reason: "missing credentials: one of JOOBLE_KEY, JOOBLE_KEYS",
    });
  });

  it("mixes plain and alternative entries", () => {
    const mixed = fakeDefinition("mixed", {
      needsCredentials: true,
      credentialVariables: ["MIXED_ID", ["MIXED_KEY", "MIXED_TOKEN"]],
    });
    expect(checkCredentials(mixed, {})).toMatchObject({
      ready: false,
      reason: "missing credentials: MIXED_ID; one of MIXED_KEY, MIXED_TOKEN",
    });
    expect(
      checkCredentials(mixed, { MIXED_ID: "i", MIXED_TOKEN: "t" }),
    ).toEqual({
      ready: true,
      credentials: { MIXED_ID: "i", MIXED_TOKEN: "t" },
    });
  });
});

describe(".env.example (FR-9)", () => {
  it("must list every alternative", () => {
    expect(variablesMissingFromExample([jooble], "JOOBLE_KEY=\n")).toEqual([
      "JOOBLE_KEYS",
    ]);
  });

  it("finds the declared variables an example does not list", () => {
    const example = "# Keyed\nKEYED_APP_ID=\n# KEYED_OPTIONAL=\n";
    expect(variablesMissingFromExample([keyed], example)).toEqual([
      "KEYED_APP_KEY",
    ]);
  });

  it("holds no values for credential variables", async () => {
    const example = await readFile(
      new URL("../../../.env.example", import.meta.url),
      "utf8",
    );
    const filled = example
      .split(/\r?\n/)
      .filter((line) =>
        /^[A-Z][A-Z0-9_]*(KEY|ID|TOKEN|SECRET)S?=\S/.test(line),
      );
    expect(filled).toEqual([]);
  });
});
