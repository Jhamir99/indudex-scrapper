import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The processor's own state folder (AGENTS.md, "Processor"): PROCESSOR_STATE_DIR when set, else
// `state/` at the repo root (git ignores it). The same from src (tsx) and dist (node). Never the
// scrapper's store.
export function processorStateDirectory(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const configured = environment["PROCESSOR_STATE_DIR"]?.trim();
  if (configured) return resolve(configured);
  return fileURLToPath(new URL("../../../state", import.meta.url));
}
