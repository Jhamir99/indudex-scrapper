import type { Clock } from "../../src/features/crawl-core/ports.js";

// Time moves only when the code under test sleeps or the test advances it.
export class FakeClock implements Clock {
  private current: number;

  constructor(start: Date | string = "2026-11-15T08:00:00Z") {
    this.current = new Date(start).getTime();
  }

  now(): Date {
    return new Date(this.current);
  }

  async sleep(milliseconds: number): Promise<void> {
    this.advance(milliseconds);
  }

  advance(milliseconds: number): void {
    this.current += Math.max(0, milliseconds);
  }
}
