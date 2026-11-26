import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CONFIG_DIRECTORY } from "../../shared/config/load-config.js";
import {
  Portal,
  PORTALS_FILE,
  readPortalList,
  sourceOf,
} from "./portal-list.js";

describe("the portal list (job portals FR-1, FR-2)", () => {
  const portals = readPortalList();

  it("holds the legacy's 865 entries, 227 read, every one switched off with its reason", () => {
    expect(portals).toHaveLength(865);
    expect(portals.filter((portal) => !portal.off)).toHaveLength(227);
    expect(portals.filter((portal) => portal.off)).toHaveLength(638);
    expect(
      portals.every((portal) => !portal.off || portal.off.length > 3),
    ).toBe(true);
  });

  it("gives every portal read a source id of its own", () => {
    const ids = portals.filter((portal) => !portal.off).map(sourceOf);
    expect(new Set(ids).size).toBe(ids.length);
    expect(sourceOf({ name: "Free-Work", host: "www.free-work.com" })).toBe(
      "free-work.com",
    );
    expect(
      sourceOf({
        name: "Jobbird",
        host: "www.jobbird.com",
        key: "jobbird.com-nl",
      }),
    ).toBe("jobbird.com-nl");
  });

  it("credits the legacy in its header", () => {
    expect(readFileSync(join(CONFIG_DIRECTORY, PORTALS_FILE), "utf8")).toMatch(
      /^# [\s\S]*https:\/\/github\.com\/JustJans\/indudex/,
    );
  });

  it("refuses an entry with an unknown field or a pattern that is no pattern", () => {
    expect(
      Portal.safeParse({ name: "X", host: "x.example", read_all: true })
        .success,
    ).toBe(false);
    expect(
      Portal.safeParse({ name: "X", host: "x.example", match: "(" }).success,
    ).toBe(false);
  });
});
