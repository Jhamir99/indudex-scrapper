import { join } from "node:path";
import { gzipSync } from "node:zlib";
import type { StoredAdvert } from "../../shared/schemas/advert.js";
import { writeFileAtomic } from "../../shared/storage/atomic.js";
import type { GateDecision, GateInput } from "./decide.js";

// The explain report (FR-9): one line per advert left out, as the legacy's build wrote it:
// `[reason] title | company | location (source)`.
export type ExplainedAdvert = Pick<
  StoredAdvert,
  "title" | "company" | "location" | "source"
>;

export const explainLine = (reason: string, advert: ExplainedAdvert): string =>
  `[${reason}] ${advert.title} | ${advert.company} | ${advert.location} (${advert.source})`;

export const EXPLAIN_FILE = "explain.txt.gz";

export interface ExplainSummary {
  readonly adverts: number;
  readonly kept: number;
  readonly trades: number;
  // Adverts left out per reason, the commonest first.
  readonly reasons: readonly (readonly [string, number])[];
  readonly path: string;
}

// Every advert through the gate, the lines of those left out written gzipped and atomically into
// `directory`, and the counts.
export async function writeExplainReport(
  adverts: Iterable<GateInput & ExplainedAdvert>,
  decide: (advert: GateInput) => GateDecision,
  directory: string,
): Promise<ExplainSummary> {
  const lines: string[] = [];
  const reasons = new Map<string, number>();
  let total = 0;
  let kept = 0;
  let trades = 0;
  for (const advert of adverts) {
    total++;
    const decision = decide(advert);
    if (decision.kept) {
      kept++;
      if (decision.trade) trades++;
      continue;
    }
    lines.push(explainLine(decision.reason, advert));
    reasons.set(decision.reason, (reasons.get(decision.reason) ?? 0) + 1);
  }
  const path = join(directory, EXPLAIN_FILE);
  await writeFileAtomic(
    path,
    gzipSync(lines.length > 0 ? `${lines.join("\n")}\n` : ""),
  );
  return {
    adverts: total,
    kept,
    trades,
    reasons: [...reasons].toSorted(
      (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1),
    ),
    path,
  };
}

export function formatSummary(summary: ExplainSummary): string {
  const share = (n: number) =>
    summary.adverts > 0 ? ((100 * n) / summary.adverts).toFixed(1) : "0.0";
  return [
    `${summary.adverts} adverts, ${summary.kept} kept (${share(summary.kept)} %), ${summary.trades} of them by the trades`,
    ...summary.reasons.map(([reason, n]) => `${n} ${reason} (${share(n)} %)`),
    `report: ${summary.path}`,
    "",
  ].join("\n");
}
