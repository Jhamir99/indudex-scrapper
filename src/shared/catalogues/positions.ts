import { z } from "@hono/zod-openapi";
import { readCatalogue, readCatalogueFile } from "./read-catalogue.js";

// The lists a profile code names entries of by position (FR-4), with each one's id.
export async function currentPositions(
  directory?: string,
): Promise<Record<string, string[]>> {
  const families = await readCatalogue("families", directory);
  return {
    "families.groups": families.groups.map((group) => group.id),
    "families.families": families.families.map((family) => family.id),
    occupations: (await readCatalogue("occupations", directory)).occupations.map(
      (occupation) => occupation.code,
    ),
    countries: (await readCatalogue("countries", directory)).countries.map(
      (country) => country.iso,
    ),
    languages: (await readCatalogue("languages", directory)).languages.map(
      (language) => language.code,
    ),
    degrees: (await readCatalogue("degrees", directory)).degrees.map(
      (degree) => degree.id,
    ),
    seniority: (await readCatalogue("seniority", directory)).levels.map(
      (level) => level.id,
    ),
    vetoes: (await readCatalogue("vetoes", directory)).vetoes.map(
      (veto) => veto.id,
    ),
  };
}

export const PositionsRecord = z.strictObject({
  about: z.string().min(1),
  positions: z.record(z.string(), z.array(z.string())),
});

export function readPositionsRecord(directory?: string) {
  return readCatalogueFile("positions.json", PositionsRecord, directory);
}

// What breaks the record: an entry removed, renamed or moved, or one added without recording it.
export function positionProblems(
  recorded: Readonly<Record<string, readonly string[]>>,
  current: Readonly<Record<string, readonly string[]>>,
): string[] {
  const problems: string[] = [];
  for (const [list, ids] of Object.entries(current)) {
    const record = recorded[list];
    if (!record) {
      problems.push(`${list}: not recorded`);
      continue;
    }
    record.forEach((id, position) => {
      if (ids[position] !== id)
        problems.push(
          `${list}: position ${position} was "${id}", is ${ids[position] === undefined ? "gone" : `"${ids[position]}"`}`,
        );
    });
    if (ids.length > record.length)
      problems.push(
        `${list}: ${ids.slice(record.length).join(", ")} added but not recorded`,
      );
  }
  for (const list of Object.keys(recorded))
    if (!(list in current)) problems.push(`${list}: recorded but gone`);
  return problems;
}
