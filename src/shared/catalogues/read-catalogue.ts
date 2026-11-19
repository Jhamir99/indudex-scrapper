import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import type { z } from "@hono/zod-openapi";
import { describeIssues, readInside } from "../config/data-file.js";
import { CATALOGUES, type CatalogueName } from "./catalogues.js";

// The repo's catalogues/ folder: three levels up from this file in src/ and in dist/ alike.
export const CATALOGUE_DIRECTORY = fileURLToPath(
  new URL("../../../catalogues/", import.meta.url),
);

export class CatalogueError extends Error {
  override name = "CatalogueError";
}

const catalogueError = (message: string) => new CatalogueError(message);

// Read once per process: the towns alone are 9 MB.
const cache = new Map<string, Promise<unknown>>();

async function parseCatalogue<Schema extends z.ZodType>(
  file: string,
  schema: Schema,
  directory: string,
): Promise<z.output<Schema>> {
  const text = await readInside(directory, file, catalogueError, "catalogues");
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new CatalogueError(`${file}: not valid JSON: ${reason}`);
  }
  const result = schema.safeParse(data);
  if (!result.success)
    throw new CatalogueError(describeIssues(file, result.error));
  return result.data;
}

// A catalogue file, validated, parsed on first use and the same copy afterwards (FR-3, FR-7). A
// failure is not kept, so a file fixed in the meantime is read again.
export function readCatalogueFile<Schema extends z.ZodType>(
  file: string,
  schema: Schema,
  directory: string = CATALOGUE_DIRECTORY,
): Promise<z.output<Schema>> {
  const key = resolve(directory, file);
  const cached = cache.get(key);
  if (cached) return cached as Promise<z.output<Schema>>;
  const reading = parseCatalogue(file, schema, directory);
  cache.set(key, reading);
  reading.catch(() => cache.delete(key));
  return reading;
}

type CatalogueOf<Name extends CatalogueName> = z.output<
  (typeof CATALOGUES)[Name]["schema"]
>;

// The only way into catalogues/ for the processor's steps.
export function readCatalogue<Name extends CatalogueName>(
  name: Name,
  directory: string = CATALOGUE_DIRECTORY,
): Promise<CatalogueOf<Name>> {
  const { file, schema } = CATALOGUES[name];
  // TypeScript cannot follow a generic name through the table's union of schemas.
  return readCatalogueFile(file, schema, directory) as Promise<
    CatalogueOf<Name>
  >;
}
