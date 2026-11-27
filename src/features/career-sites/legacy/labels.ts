// The legacy's builder/lib/labels.ts `withLabels` as the careers reader calls it: a page's labelled facts added to what
// its block gave, where those say nothing. Here the reading is crawl-core's (`pageFacts`, composed by the entry point
// from advert facts, pay and the publication) and the merge its `withPageFacts`; the job is filled in place, as the
// legacy's was.
import { NO_PAGE_FACTS, withPageFacts } from "../../crawl-core/page-facts.js";
import { passTools } from "./pass.js";

export function withLabels<J extends object>(job: J, html: unknown): J {
  if (!job || !html) return job;
  const facts = passTools().pageFacts?.(String(html)) ?? NO_PAGE_FACTS();
  return Object.assign(job, withPageFacts(job as never, facts));
}
