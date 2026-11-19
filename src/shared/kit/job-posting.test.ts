import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { jobPostings, repairJson, salaryOf } from "./job-posting.js";

const PAGE = "https://example.com/jobs/1";
const ld = (json: string, type = "application/ld+json") =>
  `<html><head><script type="${type}">${json}</script></head><body></body></html>`;

describe("jobPostings (FR-1)", () => {
  it("reads a saved Kuntarekry page", async () => {
    const html = await readFile(
      new URL(
        "../../../test/fixtures/kuntarekry/vacancy-1929241.html",
        import.meta.url,
      ),
      "utf8",
    );
    const [posting, more] = jobPostings(html, PAGE);
    expect(more).toBeUndefined();
    expect(posting).toMatchObject({
      title: "Sairaanhoitaja, Tyks Sydänkeskus, Sydänosasto 1 ja 2, Turku",
      company:
        "Varsinais-Suomen hyvinvointialue, Tyks/sairaalapalvelut, Operatiiviset alat, Tyks Sydänkeskus",
      locality: "Turku",
      region: "Varsinais-Suomi",
      country: "",
      location: "Turku, Varsinais-Suomi",
      url: PAGE,
      posted: "2026-11-16",
      validThrough: "2026-11-30",
      employmentType: [
        "Kokoaikatyö, 3-vuorotyö, Työpaikka, Vakinainen, Anonyymi, Työsuhde",
      ],
      remote: false,
    });
    expect(posting?.description).toMatch(
      /^Kiinnostaako sinua akuutti sydänpotilaan/,
    );
  });

  it("reads postings in a @graph, a list and a mainEntity", () => {
    const graph = ld(
      JSON.stringify({
        "@graph": [
          {
            "@type": "WebPage",
            mainEntity: { "@type": "JobPosting", title: "A" },
          },
          {
            "@type": ["JobPosting"],
            name: "B",
            hiringOrganization: { name: "Acme" },
          },
        ],
      }),
    );
    const list = ld(JSON.stringify([{ "@type": "JobPosting", title: "C" }]));
    expect(jobPostings(graph, PAGE).map((p) => [p.title, p.company])).toEqual([
      ["A", ""],
      ["B", "Acme"],
    ]);
    expect(jobPostings(list, PAGE).map((p) => p.title)).toEqual(["C"]);
  });

  it("reads a block with raw newlines in its strings, as the legacy repaired it", () => {
    const html = ld(
      '{"@type":"JobPosting","title":"Elektriker","description":"Line one\nLine two"}',
    );
    expect(jobPostings(html, PAGE)[0]?.description).toBe("Line one\nLine two");
  });

  it("takes the first address, the country code and remote work", () => {
    const html = ld(
      JSON.stringify({
        "@type": "JobPosting",
        title: "Engineer <h2>Your benefits</h2>",
        jobLocation: [
          { address: [{ addressLocality: "Graz", addressCountry: "AT" }] },
          { address: { addressLocality: "Wien" } },
        ],
        jobLocationType: "TELECOMMUTE",
        employmentType: ["FULL_TIME", "PERMANENT"],
      }),
    );
    expect(jobPostings(html, PAGE)[0]).toMatchObject({
      title: "Engineer",
      locality: "Graz",
      country: "at",
      location: "Graz, AT",
      remote: true,
      employmentType: ["FULL_TIME", "PERMANENT"],
    });
  });

  it("gives none for a page without a JobPosting or with a broken block", () => {
    expect(jobPostings("<html><body>Hello</body></html>", PAGE)).toEqual([]);
    expect(jobPostings(ld('{"@type":"JobPosting",'), PAGE)).toEqual([]);
    expect(
      jobPostings(ld('{"@type":"Organization","name":"Acme"}'), PAGE),
    ).toEqual([]);
  });
});

describe("repairJson", () => {
  it("escapes control characters inside strings only", () => {
    expect(repairJson('{"a":"x\ty"}\n')).toBe('{"a":"x\\ty"}\n');
    expect(repairJson('{"a":"say \\"hi\\"\n"}')).toBe(
      '{"a":"say \\"hi\\"\\n"}',
    );
  });
});

const partTimeOf = (employmentType: unknown) =>
  salaryOf({
    baseSalary: {
      currency: "EUR",
      value: { minValue: 20, maxValue: 25, unitText: "HOUR" },
    },
    employmentType,
  })?.partTime;

describe("salaryOf (pay FR-1)", () => {
  it("reads Google's own example shape", () => {
    expect(
      salaryOf({
        baseSalary: {
          "@type": "MonetaryAmount",
          currency: "EUR",
          value: {
            "@type": "QuantitativeValue",
            minValue: 50000,
            maxValue: 60000,
            unitText: "YEAR",
          },
        },
        employmentType: "FULL_TIME",
      }),
    ).toEqual({ min: 50000, max: 60000, currency: "EUR", period: "YEAR" });
  });

  it("reads a bare number with the period on the salary, and the currency on the posting", () => {
    expect(
      salaryOf({
        baseSalary: { currency: "GBP", value: 42000, unitText: "YEAR" },
      }),
    ).toEqual({ min: 42000, max: 42000, currency: "GBP", period: "YEAR" });
    expect(
      salaryOf({
        salaryCurrency: "PLN",
        baseSalary: { value: { value: 12000, unitText: "MONTH" } },
      }),
    ).toEqual({ min: 12000, max: 12000, currency: "PLN", period: "MONTH" });
  });

  it("is part time when the posting says only that", () => {
    expect([
      partTimeOf(["PART_TIME"]),
      partTimeOf(["PART_TIME", "FULL_TIME"]),
    ]).toEqual([true, undefined]);
  });

  it("gives nothing for no salary, a word, or a salary with no amount", () => {
    expect([
      salaryOf({}),
      salaryOf({ baseSalary: "Competitive" }),
      salaryOf({ baseSalary: { currency: "EUR" } }),
      salaryOf({
        baseSalary: {
          currency: "EUR",
          value: { minValue: null, maxValue: null, unitText: "YEAR" },
        },
      }),
    ]).toEqual([undefined, undefined, undefined, undefined]);
  });

  it("reads a page end to end", () => {
    const [posting] = jobPostings(
      ld(
        '{"@type":"JobPosting","title":"Site Engineer","baseSalary":{"@type":"MonetaryAmount","currency":"EUR","value":{"@type":"QuantitativeValue","minValue":3000,"maxValue":3800,"unitText":"MONTH"}}}',
      ),
      PAGE,
    );
    expect(posting?.pay).toEqual({
      min: 3000,
      max: 3800,
      currency: "EUR",
      period: "MONTH",
    });
  });
});
