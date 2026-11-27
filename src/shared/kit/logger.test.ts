import { describe, expect, it } from "vitest";
import { messageOfLine } from "./logger.js";

describe("a log line's message", () => {
  it("is a JSON line's msg with its time, or a plain line as it is", () => {
    expect([
      messageOfLine(
        '{"level":"info","time":"2026-11-27T03:00:00.000Z","msg":"12 of 40 sources due"}',
      ),
      messageOfLine("2026-11-26T20:00:00.000Z 12 of 40 sources due"),
      messageOfLine("{ not json"),
    ]).toEqual([
      { message: "12 of 40 sources due", time: "2026-11-27T03:00:00.000Z" },
      { message: "2026-11-26T20:00:00.000Z 12 of 40 sources due" },
      { message: "{ not json" },
    ]);
  });
});
