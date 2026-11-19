import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { processorStateDirectory } from "../../shared/storage/processor-state.js";
import {
  HISTORY_FILE,
  HistoryError,
  readHistory,
  writeHistory,
} from "./history.js";

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "indudex-state-"));
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

const siemens = {
  n: "Siemens AG",
  g: "engineers",
  p: ["DE212", "es"],
  t: "München",
  tn: "DE212",
  seen: "2026-11-19",
};

describe("the employers kept between runs (companies FR-5)", () => {
  it("reads nothing before the first run", async () => {
    expect(await readHistory(directory)).toEqual({});
  });

  it("writes the history and reads it back, versioned", async () => {
    await writeHistory(directory, { siemens });
    expect(await readHistory(directory)).toEqual({ siemens });
    expect(
      JSON.parse(await readFile(join(directory, HISTORY_FILE), "utf8")),
    ).toEqual({
      version: 1,
      companies: { siemens },
    });
  });

  it("refuses a broken or foreign file, naming its path, and never resets it", async () => {
    await writeFile(join(directory, HISTORY_FILE), "{ not json");
    await expect(readHistory(directory)).rejects.toThrow(HistoryError);
    await writeFile(
      join(directory, HISTORY_FILE),
      JSON.stringify({ version: 2, companies: {} }),
    );
    await expect(readHistory(directory)).rejects.toThrow(
      /companies\.json: version/,
    );
    expect(await readFile(join(directory, HISTORY_FILE), "utf8")).toContain(
      '"version":2',
    );
  });

  it("keeps an employer keyed like a property of every object as an employer", async () => {
    await writeHistory(directory, {
      constructor: { ...siemens, n: "Constructor" },
    });
    const history = await readHistory(directory);
    expect(history["constructor"]?.n).toBe("Constructor");
    expect(history["toString"]).toBeUndefined();
  });
});

describe("the processor's state folder", () => {
  it("is PROCESSOR_STATE_DIR when set, else state/ at the repo root", () => {
    expect(processorStateDirectory({ PROCESSOR_STATE_DIR: "/tmp/x" })).toBe(
      "/tmp/x",
    );
    expect(processorStateDirectory({})).toMatch(/indudex-scrapper\/state$/);
  });
});
