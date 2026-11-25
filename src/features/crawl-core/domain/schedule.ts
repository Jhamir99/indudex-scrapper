import type { SourceState } from "../../../shared/schemas/source.js";

export interface ScheduleRules {
  readonly cadenceHours: number;
  // The longest wait a source that keeps coming back unchanged can reach.
  readonly unchangedMaxHours: number;
  // The wait after the 1st, 2nd, 3rd... failure; the last value repeats.
  readonly backoffHours: readonly number[];
  readonly parkAfterFailures: number;
  readonly parkedHours: number;
  // The wait of a source that left pages of ours to read (job portals FR-5).
  readonly backlogHours?: number;
}

const HOUR = 3_600_000;
// Each unchanged pass waits half as long again as the one before (legacy `waitMs`).
const UNCHANGED_GROWTH = 1.5;

const later = (from: Date, hours: number) =>
  new Date(from.getTime() + hours * HOUR).toISOString();

// A source never run is due at once; otherwise when its next-due time has come.
export function isDue(state: SourceState | undefined, now: Date): boolean {
  if (!state?.nextDueAt) return true;
  return new Date(state.nextDueAt).getTime() <= now.getTime();
}

// Only sources read daily or less often stretch their wait, as in the legacy: a source with a
// shorter cadence has it because its terms or its pace ask for it.
export function waitAfterSuccessHours(
  rules: ScheduleRules,
  unchangedPasses: number,
): number {
  const { cadenceHours, unchangedMaxHours } = rules;
  if (cadenceHours < 24 || unchangedMaxHours <= cadenceHours)
    return cadenceHours;
  return Math.min(
    unchangedMaxHours,
    cadenceHours * UNCHANGED_GROWTH ** unchangedPasses,
  );
}

export function afterSuccess(
  previous: SourceState | undefined,
  run: {
    readonly at: Date;
    readonly advertCount: number;
    readonly changed: boolean;
    // Pages of ours left to read.
    readonly backlog?: number;
  },
  rules: ScheduleRules,
): SourceState {
  const unchangedPasses = run.changed
    ? 0
    : (previous?.unchangedPasses ?? 0) + 1;
  const wait = waitAfterSuccessHours(rules, unchangedPasses);
  const backlog = run.backlog ?? 0;
  return {
    status: "enabled",
    lastRunAt: run.at.toISOString(),
    advertCount: run.advertCount,
    consecutiveFailures: 0,
    unchangedPasses,
    heldDrops: 0,
    ...(backlog > 0 ? { backlog } : {}),
    nextDueAt: later(
      run.at,
      backlog > 0 && rules.backlogHours !== undefined
        ? Math.min(wait, rules.backlogHours)
        : wait,
    ),
  };
}

// The stored adverts are kept on a failure (FR-4), so the advert count stays as it was.
export function afterFailure(
  previous: SourceState | undefined,
  run: {
    readonly at: Date;
    readonly reason: string;
    // The read was held as a suspect drop: counted, so the next drop can be accepted.
    readonly heldDrop?: boolean;
  },
  rules: ScheduleRules,
): SourceState {
  const consecutiveFailures = (previous?.consecutiveFailures ?? 0) + 1;
  const fields = {
    reason: run.reason,
    lastRunAt: run.at.toISOString(),
    advertCount: previous?.advertCount ?? 0,
    consecutiveFailures,
    unchangedPasses: 0,
    heldDrops: run.heldDrop ? (previous?.heldDrops ?? 0) + 1 : 0,
  };
  if (consecutiveFailures >= rules.parkAfterFailures) {
    const parkedUntil = later(run.at, rules.parkedHours);
    return { status: "parked", ...fields, parkedUntil, nextDueAt: parkedUntil };
  }
  const { backoffHours } = rules;
  const wait =
    backoffHours[Math.min(consecutiveFailures, backoffHours.length) - 1] ?? 0;
  return { status: "failed", ...fields, nextDueAt: later(run.at, wait) };
}

// The sources due at `now`, in a stable order: never-run sources first, then the longest
// overdue, ties by id.
export function selectDue<Source extends { readonly id: string }>(
  sources: readonly Source[],
  states: ReadonlyMap<string, SourceState>,
  now: Date,
): Source[] {
  const dueAt = (source: Source) => {
    const nextDueAt = states.get(source.id)?.nextDueAt;
    return nextDueAt ? new Date(nextDueAt).getTime() : -Infinity;
  };
  return sources
    .filter((source) => isDue(states.get(source.id), now))
    .toSorted(
      (a, b) => dueAt(a) - dueAt(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );
}

// A source that may not run (missing credentials, taken down): it keeps its history and is due
// as soon as it is allowed again (FR-9).
export function disabled(
  previous: SourceState | undefined,
  reason: string,
): SourceState {
  return {
    status: "disabled",
    reason,
    lastRunAt: previous?.lastRunAt ?? null,
    advertCount: previous?.advertCount ?? 0,
    consecutiveFailures: previous?.consecutiveFailures ?? 0,
    unchangedPasses: previous?.unchangedPasses ?? 0,
    heldDrops: previous?.heldDrops ?? 0,
    nextDueAt: null,
  };
}

// robots.txt closed the source (FR-5): recorded as disallowed, and asked again after the same
// waits as a failure, since a site may open again. Its adverts leave the store, so none is left.
export function afterDisallowed(
  previous: SourceState | undefined,
  run: { readonly at: Date; readonly reason: string },
  rules: ScheduleRules,
): SourceState {
  const failure = afterFailure(previous, run, rules);
  return {
    status: "disallowed",
    reason: run.reason,
    lastRunAt: failure.lastRunAt,
    advertCount: 0,
    consecutiveFailures: failure.consecutiveFailures,
    unchangedPasses: failure.unchangedPasses,
    heldDrops: failure.heldDrops,
    nextDueAt: failure.nextDueAt,
  };
}

// A read more likely to be an outage than an emptied source (legacy `suspectDrop`): none after
// some, or under a tenth of 50 or more.
export function isSuspectDrop(had: number, has: number): boolean {
  return had > 0 && (has === 0 || (had >= 50 && has < had / 10));
}

// A suspect read of none is always held. A smaller drop is held once and accepted when the next
// read repeats it (legacy `emptyPass`).
export function holdsDrop(
  had: number,
  has: number,
  heldDropsBefore: number,
): boolean {
  return isSuspectDrop(had, has) && (has === 0 || heldDropsBefore === 0);
}
