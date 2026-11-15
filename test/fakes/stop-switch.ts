import type { StopSwitch } from "../../src/features/crawl-core/ports.js";

export class FakeStopSwitch implements StopSwitch {
  active = false;

  async isActive(): Promise<boolean> {
    return this.active;
  }
}
