// The legacy's builder/translate.mjs as its tests read it: this repo's translate.ts, with the
// legacy's synchronous file helpers over the same formats (the caches, the untranslated sources'
// list, the titles to translate anew).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parse } from "yaml";
import { NOTHING } from "../../src/shared/storage/title-caches.ts";

export * from "../../src/features/title-translation/translate.ts";
export { NOTHING };

export const loadCache = (path) =>
  new Map(
    existsSync(path)
      ? Object.entries(JSON.parse(readFileSync(path, "utf8")))
      : [],
  );
export function saveCache(path, cache) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(Object.fromEntries(cache)));
}
export const loadUntranslated = (path) =>
  new Set(Object.keys(parse(readFileSync(path, "utf8")).sources));
export function loadRedo(path) {
  try {
    return new Set(
      existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : [],
    );
  } catch {
    return new Set();
  }
}
