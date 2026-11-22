import { describe, expect, it } from "vitest";
import type { StoredAdvert } from "../../shared/schemas/advert.js";
import { Offer } from "../../shared/schemas/published/offer.js";
import {
  campaignPlaces,
  located,
  offerId,
  offerOf,
  type OfferInput,
  unescaped,
} from "./offer.js";

const advert: StoredAdvert = {
  id: "feinaactiva-1",
  source: "feinaactiva",
  sourceId: "1",
  title: "Tècnic/a de manteniment",
  company: "Acme SL",
  location: "Vic, Barcelona, vic",
  country: "es",
  city: "Vic",
  remote: false,
  url: "https://feinaactiva.example/oferta/1?utm_source=x",
  description: "Contracte: indefinit\nJornada: completa",
  occupationCodes: { isco: "3115" },
  language: "ca",
  attribution: { licence: "CC BY 4.0", credit: "Generalitat de Catalunya" },
  firstSeen: "2026-11-01",
};
const input: OfferInput = {
  advert,
  title: "Tècnic/a de manteniment",
  employer: { name: "Acme SL", agency: false },
  placement: {
    town: {
      geonameId: 3_106_050,
      name: "Vic",
      latitude: 41.93,
      longitude: 2.25,
    },
    nuts: "ES511",
    from: "location",
  },
  townNamed: "Vic",
  families: ["3115"],
  occupations: ["3115.1"],
  facts: {
    workMode: "onsite",
    contract: null,
    workingTime: null,
    years: { most: 3, least: 2 },
    degrees: [],
    languages: ["ca"],
  },
  pay: {
    low: 1900,
    high: 1900,
    currency: "EUR",
    period: "month",
    from: "field",
    yearlyEur: 26_600,
  },
  days: { d: "2026-11-10", x: "2026-12-01" },
};

describe("the published offer (publication FR-5)", () => {
  it("gives every field in the legacy's order, each only when there is something to say", () => {
    const offer = located(offerOf(input), input.placement);
    expect(Offer.parse(offer)).toEqual(offer);
    expect(Object.keys(offer)).toEqual([
      "id",
      "t",
      "c",
      "l",
      "cc",
      "ci",
      "d",
      "u",
      "s",
      "f",
      "k",
      "y",
      "yl",
      "tl",
      "ct",
      "wt",
      "x",
      "w",
      "p",
      "pa",
      "lg",
      "e",
      "g",
      "n",
    ]);
    expect(offer).toMatchObject({
      id: offerId("https://feinaactiva.example/oferta/1"),
      l: "Vic, Barcelona",
      u: "https://feinaactiva.example/oferta/1",
      k: "3115",
      ct: "i",
      wt: "c",
      w: "o",
      p: [1900, 1900, "EUR", "m"],
      pa: 26_600,
      g: [41.93, 2.25],
      n: "ES511",
    });
  });

  it("keeps the source's fields over the text, and makes agency work what the text says is", () => {
    const offer = offerOf({
      ...input,
      advert: {
        ...advert,
        description:
          "Wir suchen im Rahmen der Arbeitnehmerüberlassung einen Schlosser.",
      },
      facts: {
        ...input.facts,
        contract: { kind: "permanent" },
        workingTime: { kind: "part", hours: 20 },
      },
    });
    expect([offer.ct, offer.wt]).toEqual(["e", "p20"]);
  });

  it("names the town the place gives when the gazetteer knows none, and an agency's offer", () => {
    const offer = offerOf({
      ...input,
      placement: { town: null, nuts: "ES51", from: "area" },
      townNamed: "Comarques de Barcelona",
      employer: { name: "Randstad", agency: true },
      days: { d: "", fs: "2026-11-01" },
      pay: null,
    });
    expect(
      located(offer, { town: null, nuts: "ES51", from: "area" }),
    ).toMatchObject({
      ci: "Comarques de Barcelona",
      n: "ES51",
      ag: 1,
      d: "",
      fs: "2026-11-01",
    });
    expect(offer.g).toBeUndefined();
  });

  it("gives the same id to one advert under several addresses, and another to another", () => {
    expect(offerId("https://a.example/1?utm_source=x")).toBe(
      offerId("https://a.example/1/"),
    );
    expect(offerId("https://a.example/1")).toHaveLength(8);
    expect(offerId("https://cvvp.nva.gov.lv/#/pub/vakances/1")).not.toBe(
      offerId("https://cvvp.nva.gov.lv/#/pub/vakances/2"),
    );
  });

  it("lists a campaign's other towns once each, in Spanish order, the town alone when it is not on the map", () => {
    const offer = offerOf(input);
    const at = (ci: string, g?: [number, number]) =>
      ({ ...offer, ci, ...(g ? { g } : { g: undefined }) }) as Offer;
    expect(
      campaignPlaces(offer, [
        at("Ávila", [40.66, -4.7]),
        at("Zaragoza", [41.65, -0.88]),
        at("VIC"),
        at("Lleida"),
        at("Ávila", [40.66, -4.7]),
      ]),
    ).toEqual([["Ávila", 40.66, -4.7], ["Lleida"], ["Zaragoza", 41.65, -0.88]]);
  });

  it("writes out what one reading left escaped, twice over too", () => {
    const offer = unescaped({
      ...offerOf(input),
      t: "Project &#038; Service Manager",
      c: "Johnson &amp;amp; Johnson",
    });
    expect([offer.t, offer.c]).toEqual([
      "Project & Service Manager",
      "Johnson & Johnson",
    ]);
  });
});
