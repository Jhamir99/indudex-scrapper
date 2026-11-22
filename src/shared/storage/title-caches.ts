import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { writeFileAtomic } from "./atomic.js";

// The title translator's files in the processor's state folder, in the legacy's formats so its
// caches can be copied in (title translation FR-8): titles-<lang>.json (title → its translation, or
// "" when the title needed none), mt-wanted.json (the titles the caches lack, the translator's
// queue), mt-redo.json (titles to translate anew), mt-current.json (the chunk at work),
// mt-stuck.json (titles set aside for good).

// A cache's answer for "this title is already in that language".
export const NOTHING = "";

export class TitleCacheError extends Error {
  override name = "TitleCacheError";
}

const isMissing = (error: unknown) =>
  (error as NodeJS.ErrnoException | undefined)?.code === "ENOENT";

async function readJson(path: string): Promise<unknown> {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    if (isMissing(error)) return undefined;
    throw error;
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new TitleCacheError(`${path}: not JSON`);
  }
}

export const cachePath = (directory: string, language: string): string => {
  if (!/^[a-z]{2}$/.test(language))
    throw new TitleCacheError(`not a language: ${JSON.stringify(language)}`);
  return join(directory, `titles-${language}.json`);
};

// A language's cache; none yet is empty. One that is there and cannot be read is an error: read as
// empty, a merge would write a few new translations over hundreds of thousands (TRA-05).
export async function readCache(
  directory: string,
  language: string,
): Promise<Map<string, string>> {
  const path = cachePath(directory, language);
  const data = await readJson(path);
  if (data === undefined) return new Map();
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new TitleCacheError(`${path}: not a cache`);
  const entries = Object.entries(data as Record<string, unknown>);
  if (entries.some(([, value]) => typeof value !== "string"))
    throw new TitleCacheError(`${path}: not a cache`);
  return new Map(entries as [string, string][]);
}

export async function writeCache(
  directory: string,
  language: string,
  cache: ReadonlyMap<string, string>,
): Promise<void> {
  await writeFileAtomic(
    cachePath(directory, language),
    JSON.stringify(Object.fromEntries(cache)),
  );
}

// The other files: a JSON value each, or `empty` when the file is not there yet.
export const TRANSLATOR_FILES = {
  wanted: "mt-wanted.json",
  redo: "mt-redo.json",
  current: "mt-current.json",
  stuck: "mt-stuck.json",
} as const;
export type TranslatorFile = keyof typeof TRANSLATOR_FILES;

export async function readTranslatorFile<T>(
  directory: string,
  file: TranslatorFile,
  empty: T,
): Promise<T> {
  const data = await readJson(join(directory, TRANSLATOR_FILES[file]));
  return data === undefined ? empty : (data as T);
}

export async function writeTranslatorFile(
  directory: string,
  file: TranslatorFile,
  value: unknown,
): Promise<void> {
  await writeFileAtomic(
    join(directory, TRANSLATOR_FILES[file]),
    JSON.stringify(value),
  );
}
