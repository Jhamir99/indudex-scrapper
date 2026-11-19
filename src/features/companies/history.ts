import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "@hono/zod-openapi";
import { writeFileAtomic } from "../../shared/storage/atomic.js";

// The employers the directory has listed, kept between runs in the processor's state folder
// (companies FR-5; the legacy's builder/state/companies.json). Under each key: the shown name (n),
// the occupation group it hires most for (g), its places (p: NUTS 3 codes, or countries for offers
// placed no closer), its town (t) and the town's NUTS 3 code (tn), and the day it was last seen. The
// legacy's careers page (s) comes with 016-career-sites.
export const HISTORY_FILE = "companies.json";
export const HISTORY_VERSION = 1;

export const RememberedEmployer = z.strictObject({
  n: z.string(),
  g: z.string(),
  p: z.array(z.string()),
  t: z.string(),
  tn: z.string(),
  seen: z.iso.date(),
});
export type RememberedEmployer = z.infer<typeof RememberedEmployer>;

const HistoryFile = z.strictObject({
  version: z.literal(HISTORY_VERSION),
  companies: z.record(z.string(), RememberedEmployer),
});

export type History = Record<string, RememberedEmployer>;

export class HistoryError extends Error {
  override name = "HistoryError";
}

const isMissing = (error: unknown) =>
  (error as NodeJS.ErrnoException | undefined)?.code === "ENOENT";

// The history in `directory`, empty when there is none yet. A file that cannot be read as written
// is an error naming its path, never reset: starting over would forget every employer listed.
export async function readHistory(directory: string): Promise<History> {
  const path = join(directory, HISTORY_FILE);
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    if (isMissing(error)) return {};
    throw error;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new HistoryError(
      `${path}: not JSON (${error instanceof Error ? error.message : String(error)})`,
    );
  }
  const result = HistoryFile.safeParse(parsed);
  if (!result.success)
    throw new HistoryError(
      `${path}: ${result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`,
    );
  // A plain object with no prototype, so a key like «constructor» is only ever an employer's.
  return Object.assign(Object.create(null) as History, result.data.companies);
}

export async function writeHistory(
  directory: string,
  history: History,
): Promise<void> {
  const file = HistoryFile.parse({
    version: HISTORY_VERSION,
    companies: history,
  });
  await writeFileAtomic(join(directory, HISTORY_FILE), JSON.stringify(file));
}
