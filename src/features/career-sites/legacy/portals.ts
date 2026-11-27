// The legacy's builder/adapters/portals.ts `loadPortals` as the careers lists ask it: the job portals of
// config/portals.yml (job portals' list, read here as data), each switched off where it carries its reason (`off`), as
// the legacy's `enabled: false`. A site the portals list names is read there, not as an employer's.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

export type Portal = {
  name?: string;
  host?: string;
  enabled?: boolean;
  alone?: boolean;
};
const FILE = join(
  dirname(dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))))),
  "config",
  "portals.yml",
);
let read: Portal[] | null = null;
export function loadPortals({ all = false } = {}): Portal[] {
  read ??= (
    (
      parse(readFileSync(FILE, "utf8")) as {
        portals?: (Portal & { off?: string })[];
      } | null
    )?.portals ?? []
  ).map(({ off, ...portal }) => (off ? { ...portal, enabled: false } : portal));
  return read.filter((portal) => all || portal.enabled !== false);
}
