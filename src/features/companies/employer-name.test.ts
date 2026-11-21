import { describe, expect, it } from "vitest";
import { goldenNames } from "../../../test/companies/golden.js";
import { withoutClutter } from "../../shared/kit/clutter.js";
import {
  companyName,
  companyOfAdvert,
  genericName,
  spelledCompany,
} from "./employer-name.js";

describe("the employer's name (companies FR-1)", () => {
  it("takes off a leading sign, a tax number, a careers site's words and a slogan", () => {
    expect(
      [
        ". AECOM Limited",
        "AXXON SELECTING ETT, S.L. B17383910",
        "Stellenangebote bei Siemens",
        "BASF - At BASF, we offer great careers!",
        "Karriere - Kernkraftwerk Gösgen-Däniken AG",
        "Jobs - Implenia",
        "adesso Group Stellenportal",
        "Bosch™ Rexroth",
        "Jobs in Mind",
      ].map(companyName),
    ).toEqual([
      "AECOM Limited",
      "AXXON SELECTING ETT, S.L.",
      "Siemens",
      "BASF",
      "Kernkraftwerk Gösgen-Däniken AG",
      "Implenia",
      "adesso Group",
      "Bosch Rexroth",
      "Jobs in Mind",
    ]);
  });

  it("names no one with a word for a company, a department, a country, a board or a pay", () => {
    expect(
      [
        "EMPRESA",
        "Human Resources",
        "Spain",
        "Jobriver IT Jobbörse",
        "Jobs for Indeed",
        "Ihr Firmenname",
        "£22/hour",
        "Karriere",
      ].map(companyName),
    ).toEqual(["", "", "", "", "", "", "", ""]);
    expect(["Jobs", "Careers", "Siemens"].map(genericName)).toEqual([
      true,
      true,
      false,
    ]);
  });

  it("names no one when the reader took the title, a place's portal or a field's board", () => {
    expect(
      [
        {
          company: "Fire and Security Engineer",
          title: "Fire and Security Engineer",
          url: "https://www.4wayrecruitment.co.uk/job/1",
        },
        {
          company: "Karriere Südtirol",
          title: "x",
          url: "https://www.karriere-suedtirol.com/job/1",
        },
        { company: "Architektur Stellen", title: "x", url: "https://x.ch/1" },
      ].map(companyOfAdvert),
    ).toEqual(["", "", ""]);
    expect(
      companyOfAdvert({
        company: "HUBER+SUHNER",
        title: "HUBER+SUHNER",
        url: "https://www.hubersuhner.com/jobs/1",
      }),
    ).toBe("HUBER+SUHNER");
  });

  it("spells a name copied from the address as the text writes it", () => {
    expect([
      spelledCompany(
        "Froewag",
        "https://froewag.de/jobs/1",
        "Die Fröwag GmbH sucht",
      ),
      spelledCompany(
        "Fastlta",
        "https://fastlta.jobs.personio.de/job/1",
        "Bei FAST LTA arbeiten",
      ),
      spelledCompany(
        "Igh",
        "https://igh.recruitee.com/o/1",
        "Bei IG&H suchen wir",
      ),
      spelledCompany(
        "HEIDELBERG",
        "https://heidelberg.com/1",
        "HEIDELBERG ist",
      ),
    ]).toEqual(["Fröwag", "FAST LTA", "IG&H", "HEIDELBERG"]);
  });

  it("takes clutter out of a field: an address, a phone, placeholders, pictures, direction marks", () => {
    expect(
      [
        "Siemens - www.siemens.com",
        "Bei Interesse 0151-12345678",
        "null null null 2000 Antwerpen",
        "🛠️ Électricien",
        "C#",
        "Acme‮GmbH",
        "Müntener & Thomas<br>Personal",
      ].map((field) => withoutClutter(field)),
    ).toEqual([
      "Siemens",
      "",
      "2000 Antwerpen",
      "Électricien",
      "C#",
      "AcmeGmbH",
      "Müntener & Thomas Personal",
    ]);
  });

  it("reads every name of the legacy's golden set the same", async () => {
    const differ = (await goldenNames()).filter(
      ({ s, name, clutter }) =>
        companyName(s) !== name || withoutClutter(s) !== clutter,
    );
    expect(differ.map(({ s }) => s)).toEqual([]);
  });
});
