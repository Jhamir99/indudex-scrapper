import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { FIXTURES_DIRECTORY } from "../contract/adapter-contract.js";

// The legacy's own readings (test/fixtures/pay/*.json): every call its pay tests make, and every
// string of its tests read the same way.
export interface GoldenCase {
  readonly fn: string;
  readonly args: readonly unknown[];
  readonly result: unknown;
}

export interface GoldenSet {
  readonly about: string;
  readonly rates?: Readonly<Record<string, number>>;
  readonly cases: readonly GoldenCase[];
}

export async function goldenSet(name: "fields" | "text"): Promise<GoldenSet> {
  return JSON.parse(
    await readFile(join(FIXTURES_DIRECTORY, "pay", `${name}.json`), "utf8"),
  ) as GoldenSet;
}
