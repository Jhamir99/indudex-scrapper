import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { jobPostings, repairJson } from "./job-posting.js";

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
