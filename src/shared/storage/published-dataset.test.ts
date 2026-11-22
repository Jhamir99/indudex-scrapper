import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DatasetError,
  POINTER,
  PublishedDataset,
  publishedDirectory,
  versionOf,
} from "./published-dataset.js";

let directory: string;
let dataset: PublishedDataset;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "indudex-published-"));
  dataset = new PublishedDataset(directory);
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

const publish = async (version: string) => {
  const writer = await dataset.start(version);
  await writer.write("index.json", `{"v":1,"version":"${version}"}`);
  await writer.write("offers/2144-es.json", "{}");
  await writer.finish();
};

describe("the published dataset's versions (publication FR-10)", () => {
  it("names a version by its build's UTC time", () => {
    expect(versionOf(new Date("2026-11-22T10:15:00.123Z"))).toBe(
      "20261122T101500Z",
    );
  });

  it("has no current version before the first publication", async () => {
    expect(await dataset.current()).toBeNull();
  });

  it("moves the pointer only once the version is whole", async () => {
    const writer = await dataset.start("20261122T100000Z");
    await writer.write("offers/2144-es.json", "{}");
    expect(await dataset.current()).toBeNull();
    expect(await readdir(directory)).toEqual(["20261122T100000Z.partial"]);
    await writer.finish();
    expect(await dataset.current()).toBe("20261122T100000Z");
    expect(
      JSON.parse(await readFile(join(directory, POINTER), "utf8")),
    ).toEqual({
      v: 1,
      version: "20261122T100000Z",
    });
    expect(
      await readFile(
        join(directory, "20261122T100000Z", "offers", "2144-es.json"),
        "utf8",
      ),
    ).toBe("{}");
  });

  it("leaves the last version current when a build stops, and the next build removes what it left", async () => {
    await publish("20261122T100000Z");
    const stopped = await dataset.start("20261122T110000Z");
    await stopped.write("index.json", "{}");
    expect(await dataset.current()).toBe("20261122T100000Z");
    await publish("20261122T120000Z");
    expect((await readdir(directory)).toSorted()).toEqual([
      "20261122T100000Z",
      "20261122T120000Z",
      POINTER,
    ]);
  });

  it("keeps three versions, the current one always", async () => {
    for (const hour of ["10", "11", "12", "13"])
      await publish(`20261122T${hour}0000Z`);
    expect(await dataset.versions()).toEqual([
      "20261122T110000Z",
      "20261122T120000Z",
      "20261122T130000Z",
    ]);
    // A pointer moved back to an old version by hand keeps it through a prune.
    await publish("20261122T140000Z");
    await writeFile(
      join(directory, POINTER),
      '{"v":1,"version":"20261122T120000Z"}',
    );
    await dataset.prune();
    expect(await dataset.versions()).toEqual([
      "20261122T120000Z",
      "20261122T130000Z",
      "20261122T140000Z",
    ]);
    await publish("20261122T150000Z");
    expect(await dataset.versions()).toEqual([
      "20261122T130000Z",
      "20261122T140000Z",
      "20261122T150000Z",
    ]);
  });

  it("refuses a pointer that names a missing version, or that is no pointer, with its path", async () => {
    await mkdir(directory, { recursive: true });
    await writeFile(
      join(directory, POINTER),
      '{"v":1,"version":"20261122T100000Z"}',
    );
    await expect(dataset.current()).rejects.toThrow(DatasetError);
    await expect(dataset.current()).rejects.toThrow(
      /current\.json: names version 20261122T100000Z/,
    );
    await writeFile(join(directory, POINTER), '{"version":"../etc"}');
    await expect(dataset.current()).rejects.toThrow(/not a version pointer/);
  });

  it("refuses a file outside its version, a bad version name and a version published already", async () => {
    await publish("20261122T100000Z");
    const writer = await dataset.start("20261122T110000Z");
    await expect(writer.write("../current.json", "{}")).rejects.toThrow(
      /inside its version/,
    );
    await expect(dataset.start("latest")).rejects.toThrow(/not a version name/);
    await expect(dataset.start("20261122T100000Z")).rejects.toThrow(
      /published already/,
    );
  });

  it("reads its folder from PUBLISHED_DIR, else published/ at the repo root", () => {
    expect(
      publishedDirectory({ PUBLISHED_DIR: "/srv/indudex/published" }),
    ).toBe("/srv/indudex/published");
    expect(publishedDirectory({})).toMatch(/[/\\]published$/);
  });
});
