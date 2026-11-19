import { describe, expect, it } from "vitest";
import { createEmployerReader, type EmployerAdvert } from "./employer.js";

const advert = (fields: Partial<EmployerAdvert>): EmployerAdvert => ({
  company: "Siemens AG",
  title: "Elektroingenieur (m/w/d)",
  url: "https://jobs.example/1",
  description: "",
  ...fields,
});

describe("an advert's employer (companies FR-1 to FR-4, FR-9)", () => {
  it("gives the name as shown, its key and whether it is an agency's", () => {
    const read = createEmployerReader([]);
    expect(read(advert({}))).toEqual({
      name: "Siemens AG",
      key: "siemens",
      agency: false,
    });
    expect(
      read(advert({ company: "Randstad Deutschland GmbH & Co. KG" })),
    ).toEqual({
      name: "Randstad Deutschland GmbH & Co. KG",
      key: "randstad deutschland",
      agency: true,
    });
    expect(read(advert({ company: "Confidencial" }))).toEqual({
      name: "",
      key: "",
      agency: false,
    });
  });

  it("writes the source's names as its adverts do first", () => {
    const adverts = [
      advert({
        company: "JACKSON HOGG",
        description: "Jackson Hogg is hiring",
      }),
    ];
    expect(
      createEmployerReader(adverts)(adverts[0] as EmployerAdvert).name,
    ).toBe("Jackson Hogg");
  });

  it("names no one when the employer is the advert's own town, but on a site of that name", () => {
    const read = createEmployerReader([]);
    expect(
      read(
        advert({ company: "London", url: "https://www.justjobs.co.uk/job/1" }),
        "London",
      ).name,
    ).toBe("");
    expect(
      read(advert({ company: "Rehau", url: "https://rehau.jobs/1" }), "Rehau")
        .name,
    ).toBe("Rehau");
    expect(read(advert({ company: "London" })).name).toBe("London");
  });

  it("reads the same twice", () => {
    const read = createEmployerReader([]);
    expect(read(advert({}))).toEqual(read(advert({})));
  });
});
