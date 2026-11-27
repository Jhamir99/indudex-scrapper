import { describe, expect, it } from "vitest";
import type { SourceState } from "../../shared/schemas/source.js";
import { dueQueue, worthOf } from "./queue.js";

// The legacy's `due` (builder/crawl.ts); ours was compared with it on 3,000 random sources and states (career sites T006,
// the same 2,552 in the same order).
const NOW = new Date("2026-11-27T12:00:00Z");
const state = (hoursAgo: number, dueHoursAgo: number): SourceState => ({
  status: "enabled",
  lastRunAt: new Date(NOW.getTime() - hoursAgo * 3_600_000).toISOString(),
  advertCount: 3,
  consecutiveFailures: 0,
  unchangedPasses: 0,
  heldDrops: 0,
  nextDueAt: new Date(NOW.getTime() - dueHoursAgo * 3_600_000).toISOString(),
});
const source = (id: string, group = "careers", cadenceHours = 24) => ({
  id,
  group,
  cadenceHours,
});

describe("the legacy's queue (career sites FR-6)", () => {
  it("reads what the site shows first, Catalonia's before Spain's, then the rest, one place in five for the silent", () => {
    const sources = ["cat", "es", "de", "s1", "s2", "s3", "s4", "none"].map(
      (id) => source(id),
    );
    const states = new Map(sources.map((s) => [s.id, state(30, 2)]));
    const shown = new Map<string, readonly [number, number, number]>([
      ["cat", [4, 4, 2]],
      ["es", [3, 3, 0]],
      ["de", [5, 0, 0]],
      ["s1", [1, 0, 0]],
      ["s2", [1, 0, 0]],
      ["s3", [1, 0, 0]],
      ["s4", [1, 0, 0]],
    ]);
    expect(
      dueQueue(sources, states, {
        now: NOW,
        worth: (id) => worthOf(shown, id),
        newARun: 300,
        noneEvery: 5,
      }).map((s) => s.id),
    ).toEqual(["cat", "es", "de", "s1", "none", "s2", "s3", "s4"]);
  });

  it("takes never-read sources after the overdue ones, so many a run, a group at a time in turn", () => {
    const sources = [
      source("old"),
      source("c1"),
      source("c2"),
      source("c3"),
      source("g1", "greenhouse"),
      source("g2", "greenhouse"),
    ];
    const states = new Map([["old", state(30, 2)]]);
    expect(
      dueQueue(sources, states, {
        now: NOW,
        worth: () => 1,
        newARun: 3,
        noneEvery: 5,
      }).map((s) => s.id),
    ).toEqual(["old", "c1", "g1", "c2"]);
  });

  it("puts a source read well within its cadence (reading on) last, and leaves one not due", () => {
    const sources = [
      source("portal", "portals", 6),
      source("site"),
      source("later"),
    ];
    const states = new Map([
      ["portal", state(1, 0)],
      ["site", state(30, 2)],
      ["later", state(1, -5)],
    ]);
    expect(
      dueQueue(sources, states, {
        now: NOW,
        worth: () => 1,
        newARun: 300,
        noneEvery: 5,
      }).map((s) => s.id),
    ).toEqual(["site", "portal"]);
  });
});
