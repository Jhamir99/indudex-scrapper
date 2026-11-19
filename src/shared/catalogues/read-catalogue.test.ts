import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "@hono/zod-openapi";
import {
  CATALOGUE_DIRECTORY,
  CatalogueError,
  readCatalogueFile,
} from "./read-catalogue.js";

const Levels = z.strictObject({
  levels: z.array(z.strictObject({ id: z.string(), label: z.string() })),
});

let root: string;
let directory: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "indudex-catalogues-"));
  directory = join(root, "catalogues");
  await mkdir(join(directory, "codes"), { recursive: true });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const write = (name: string, data: unknown) =>
  writeFile(
    join(directory, name),
    typeof data === "string" ? data : JSON.stringify(data),
  );

const levels = { levels: [{ id: "junior", label: "Junior" }] };

async function failure(promise: Promise<unknown>): Promise<CatalogueError> {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(CatalogueError);
  return error as CatalogueError;
}

describe("readCatalogueFile (FR-3, FR-7)", () => {
  it("reads and validates a catalogue, also in a subfolder", async () => {
    await write("codes/seniority.json", levels);
    await expect(
      readCatalogueFile("codes/seniority.json", Levels, directory),
    ).resolves.toEqual(levels);
  });

  it("parses a file once and hands out the same copy afterwards", async () => {
    await write("seniority.json", levels);
    const first = await readCatalogueFile("seniority.json", Levels, directory);
    await write("seniority.json", { levels: [] });
    const second = await readCatalogueFile("seniority.json", Levels, directory);
    expect(second).toBe(first);
  });

  it("reports a schema mismatch with the file and the place in it", async () => {
    await write("seniority.json", { levels: [{ id: "junior", lable: "x" }] });
    const error = await failure(
      readCatalogueFile("seniority.json", Levels, directory),
    );
    expect(error.message).toMatch(/^seniority\.json: levels\.0/);
  });

  it("reports a file that is not JSON", async () => {
    await write("seniority.json", '{"levels": [');
    const error = await failure(
      readCatalogueFile("seniority.json", Levels, directory),
    );
    expect(error.message).toMatch(/^seniority\.json: not valid JSON: /);
  });

  it("reports a missing file", async () => {
    const error = await failure(
      readCatalogueFile("missing.json", Levels, directory),
    );
    expect(error.message).toBe(
      "missing.json: not found in the catalogues folder",
    );
  });

  it("does not keep a failure, so a fixed file is read again", async () => {
    await write("seniority.json", "{");
    await failure(readCatalogueFile("seniority.json", Levels, directory));
    await write("seniority.json", levels);
    await expect(
      readCatalogueFile("seniority.json", Levels, directory),
    ).resolves.toEqual(levels);
  });

  it.each(["../secret.json", "/etc/passwd"])(
    "refuses %s, outside the folder",
    async (file) => {
      const error = await failure(readCatalogueFile(file, Levels, directory));
      expect(error.message).toBe(`${file}: outside the catalogues folder`);
    },
  );

  it("refuses a link that leads out of the folder", async () => {
    await writeFile(join(root, "outside.json"), JSON.stringify(levels));
    await symlink(join(root, "outside.json"), join(directory, "linked.json"));
    const error = await failure(
      readCatalogueFile("linked.json", Levels, directory),
    );
    expect(error.message).toBe("linked.json: outside the catalogues folder");
  });

  it("points at the repo's catalogues folder", () => {
    expect(CATALOGUE_DIRECTORY).toMatch(/[/\\]catalogues[/\\]$/);
  });
});
