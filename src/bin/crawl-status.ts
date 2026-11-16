// `pnpm crawl:status`: prints the state of every source (FR-10). Reads the store only.
import { formatStatus } from "../features/crawl-core/status.js";
import { FileAdvertStore } from "../shared/storage/file-advert-store.js";
import { storeDirectory } from "./store-directory.js";

const clock = { now: () => new Date() };
const store = new FileAdvertStore(storeDirectory(), clock);
process.stdout.write(formatStatus(await store.readStates()));
