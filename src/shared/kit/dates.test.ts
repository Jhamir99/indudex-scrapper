import { describe, expect, it } from "vitest";
import { parseDay } from "./dates.js";

describe("parseDay", () => {
  it.each([
    ["2026-11-01", "2026-11-01"],
    ["2026-11-01T10:15:00Z", "2026-11-01"],
    ["2026-11-01T23:30:00+01:00", "2026-11-01"],
    ["2026-11-01 10:15:00", "2026-11-01"],
    ["01.11.2026", "2026-11-01"],
    ["1.11.2026 08:30", "2026-11-01"],
    ["01/11/2026", "2026-11-01"],
    ["01-11-2026", "2026-11-01"],
    ["Sat, 01 Nov 2026 10:00:00 GMT", "2026-11-01"],
    ["1 Nov 2026", "2026-11-01"],
    ["  2026-11-01  ", "2026-11-01"],
  ])("reads %j", (input, expected) => {
    expect(parseDay(input)).toBe(expected);
  });

  it.each([
    "",
    "tomorrow",
    "2026-02-30",
    "31.04.2026",
    "2026-13-01",
    "11/2026",
    "Sat, 01 Foo 2026",
    "20261101",
  ])("returns nothing for %j", (input) => {
    expect(parseDay(input)).toBeUndefined();
  });

  it("returns nothing for what is not text", () => {
    expect(parseDay(undefined)).toBeUndefined();
    expect(parseDay(null)).toBeUndefined();
    expect(parseDay(1_792_101_600_000)).toBeUndefined();
  });
});
