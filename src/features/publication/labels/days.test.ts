import { describe, expect, it } from "vitest";
import { advertDays, deadlineInText, isoDay, postedInText } from "./days.js";

// The legacy's examples (test/labels.test.mjs, test/builder.test.mjs, test/normalise-audit.test.mjs).
const TODAY = "2026-11-22";
const ago = (days: number) =>
  new Date(Date.parse(`${TODAY}T00:00:00Z`) - days * 86_400_000)
    .toISOString()
    .slice(0, 10);
const days = (fields: {
  posted?: string;
  expires?: string;
  description?: string;
}) =>
  advertDays({ firstSeen: "2026-11-01", description: "x", ...fields }, TODAY);

describe("the days an advert states (publication FR-3)", () => {
  it("reads a labelled last day in any of its forms; a start day is no deadline", () => {
    expect(
      [
        "Sista ansökningsdag: 2026-11-19",
        "Søknadsfrist: 08.11.2026",
        "Die Bewerbungsfrist endet am 15.11.2026.",
        "Closing date: 15 November 2026",
        "Date limite de candidature : 30/11/2026",
        "Eintritt: 01.12.2026",
      ].map(deadlineInText),
    ).toEqual([
      "2026-11-19",
      "2026-11-08",
      "2026-11-15",
      "2026-11-15",
      "2026-11-30",
      "",
    ]);
  });

  it("reads the day the advert says it was posted, after its label or phrase", () => {
    expect(
      [
        "Stellenbeschreibung Datum: 21. Oktober 2025",
        "Veröffentlicht: 05.11.2026",
        "Ausgeschrieben seit 31.10.2026",
        "Publicado el 3 de noviembre de 2026",
        "Eingestellt bei uns seit 2026-10-01",
      ].map(postedInText),
    ).toEqual(["2025-10-21", "2026-11-05", "2026-10-31", "2026-11-03", ""]);
  });

  it("takes only a day of the calendar for a day", () => {
    expect(
      ["2026-09-01T08:00:00Z", "Mon Aug 24", "2026-13-01", "2027-02-31"].map(
        isoDay,
      ),
    ).toEqual(["2026-09-01", "", "", ""]);
  });

  it("keeps the source's day, else the text's; a day still to come is none, and the first day in the store goes apart", () => {
    expect(days({ posted: "2026-09-01T08:00:00Z" })).toEqual({
      d: "2026-09-01",
    });
    expect(days({ posted: "Mon Aug 24" })).toEqual({ d: "", fs: "2026-11-01" });
    expect(days({ posted: "2099-08-13" })).toEqual({ d: "", fs: "2026-11-01" });
    expect(
      days({ description: "Stellenbeschreibung Datum: 21. Oktober 2025" }),
    ).toEqual({ d: "2025-10-21" });
    expect(
      days({ posted: "2026-09-01", description: "Veröffentlicht: 05.11.2026" }),
    ).toEqual({ d: "2026-09-01" });
  });

  it("drops an end day on the posting day of a fresh advert, keeps it for an old one, keeps a real one", () => {
    expect([
      days({ posted: ago(3), expires: ago(3) }).x,
      days({ posted: ago(400), expires: ago(400) }).x,
      days({ posted: ago(3), expires: ago(-30) }).x,
    ]).toEqual([undefined, ago(400), ago(-30)]);
  });

  it("takes an end day a year after the advert's for a site's default, one weeks off for its deadline", () => {
    expect([
      days({ posted: "2026-11-03", expires: "2027-11-03" }).x,
      days({ posted: "2026-11-03", expires: "2027-01-15" }).x,
      days({ expires: "2036-11-03" }).x,
    ]).toEqual([undefined, "2027-01-15", undefined]);
  });

  it("reads the text's last day when the field names none, while it is ahead", () => {
    expect(
      days({ expires: "pronto", description: `Fecha límite: ${ago(-20)}` }).x,
    ).toBe(ago(-20));
    expect(days({ description: `Fecha límite: ${ago(2)}` }).x).toBeUndefined();
  });
});
