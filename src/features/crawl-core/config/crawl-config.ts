import { z } from "@hono/zod-openapi";
import { SourceId } from "../../../shared/schemas/source.js";
import type { ScheduleRules } from "../domain/schedule.js";

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
    // A source that left pages of ours to read is due again after this (job portals FR-5).
    backlogHours: Hours.default(1),
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
    // Hosts paced by their own gap instead of `perHost.gapMs`, with the reason in a comment.
    hosts: z.record(z.string().min(1), z.int().nonnegative()).default({}),
  }),
  connections: z.strictObject({
    maxOpen: z.int().positive(),
    newPerSecond: z.number().positive(),
  }),
  run: z
    .strictObject({
      // Sources read at once. Each site keeps its own pace (`pace`, `connections`) however many
      // run; this only keeps one slow source (an hour's pass) from holding up the others.
      concurrency: z.int().positive(),
      // Pages a run may read across its sources (job portals FR-5).
      pageBudget: z.int().positive().default(30_000),
    })
    .default({ concurrency: 4, pageBudget: 30_000 }),
  // 4xx answers a server may give within the window before it is asked nothing more.
  errorBudget: z.strictObject({
    errors: z.int().positive(),
    windowMinutes: z.number().positive(),
  }),
  // Hosting providers that block an address on all their machines at once: their IPv4 networks,
  // all paced as one server (`pace.perProvider`).
  providers: z
    .record(
      z.string().min(1),
      z.array(
        z
          .string()
          .regex(
            /^\d{1,3}(?:\.\d{1,3}){3}\/\d{1,2}$/,
            "an IPv4 network (a.b.c.d/n)",
          ),
      ),
    )
    .default({}),
  // Per-source overrides, added by the source features.
  sources: z
    .record(SourceId, z.strictObject({ cadenceHours: Hours.optional() }))
    .default({}),
});
export type CrawlConfig = z.infer<typeof CrawlConfig>;

// The schedule of one source: its own cadence when `sources` gives one, the default otherwise.
export function scheduleRules(
  config: CrawlConfig,
  source: string,
): ScheduleRules {
  return {
    cadenceHours:
      config.sources[source]?.cadenceHours ?? config.cadence.defaultHours,
    unchangedMaxHours: config.cadence.unchangedMaxHours,
    backoffHours: config.backoff.hours,
    parkAfterFailures: config.backoff.parkAfterFailures,
    parkedHours: config.backoff.parkedHours,
    backlogHours: config.cadence.backlogHours,
  };
}
