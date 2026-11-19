import type { RatesKeeper } from "../../src/features/crawl-core/ports.js";

// Keeps the rates file in memory, with the day it was kept on.
export class InMemoryRatesKeeper implements RatesKeeper {
  kept: string | undefined;
  day: string | undefined;

  constructor(private readonly clock: { now(): Date }) {}

  async keptOn(): Promise<string | undefined> {
    return this.day;
  }

  async keep(xml: string): Promise<void> {
    this.kept = xml;
    this.day = this.clock.now().toISOString().slice(0, 10);
  }
}
