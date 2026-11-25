import { describe, expect, it } from "vitest";
import type { SourceState } from "../../shared/schemas/source.js";
import { formatStatus } from "./status.js";

const base = {
  lastRunAt: "2026-11-16T08:00:12.000Z",
  advertCount: 120,
  consecutiveFailures: 0,
  unchangedPasses: 0,
  heldDrops: 0,
  nextDueAt: "2026-11-17T08:00:12.000Z",
};

describe("formatStatus (FR-10)", () => {
  it("prints state, last run, advert count, next run and reason for a mix of states", () => {
    const states = new Map<string, SourceState>([
      ["brz", { status: "enabled", ...base }],
      [
        "adzuna",
        {
          status: "disabled",
          reason: "missing credentials: ADZUNA_APP_ID, ADZUNA_APP_KEY",
          ...base,
          lastRunAt: null,
          advertCount: 0,
          nextDueAt: null,
        },
      ],
      [
        "feina",
        {
          status: "failed",
          reason:
            "server-error (HTTP 503) for https://feina.example/feed after 3 attempts",
          ...base,
          consecutiveFailures: 2,
          nextDueAt: "2026-11-19T08:00:12.000Z",
        },
      ],
      [
        "closed",
        {
          status: "disallowed",
          reason: "robots.txt disallows https://closed.example/jobs",
          ...base,
          advertCount: 4,
        },
      ],
      [
        "gone",
        {
          status: "parked",
          reason: "network for https://gone.example/ after 3 attempts",
          parkedUntil: "2026-12-16T08:00:12.000Z",
          ...base,
          consecutiveFailures: 6,
          nextDueAt: "2026-12-16T08:00:12.000Z",
        },
      ],
    ]);

    expect(formatStatus(states, ["brz", "fresh"])).toBe(
      [
        "SOURCE  STATE                           LAST RUN           ADVERTS  NEXT RUN           REASON",
        "adzuna  disabled                        -                  0        due                missing credentials: ADZUNA_APP_ID, ADZUNA_APP_KEY",
        "brz     enabled                         2026-11-16 08:00Z  120      2026-11-17 08:00Z",
        "closed  disallowed                      2026-11-16 08:00Z  4        2026-11-17 08:00Z  robots.txt disallows https://closed.example/jobs",
        "feina   failed                          2026-11-16 08:00Z  120      2026-11-19 08:00Z  server-error (HTTP 503) for https://feina.example/feed after 3 attempts",
        "fresh   never run                       -                  -        due",
        "gone    parked until 2026-12-16 08:00Z  2026-11-16 08:00Z  120      2026-12-16 08:00Z  network for https://gone.example/ after 3 attempts",
        "",
      ].join("\n"),
    );
  });

  it("says so when there is nothing to show", () => {
    expect(formatStatus(new Map())).toBe("No sources yet.\n");
  });
});

describe("a source's backlog in the status (job portals FR-5)", () => {
  it("says how many pages of ours an enabled source left to read", () => {
    const states = new Map<string, SourceState>([
      [
        "free-work.com",
        {
          status: "enabled",
          lastRunAt: "2026-11-16T08:00:12.000Z",
          advertCount: 1500,
          consecutiveFailures: 0,
          unchangedPasses: 0,
          heldDrops: 0,
          backlog: 2311,
          nextDueAt: "2026-11-16T09:00:12.000Z",
        },
      ],
    ]);
    expect(formatStatus(states)).toContain(
      "backlog: 2311 pages of ours to read",
    );
  });
});
