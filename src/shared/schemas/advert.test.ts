import { describe, expect, it } from "vitest";
import { Advert, advertId, DESCRIPTION_LIMIT } from "./advert.js";

const completeAdvert = {
  id: advertId("brz", "4711"),
  source: "brz",
  sourceId: "4711",
  title: "Systemtechniker (m/w/d)",
  company: "Bundesrechenzentrum",
  location: "Wien, Österreich",
  country: "at",
  city: "Wien",
  remote: false,
  workMode: "hybrid",
  url: "https://www.brz-jobs.at/Job/4711",
  description: "Betrieb von Serverlandschaften.",
  posted: "2026-11-01",
  expires: "2026-12-01",
  occupationCodes: { isco: "3513" },
  language: "de",
  attribution: {
    licence: "CC BY 4.0, through data.gv.at",
    credit: "Bundesrechenzentrum, CC BY 4.0 (data.gv.at)",
  },
};

function rejectionPaths(input: unknown): string[] {
  const result = Advert.safeParse(input);
  expect(result.success).toBe(false);
  return result.error?.issues.map((issue) => issue.path.join(".")) ?? [];
}

describe("Advert (FR-1, FR-2)", () => {
  it("accepts a complete advert", () => {
    expect(Advert.parse(completeAdvert)).toEqual(completeAdvert);
  });

  it("accepts an advert without dates, work mode or codes, and with no credit required", () => {
    const {
      posted: _posted,
      expires: _expires,
      workMode: _workMode,
      ...rest
    } = completeAdvert;
    const minimal = {
      ...rest,
      occupationCodes: {},
      attribution: { licence: "Public domain", credit: null },
    };
    expect(Advert.safeParse(minimal).success).toBe(true);
  });

  it("rejects a missing or blank title", () => {
    const { title: _title, ...withoutTitle } = completeAdvert;
    expect(rejectionPaths(withoutTitle)).toEqual(["title"]);
    expect(rejectionPaths({ ...completeAdvert, title: "   " })).toEqual([
      "title",
    ]);
  });

  it("rejects an address that is not https", () => {
    const paths = rejectionPaths({
      ...completeAdvert,
      url: "http://www.brz-jobs.at/Job/4711",
    });
    expect(paths).toEqual(["url"]);
  });

  it("rejects a bad date", () => {
    expect(rejectionPaths({ ...completeAdvert, posted: "01.11.2026" })).toEqual(
      ["posted"],
    );
    expect(
      rejectionPaths({ ...completeAdvert, expires: "2026-02-30" }),
    ).toEqual(["expires"]);
  });

  it("rejects a missing licence or credit, with the reason", () => {
    const result = Advert.safeParse({
      ...completeAdvert,
      attribution: { credit: null },
    });
    expect(result.error?.issues[0]?.path).toEqual(["attribution", "licence"]);
    expect(result.error?.issues[0]?.message).toBeTruthy();

    expect(
      rejectionPaths({
        ...completeAdvert,
        attribution: { licence: "CC BY 4.0" },
      }),
    ).toEqual(["attribution.credit"]);

    const { attribution: _attribution, ...withoutAttribution } = completeAdvert;
    expect(rejectionPaths(withoutAttribution)).toEqual(["attribution"]);
  });

  it("has no field for a contact person or an e-mail", () => {
    const fields = Object.keys(Advert.shape);
    expect(
      fields.filter((field) => /contact|mail|phone|person/i.test(field)),
    ).toEqual([]);

    expect(
      rejectionPaths({ ...completeAdvert, contactEmail: "hr@example.com" }),
    ).toEqual([""]);
  });

  it("rejects a description over the limit", () => {
    expect(
      rejectionPaths({
        ...completeAdvert,
        description: "x".repeat(DESCRIPTION_LIMIT + 1),
      }),
    ).toEqual(["description"]);
  });
});

describe("advertId", () => {
  it("is stable and depends only on the source and its own id", () => {
    expect(advertId("brz", "4711")).toBe(advertId("brz", "4711"));
    expect(advertId("brz", "4711")).not.toBe(advertId("brz", "4712"));
    expect(advertId("brz", "4711")).not.toBe(advertId("ams", "4711"));
    expect(advertId("brz", "4711")).toMatch(/^brz-[0-9a-f]{16}$/);
  });
});
