import { z } from "@hono/zod-openapi";
import { loadConfig } from "../../../../shared/config/load-config.js";

// config/ssyk-groups.yml (FR-7): the occupation groups jobtech asks for, by JobTech concept id.
export const SsykGroups = z.strictObject({
  groups: z
    .array(
      z.strictObject({
        // JobTech's taxonomy concept id ("xm5G_vGn_iyk"), what the API filters on.
        concept: z
          .string()
          .regex(/^\w{4}_\w{3}_\w{3}$/, "a JobTech concept id"),
        ssyk: z.string().regex(/^\d{4}$/, "an SSYK-2012 unit group"),
        label: z.string().min(1),
        isco: z.array(z.string().regex(/^\d{4}$/)).min(1),
      }),
    )
    .min(1),
});
export type SsykGroups = z.infer<typeof SsykGroups>;

let loaded: Promise<SsykGroups> | undefined;

// Read once per process.
export function loadSsykGroups(): Promise<SsykGroups> {
  loaded ??= loadConfig("ssyk-groups.yml", SsykGroups);
  return loaded;
}
