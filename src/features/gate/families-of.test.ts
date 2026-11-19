import { describe, expect, it } from "vitest";
import { realGate } from "../../../test/gate/catalogues.js";
import { gateGolden } from "../../../test/gate/golden.js";
import { familiesOf, type GateRaw, occupationsOf } from "./families-of.js";

const gate = await realGate();
const read = (
  title: string,
  lang: string,
  codes: Partial<Pick<GateRaw, "isco" | "ssyk">> = {},
  german = false,
  split = false,
) => {
  const raw: GateRaw = { title, lang, ...codes };
  const families = familiesOf(raw, gate.main, german, split);
  return [families, occupationsOf(raw, families, gate.main, german, split)];
};

describe("an advert's families and occupations (gate FR-1 to FR-3, FR-6)", () => {
  it("believes the source's ISCO code, and leaves out a code the vertical does not hold", () => {
    expect(read("Mechanical Engineer", "en", { isco: "2144" })).toEqual([
      ["2144"],
      ["2144.1"],
    ]);
    expect(read("Mechanical Engineer", "en", { isco: "2431" })).toEqual([
      [],
      [],
    ]);
  });

  it("reads an SSYK concept of several families into those its title names, else all", () => {
    const [id, families] =
      [...gate.main.bySsyk].find(([, ids]) => ids.length > 1) ?? [];
    expect(families?.length).toBeGreaterThan(1);
    expect(familiesOf({ title: "", lang: "sv", ssyk: id }, gate.main)).toEqual(
      families,
    );
  });

  it("reads a mechanical engineer in any language, and not a sales engineer", () => {
    expect(
      [
        ["Ingeniero/a mecánico", "es"],
        ["Maschinenbauingenieur (m/w/d)", "de"],
        ["Werktuigbouwkundig ingenieur", "nl"],
        ["Mechanical Sales Engineer", "en"],
      ].map(([title = "", lang = ""]) => read(title, lang)[0]),
    ).toEqual([["2144"], ["2144"], ["2144"], []]);
  });

  it("sends a bare engineer to the discipline it names, else to 2149, and computing to its family", () => {
    expect(
      [
        ["Engineer", "en"],
        ["Senior Project Engineers", "en"],
        ["Design Engineer - Electrical", "en"],
        ["Bauingenieur", "de"],
        ["Software Engineer", "en"],
        ["Data Engineer", "en"],
        ["IT-Sicherheitsberater", "de"],
        ["Techniker Elektrotechnik", "de"],
        ["Supervisor de obra", "es"],
        ["Marketing Specialist", "en"],
      ].map(([title = "", lang = ""]) => read(title, lang)[0]),
    ).toEqual([
      ["2149"],
      ["2149"],
      ["2151"],
      ["2142"],
      ["2512"],
      ["2519"],
      ["2529"],
      ["3113"],
      ["3123"],
      [],
    ]);
  });

  it("reads the Italian «ai» as AI only when it is", () => {
    expect([
      read("Sviluppatore AI", "it")[0],
      read("Cameriera ai piani", "it")[0],
    ]).toEqual([["2519"], []]);
  });

  it("sets a hardware developer apart in the German pass", () => {
    expect(read("Hardwareentwickler", "de", {}, true, true)).toEqual([
      ["2152"],
      ["2152.1"],
    ]);
  });

  it("names the occupation inside the family, or the discipline's own when a route filed it", () => {
    expect(
      [
        read("Naval Architect", "en"),
        read("Mechanical Design Engineer", "en"),
        read("Werktuigbouwkundig ingenieur", "nl"),
      ].map(([, occupations]) => occupations),
    ).toEqual([["2144.1.14"], ["2144.1"], ["2144.1", "2144.1.12"]]);
  });

  it("reads every title of the legacy's golden set into the same main families", async () => {
    const { langs, cases } = await gateGolden();
    const differ: string[] = [];
    for (const { t, main } of cases)
      langs.forEach((lang, at) => {
        const got = familiesOf({ title: t, lang }, gate.main);
        if (JSON.stringify(got) !== JSON.stringify(main[at]))
          differ.push(
            `${lang} ${t}: ${JSON.stringify(got)} vs ${JSON.stringify(main[at])}`,
          );
      });
    expect(cases.length).toBeGreaterThan(800);
    expect(differ).toEqual([]);
  });
});
