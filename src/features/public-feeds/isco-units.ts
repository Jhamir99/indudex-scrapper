import { z } from "@hono/zod-openapi";
import { loadConfig } from "../../shared/config/load-config.js";

// config/isco-units.yml (FR-7): the ISCO-08 unit groups of Indudex's scope, for the sources asked
// or filtered by occupation code.
export const IscoUnits = z.strictObject({
  units: z
    .array(
      z.strictObject({
        isco: z.string().regex(/^\d{4}$/, "an ISCO-08 unit group"),
        label: z.string().min(1),
        // One of the skilled trades, shown only to a visitor who picks it.
        optional: z.boolean().optional(),
      }),
    )
    .min(1),
});
export type IscoUnits = z.infer<typeof IscoUnits>;

let loaded: Promise<ReadonlySet<string>> | undefined;

// The unit groups' codes, read once per process.
export function loadIscoUnits(): Promise<ReadonlySet<string>> {
  loaded ??= loadConfig("isco-units.yml", IscoUnits).then(
    ({ units }) => new Set(units.map((unit) => unit.isco)),
  );
  return loaded;
}
