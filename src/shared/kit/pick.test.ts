import { describe, expect, it } from "vitest";
import { parseXml, pickAll, pickText } from "./pick.js";

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<jobs>
  <job>
    <id>0123</id>
    <name><![CDATA[Systemtechniker (m/w/d) & Co]]></name>
    <url lang="de">https://www.brz-jobs.at/Job/0123</url>
    <description><![CDATA[<p>Betrieb &amp; Wartung</p>]]></description>
  </job>
  <job>
    <id>0124</id>
    <name>Netzwerktechniker</name>
  </job>
</jobs>`;

describe("picking from XML", () => {
  const document = parseXml(feed);

  it("lists repeated elements", () => {
    const jobs = pickAll(document, "jobs.job");
    expect(jobs).toHaveLength(2);
    expect(jobs.map((job) => pickText(job, "id"))).toEqual(["0123", "0124"]);
  });

  it("reads CDATA as text, untouched", () => {
    const [first] = pickAll(document, "jobs.job");
    expect(pickText(first, "name")).toBe("Systemtechniker (m/w/d) & Co");
    expect(pickText(first, "description")).toBe("<p>Betrieb &amp; Wartung</p>");
  });

  it("reads the text of an element with attributes", () => {
    const [first] = pickAll(document, "jobs.job");
    expect(pickText(first, "url")).toBe("https://www.brz-jobs.at/Job/0123");
    expect(pickText(first, "url.@lang")).toBe("de");
  });

  it("returns a list for a single element too", () => {
    const single = parseXml("<jobs><job><id>1</id></job></jobs>");
    expect(pickAll(single, "jobs.job")).toHaveLength(1);
  });

  it("handles missing elements", () => {
    const [, second] = pickAll(document, "jobs.job");
    expect(pickText(second, "url")).toBe("");
    expect(pickAll(document, "jobs.vacancy")).toEqual([]);
    expect(pickAll(parseXml("<jobs></jobs>"), "jobs.job")).toEqual([]);
  });
});

describe("picking from JSON", () => {
  const response = {
    total: 2,
    hits: [
      { id: 17, title: "Elektroniker", employer: { name: "Example AG" } },
      { id: 18, title: "Mechatroniker", employer: null },
    ],
  };

  it("lists repeated items and reads nested fields", () => {
    const hits = pickAll(response, "hits");
    expect(hits).toHaveLength(2);
    expect(hits.map((hit) => pickText(hit, "employer.name"))).toEqual([
      "Example AG",
      "",
    ]);
  });

  it("reads numbers as text and walks into every item of a list", () => {
    expect(pickText(response, "total")).toBe("2");
    expect(pickAll(response, "hits.title")).toEqual([
      "Elektroniker",
      "Mechatroniker",
    ]);
  });

  it("handles missing fields and values that are not objects", () => {
    expect(pickText(response, "hits.salary")).toBe("");
    expect(pickAll(undefined, "hits")).toEqual([]);
    expect(pickAll("text", "hits")).toEqual([]);
  });
});
