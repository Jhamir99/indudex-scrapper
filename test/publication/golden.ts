import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { FIXTURES_DIRECTORY } from "../contract/adapter-contract.js";

// The legacy's readings of labelled facts and days (test/fixtures/publication/labels.json): an
// advert's source, title and the lines of its text that matter, with what the legacy read.
export interface GoldenLabels {
  readonly source: string;
  readonly title: string;
  readonly text: string;
  readonly ct?: string;
  readonly wt?: string;
  readonly posted: string;
  readonly deadline: string;
}

export async function goldenLabels(): Promise<readonly GoldenLabels[]> {
  const file = JSON.parse(
    await readFile(
      join(FIXTURES_DIRECTORY, "publication", "labels.json"),
      "utf8",
    ),
  ) as { cases: GoldenLabels[] };
  return file.cases;
}
