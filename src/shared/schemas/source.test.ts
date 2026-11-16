import { describe, expect, it } from "vitest";
import { SourceDefinition, SourceState } from "./source.js";

const brz = {
  id: "brz",
  kind: "feed",
  licence: {
    name: "Bundesrechenzentrum, Stellenausschreibungen",
    short: "BRZ",
    url: "https://www.data.gv.at/",
    licence: "CC BY 4.0, through data.gv.at",
    credit: "Bundesrechenzentrum, CC BY 4.0 (data.gv.at)",
  },
  needsCredentials: false,
};

describe("SourceDefinition (FR-2, FR-9)", () => {
  it("accepts a source without credentials", () => {
    expect(SourceDefinition.parse(brz)).toEqual({
      ...brz,
      credentialVariables: [],
    });
  });

  it("accepts a source that names its credential variables", () => {
    const adzuna = {
      ...brz,
      id: "adzuna",
      needsCredentials: true,
      credentialVariables: ["ADZUNA_APP_ID", "ADZUNA_APP_KEY"],
    };
    expect(SourceDefinition.safeParse(adzuna).success).toBe(true);
  });

  it("rejects a source without licence data", () => {
    const { licence: _licence, ...withoutLicence } = brz;
    expect(
      SourceDefinition.safeParse(withoutLicence).error?.issues[0]?.path,
    ).toEqual(["licence"]);

    const withoutCredit = { ...brz, licence: { ...brz.licence } } as Record<
      string,
      unknown
    >;
    delete (withoutCredit.licence as Record<string, unknown>).credit;
    expect(
      SourceDefinition.safeParse(withoutCredit).error?.issues[0]?.path,
    ).toEqual(["licence", "credit"]);
  });

  it("rejects a source without the credentials flag", () => {
    const { needsCredentials: _needsCredentials, ...withoutFlag } = brz;
    expect(
      SourceDefinition.safeParse(withoutFlag).error?.issues[0]?.path,
    ).toEqual(["needsCredentials"]);
  });

  it("rejects a credentials flag that does not match the variables", () => {
    expect(
      SourceDefinition.safeParse({ ...brz, needsCredentials: true }).error
        ?.issues[0]?.path,
    ).toEqual(["credentialVariables"]);
  });
});

const fields = {
  lastRunAt: "2026-11-15T08:00:00Z",
  advertCount: 42,
  consecutiveFailures: 0,
  unchangedPasses: 0,
  heldDrops: 0,
  nextDueAt: "2026-11-16T08:00:00Z",
};

describe("SourceDefinition credentials (FR-9)", () => {
  const base = {
    id: "jooble",
    kind: "via",
    licence: {
      name: "Jooble",
      short: "Jooble",
      url: "https://jooble.org/",
      licence: "Jooble partner API terms",
      credit: "Jobs by Jooble",
    },
    needsCredentials: true,
  };

  it("takes a list of alternatives as one entry", () => {
    const parsed = SourceDefinition.parse({
      ...base,
      credentialVariables: [["JOOBLE_KEY", "JOOBLE_KEYS"]],
    });
    expect(parsed.credentialVariables).toEqual([["JOOBLE_KEY", "JOOBLE_KEYS"]]);
  });

  it("rejects an empty list of alternatives", () => {
    expect(
      SourceDefinition.safeParse({ ...base, credentialVariables: [[]] })
        .success,
    ).toBe(false);
  });
});

describe("SourceState (FR-10)", () => {
  it.each([
    { status: "enabled", ...fields },
    { status: "disabled", reason: "missing ADZUNA_APP_KEY", ...fields },
    {
      status: "failed",
      reason: "HTTP 503",
      ...fields,
      consecutiveFailures: 2,
    },
    { status: "disallowed", reason: "robots.txt closes /feed", ...fields },
    {
      status: "parked",
      reason: "6 consecutive failures",
      parkedUntil: "2026-12-15T08:00:00Z",
      ...fields,
      consecutiveFailures: 6,
    },
  ])("accepts the $status state", (state) => {
    expect(SourceState.parse(state)).toEqual(state);
  });

  it("reads a state written before heldDrops existed as none held (FR-4)", () => {
    const { heldDrops: _heldDrops, ...older } = fields;
    expect(SourceState.parse({ status: "enabled", ...older })).toEqual({
      status: "enabled",
      ...fields,
    });
  });

  it("accepts a source that never ran", () => {
    const state = {
      status: "enabled",
      lastRunAt: null,
      advertCount: 0,
      consecutiveFailures: 0,
      nextDueAt: null,
    };
    expect(SourceState.safeParse(state).success).toBe(true);
  });

  it("requires a reason for every state other than enabled", () => {
    expect(
      SourceState.safeParse({ status: "failed", ...fields }).error?.issues[0]
        ?.path,
    ).toEqual(["reason"]);
  });

  it("requires the end of the parking period", () => {
    expect(
      SourceState.safeParse({ status: "parked", reason: "x", ...fields }).error
        ?.issues[0]?.path,
    ).toEqual(["parkedUntil"]);
  });

  it("rejects an unknown status and negative counts", () => {
    expect(SourceState.safeParse({ status: "paused", ...fields }).success).toBe(
      false,
    );
    expect(
      SourceState.safeParse({ status: "enabled", ...fields, advertCount: -1 })
        .success,
    ).toBe(false);
  });
});
