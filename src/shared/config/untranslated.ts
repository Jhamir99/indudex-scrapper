import { z } from "@hono/zod-openapi";
import { SourceId } from "../schemas/source.js";
import { loadConfig } from "./load-config.js";

// config/untranslated.yml: the sources whose terms forbid altering their content, each with the
// clause that says so. Read by the processor's steps that would change a title.
export const Untranslated = z.strictObject({
  sources: z.record(SourceId, z.string().min(1)),
});
export type Untranslated = z.infer<typeof Untranslated>;

export async function loadUntranslated(
  directory?: string,
): Promise<ReadonlySet<string>> {
  const { sources } = await loadConfig(
    "untranslated.yml",
    Untranslated,
    directory,
  );
  return new Set(Object.keys(sources));
}
