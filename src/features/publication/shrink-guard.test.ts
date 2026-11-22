import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Offer } from "../../shared/schemas/published/offer.js";
import { falls, guard, pileCounts, remember } from "./shrink-guard.js";
import {
  readState,
  StateError,
  writeState,
  type RememberedPile,
} from "./state.js";

// The legacy's examples (test/publish-audit.test.mjs, PUB-04).
const T0 = Date.parse("2026-11-20T00:00:00Z");
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
let history: RememberedPile[] = [];
for (const [k, offers] of [832, 700, 600].entries())
  history = remember(history, { offers, es: 100, cat: 20 }, T0 + k * HOUR);

// An offer in a country, with its NUTS code when it has one.
const at = (cc: string, n?: string) => ({ cc, ...(n ? { n } : {}) }) as Offer;

describe("the shrink guard (publication FR-11)", () => {
  it("sees a fall in steps against the most of the last days, and a country gone while the total held", () => {
    expect(falls({ offers: 500, es: 100, cat: 20 }, history)).toEqual([
      ["offers", 500, 832],
    ]);
    expect(falls({ offers: 830, es: 3, cat: 0 }, history)).toEqual([
      ["es", 3, 100],
      ["cat", 0, 20],
    ]);
    expect(falls({ offers: 800, es: 90, cat: 18 }, history)).toEqual([]);
  });

  it("forgets what is older than the window", () => {
    expect(
      remember(history, { offers: 1, es: 0, cat: 0 }, T0 + 4 * DAY),
    ).toHaveLength(1);
  });

  it("counts the offers, Spain's and Catalonia's", () => {
    expect(
      pileCounts([at("es", "ES511"), at("es", "ES300"), at("de")]),
    ).toEqual({ offers: 3, es: 2, cat: 1 });
  });

  it("holds a fallen pile for a day, publishes it with --force or once the day has passed, never an empty one", () => {
    const fallen = { offers: 500, es: 100, cat: 20 };
    const base = {
      history,
      force: false,
      lastPublishedAt: new Date(T0 + 2 * HOUR).toISOString(),
    };
    expect(
      guard({ ...base, counts: fallen, now: T0 + 5 * HOUR }),
    ).toMatchObject({ publish: false });
    expect(
      guard({ ...base, counts: fallen, now: T0 + 5 * HOUR, force: true }),
    ).toMatchObject({ publish: true, alert: expect.stringMatching(/forced/) });
    expect(
      guard({ ...base, counts: fallen, now: T0 + 2 * HOUR + DAY + 1 }),
    ).toMatchObject({
      publish: true,
      alert: expect.stringMatching(/has lasted 24 h/),
    });
    expect(
      guard({
        ...base,
        counts: { offers: 800, es: 90, cat: 18 },
        now: T0 + 5 * HOUR,
      }),
    ).toEqual({ publish: true, fell: [] });
    expect(
      guard({
        ...base,
        counts: { offers: 0, es: 0, cat: 0 },
        now: T0,
        force: true,
      }),
    ).toMatchObject({ publish: false });
  });

  it("keeps the history in the processor's state, and refuses a file it cannot read, naming it", async () => {
    const directory = await mkdtemp(join(tmpdir(), "indudex-state-"));
    try {
      expect(await readState(directory, "pile-history.json")).toBeUndefined();
      await writeState(directory, "pile-history.json", { piles: history });
      expect((await readState(directory, "pile-history.json"))?.piles).toEqual(
        history,
      );
      await writeFile(
        join(directory, "taken.json"),
        '{"version":1,"taken":[{"url":1}]}',
      );
      await expect(readState(directory, "taken.json")).rejects.toThrow(
        StateError,
      );
      await expect(readState(directory, "taken.json")).rejects.toThrow(
        /taken\.json/,
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
