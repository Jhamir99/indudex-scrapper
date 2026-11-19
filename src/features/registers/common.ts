import type { Readable } from "node:stream";

// What every register's reading shares (legacy builder/tools/registers.mjs).

// The NACE divisions whose companies hire engineers, technicians and IT people: mining (05-09),
// manufacturing (10-33), energy, water and waste (35-39), construction (41-43), water and air
// transport (50, 51), telecoms and IT (61-63), engineering and research (71, 72). Software
// publishing (58.2) and the support of water and air transport (52.22, 52.23) too.
const DIVISIONS = new Set([
  "05",
  "06",
  "07",
  "08",
  "09",
  ...Array.from({ length: 24 }, (_, i) => String(10 + i)),
  "35",
  "36",
  "37",
  "38",
  "39",
  "41",
  "42",
  "43",
  "50",
  "51",
  "61",
  "62",
  "63",
  "71",
  "72",
]);
const CLASSES = /^(582|5222|5223)/;

export const relevantActivity = (nace: unknown): boolean => {
  const code = String(nace ?? "").replace(/[^0-9]/g, "");
  return DIVISIONS.has(code.slice(0, 2)) || CLASSES.test(code);
};

// A register's company counts with this many people or more, where the register says how many.
export const MIN_PEOPLE = 10;

// A register's town as people write it: "SAINT-ETIENNE" becomes "Saint-Etienne".
export const titleCase = (text: unknown): string =>
  String(text ?? "")
    .toLowerCase()
    .replace(
      /(^|[\s\-'’(/])(\p{L})/gu,
      (_, before: string, letter: string) => before + letter.toUpperCase(),
    )
    .trim();

// One CSV line's fields, quoted commas and doubled quotes kept.
export function csvFields(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else quoted = false;
      } else current += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(current);
      current = "";
    } else current += ch;
  }
  out.push(current);
  return out;
}

// The objects of a JSON array read one at a time, so a file of a million fits in memory. A record
// that does not parse is passed by.
export async function* jsonObjects(stream: Readable): AsyncGenerator<unknown> {
  let depth = 0;
  let buffer = "";
  let inString = false;
  let escaped = false;
  stream.setEncoding("utf8");
  for await (const chunk of stream as AsyncIterable<string>) {
    let start = depth > 0 ? 0 : -1;
    for (let i = 0; i < chunk.length; i++) {
      const ch = chunk[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === "{") {
        if (depth === 0) start = i;
        depth++;
      } else if (ch === "}") {
        depth--;
        if (depth === 0) {
          const text = buffer + chunk.slice(start, i + 1);
          buffer = "";
          start = -1;
          try {
            yield JSON.parse(text);
          } catch {
            // one record
          }
        }
      }
    }
    if (depth > 0) buffer += chunk.slice(start < 0 ? 0 : start);
  }
}
