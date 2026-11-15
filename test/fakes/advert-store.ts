import type { AdvertStore } from "../../src/features/crawl-core/ports.js";
import type { Advert } from "../../src/shared/schemas/advert.js";
import type { SourceState } from "../../src/shared/schemas/source.js";

// Keeps copies, so a test can't change stored data by mutating what it passed in or read back.
export class InMemoryAdvertStore implements AdvertStore {
  readonly adverts = new Map<string, Advert[]>();
  readonly states = new Map<string, SourceState>();

  async readAdverts(source: string): Promise<Advert[]> {
    return structuredClone(this.adverts.get(source) ?? []);
  }

  async replaceAdverts(
    source: string,
    adverts: readonly Advert[],
  ): Promise<void> {
    this.adverts.set(source, structuredClone([...adverts]));
  }

  async dropAdverts(
    source: string,
    advertIds: readonly string[],
  ): Promise<void> {
    const dropped = new Set(advertIds);
    const kept = (this.adverts.get(source) ?? []).filter(
      (advert) => !dropped.has(advert.id),
    );
    this.adverts.set(source, kept);
  }

  async readState(source: string): Promise<SourceState | undefined> {
    const state = this.states.get(source);
    return state && structuredClone(state);
  }

  async writeState(source: string, state: SourceState): Promise<void> {
    this.states.set(source, structuredClone(state));
  }

  async readStates(): Promise<Map<string, SourceState>> {
    return structuredClone(this.states);
  }
}
