import { describe, expect, it } from "vitest";
import { readCatalogue } from "../../shared/catalogues/read-catalogue.js";
import { AdvertFacts, createFactReader } from "./index.js";

const reader = async (keptAsWritten: ReadonlySet<string> = new Set()) =>
  createFactReader({
    degrees: await readCatalogue("degrees"),
    languages: await readCatalogue("languages"),
    titles: ["SAP Engineer", "SAP Consultant", "SAP Developer"],
    keptAsWritten,
  });

const advert = {
  source: "feinaactiva",
  title: "SAP DEVELOPER FOR LOGISTICS",
  location: "Barcelona, España",
  description:
    "Work Model: Hybrid\nYou have 3+ years of experience in SAP.\nFluent English is required.",
  contract: "Contracte laboral temporal (6 mesos)",
  hours: "Jornada completa",
};

describe("an advert's facts (FR-1 to FR-8)", () => {
  it("reads every fact of an advert", async () => {
    const facts = (await reader()).facts(advert);
    expect(facts).toEqual({
      workMode: "hybrid",
      contract: { kind: "temporary", months: 6 },
      workingTime: { kind: "full" },
      years: { most: 3, least: 3 },
      degrees: [],
      languages: ["en"],
      title: "SAP Developer for Logistics",
    });
    expect(AdvertFacts.parse(facts)).toEqual(facts);
  });

  it("believes the years a source states, none included", async () => {
    const facts = await reader();
    expect(facts.facts({ ...advert, years: 5 }).years).toEqual({
      most: 5,
      least: 5,
    });
    expect(facts.facts({ ...advert, years: 0 }).years).toBeNull();
  });

  it("keeps the title of a source that asks its content not be altered", async () => {
    expect((await reader(new Set(["feinaactiva"]))).facts(advert).title).toBe(
      "SAP DEVELOPER FOR LOGISTICS",
    );
  });

  it("gives the same facts each time", async () => {
    const facts = await reader();
    expect(facts.facts(advert)).toEqual(facts.facts(advert));
  });
});
