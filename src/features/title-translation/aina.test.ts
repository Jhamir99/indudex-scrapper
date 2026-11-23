import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Aina's worker wired as the legacy wired it (title translation FR-7): a Python in AINA_DIR/venv, the model in
// AINA_DIR/model. Here a stand-in "python" (a shell script) that answers each line in capitals, so the plumbing is
// tested without the model.
let directory: string;

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "indudex-aina-"));
  await mkdir(join(directory, "venv", "bin"), { recursive: true });
  await mkdir(join(directory, "model"), { recursive: true });
  await writeFile(join(directory, "model", "model.bin"), "");
  const python = join(directory, "venv", "bin", "python");
  await writeFile(python, "#!/bin/sh\ntr 'a-z' 'A-Z'\n");
  await chmod(python, 0o755);
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await rm(directory, { recursive: true, force: true });
});

describe("Aina's worker (title translation FR-7)", () => {
  it("is used where its Python and model are installed, a line in for each line out, in order", async () => {
    vi.stubEnv("AINA_DIR", directory);
    vi.resetModules();
    const { aina, ainaHere } = await import("./aina.js");
    expect(ainaHere()).toBe(true);
    expect(aina(["tecnic", "mecanic de manteniment"])).toEqual([
      "TECNIC",
      "MECANIC DE MANTENIMENT",
    ]);
    expect(aina(["tecnic", "mecanic de manteniment"])).toEqual([
      "TECNIC",
      "MECANIC DE MANTENIMENT",
    ]);
  });

  it("is not there where AINA_DIR holds no model: the route through English stands", async () => {
    vi.stubEnv("AINA_DIR", join(directory, "missing"));
    vi.resetModules();
    const { ainaHere } = await import("./aina.js");
    expect(ainaHere()).toBe(false);
  });
});
