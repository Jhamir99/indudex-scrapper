import type { Clock } from "../../src/features/crawl-core/ports.js";

interface Timer {
  readonly at: number;
  readonly wake: () => void;
}

// Virtual time. Time moves only when the test advances it or when everything under test is
// waiting on `sleep`: once the pending promises have settled, the earliest sleepers wake and the
// clock jumps to their time. Concurrent sleeps therefore overlap as they would on a real clock.
export class FakeClock implements Clock {
  private current: number;
  private timers: Timer[] = [];
  private wakeScheduled = false;

  constructor(start: Date | string = "2026-11-15T08:00:00Z") {
    this.current = new Date(start).getTime();
  }

  now(): Date {
    return new Date(this.current);
  }

  sleep(milliseconds: number): Promise<void> {
    if (milliseconds <= 0) return Promise.resolve();
    return new Promise((wake) => {
      this.timers.push({ at: this.current + milliseconds, wake });
      this.scheduleWake();
    });
  }

  advance(milliseconds: number): void {
    this.current += Math.max(0, milliseconds);
  }

  // setImmediate runs after every pending promise has settled, so the code under test has gone
  // as far as it can without time passing.
  private scheduleWake(): void {
    if (this.wakeScheduled) return;
    this.wakeScheduled = true;
    setImmediate(() => {
      this.wakeScheduled = false;
      this.wakeEarliest();
    });
  }

  private wakeEarliest(): void {
    if (this.timers.length === 0) return;
    const earliest = Math.min(...this.timers.map((timer) => timer.at));
    this.current = Math.max(this.current, earliest);
    const due = this.timers.filter((timer) => timer.at <= this.current);
    this.timers = this.timers.filter((timer) => timer.at > this.current);
    for (const timer of due) timer.wake();
    if (this.timers.length > 0) this.scheduleWake();
  }
}
