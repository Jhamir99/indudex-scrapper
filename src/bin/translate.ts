// `pnpm translate [-- --minutes 45] [-- --workers 2] [-- --group 400]`: one run of the title translator. Works
// through the titles the last publication found its caches lacking (state/mt-wanted.json) with Firefox's models
// (MT_DIR, fetched with `pnpm translate:fetch`) and Aina where it is installed (AINA_DIR), into the caches the next
// publication applies. Starts no chunk after its minutes. Exits 1 when it fails (no models, or no answer for most
// titles). The host's cron runs it (012-operations).
import { parseArgs } from "node:util";
import { mtDir } from "../features/title-translation/engine.js";
import { runTranslator } from "../features/title-translation/run.js";
import { processorStateDirectory } from "../shared/storage/processor-state.js";

const number = (value: string | undefined, fallback: number) =>
  value ? Number(value) : fallback;
const log = (line: string) =>
  console.log(
    `[${new Date().toISOString().slice(0, 19).replace("T", " ")}] ${line}`,
  );

try {
  const { values } = parseArgs({
    args: process.argv.slice(2).filter((argument) => argument !== "--"),
    options: {
      minutes: { type: "string" },
      workers: { type: "string" },
      group: { type: "string" },
    },
    strict: true,
    allowPositionals: false,
  });
  const result = await runTranslator({
    stateDirectory: processorStateDirectory(),
    mtDirectory: mtDir(),
    minutes: number(values.minutes, 45),
    workers: number(values.workers, 2),
    group: number(values.group, 400),
    log,
  });
  if (result.failed) process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
