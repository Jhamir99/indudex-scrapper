import { describe, expect, it } from "vitest";
import { CrawlConfig, scheduleRules } from "./crawl-config.js";
import { loadConfig } from "./load-config.js";

describe("config/crawl.yml (FR-3, FR-5, FR-6)", () => {
  it("loads with the legacy defaults", async () => {
    const config = await loadConfig("crawl.yml", CrawlConfig);

    expect(config.cadence).toEqual({
      defaultHours: 24,
      unchangedMaxHours: 168,
    });
    expect(config.backoff).toEqual({
      hours: [24, 72, 168],
      parkAfterFailures: 6,
      parkedHours: 720,
    });
    expect(config.pace.perServer).toEqual({ gapMs: 5000, inFlight: 1 });
    expect(config.pace.perProvider).toEqual({ gapMs: 3000, inFlight: 1 });
    expect(config.pace.perHost).toEqual({ gapMs: 3000, inFlight: 1 });
    expect(config.connections).toEqual({ maxOpen: 16, newPerSecond: 2 });
    expect(config.errorBudget).toEqual({ errors: 3, windowMinutes: 10 });
  });

  it("takes per-source cadences", () => {
    const config = CrawlConfig.parse({
      cadence: { defaultHours: 24, unchangedMaxHours: 168 },
      backoff: { hours: [24], parkAfterFailures: 6, parkedHours: 720 },
      pace: {
        perHost: { gapMs: 3000, inFlight: 1 },
        perServer: { gapMs: 5000, inFlight: 1 },
        perProvider: { gapMs: 3000, inFlight: 1 },
      },
      connections: { maxOpen: 16, newPerSecond: 2 },
      errorBudget: { errors: 3, windowMinutes: 10 },
      sources: { brz: { cadenceHours: 12 } },
    });
    expect(config.sources.brz?.cadenceHours).toBe(12);
  });
});

describe("scheduleRules (FR-6)", () => {
  it("gives a source its own cadence, or the default", async () => {
    const loaded = await loadConfig("crawl.yml", CrawlConfig);
    const config = { ...loaded, sources: { brz: { cadenceHours: 12 } } };

    expect(scheduleRules(config, "brz")).toEqual({
      cadenceHours: 12,
      unchangedMaxHours: 168,
      backoffHours: [24, 72, 168],
      parkAfterFailures: 6,
      parkedHours: 720,
    });
    expect(scheduleRules(config, "other").cadenceHours).toBe(24);
  });
});
