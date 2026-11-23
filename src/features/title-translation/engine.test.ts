import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { mtDir, translate } from "./engine.js";

// The engine's wiring (title translation FR-5): the WebAssembly and the models are the operator's download, so
// here only what does not need them. A real run is measured in T015.
describe("the engine (title translation FR-5)", () => {
  it("answers nothing for no text, without starting a worker", async () => {
    expect(await translate("de-en", [], { dir: "/nowhere" })).toEqual([]);
    expect(await translate("de-en", ["", ""], { dir: "/nowhere" })).toEqual([]);
  });

  it("fails the call when a worker cannot load the engine, naming the file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "indudex-engine-"));
    try {
      await expect(
        translate("de-en", ["Elektriker", "Monteur"], { dir, workers: 2 }),
      ).rejects.toThrow(/bergamot-translator\.wasm/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it("reads its folder from MT_DIR, else state/mt at the repo root", () => {
    const was = process.env["MT_DIR"];
    process.env["MT_DIR"] = "/srv/mt";
    expect(mtDir()).toBe("/srv/mt");
    delete process.env["MT_DIR"];
    expect(mtDir()).toMatch(/[/\\]state[/\\]mt$/);
    if (was !== undefined) process.env["MT_DIR"] = was;
  });
});
