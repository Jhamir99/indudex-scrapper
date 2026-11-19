import { describe, expect, it } from "vitest";
import { loadUntranslated } from "./untranslated.js";

describe("config/untranslated.yml", () => {
  it("names the sources whose terms forbid altering their content", async () => {
    const sources = await loadUntranslated();
    expect([...sources]).toEqual(
      expect.arrayContaining([
        "sne",
        "feinaactiva",
        "gencat",
        "madrid",
        "clm",
        "solidjobs",
      ]),
    );
  });
});
