import { readFile, realpath } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { isAbsolute, relative, resolve } from "node:path";
import { parse } from "yaml";
import type { z } from "@hono/zod-openapi";

// The repo's config/ folder: four levels up from this file in src/ and in dist/ alike.
export const CONFIG_DIRECTORY = fileURLToPath(
  new URL("../../../../config/", import.meta.url),
);

export class ConfigError extends Error {
  override name = "ConfigError";
}

const isInside = (directory: string, path: string) => {
  const fromDirectory = relative(directory, path);
  return (
    fromDirectory !== "" &&
    !fromDirectory.startsWith("..") &&
    !isAbsolute(fromDirectory)
  );
};

// Reads a YAML file from the config folder and validates it. Schemas for config files should be
// strict objects, so a misspelt key fails instead of being ignored.
export async function loadConfig<Schema extends z.ZodType>(
  fileName: string,
  schema: Schema,
  directory: string = CONFIG_DIRECTORY,
): Promise<z.output<Schema>> {
  const path = resolve(directory, fileName);
  if (!isInside(resolve(directory), path))
    throw new ConfigError(`${fileName}: outside the config folder`);

  let realPath: string;
  try {
    realPath = await realpath(path);
  } catch {
    throw new ConfigError(`${fileName}: not found in the config folder`);
  }
  // A link inside the folder must not lead out of it either.
  if (!isInside(await realpath(directory), realPath))
    throw new ConfigError(`${fileName}: outside the config folder`);

  let data: unknown;
  try {
    data = parse(await readFile(realPath, "utf8"));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new ConfigError(`${fileName}: not valid YAML: ${reason}`);
  }

  const result = schema.safeParse(data);
  if (!result.success) {
    const problems = result.error.issues.map(
      (issue) => `${issue.path.join(".") || "(top level)"}: ${issue.message}`,
    );
    throw new ConfigError(`${fileName}: ${problems.join("; ")}`);
  }
  return result.data;
}
