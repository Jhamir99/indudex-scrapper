import { describe, expect, it } from "vitest";
import { stated } from "./stated.js";

describe("stated source fields (advert-facts FR-1)", () => {
  it("keeps only what the source gives, tidied", () => {
    expect(
      stated({
        contract: "  CDI ",
        hours: "",
        employmentType: ["FULL_TIME", undefined, "FULL_TIME", " "],
        years: Number.NaN,
      }),
    ).toEqual({ contract: "CDI", employmentType: ["FULL_TIME"] });
  });

  it("caps a value to what the store takes", () => {
    expect(stated({ hours: "x".repeat(500) }).hours).toHaveLength(200);
  });

  it("keeps years that are a count", () => {
    expect(stated({ years: 2 })).toEqual({ years: 2 });
    expect(stated({ years: -1 })).toEqual({});
  });
});
