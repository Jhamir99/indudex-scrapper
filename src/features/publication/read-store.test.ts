import { describe, expect, it } from "vitest";
import type { StoredAdvert } from "../../shared/schemas/advert.js";
import {
  DROP_AFTER_DAYS,
  readStore,
  type StoreReader,
  type Takedowns,
} from "./read-store.js";

const NOW = new Date("2026-11-22T10:00:00.000Z");
const advert = (
  source: string,
  n: number,
  fields: Partial<StoredAdvert> = {},
): StoredAdvert => ({
  id: `${source}-${n}`,
  source,
  sourceId: String(n),
  title: "Elektroniker (m/w/d)",
  company: "Acme GmbH",
  location: "Berlin",
  country: "de",
  city: "Berlin",
  remote: false,
  url: `https://${source}.example/jobs/${n}`,
  description: "Wir suchen dich.",
  occupationCodes: {},
  language: "de",
  attribution: { licence: "CC BY 4.0", credit: null },
  firstSeen: "2026-11-01",
  ...fields,
});
const daysAgo = (days: number) =>
  new Date(NOW.getTime() - days * 86_400_000).toISOString();

const store = (
  files: Record<string, { savedAt: string; adverts: StoredAdvert[] }>,
): StoreReader => ({
  storedSources: async () => Object.keys(files).toSorted(),
  readPass: async (source) => files[source] ?? { savedAt: "", adverts: [] },
});
const none: Takedowns = {
  sourceReason: () => undefined,
  advertTaken: () => false,
  companyTaken: () => false,
};

describe("what the publication reads of the store (publication FR-2)", () => {
  it("reads the listed sources' adverts, with the newest pass", async () => {
    const reading = await readStore({
      store: store({
        brz: {
          savedAt: daysAgo(1),
          adverts: [advert("brz", 1), advert("brz", 2)],
        },
        sae: { savedAt: daysAgo(2), adverts: [advert("sae", 1)] },
      }),
      listed: new Set(["brz", "sae"]),
      takedowns: none,
      now: NOW,
    });
    expect(
      reading.passes.map((pass) => [pass.source, pass.adverts.length]),
    ).toEqual([
      ["brz", 2],
      ["sae", 1],
    ]);
    expect(reading.counts).toEqual({
      found: 3,
      withdrawn: 0,
      stale: 0,
      noLink: 0,
    });
    expect([reading.sources, reading.crawledAt]).toEqual([2, daysAgo(1)]);
  });

  it("leaves out a source no longer listed or taken down, and one whose last pass is too old", async () => {
    const reading = await readStore({
      store: store({
        brz: { savedAt: daysAgo(1), adverts: [advert("brz", 1)] },
        gone: {
          savedAt: daysAgo(1),
          adverts: [advert("gone", 1), advert("gone", 2)],
        },
        sae: { savedAt: daysAgo(1), adverts: [advert("sae", 1)] },
        old: {
          savedAt: daysAgo(DROP_AFTER_DAYS + 1),
          adverts: [advert("old", 1)],
        },
      }),
      listed: new Set(["brz", "sae", "old"]),
      takedowns: {
        ...none,
        sourceReason: (source) =>
          source === "sae" ? "the source's request" : undefined,
      },
      now: NOW,
    });
    expect(reading.passes.map((pass) => pass.source)).toEqual(["brz"]);
    expect(reading.counts).toEqual({
      found: 1,
      withdrawn: 3,
      stale: 1,
      noLink: 0,
    });
  });

  it("leaves out an employer taken down, and keeps an advert taken down aside for its copies", async () => {
    const reading = await readStore({
      store: store({
        brz: {
          savedAt: daysAgo(1),
          adverts: [
            advert("brz", 1),
            advert("brz", 2, { company: "Other AG" }),
            advert("brz", 3, { company: "Third AG" }),
          ],
        },
      }),
      listed: new Set(["brz"]),
      takedowns: {
        ...none,
        companyTaken: (name) => name === "Other AG",
        advertTaken: (url) => url === "https://brz.example/jobs/3",
      },
      now: NOW,
    });
    expect(reading.passes[0]?.adverts.map((a) => a.id)).toEqual(["brz-1"]);
    expect(reading.taken.map((a) => a.id)).toEqual(["brz-3"]);
    expect(reading.counts.withdrawn).toBe(2);
  });

  it("cuts each field at its limit and mends its broken letters before any step reads it", async () => {
    const reading = await readStore({
      store: store({
        brz: {
          savedAt: daysAgo(1),
          adverts: [
            advert("brz", 1, {
              location: "M\\u00fcnchen",
              company: "IngÃ©nierie SA",
              title: `${"Elektroniker ".repeat(50)}Ende`,
            }),
          ],
        },
      }),
      listed: new Set(["brz"]),
      takedowns: none,
      now: NOW,
    });
    const [read] = reading.passes[0]?.adverts ?? [];
    expect([read?.location, read?.company]).toEqual([
      "München",
      "Ingénierie SA",
    ]);
    expect(read?.title.length).toBeLessThanOrEqual(500);
    expect(read?.title.endsWith("Elektroniker")).toBe(true);
  });
});
