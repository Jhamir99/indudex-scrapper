import { describe, expect, it } from "vitest";
import {
  ambiguousNames,
  distanceKm,
  namesIn,
  townNames,
} from "./ambiguous-names.js";
import type { TownInUse } from "./in-use.js";

const town = (
  geonameId: number,
  name: string,
  country: string,
  latitude: number,
  longitude: number,
): TownInUse => ({
  geonameId,
  name,
  geonamesName: "",
  region: "",
  country,
  latitude,
  longitude,
  offers: 1,
  otherNames: [],
});

// The legacy's own test list (test/query.test.mjs).
const towns = [
  town(1, "Oss", "nl", 51.77, 5.52),
  town(2, "Duisburg", "de", 51.43, 6.76),
  town(3, "Brno", "cz", 49.2, 16.61),
  town(4, "Vigo", "es", 42.24, -8.72),
  town(5, "Hook", "gb", 51.28, -0.96),
  town(6, "Orange", "fr", 44.14, 4.81),
  town(7, "Köln", "de", 50.94, 6.96),
];
const names = townNames(towns);
const isPlace = (text: string, company = false) =>
  namesIn(text, names, undefined, company).map((mention) => mention.place);

const offer = (
  title: string,
  company: string,
  latitude: number,
  longitude: number,
) => ({
  title,
  company,
  placement: {
    town: { geonameId: 9, name: "x", latitude, longitude },
    nuts: null,
    from: "location" as const,
  },
});

describe("town names in titles and companies (FR-8)", () => {
  it("reads a name first in a title, unmarked, as a word", () => {
    expect(isPlace("OSS Automation Engineer")).toEqual([false]);
  });

  it("reads a name last in a title, or after a separator or a place word, as a place", () => {
    expect(isPlace("Softwareentwickler Duisburg")).toEqual([true]);
    expect(isPlace("Engineer (Oss)")).toEqual([true]);
    expect(isPlace("Engineer – Vigo")).toEqual([true]);
    expect(isPlace("Engineer in Vigo area")).toEqual([true]);
  });

  it("reads «Hook» in «Hook Up Engineer» and a company called «Orange» as words", () => {
    expect(isPlace("Hook Up Engineer")).toEqual([false]);
    expect(isPlace("Orange", true)).toEqual([false]);
  });

  it("reads a name with a separator or a region word after it as a place, past the first word", () => {
    expect(isPlace("Engineer Köln, NRW")).toEqual([true]);
    expect(isPlace("Engineer Vigo province jobs")).toEqual([true]);
  });

  it("reads a company's home town as a place, a company named after a town as a word", () => {
    expect(isPlace("Dopravoprojekt Brno a.s.", true)).toEqual([true]);
    expect(isPlace("Oss Energy", true)).toEqual([false]);
  });

  it("reads a name as a place when the offer is near that town, or the text names another", () => {
    expect(
      namesIn("OSS Automation Engineer", names, [51.8, 5.5]).map(
        (mention) => mention.place,
      ),
    ).toEqual([true]);
    expect(isPlace("Oss Duisburg Engineer")).toEqual([true, true]);
  });

  it("finds a name used more as a word than as a place ambiguous", () => {
    expect(
      ambiguousNames(towns, [
        offer("OSS Automation Engineer", "Telco", 52.37, 4.9),
        offer("OSS Support", "Telco", 52.37, 4.9),
        offer("Operator", "Pharma Oss", 51.77, 5.52),
        offer("Engineer Duisburg", "X", 48, 11),
      ]),
    ).toEqual(["oss"]);
  });

  it("measures kilometres on the globe", () => {
    expect(Math.round(distanceKm([51.77, 5.52], [51.43, 6.76]))).toBe(94);
  });
});
