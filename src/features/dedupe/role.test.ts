import { describe, expect, it } from "vitest";
import { goldenRoles } from "../../../test/dedupe/golden.js";
import { companyOf, jobKey, roleKey, titleKey } from "./role.js";

// The legacy's examples (test/builder.test.mjs) and Argus's rules.
describe("the role an advert is (dedupe FR-3)", () => {
  it("reads a company written two ways as one", () => {
    expect(
      [
        "Sopra Steria ES",
        "Roche Ext",
        "Indra Group",
        "3530 Kyndryl España, S.A.U.",
        "ES03 ARXADA SPAIN S.L.",
        "Back Market",
        "Aircall.io, Inc.",
        "Johnson &amp; Johnson",
        "Grupo Aldesa",
      ].map(companyOf),
    ).toEqual([
      "soprasteria",
      "roche",
      "indra",
      "kyndryl",
      "arxada",
      "backmarket",
      "aircall",
      "johnsonjohnson",
      "aldesa",
    ]);
  });

  it("never empties a name, keeps a word that names someone, reads any alphabet", () => {
    expect(
      [
        "Group",
        "S.A.",
        "Siemens Energy AG",
        "Indra Avitech GmbH",
        "ING Hubs",
        "Ελληνικά Πετρέλαια Α.Ε.",
        "",
      ].map(companyOf),
    ).toEqual([
      "group",
      "sa",
      "siemensenergy",
      "indraavitech",
      "inghubs",
      "ελληνικαπετρελαιααε",
      "",
    ]);
  });

  it("reads a gender tag as no name, and takes only a code in front off", () => {
    expect(
      ["(m/w/d)", "£18000 per annum", "£20000 per annum"].map(companyOf),
    ).toEqual(["", "18000perannum", "20000perannum"]);
  });

  it("keeps a number before a word that names no one, and never cuts a name down to «the» (NOA-23)", () => {
    expect(
      [
        "360 Consulting",
        "3530 Kyndryl España, S.A.U.",
        "The Company",
        "The Group",
        "Grupo Planeta",
      ].map(companyOf),
    ).toEqual([
      "360consulting",
      "kyndryl",
      "thecompany",
      "thegroup",
      "planeta",
    ]);
  });

  it("takes gender tags, schedules, odd dashes and trailing signs off a title", () => {
    expect(
      [
        "Elektroniker (m/w/d)",
        "Projektleiter (All Genders)",
        "Bauleiter (x w m) 80-100%",
        "Power Systems – Engineer.",
        "Techniker (mwd)",
      ].map(titleKey),
    ).toEqual([
      "elektroniker",
      "projektleiter",
      "bauleiter",
      "power systems - engineer",
      "techniker",
    ]);
  });

  it("does not backtrack on a long run of gender letters", () => {
    const started = performance.now();
    titleKey(`Engineer (${"m ".repeat(20_000)}`);
    expect(performance.now() - started).toBeLessThan(500);
  });

  it("decodes entities before comparing", () => {
    expect(roleKey("Acme", "Automation &amp;amp; Controls Engineer")).toBe(
      roleKey("Acme", "Automation & Controls Engineer"),
    );
  });

  it("gives no role to an advert whose employer names no one", () => {
    expect(
      ["", "Adzuna", "LinkedIn", "(m/w/d)"].map((company) =>
        jobKey({ company, title: "Offshore Engineer" }),
      ),
    ).toEqual(["", "", "", ""]);
  });

  it("reads a Catalan title in Spanish, so the two are one role", () => {
    expect(jobKey({ company: "Acme", title: "Tècnic/a de manteniment" })).toBe(
      jobKey({ company: "Acme", title: "Técnico/a de mantenimiento" }),
    );
    expect(jobKey({ company: "Acme", title: "Fuster", language: "ca" })).toBe(
      jobKey({ company: "Acme", title: "Carpintero", language: "es" }),
    );
  });
});

describe("the roles' golden set", () => {
  it("reads every company and title as the legacy did", async () => {
    const { companies, titles } = await goldenRoles();
    expect(companies.length).toBeGreaterThan(900);
    expect(titles.length).toBeGreaterThan(3000);
    expect(
      companies.filter(({ s, key }) => companyOf(s) !== key).map(({ s }) => s),
    ).toEqual([]);
    expect(
      titles
        .filter(
          ({ s, lang, key }) =>
            jobKey({ company: "Acme", title: s, language: lang }) !== key,
        )
        .map(({ s }) => s),
    ).toEqual([]);
  });
});
