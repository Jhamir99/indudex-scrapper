import { readFileSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The method's data, byte for byte from the legacy's builder/mt (dict/vocab-<lang>.json: how often
// each word is written in a language's titles; case-en.json: English words as they are written;
// spellings.json: how titles write each word in capitals; trades.json: the trades Firefox gets
// wrong), in catalogues/translation/ at the repo root. Read once, synchronously as the method reads
// its tables, and nothing outside that folder.
export const TRANSLATION_DATA = fileURLToPath(
  new URL("../../../catalogues/translation", import.meta.url),
);

export class TranslationDataError extends Error {
  override name = "TranslationDataError";
}

const inside = (directory: string, path: string) => {
  const from = relative(directory, path);
  return from !== "" && !from.startsWith("..") && !isAbsolute(from);
};

const read = new Map<string, unknown>();

export function translationData<T>(
  name: string,
  directory = TRANSLATION_DATA,
): T {
  const path = resolve(directory, name);
  const key = path;
  if (read.has(key)) return read.get(key) as T;
  if (!inside(resolve(directory), path))
    throw new TranslationDataError(`${name}: outside ${directory}`);
  let real: string;
  try {
    real = realpathSync(path);
  } catch {
    throw new TranslationDataError(`${name}: not found in ${directory}`);
  }
  if (!inside(realpathSync(directory), real))
    throw new TranslationDataError(`${name}: outside ${directory}`);
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(real, "utf8"));
  } catch {
    throw new TranslationDataError(`${name}: not JSON`);
  }
  read.set(key, data);
  return data as T;
}

// How often each word is written in a language's titles.
export const vocab = (language: string): Readonly<Record<string, number>> =>
  translationData<Record<string, number>>(`dict/vocab-${language}.json`);
