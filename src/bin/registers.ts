// `pnpm registers <brreg|sirene|diba> [files…] --lau <lau.tsv>`: one open register's companies into
// the store (companies FR-6), run by the operator when a register publishes a new file. Barcelona's
// census is fetched through the polite client; the others are read from the files given.
import { parseArgs } from "node:util";
import { CrawlConfig } from "../features/crawl-core/config/crawl-config.js";
import { botSigner, politeHttpClient } from "../features/crawl-core/run.js";
import {
  RegisterUsageError,
  runRegister,
} from "../features/registers/registers.js";
import { loadConfig } from "../shared/config/load-config.js";
import { RegisterId } from "../shared/schemas/register.js";
import { FileStopSwitch } from "../shared/storage/file-stop-switch.js";
import { storeDirectory } from "./store-directory.js";
import { processLog } from "../shared/kit/logger.js";

const USAGE = "usage: registers <brreg|sirene|diba> [files…] --lau <lau.tsv>";
const clock = {
  now: () => new Date(),
  sleep: (milliseconds: number) =>
    new Promise<void>((wake) => setTimeout(wake, Math.max(0, milliseconds))),
};
const logged = processLog("registers");
const log = (message: string) => logged.info(message);

try {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2).filter((argument) => argument !== "--"),
    options: { lau: { type: "string" } },
    strict: true,
    allowPositionals: true,
  });
  const [name, ...files] = positionals;
  const register = RegisterId.safeParse(name);
  if (!register.success || !values.lau) throw new RegisterUsageError(USAGE);
  const store = storeDirectory();
  const { http, close } = politeHttpClient(
    await loadConfig("crawl.yml", CrawlConfig),
    clock,
    undefined,
    botSigner(process.env),
  );
  try {
    await runRegister({
      register: register.data,
      files,
      lau: values.lau,
      store,
      http,
      clock,
      stopSwitch: new FileStopSwitch(store),
      log,
    });
  } finally {
    close();
  }
} catch (error) {
  logged.error(error instanceof Error ? error.message : String(error));
  process.exitCode = error instanceof RegisterUsageError ? 2 : 1;
}
