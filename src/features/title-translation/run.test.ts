import { existsSync } from "node:fs";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Engine } from "./legs.js";
import { runTranslator } from "./run.js";

// The translator's run on temporary state with a stand-in engine (title translation FR-8, FR-9).
let state: string;
beforeEach(async () => {
  state = await mkdtemp(join(tmpdir(), "indudex-translator-"));
});
afterEach(async () => {
  await rm(state, { recursive: true, force: true });
});

const wanted = (t: string, into = ["en", "es"], fields = {}) => ({
  t,
  lang: "de",
  into,
  n: 1,
  cc: "de",
  ci: "",
  c: "",
  ...fields,
});
const write = (name: string, value: unknown) =>
  writeFile(join(state, name), JSON.stringify(value));
const read = async (name: string) =>
  JSON.parse(await readFile(join(state, name), "utf8"));
// An engine that writes each text in capitals, and one that fails on any batch of more than one text.
const capitals: Engine = {
  translate: async (_pair, texts) => texts.map((t) => t.toUpperCase()),
  aina: null,
};
const run = (engine: Engine, fields = {}) => {
  const log: string[] = [];
  return runTranslator({
    stateDirectory: state,
    mtDirectory: join(state, "mt"),
    engine,
    log: (l) => log.push(l),
    ...fields,
  }).then((result) => ({ result, log }));
};

describe("the title translator's run (title translation FR-8, FR-9)", () => {
  it("ends well with no list yet, and fails with no models", async () => {
    expect((await run(capitals)).result).toMatchObject({
      titles: 0,
      failed: false,
    });
    await write("mt-wanted.json", [wanted("Elektriker")]);
    const log: string[] = [];
    const result = await runTranslator({
      stateDirectory: state,
      mtDirectory: join(state, "mt"),
      log: (line) => log.push(line),
    });
    expect(result).toMatchObject({ failed: true, left: 1 });
    expect(log[0]).toMatch(/no models in .*pnpm translate:fetch/);
  });

  it("translates the list into the caches, empties it, and keeps a day's log", async () => {
    await write("mt-wanted.json", [wanted("Elektriker"), wanted("Monteur")]);
    await write("titles-es.json", { Schweißer: "Soldador" });
    const { result } = await run(capitals);
    expect(result).toEqual({
      titles: 2,
      written: 4,
      unanswered: 0,
      left: 0,
      failed: false,
    });
    // A title the engine gives back as it was is cached as needing no translation (""); the method writes the trades
    // of its table in ("Monteur" → "Fitter").
    expect(await read("titles-en.json")).toEqual({
      Elektriker: "",
      Monteur: "Fitter",
    });
    expect(Object.keys(await read("titles-es.json")).toSorted()).toEqual([
      "Elektriker",
      "Monteur",
      "Schweißer",
    ]);
    expect(await read("mt-wanted.json")).toEqual([]);
    expect(existsSync(join(state, "mt-current.json"))).toBe(false);
    const logs = (await readdir(state)).filter((f) => f.startsWith("mt-new-"));
    expect(logs).toHaveLength(1);
  });

  it("does a chunk the engine fails on again in halves, down to single titles", async () => {
    await write("mt-wanted.json", [
      wanted("Elektriker"),
      wanted("Monteur"),
      wanted("Schweißer"),
    ]);
    const fussy: Engine = {
      translate: async (_pair, texts) => {
        if (texts.length > 1) throw new Error("the batch failed");
        return texts.map((t) => t.toUpperCase());
      },
      aina: null,
    };
    const { result, log } = await run(fussy);
    expect(result).toMatchObject({ titles: 3, unanswered: 0, left: 0 });
    expect(
      log.filter((l) => l.includes("done in halves")).length,
    ).toBeGreaterThan(0);
  });

  it("sets a title that alone kept a run from ending aside, and does several last, one at a time", async () => {
    await write("mt-wanted.json", [wanted("Elektriker"), wanted("Monteur")]);
    await write("mt-current.json", ["Elektriker"]);
    const { result, log } = await run(capitals);
    expect(await read("mt-stuck.json")).toEqual(["Elektriker"]);
    expect(result.titles).toBe(1);
    expect(log[0]).toMatch(/"Elektriker" alone kept a run from ending/);
  });

  it("starts no chunk after its minutes", async () => {
    await write("mt-wanted.json", [
      wanted("Elektriker"),
      wanted("Monteur", ["en"]),
    ]);
    let clock = 0;
    const slow: Engine = {
      translate: async (_pair, texts) => {
        clock += 50 * 60_000;
        return texts.map((t) => t.toUpperCase());
      },
      aina: null,
    };
    const { result } = await run(slow, { minutes: 45, now: () => clock });
    expect(result).toMatchObject({ titles: 1, left: 1 });
    expect(
      (await read("mt-wanted.json")).map((w: { t: string }) => w.t),
    ).toEqual(["Monteur"]);
  });

  it("fails when the engine gives no answer for most titles", async () => {
    await write("mt-wanted.json", [wanted("Elektriker"), wanted("Monteur")]);
    // An engine that fails on every text: a title it fails on alone gets no translation this time.
    const silent: Engine = {
      translate: async () => {
        throw new Error("the engine is down");
      },
      aina: null,
    };
    const { result, log } = await run(silent);
    expect(result).toMatchObject({
      failed: true,
      titles: 2,
      unanswered: 2,
      left: 2,
    });
    expect(log.at(-1)).toMatch(/no answer for most titles/);
  });
});
