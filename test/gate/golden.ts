import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { FIXTURES_DIRECTORY } from "../contract/adapter-contract.js";

// The legacy's gate readings (test/fixtures/gate/titles.json): each title in each language of
// `langs`, the main gate's families, the classifier's families and occupations, the hygiene reason;
// then adverts with codes.
export interface GoldenTitle {
  readonly t: string;
  readonly main: string[][];
  readonly classified: [string[], string[]][];
  readonly hygiene: string | null;
}

export interface GoldenCode {
  readonly raw: {
    readonly title: string;
    readonly lang: string;
    readonly codes: { readonly isco?: string; readonly ssyk?: string };
  };
  readonly out: { readonly families: string[]; readonly occupations: string[] };
}

export interface GateGolden {
  readonly about: string;
  readonly langs: readonly string[];
  readonly cases: readonly GoldenTitle[];
  readonly codes: readonly GoldenCode[];
}

export async function gateGolden(): Promise<GateGolden> {
  return JSON.parse(
    await readFile(join(FIXTURES_DIRECTORY, "gate", "titles.json"), "utf8"),
  ) as GateGolden;
}
