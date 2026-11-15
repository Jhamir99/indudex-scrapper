import { describe, expect, it } from "vitest";
import { FakeClock } from "../../../../test/fakes/clock.js";
import type { SourceState } from "../../../shared/schemas/source.js";
import {
  afterFailure,
  afterSuccess,
  isDue,
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
