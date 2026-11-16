import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { StopSwitch } from "../../features/crawl-core/ports.js";
import { FileStopSwitch, STOP_FLAG } from "./file-stop-switch.js";

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "indudex-stop-"));
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe("FileStopSwitch (FR-7)", () => {
  it("is released while there is no flag file", async () => {
    expect(await new FileStopSwitch(directory).isActive()).toBe(false);
  });

  it("reads as active once the flag appears and released once it is removed, without a new instance", async () => {
    const stopSwitch = new FileStopSwitch(directory);
    const flag = join(directory, STOP_FLAG);

    await writeFile(flag, "");
    expect(await stopSwitch.isActive()).toBe(true);

    await rm(flag);
    expect(await stopSwitch.isActive()).toBe(false);
  });

  it("is released when the store folder does not exist yet", async () => {
    const stopSwitch = new FileStopSwitch(join(directory, "missing"));
    expect(await stopSwitch.isActive()).toBe(false);
  });

  it("counts a flag that is a folder as set", async () => {
    await mkdir(join(directory, STOP_FLAG));
    expect(await new FileStopSwitch(directory).isActive()).toBe(true);
  });

  it("fits the crawl-core StopSwitch port", () => {
    const stopSwitch = new FileStopSwitch(directory);
    const port: StopSwitch = stopSwitch;
    expect(port).toBe(stopSwitch);
  });
});
