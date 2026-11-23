import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import zlib from "node:zlib";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ENGINE_VERSION,
  fetchModels,
  type RemoteRecord,
} from "./fetch-models.js";

// A Remote Settings of small made-up files: the engine, and one direction's model and vocabulary, compressed as
// Firefox's are, with their real SHA-256.
const sha = (buf: Uint8Array) => createHash("sha256").update(buf).digest("hex");
const files = new Map<string, Buffer>();
const record = (
  name: string,
  content: string,
  fields: Partial<RemoteRecord> = {},
  zst = true,
): RemoteRecord => {
  const raw = Buffer.from(content);
  const sent = zst ? zlib.zstdCompressSync(raw) : raw;
  const location = `files/${name}`;
  files.set(location, sent);
  return {
    name: zst ? `${name}.zst` : name,
    version: "1.0",
    attachment: {
      location,
      hash: sha(sent),
      filename: zst ? `${name}.zst` : name,
    },
    ...(zst ? { decompressedHash: sha(raw) } : {}),
    ...fields,
  };
};
const engine = record(
  "bergamot-translator.wasm",
  "wasm",
  { version: ENGINE_VERSION, name: "bergamot-translator" },
  false,
);
const models = [
  record("model.deen.intgemm.alphas.bin", "model 1.0", {
    fileType: "model",
    sourceLanguage: "de",
    targetLanguage: "en",
  }),
  record("vocab.deen.spm", "vocab 1.0", {
    fileType: "vocab",
    sourceLanguage: "de",
    targetLanguage: "en",
  }),
  record("model.deen.old.bin", "older", {
    fileType: "model",
    sourceLanguage: "de",
    targetLanguage: "en",
    version: "0.9",
  }),
];
let asked: string[] = [];
const answer = (body: Buffer | object, ok = true) => ({
  ok,
  status: ok ? 200 : 404,
  json: async () => body,
  arrayBuffer: async () => {
    const b = body as Buffer;
    return b.buffer.slice(
      b.byteOffset,
      b.byteOffset + b.byteLength,
    ) as ArrayBuffer;
  },
});
const server = async (url: string) => {
  asked.push(url);
  if (url.endsWith("translations-wasm-v2/records"))
    return answer({ data: [engine] });
  if (url.endsWith("translations-models-v2/records"))
    return answer({ data: models });
  const file = files.get(url.replace(/^.*?cdn\.mozilla\.net\//, ""));
  return file ? answer(file) : answer({}, false);
};

// A server whose files are not the ones described, and one with no engine of the version wanted.
const bad = async (url: string) =>
  url.includes("cdn") ? answer(Buffer.from("tampered")) : server(url);
const none = async (url: string) =>
  url.endsWith("translations-wasm-v2/records")
    ? answer({ data: [] })
    : server(url);

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "indudex-mt-"));
  asked = [];
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("the engine and models fetched (title translation FR-5)", () => {
  it("fetches the engine and the newest version of each direction, unpacked and checked, with its files.json", async () => {
    const log: string[] = [];
    await fetchModels({
      dir,
      pairs: ["de-en", "xx-en"],
      fetch: server,
      log: (l) => log.push(l),
    });
    expect(
      await readFile(join(dir, "engine", "bergamot-translator.wasm"), "utf8"),
    ).toBe("wasm");
    expect(
      await readFile(
        join(dir, "models", "de-en", "model-model.deen.intgemm.alphas.bin"),
        "utf8",
      ),
    ).toBe("model 1.0");
    expect(
      JSON.parse(
        await readFile(join(dir, "models", "de-en", "files.json"), "utf8"),
      ),
    ).toEqual({
      model: "model-model.deen.intgemm.alphas.bin",
      vocab: "vocab-vocab.deen.spm",
      architecture: "",
      version: "1.0",
    });
    expect(log).toEqual([
      "engine fetched",
      "de-en 1.0 2 files fetched",
      "xx-en no model",
    ]);
  });

  it("keeps a file already there when it is the one described, and fetches one that is not", async () => {
    await fetchModels({
      dir,
      pairs: ["de-en"],
      fetch: server,
      log: () => undefined,
    });
    await writeFile(
      join(dir, "models", "de-en", "vocab-vocab.deen.spm"),
      "changed",
    );
    asked = [];
    const log: string[] = [];
    await fetchModels({
      dir,
      pairs: ["de-en"],
      fetch: server,
      log: (l) => log.push(l),
    });
    expect(log).toEqual(["engine already there", "de-en 1.0 1 files fetched"]);
    expect(asked.filter((u) => u.includes("cdn"))).toEqual([
      expect.stringContaining("vocab.deen.spm"),
    ]);
  });

  it("refuses a file that is not the one described, and an engine of another version", async () => {
    await expect(
      fetchModels({ dir, pairs: [], fetch: bad, log: () => undefined }),
    ).rejects.toThrow(/not the file Remote Settings describes/);
    await expect(
      fetchModels({ dir, pairs: [], fetch: none, log: () => undefined }),
    ).rejects.toThrow(/no engine 4\.0/);
  });
});
