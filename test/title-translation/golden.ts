import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { FIXTURES_DIRECTORY } from "../contract/adapter-contract.js";

// The legacy's readings for the title translation's golden sets (test/fixtures/title-translation/).
export async function goldenFile<T>(name: string): Promise<readonly T[]> {
  const file = JSON.parse(
    await readFile(join(FIXTURES_DIRECTORY, "title-translation", name), "utf8"),
  ) as {
    cases: T[];
  };
  return file.cases;
}

export interface GoldenLanguage {
  readonly t: string;
  readonly filed: string;
  readonly cc: string;
  readonly l: string;
  readonly lang: string | null;
  readonly english: boolean;
  readonly readsAs?: boolean;
  readonly englishOnly?: boolean;
  readonly place: string;
}
