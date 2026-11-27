import { describe, expect, it } from "vitest";
import { readCatalogue } from "../../shared/catalogues/read-catalogue.js";
import { readPlaces } from "../../shared/catalogues/places.js";
import { createPlacer } from "./index.js";

const placer = createPlacer({
  places: await readPlaces(),
  nuts: await readCatalogue("nuts"),
  countries: (await readCatalogue("countries")).countries,
  elsewhere: (await readCatalogue("elsewhere")).elsewhere,
});

describe("an advert's country, the world over (career sites FR-10)", () => {
  // The legacy's own answers (builder/normalise.ts placeOfAdvert at JustJans/indudex@ec79858) to the same adverts; the
  // whole copy gave the legacy's answer to each of 33,513 boards' adverts read live on 27 November 2026.
  it("reads the legacy's country and town", () => {
    const cases: [Record<string, string>, string, string][] = [
      [
        {
          url: "https://boards.greenhouse.io/x/jobs/1",
          title: "Field Engineer",
          location: "San Francisco / New York City",
        },
        "us",
        "San Francisco / New York City",
      ],
      [
        {
          url: "https://boards.greenhouse.io/x/jobs/2",
          title: "Data Engineer",
          location: "Delhi, India / Mumbai, India / Bangalore - Remote",
        },
        "in",
        "Delhi",
      ],
      [
        {
          url: "https://jobs.lever.co/x/3",
          title: "Mechatroniker (m/w/d)",
          location: "Emmerthal",
        },
        "de",
        "Emmerthal",
      ],
      [
        {
          url: "https://x.recruitee.com/o/4",
          title: "Site Engineer",
          location: "Europe",
          mode: "onsite",
        },
        "zz",
        "",
      ],
      [
        {
          url: "https://x.recruitee.com/o/5",
          title: "Site Engineer",
          location: "Europe",
        },
        "xx",
        "",
      ],
      [
        {
          url: "https://x.wd3.myworkdayjobs.com/6",
          title: "Process Engineer",
          location: "Building 7",
          country: "nl",
        },
        "nl",
        "",
      ],
      [
        {
          url: "https://apply.workable.com/x/7",
          title: "Maintenance Technician",
          location: "",
        },
        "",
        "",
      ],
      [
        {
          url: "https://x.teamtailor.com/jobs/8",
          title: "Electrician",
          location: "Baltimore, MD",
        },
        "us",
        "Baltimore",
      ],
      [
        { url: "https://jobs.example.fr/9", title: "Technicien", location: "" },
        "fr",
        "",
      ],
      [
        {
          url: "https://x.bamboohr.com/10",
          title: "Ingeniere (Firenze, FI)",
          location: "Firenze (FI)",
        },
        "it",
        "Firenze",
      ],
    ];
    for (const [advert, country, town] of cases)
      expect(placer.countryOf(advert as never)).toEqual({
        country,
        town,
      });
  });
});
