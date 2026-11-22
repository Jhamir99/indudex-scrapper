import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "@hono/zod-openapi";
import { writeFileAtomic } from "../../shared/storage/atomic.js";

// What the publication remembers between builds, in the processor's state folder: the last piles'
// counts (`pile-history.json`, the shrink guard's) and the adverts taken down it has seen
// (`taken.json`). Each file versioned and validated; one that cannot be read as written is an error
// naming its path, never reset.

export class StateError extends Error {
  override name = "StateError";
}

const STATE_VERSION = 1;

export const PileCounts = z.strictObject({
  offers: z.int().nonnegative(),
  es: z.int().nonnegative(),
  cat: z.int().nonnegative(),
});
export type PileCounts = z.infer<typeof PileCounts>;
export const RememberedPile = PileCounts.extend({ at: z.iso.datetime() });
export type RememberedPile = z.infer<typeof RememberedPile>;

export const TakenRecord = z.strictObject({
  url: z.string().min(1),
  company: z.string(),
  title: z.string(),
  language: z.string().optional(),
  place: z.string(),
});

const FILES = {
  "pile-history.json": z.strictObject({
    version: z.literal(STATE_VERSION),
    piles: z.array(RememberedPile),
  }),
  "taken.json": z.strictObject({
    version: z.literal(STATE_VERSION),
    taken: z.array(TakenRecord),
  }),
} as const;
type StateName = keyof typeof FILES;
type StateOf<Name extends StateName> = z.infer<(typeof FILES)[Name]>;

export async function readState<Name extends StateName>(
  directory: string,
  name: Name,
): Promise<StateOf<Name> | undefined> {
  const path = join(directory, name);
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new StateError(`${path}: not JSON`);
  }
  const parsed = FILES[name].safeParse(data);
  if (!parsed.success)
    throw new StateError(
      `${path}: ${parsed.error.issues[0]?.message ?? "not as written"}`,
    );
  return parsed.data as StateOf<Name>;
}

export async function writeState<Name extends StateName>(
  directory: string,
  name: Name,
  content: Omit<StateOf<Name>, "version">,
): Promise<void> {
  const file = FILES[name].parse({ version: STATE_VERSION, ...content });
  await writeFileAtomic(join(directory, name), `${JSON.stringify(file)}\n`);
}
