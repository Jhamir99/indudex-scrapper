import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "@hono/zod-openapi";
import { CONFIG_DIRECTORY, ConfigError, loadConfig } from "./load-config.js";

const Limits = z.strictObject({
  cadence_h: z.strictObject({
    default: z.number().positive(),
  }),
  backoff_h: z.array(z.number().positive()),
});

let root: string;
let configDirectory: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "indudex-config-"));
  configDirectory = join(root, "config");
  await mkdir(configDirectory);
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const write = (name: string, content: string) =>
  writeFile(join(configDirectory, name), content);

async function failure(promise: Promise<unknown>): Promise<ConfigError> {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(ConfigError);
  return error as ConfigError;
}

describe("loadConfig (FR-5, FR-6)", () => {
  it("loads a valid file", async () => {
    await write(
      "crawl.yml",
      "# legacy defaults\ncadence_h:\n  default: 24\nbackoff_h: [24, 72, 168]\n",
    );
    await expect(
      loadConfig("crawl.yml", Limits, configDirectory),
    ).resolves.toEqual({
      cadence_h: { default: 24 },
      backoff_h: [24, 72, 168],
    });
  });

  it("fails on an unknown key, with its path", async () => {
    await write(
      "crawl.yml",
      "cadence_h:\n  default: 24\n  defualt: 12\nbackoff_h: [24]\n",
    );
    const error = await failure(
      loadConfig("crawl.yml", Limits, configDirectory),
    );
    expect(error.message).toMatch(/^crawl\.yml: cadence_h: .*defualt/);
  });

  it("fails on a wrong type, with its path", async () => {
    await write(
      "crawl.yml",
      "cadence_h:\n  default: 24\nbackoff_h: [24, soon]\n",
    );
    const error = await failure(
      loadConfig("crawl.yml", Limits, configDirectory),
    );
    expect(error.message).toMatch(/^crawl\.yml: backoff_h\.1: /);
  });

  it("fails on a file that is not YAML", async () => {
    await write("crawl.yml", "cadence_h: [24\n");
    const error = await failure(
      loadConfig("crawl.yml", Limits, configDirectory),
    );
    expect(error.message).toMatch(/^crawl\.yml: not valid YAML/);
  });

  it("fails on a missing file", async () => {
    const error = await failure(
      loadConfig("missing.yml", Limits, configDirectory),
    );
    expect(error.message).toMatch(/not found/);
  });

  describe("reads no file outside the config folder", () => {
    beforeEach(async () => {
      await writeFile(
        join(root, "secret.yml"),
        "cadence_h:\n  default: 24\nbackoff_h: [24]\n",
      );
    });

    it.each(["../secret.yml", "nested/../../secret.yml"])(
      "rejects the relative path %j",
      async (fileName) => {
        const error = await failure(
          loadConfig(fileName, Limits, configDirectory),
        );
        expect(error.message).toMatch(/outside the config folder/);
      },
    );

    it("rejects an absolute path", async () => {
      const error = await failure(
        loadConfig(join(root, "secret.yml"), Limits, configDirectory),
      );
      expect(error.message).toMatch(/outside the config folder/);
    });

    it("rejects a link that leads out of the folder", async () => {
      await symlink(
        join(root, "secret.yml"),
        join(configDirectory, "link.yml"),
      );
      const error = await failure(
        loadConfig("link.yml", Limits, configDirectory),
      );
      expect(error.message).toMatch(/outside the config folder/);
    });

    it("rejects the folder itself", async () => {
      const error = await failure(loadConfig(".", Limits, configDirectory));
      expect(error.message).toMatch(/outside the config folder/);
    });
  });

  it("points at the repo's config folder by default", () => {
    expect(CONFIG_DIRECTORY).toBe(join(process.cwd(), "config") + "/");
  });
});
