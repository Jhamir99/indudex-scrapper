import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import type { z } from "@hono/zod-openapi";
import { describeIssues, readInside } from "./data-file.js";

// The repo's config/ folder: three levels up from this file in src/ and in dist/ alike.
export const CONFIG_DIRECTORY = fileURLToPath(
  new URL("../../../config/", import.meta.url),
);

export class ConfigError extends Error {
  override name = "ConfigError";
}

const configError = (message: string) => new ConfigError(message);

// Reads a YAML file from the config folder and validates it. Schemas for config files should be
// strict objects, so a misspelt key fails instead of being ignored.
export async function loadConfig<Schema extends z.ZodType>(
  fileName: string,
  schema: Schema,
  directory: string = CONFIG_DIRECTORY,
): Promise<z.output<Schema>> {
  const text = await readInside(directory, fileName, configError, "config");

  let data: unknown;
  try {
    data = parse(text);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new ConfigError(`${fileName}: not valid YAML: ${reason}`);
  }

  const result = schema.safeParse(data);
  if (!result.success)
    throw new ConfigError(describeIssues(fileName, result.error));
  return result.data;
}
