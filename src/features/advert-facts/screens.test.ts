import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { FIXTURES_DIRECTORY } from "../../../test/contract/adapter-contract.js";
import { readCatalogue } from "../../shared/catalogues/read-catalogue.js";
import {
  compileScreens,
  requiredDegrees,
  requiredLanguages,
  type Screens,
} from "./screens.js";

let screens: Screens;

beforeAll(async () => {
  screens = compileScreens({
    degrees: await readCatalogue("degrees"),
    languages: await readCatalogue("languages"),
  });
});

describe("the degrees an advert demands (FR-6)", () => {
  it("reads a degree word with a field", () => {
    expect(
      requiredDegrees(
        "You hold a degree in mechanical or electrical engineering.",
        screens,
      ),
    ).toEqual(expect.arrayContaining(["mechanical", "electrical"]));
  });

  it("reads none when the degree is a plus, or named without a demand", () => {
    expect(
      requiredDegrees("A degree in mechanical engineering is a plus.", screens),
    ).toEqual([]);
    expect(
      requiredDegrees("Our Scrum Master works near the university.", screens),
    ).toEqual([]);
  });
});

describe("the languages an advert requires (FR-7)", () => {
  it.each([
    ["Fluent German is required.", ["de"]],
    ["Gute Deutschkenntnisse in Wort und Schrift.", ["de"]],
    ["Imprescindible inglés nivel alto.", ["en"]],
    ["German is a plus.", []],
    ["Englischkenntnisse von Vorteil.", []],
    ["Vous parlez anglais, souhaité.", []],
    ["You will manage our German market.", []],
    ["A polished presentation is required.", []],
    ["Englisch oder Deutsch fließend.", []],
  ])("reads «%s» as %j", (text, codes) => {
    expect(requiredLanguages(text, screens)).toEqual(codes);
  });

  it("reads a line under a «Nice to have» heading as softened", () => {
    expect(
      requiredLanguages("Nice to have:\nDutch language skills", screens),
    ).toEqual([]);
  });
});

describe("degrees and languages, as the legacy read them", () => {
  it("reads every text of the legacy's tests the same", async () => {
    const { cases } = JSON.parse(
      await readFile(
        join(FIXTURES_DIRECTORY, "advert-facts", "screens.json"),
        "utf8",
      ),
    ) as {
      cases: { text: string; degrees: string[]; languages: string[] }[];
    };
    const differing = cases.filter(
      (one) =>
        JSON.stringify(requiredDegrees(one.text, screens)) !==
          JSON.stringify(one.degrees) ||
        JSON.stringify(requiredLanguages(one.text, screens)) !==
          JSON.stringify(one.languages),
    );
    expect(cases.length).toBeGreaterThan(300);
    expect(differing).toEqual([]);
  });
});
