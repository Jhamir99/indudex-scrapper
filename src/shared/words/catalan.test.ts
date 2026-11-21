import { describe, expect, it } from "vitest";
import { catalanToo } from "./catalan.js";

describe("a Catalan title read in Spanish", () => {
  it("reads a title the source says is Catalan, or one with a word only Catalan writes", () => {
    expect(
      catalanToo({ title: "Mecànic/a de manteniment", lang: "ca" })?.title,
    ).toBe("mecánico/a de mantenimiento");
    expect(catalanToo({ title: "Tècnic/a de manteniment" })?.title).toBe(
      "técnico/a de mantenimiento",
    );
  });

  it("keeps the advert's other fields and says it is Spanish now", () => {
    expect(
      catalanToo({ title: "Fuster", lang: "ca", isco: "7115" }),
    ).toMatchObject({ isco: "7115", lang: "es", hintLangs: ["es"] });
  });

  it("reads none in a title of another language, nor one that reads the same", () => {
    expect(catalanToo({ title: "Mechanical Engineer", lang: "en" })).toBeNull();
    expect(catalanToo({ title: "Electricista", lang: "ca" })).toBeNull();
  });

  it("never reads a word from the properties every object has (NOB-15)", () => {
    expect(catalanToo({ title: "Tècnic constructor", lang: "ca" })?.title).toBe(
      "técnico constructor",
    );
  });
});
