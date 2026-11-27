import { AsyncLocalStorage } from "node:async_hooks";
import type { PageFacts } from "../../crawl-core/page-facts.js";
import type { HttpClient } from "../../crawl-core/ports.js";

// What the legacy's readers reach for as module-level helpers, given here by the source being read: its polite client,
// the gate's reading of a title and crawl-core's reader of a page's labelled facts. Bound for the length of one pass
// (`withPass`), so the copied readers run unchanged and two passes at once never share them.
export interface PassTools {
  readonly http: HttpClient;
  readonly isOurs?: (
    title: string,
    country: string,
    language?: string,
  ) => boolean;
  readonly pageFacts?: (html: string) => PageFacts;
}

const store = new AsyncLocalStorage<PassTools>();

export const withPass = <T>(
  tools: PassTools,
  run: () => Promise<T>,
): Promise<T> => store.run(tools, run);
// The same for a reader's question asked outside a pass and answered at once (`worthReadingAgain`).
export const withPassNow = <T>(tools: PassTools, run: () => T): T =>
  store.run(tools, run);

export function passTools(): PassTools {
  const tools = store.getStore();
  if (!tools) throw new Error("no source's pass is bound (withPass)");
  return tools;
}
