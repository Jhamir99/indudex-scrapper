import { describe, expect, it } from "vitest";
import { realGate } from "../../../test/gate/catalogues.js";
import { gateGolden } from "../../../test/gate/golden.js";
import { classifier } from "./classifier.js";
import { catalanToo, markedFor, markedToo } from "./markets.js";

const gate = await realGate();
const classify = classifier(gate);
const families = (title: string, lang: string) =>
  classify({ title, lang }).families;

describe("the classifier (gate FR-4, FR-5, FR-10)", () => {
  it("reads the trades only for what the main families leave out, the vehicle trades first", () => {
    expect(classify({ title: "Mechanical Engineer", lang: "en" })).toEqual({
      families: ["2144"],
      occupations: ["2144.1"],
      trade: false,
    });
    expect(classify({ title: "Electrician", lang: "en" })).toMatchObject({
      families: ["7411"],
      trade: true,
    });
    expect([
      families("Kfz-Mechatroniker (m/w/d)", "de"),
      families("Mechatroniker (m/w/d)", "de"),
      families("Gas Engineer", "en"),
    ]).toEqual([["7231"], ["3113"], ["7126"]]);
  });

  it("reads the Spanish technician, and German titles the German way, compound roles apart last", () => {
    expect([
      families("Técnico/a automatista", "es"),
      families("Obermonteur Elektrotechnik", "de"),
      families("Entwicklungskonstrukteur", "de"),
      families("Tragwerksplaner (m/w/d)", "de"),
    ]).toEqual([["3113"], ["7411"], ["3118"], ["2142"]]);
  });

  it("reads a title once more in the language of its gender mark", () => {
    expect(markedFor("Industriemechaniker (m/w/d)")).toBe("de");
    expect(markedFor("Technicien de maintenance (H/F)")).toBe("fr");
    expect(
      markedToo({ title: "Industriemechaniker (m/w/d)", lang: "it" }),
    ).toEqual({
      title: "Industriemechaniker (m/w/d)",
      lang: "",
      hintLangs: ["it", "en", "de"],
    });
    expect([
      families("Industriemechaniker (m/w/d)", "it"),
      families("Technicien de maintenance (H/F)", "nl"),
    ]).toEqual([["7233"], ["7233"]]);
  });

  it("reads a Catalan title in Spanish, also out of a catch-all", () => {
    expect(
      catalanToo({ title: "Mecànic/a de manteniment", lang: "ca" })?.title,
    ).toBe("mecánico/a de mantenimiento");
    expect(catalanToo({ title: "Mechanical Engineer", lang: "en" })).toBeNull();
    expect([
      families("Mecànic/a de manteniment", "ca"),
      families("Enginyer/a de processos", "ca"),
    ]).toEqual([["7233"], ["2141"]]);
  });

  it("takes a title the registers confirm, only when no reading took it", () => {
    expect([
      families("- Vacature Werktuigbouwkunde", "nl"),
      families(": AC Technician", "en"),
      families("_Analityk biznesowo-systemowy (praca hybrydowa)", "pl"),
    ]).toEqual([["2144"], ["7127"], ["2511"]]);
  });

  it("gives the same answer twice, fresh arrays from its cache", () => {
    const first = classify({ title: "Software Engineer", lang: "en" });
    first.families.push("x");
    expect(
      classify({ title: "Software Engineer", lang: "en" }).families,
    ).toEqual(["2512"]);
  });

  it("reads every title and code of the legacy's golden set the same", async () => {
    const { langs, cases, codes } = await gateGolden();
    const differ: string[] = [];
    for (const { t, classified } of cases)
      langs.forEach((lang, at) => {
        const { families: f, occupations } = classify({ title: t, lang });
        if (JSON.stringify([f, occupations]) !== JSON.stringify(classified[at]))
          differ.push(
            `${lang} ${t}: ${JSON.stringify([f, occupations])} vs ${JSON.stringify(classified[at])}`,
          );
      });
    for (const { raw, out } of codes) {
      const { families: f, occupations } = classify({
        title: raw.title,
        lang: raw.lang,
        isco: raw.codes.isco,
        ssyk: raw.codes.ssyk,
      });
      if (JSON.stringify({ families: f, occupations }) !== JSON.stringify(out))
        differ.push(
          `${JSON.stringify(raw)}: ${JSON.stringify(f)} vs ${JSON.stringify(out)}`,
        );
    }
    expect(differ).toEqual([]);
  });
});
