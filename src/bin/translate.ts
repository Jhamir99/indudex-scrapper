// `pnpm translate [-- --minutes 45] [-- --workers 2] [-- --group 400]`: one run of the title translator. Works
// through the titles the last publication found its caches lacking (state/mt-wanted.json) with Firefox's models
// (MT_DIR, fetched with `pnpm translate:fetch`) and Aina where it is installed (AINA_DIR), into the caches the next
// publication applies. Starts no chunk after its minutes. Exits 1 when it fails (no models, or no answer for most
// titles). Starts no further chunk once STOP is in place in the store. The host's cron runs it (012-operations).
import { parseArgs } from "node:util";
import { mtDir } from "../features/title-translation/engine.js";
import { runTranslator } from "../features/title-translation/run.js";
import { FileStopSwitch } from "../shared/storage/file-stop-switch.js";
import { processorStateDirectory } from "../shared/storage/processor-state.js";
import { storeDirectory } from "./store-directory.js";

const number = (value: string | undefined, fallback: number) =>
  value ? Number(value) : fallback;
const log = (line: string) =>
  console.log(
    `[${new Date().toISOString().slice(0, 19).replace("T", " ")}] ${line}`,
  );

// The method keeps thousands of patterns; compiled to machine code they fill V8's code space (256 MB on arm64) and
// a run dies within a minute (23 November 2026). Interpreted they stay in the heap, so Node must start with the flag:
// set once the method's patterns exist, V8 itself fails.
const INTERPRETED = "--regexp-interpret-all";

try {
  if (!process.execArgv.includes(INTERPRETED))
    throw new Error(
      `start the translator as node ${INTERPRETED} (pnpm translate does)`,
    );
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
  // STOP in the store stops the translator between chunks, as it stops the crawl (012).
  const stopSwitch = new FileStopSwitch(storeDirectory());
  const result = await runTranslator({
    stateDirectory: processorStateDirectory(),
    mtDirectory: mtDir(),
    minutes: number(values.minutes, 45),
    workers: number(values.workers, 2),
    group: number(values.group, 400),
    log,
    stopped: () => stopSwitch.isActive(),
  });
  if (result.failed) process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
