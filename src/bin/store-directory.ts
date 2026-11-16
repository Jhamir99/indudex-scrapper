import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The store's folder: STORE_DIR when set, else `store/` at the repo root (git ignores it).
// The same from src/bin (tsx) and dist/bin (node).
export function storeDirectory(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const configured = environment["STORE_DIR"]?.trim();
  if (configured) return resolve(configured);
  return fileURLToPath(new URL("../../store", import.meta.url));
}
