// Adds the translator's new [title, translation] pairs, read as JSON from stdin, to the cache file named (legacy
// builder/mt/merge-titles.mjs). Run by the translator as a process of its own, so the memory a cache takes while it
// is read and written (about 600 MB for the largest, 27 October 2026) goes back when it ends. It imports nothing of
// this repo, so Node runs it as it is (its own type stripping), from src as from dist.
//   node merge.js state/titles-es.json < pairs.json
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";

const path = process.argv[2] ?? "";
if (!/[/\\]titles-[a-z]{2}\.json$/.test(path)) {
  console.error(`not a cache: ${path}`);
  process.exit(1);
}
// A cache that is there and cannot be read is an error: read as empty, the merge wrote the few new translations
// over hundreds of thousands (TRA-05).
const cache = new Map<string, string>(
  existsSync(path)
    ? Object.entries(
        JSON.parse(readFileSync(path, "utf8")) as Record<string, string>,
      )
    : [],
);
for (const [title, out] of JSON.parse(readFileSync(0, "utf8")) as [
  string,
  string,
][])
  cache.set(title, out);
// Whole or nothing: a temporary file beside the cache, then renamed over it.
writeFileSync(
  `${path}.${process.pid}.tmp`,
  JSON.stringify(Object.fromEntries(cache)),
);
renameSync(`${path}.${process.pid}.tmp`, path);
