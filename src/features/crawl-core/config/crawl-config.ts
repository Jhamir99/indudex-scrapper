import { z } from "@hono/zod-openapi";
import { SourceId } from "../../../shared/schemas/source.js";

const Hours = z.number().positive();

const Pace = z.strictObject({
  // The least time between two requests.
  gapMs: z.int().nonnegative(),
  // Requests at once.
  inFlight: z.int().positive(),
});

// config/crawl.yml: the scrapper's schedule and politeness limits (FR-3, FR-5, FR-6).
export const CrawlConfig = z.strictObject({
  cadence: z.strictObject({
    defaultHours: Hours,
    unchangedMaxHours: Hours,
  }),
  backoff: z.strictObject({
    hours: z.array(Hours).min(1),
    parkAfterFailures: z.int().positive(),
    parkedHours: Hours,
  }),
  pace: z.strictObject({
    perHost: Pace,
    // A machine that serves several of our hosts.
    perServer: Pace,
    // A hosting provider that blocks an address on all its machines at once.
    perProvider: Pace,
  }),
  connections: z.strictObject({
    maxOpen: z.int().positive(),
    newPerSecond: z.number().positive(),
  }),
  // Per-source overrides, added by the source features.
  sources: z
    .record(SourceId, z.strictObject({ cadenceHours: Hours.optional() }))
    .default({}),
});
export type CrawlConfig = z.infer<typeof CrawlConfig>;
