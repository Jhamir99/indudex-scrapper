import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FIXTURES_DIRECTORY } from "../../../test/contract/adapter-contract.js";
import { extractRequiredYears } from "./argus/requirements.js";
import { yearsAsked, yearsRange } from "./years.js";

describe("Argus's years reader", () => {
  it("reads a number beside an experience word, the low end of a range, not a boast", () => {
    expect(extractRequiredYears("you have 3-5 years of experience")).toBe(3);
    expect(extractRequiredYears("more than 3 years of experience")).toBe(4);
    expect(
      extractRequiredYears("for over 25 years our experience serves clients"),
    ).toBeNull();
    expect(
      extractRequiredYears("ideally 4 years of experience in the field"),
    ).toBeNull();
  });
});

describe("the years an advert asks (FR-5)", () => {
  it("reads a list with no full stops one line at a time", () => {
    expect(
      yearsAsked(
        "",
        "Our team is great\n3+ years of backend experience\nWe offer a bonus",
      ),
    ).toBe(3);
  });

  it("reads a heading with the line under it", () => {
    expect(
      yearsAsked(
        "",
        "About you\nMinimum Qualifications Required:\n7–10 years in heavy industrial construction",
      ),
    ).toBe(7);
  });

  it.each([
    ["Entre 7 et 12 ans d'expérience", 7],
    ["Esperienza tra 3 e 5 anni nel ruolo", 3],
    ["Expérience significative dans le domaine (minimum 5 ans)", 5],
    ["Mindestens zwei Jahre Berufserfahrung", 2],
  ])("reads «%s» as %i", (text, years) => {
    expect(yearsAsked("", text)).toBe(years);
  });

  it("reads a ceiling, a warranty and the company's own years as asking nothing", () => {
    expect(yearsAsked("", "Less than 3 years of experience.")).toBeNull();
    expect(yearsAsked("", "5 years warranty on all products.")).toBeNull();
    expect(
      yearsAsked(
        "",
        "Mit über 15 Jahren Erfahrung bieten wir unseren Kunden Lösungen.",
      ),
    ).toBeNull();
  });

  it("gives the largest and the smallest of several figures", () => {
    expect(
      yearsRange(
        "",
        "10+ years of professional experience.\n3+ years of B2B SaaS sales experience.",
      ),
    ).toEqual({ most: 10, least: 3 });
  });

  it("reads every text of the legacy's tests as the legacy did", async () => {
    const { cases } = JSON.parse(
      await readFile(
        join(FIXTURES_DIRECTORY, "advert-facts", "years.json"),
        "utf8",
      ),
    ) as {
      cases: {
        title: string;
        text: string;
        years: { most: number; least: number } | null;
      }[];
    };
    const differing = cases.filter(
      (one) =>
        JSON.stringify(yearsRange(one.title, one.text)) !==
        JSON.stringify(one.years),
    );
    expect(cases.length).toBeGreaterThan(400);
    expect(differing).toEqual([]);
  });
});
