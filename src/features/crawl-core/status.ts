import type { SourceState } from "../../shared/schemas/source.js";

// FR-10: one line per source with its state, last run, advert count, next run and reason.
// `known` adds the registered sources that have no state yet.
export function formatStatus(
  states: ReadonlyMap<string, SourceState>,
  known: readonly string[] = [],
): string {
  const sources = [...new Set([...states.keys(), ...known])].toSorted();
  if (sources.length === 0) return "No sources yet.\n";
  const header = [
    "SOURCE",
    "STATE",
    "LAST RUN",
    "ADVERTS",
    "NEXT RUN",
    "REASON",
  ];
  const rows = sources.map((source) => {
    const state = states.get(source);
    if (!state) return [source, "never run", "-", "-", "due", ""];
    return [
      source,
      state.status === "parked"
        ? `parked until ${minute(state.parkedUntil)}`
        : state.status,
      state.lastRunAt ? minute(state.lastRunAt) : "-",
      String(state.advertCount),
      state.nextDueAt ? minute(state.nextDueAt) : "due",
      "reason" in state
        ? state.reason
        : state.backlog
          ? `backlog: ${state.backlog} pages of ours to read`
          : "",
    ];
  });
  const widths = header.map((_, column) =>
    Math.max(...[header, ...rows].map((row) => row[column]?.length ?? 0)),
  );
  const line = (row: readonly string[]) =>
    row
      .map((cell, column) =>
        column === row.length - 1 ? cell : cell.padEnd(widths[column] ?? 0),
      )
      .join("  ")
      .trimEnd();
  return `${[header, ...rows].map(line).join("\n")}\n`;
}

// "2026-11-16 08:00Z": minutes are enough to read a schedule.
function minute(timestamp: string): string {
  return `${timestamp.slice(0, 10)} ${timestamp.slice(11, 16)}Z`;
}
