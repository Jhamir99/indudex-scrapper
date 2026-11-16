import type {
  AdvertStore,
  Clock,
} from "../../src/features/crawl-core/ports.js";
import {
  type Advert,
  isExpired,
  type StoredAdvert,
} from "../../src/shared/schemas/advert.js";
import type {
  SourceMemory,
  SourceState,
} from "../../src/shared/schemas/source.js";
import { FakeClock } from "./clock.js";

// Behaves as the file store does (first-seen days, expiry, an empty set changes nothing), in memory.
// Keeps copies, so a test can't change stored data by mutating what it passed in or read back.
export class InMemoryAdvertStore implements AdvertStore {
  readonly adverts = new Map<string, StoredAdvert[]>();
  readonly states = new Map<string, SourceState>();
  readonly memories = new Map<string, SourceMemory>();

  constructor(private readonly clock: Clock = new FakeClock()) {}

  private today(): string {
    return this.clock.now().toISOString().slice(0, 10);
  }

  async readAdverts(source: string): Promise<StoredAdvert[]> {
    const today = this.today();
    return structuredClone(
      (this.adverts.get(source) ?? []).filter(
        (advert) => !isExpired(advert, today),
      ),
    );
  }

  async replaceAdverts(
    source: string,
    adverts: readonly Advert[],
  ): Promise<void> {
    if (adverts.length === 0) return;
    const today = this.today();
    const firstSeen = new Map(
      (this.adverts.get(source) ?? []).map((a) => [a.id, a.firstSeen]),
    );
    const stored = adverts
      .map((advert) => ({
        ...structuredClone(advert),
        firstSeen: firstSeen.get(advert.id) ?? today,
      }))
      .filter((advert) => !isExpired(advert, today));
    this.adverts.set(source, stored);
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

  async readMemory(source: string): Promise<SourceMemory | undefined> {
    const memory = this.memories.get(source);
    return memory === undefined ? undefined : structuredClone(memory);
  }

  async writeMemory(source: string, memory: SourceMemory): Promise<void> {
    this.memories.set(source, structuredClone(memory));
  }

  async readStates(): Promise<Map<string, SourceState>> {
    return structuredClone(this.states);
  }
}
