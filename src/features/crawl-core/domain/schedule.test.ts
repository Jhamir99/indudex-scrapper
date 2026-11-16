import { describe, expect, it } from "vitest";
import { FakeClock } from "../../../../test/fakes/clock.js";
import type { SourceState } from "../../../shared/schemas/source.js";
import {
  afterFailure,
  afterSuccess,
  holdsDrop,
  isDue,
  isSuspectDrop,
  selectDue,
  type ScheduleRules,
  waitAfterSuccessHours,
} from "./schedule.js";

// The legacy crawl.yml defaults.
const rules: ScheduleRules = {
  cadenceHours: 24,
  unchangedMaxHours: 168,
  backoffHours: [24, 72, 168],
  parkAfterFailures: 6,
  parkedHours: 720,
};

const HOUR = 3_600_000;
const hoursBetween = (from: Date, to: string | null) =>
  (new Date(to ?? NaN).getTime() - from.getTime()) / HOUR;

describe("isDue (FR-6)", () => {
  it("is due when the source never ran", () => {
    expect(isDue(undefined, new FakeClock().now())).toBe(true);
  });

  it("is due once its cadence has passed, and not before", () => {
    const clock = new FakeClock();
    const state = afterSuccess(
      undefined,
      { at: clock.now(), advertCount: 10, changed: true },
      rules,
    );

    clock.advance(23 * HOUR);
    expect(isDue(state, clock.now())).toBe(false);
    clock.advance(HOUR);
    expect(isDue(state, clock.now())).toBe(true);
  });
});

describe("unchanged wait (FR-6)", () => {
  it("lengthens the wait on each unchanged pass, up to the limit", () => {
    const clock = new FakeClock();
    let state = afterSuccess(
      undefined,
      { at: clock.now(), advertCount: 10, changed: true },
      rules,
    );
    const waits = [hoursBetween(clock.now(), state.nextDueAt)];
    for (let pass = 0; pass < 6; pass++) {
      clock.advance(waits.at(-1)! * HOUR);
      state = afterSuccess(
        state,
        { at: clock.now(), advertCount: 10, changed: false },
        rules,
      );
      waits.push(hoursBetween(clock.now(), state.nextDueAt));
    }

    expect(waits).toEqual([24, 36, 54, 81, 121.5, 168, 168]);
  });

  it("goes back to the cadence as soon as the source changes", () => {
    const clock = new FakeClock();
    let state: SourceState | undefined;
    for (const changed of [false, false, false, true]) {
      state = afterSuccess(
        state,
        { at: clock.now(), advertCount: 10, changed },
        rules,
      );
    }
    expect(state?.unchangedPasses).toBe(0);
    expect(hoursBetween(clock.now(), state?.nextDueAt ?? null)).toBe(24);
  });

  it("keeps a cadence shorter than a day as it is", () => {
    expect(waitAfterSuccessHours({ ...rules, cadenceHours: 6 }, 5)).toBe(6);
  });
});

// Fails a source the given number of times, each attempt when it is due again.
function failTimes(times: number, clock = new FakeClock()) {
  let state: SourceState | undefined;
  const waits: number[] = [];
  for (let attempt = 0; attempt < times; attempt++) {
    state = afterFailure(state, { at: clock.now(), reason: "HTTP 503" }, rules);
    waits.push(hoursBetween(clock.now(), state.nextDueAt));
    clock.advance(waits.at(-1)! * HOUR);
  }
  return { state: state!, waits };
}

