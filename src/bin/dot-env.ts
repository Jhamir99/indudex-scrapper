import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

// Keys from `.env` at the repo root (never committed); a variable already set wins. The same from
// src/bin (tsx) and dist/bin (node).
export function environmentWithDotEnv(): Record<string, string | undefined> {
  const file = fileURLToPath(new URL("../../.env", import.meta.url));
  const fromFile = existsSync(file) ? parseEnv(readFileSync(file, "utf8")) : {};
  return { ...fromFile, ...process.env };
}
