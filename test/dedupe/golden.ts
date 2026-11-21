import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { FIXTURES_DIRECTORY } from "../contract/adapter-contract.js";

// The legacy's published titles (test/fixtures/dedupe/titles.json): `s` as the store has it, `t` as
// the legacy published it.
export interface GoldenTitle {
  readonly s: string;
  readonly t: string;
}

export async function goldenTitles(): Promise<readonly GoldenTitle[]> {
  const file = JSON.parse(
    await readFile(join(FIXTURES_DIRECTORY, "dedupe", "titles.json"), "utf8"),
  ) as { cases: GoldenTitle[] };
  return file.cases;
}

// The legacy's companyOf and jobKey (test/fixtures/dedupe/roles.json): companies' strings with
// their name, titles as published with their advert's language and their key under "Acme".
export interface GoldenRoles {
  readonly companies: readonly { readonly s: string; readonly key: string }[];
  readonly titles: readonly {
    readonly s: string;
    readonly lang: string;
    readonly key: string;
  }[];
}

export async function goldenRoles(): Promise<GoldenRoles> {
  return JSON.parse(
    await readFile(join(FIXTURES_DIRECTORY, "dedupe", "roles.json"), "utf8"),
  ) as GoldenRoles;
}
