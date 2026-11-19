import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { FIXTURES_DIRECTORY } from "../contract/adapter-contract.js";

// The legacy's readings of employer names (test/fixtures/companies/names.json).
export interface GoldenName {
  readonly s: string;
  readonly name: string;
  readonly clean: string;
  readonly key: string;
  readonly usable: boolean;
  readonly display: string;
  readonly agency: boolean;
  readonly clutter: string;
}

export async function goldenNames(): Promise<readonly GoldenName[]> {
  const file = JSON.parse(
    await readFile(join(FIXTURES_DIRECTORY, "companies", "names.json"), "utf8"),
  ) as { cases: GoldenName[] };
  return file.cases;
}