describe("backoff and parking (FR-3)", () => {
  it("waits 24, 72 and 168 hours after consecutive failures", () => {
    const { state, waits } = failTimes(5);
    expect(waits).toEqual([24, 72, 168, 168, 168]);
    expect(state).toMatchObject({
      status: "failed",
      reason: "HTTP 503",
      consecutiveFailures: 5,
    });
  });

  it("parks the source for about a month after 6 failures", () => {
    const { state, waits } = failTimes(6);
    expect(waits.at(-1)).toBe(720);
    expect(state.status).toBe("parked");
    if (state.status !== "parked") return;
    expect(state.parkedUntil).toBe(state.nextDueAt);

    const parkedUntil = new Date(state.parkedUntil).getTime();
    expect(isDue(state, new Date(parkedUntil - HOUR))).toBe(false);
    expect(isDue(state, new Date(parkedUntil))).toBe(true);
  });

  it("keeps the advert count of the last good run", () => {
    const clock = new FakeClock();
    const good = afterSuccess(
      undefined,
      { at: clock.now(), advertCount: 42, changed: true },
      rules,
    );
    const failed = afterFailure(
      good,
      { at: clock.now(), reason: "timeout" },
      rules,
    );
    expect(failed.advertCount).toBe(42);
  });

  it("resets the count after a success", () => {
    const clock = new FakeClock();
    const { state } = failTimes(4, clock);
    const recovered = afterSuccess(
      state,
      { at: clock.now(), advertCount: 7, changed: true },
      rules,
    );
    expect(recovered).toMatchObject({
      status: "enabled",
      consecutiveFailures: 0,
      advertCount: 7,
    });

    const failedAgain = afterFailure(
      recovered,
      { at: clock.now(), reason: "HTTP 500" },
      rules,
    );
    expect(hoursBetween(clock.now(), failedAgain.nextDueAt)).toBe(24);
  });
});

const enabledDueAt = (nextDueAt: string | null): SourceState => ({
  status: "enabled",
  lastRunAt: null,
  advertCount: 0,
  consecutiveFailures: 0,
  unchangedPasses: 0,
  heldDrops: 0,
  nextDueAt,
});

describe("selectDue (FR-6)", () => {
  it("keeps only due sources: never run first, then the longest overdue, ties by id", () => {
    const now = new Date("2026-11-16T08:00:00Z");
    const sources = ["e", "d", "c", "b", "a"].map((id) => ({ id }));
    const states = new Map([
      ["a", enabledDueAt("2026-11-16T07:00:00Z")],
      ["b", enabledDueAt("2026-11-16T09:00:00Z")],
      ["c", enabledDueAt("2026-11-15T07:00:00Z")],
      ["d", enabledDueAt("2026-11-16T07:00:00Z")],
    ]);

    expect(selectDue(sources, states, now).map((s) => s.id)).toEqual([
      "e",
      "c",
      "a",
      "d",
    ]);
  });
});

describe("suspect drops (FR-4)", () => {
  it("are none after some, or under a tenth of 50 or more", () => {
    expect(isSuspectDrop(1, 0)).toBe(true);
    expect(isSuspectDrop(60, 5)).toBe(true);
    expect(isSuspectDrop(60, 6)).toBe(false);
    expect(isSuspectDrop(49, 1)).toBe(false);
    expect(isSuspectDrop(0, 0)).toBe(false);
  });

  it("hold a read of none every time and a smaller drop only once", () => {
    expect(holdsDrop(10, 0, 0)).toBe(true);
    expect(holdsDrop(10, 0, 3)).toBe(true);
    expect(holdsDrop(60, 5, 0)).toBe(true);
    expect(holdsDrop(60, 5, 1)).toBe(false);
  });

  it("are counted by afterFailure and reset by a success", () => {
    const at = new Date("2026-11-16T08:00:00Z");
    const once = afterFailure(
      undefined,
      { at, reason: "drop", heldDrop: true },
      rules,
    );
    const twice = afterFailure(
      once,
      { at, reason: "drop", heldDrop: true },
      rules,
    );
    expect(twice.heldDrops).toBe(2);
    expect(afterFailure(twice, { at, reason: "down" }, rules).heldDrops).toBe(
      0,
    );
    expect(
      afterSuccess(twice, { at, advertCount: 1, changed: true }, rules)
        .heldDrops,
    ).toBe(0);
  });
});
