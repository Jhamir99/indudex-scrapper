// Firefox Translations' engine (Bergamot, the WebAssembly build Firefox itself runs) and its models, run in Node
// (legacy builder/mt/engine.mjs, word for word but for types): a list of texts in, their translations out, in
// order. The engine's loader (vendor/bergamot/bergamot-translator.js, from mozilla/translations, MPL 2.0) is kept in
// the repo; its WebAssembly and the models are fetched by `pnpm translate:fetch` into the folder MT_DIR names
// (state/mt by default), with the files each model has listed in files.json. The texts are cut into one contiguous
// share per worker, and each worker translates its share in batches: a text's translation can still change a little
// with its neighbours in a batch, so the same list, workers and batch give the same output.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  isMainThread,
  parentPort,
  Worker,
  workerData,
} from "node:worker_threads";

const LOADER = fileURLToPath(
  new URL("../../../vendor/bergamot/bergamot-translator.js", import.meta.url),
);
export const mtDir = (): string =>
  process.env["MT_DIR"] ||
  fileURLToPath(new URL("../../../state/mt", import.meta.url));

export interface EngineSettings {
  readonly workers?: number;
  readonly batch?: number;
  readonly dir?: string;
}

// One direction ("de-en"), or two through the second's source ("de-en+en-es"). Empty texts are left out, as the
// engine cannot read them; the answer has one translation per text given that was not empty.
export async function translate(
  pair: string,
  texts: readonly string[],
  { workers = 4, batch = 64, dir = mtDir() }: EngineSettings = {},
): Promise<string[]> {
  const lines = texts.filter((t) => t.length);
  if (!lines.length) return [];
  const per = Math.ceil(lines.length / workers);
  const shares = Array.from({ length: workers }, (_, w) =>
    lines.slice(w * per, (w + 1) * per),
  ).filter((s) => s.length);
  const running: Worker[] = [];
  const outs = await Promise.all(
    shares.map(
      (chunk) =>
        new Promise<string[]>((done, fail) => {
          const worker = new Worker(new URL(import.meta.url), {
            workerData: { dir, pairs: pair, chunk, batch },
          });
          running.push(worker);
          worker.once("message", (m: { out?: string[]; error?: string }) =>
            m.error ? fail(new Error(m.error)) : done(m.out ?? []),
          );
          worker.once("error", fail);
        }),
    ),
  ).catch((error: unknown) => {
    // One worker failing fails the call: the others are stopped, not left translating for nothing.
    for (const worker of running) void worker.terminate();
    throw error;
  });
  return outs.flat();
}

// What the worker reads of the WebAssembly module (Emscripten's bindings, untyped).
interface Deletable {
  delete(): void;
}
interface Vector<T> extends Deletable {
  push_back(value: T): void;
}
interface Response {
  getTranslatedText(): string;
}
interface Responses extends Deletable {
  size(): number;
  get(i: number): Response;
}
interface AlignedMemory {
  getByteArrayView(): Uint8Array;
}
interface Bergamot {
  AlignedMemory: new (size: number, align: number) => AlignedMemory;
  AlignedMemoryList: new () => Vector<AlignedMemory>;
  VectorString: new () => Vector<string>;
  VectorResponseOptions: new () => Vector<{
    qualityScores: boolean;
    alignment: boolean;
    html: boolean;
  }>;
  TranslationModel: new (
    from: string,
    to: string,
    config: string,
    model: AlignedMemory,
    shortlist: null,
    vocabs: Vector<AlignedMemory>,
    quality: null,
  ) => unknown;
  BlockingService: new (options: { cacheSize: number }) => {
    translate(
      model: unknown,
      messages: Vector<string>,
      options: Vector<unknown>,
    ): Responses;
    translateViaPivoting(
      first: unknown,
      second: unknown,
      messages: Vector<string>,
      options: Vector<unknown>,
    ): Responses;
  };
}
type Loader = (settings: Record<string, unknown>) => Bergamot;

const data = workerData as {
  dir: string;
  pairs: string;
  chunk: string[];
  batch: number;
} | null;
// A worker's answer to the thread that started it (a worker thread's port: no origin to name).
const post = (message: { out?: string[]; error?: string }) =>
  // oxlint-disable-next-line unicorn/require-post-message-target-origin -- a worker thread's port, not a window
  parentPort?.postMessage(message);

if (!isMainThread && data?.chunk) {
  const { dir, pairs, chunk, batch } = data;
  try {
    const require = createRequire(import.meta.url);
    const glue = readFileSync(LOADER, "utf8");
    // The loader is an Emscripten script that defines loadBergamot: run as the legacy ran it.
    // oxlint-disable-next-line no-eval -- the vendored loader is a script, not a module
    const loader = (0, eval)(
      `(function(require, process){${glue}\n;return loadBergamot;})`,
    )(require, process) as Loader;
    const wasmBinary = readFileSync(
      join(dir, "engine", "bergamot-translator.wasm"),
    );
    const bergamot = loader({
      INITIAL_MEMORY: 41_943_040,
      print: () => undefined,
      printErr: () => undefined,
      wasmBinary,
      onRuntimeInitialized() {
        setImmediate(run);
      },
    });
    const aligned = (file: string, align: number) => {
      const buf = readFileSync(file);
      const mem = new bergamot.AlignedMemory(buf.byteLength, align);
      mem
        .getByteArrayView()
        .set(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
      return mem;
    };
    // Firefox's own settings for its models, one candidate (a wider beam made these models worse), but not the
    // lexical shortlist: it lets a batch write only the words its texts' words most often give, and short titles in
    // small batches came out with broken words ("Ingegnee di automazione", "Electricidada"); without it a title reads
    // the same in a batch of any size, for about a quarter more time (31 October 2026).
    const model = (pair: string) => {
      const at = join(dir, "models", pair);
      const files = JSON.parse(
        readFileSync(join(at, "files.json"), "utf8"),
      ) as { vocab: string; model: string };
      const vocabs = new bergamot.AlignedMemoryList();
      vocabs.push_back(aligned(join(at, files.vocab), 64));
      const config = `\n${Object.entries({
        "beam-size": "1",
        normalize: "1.0",
        "word-penalty": "0",
        "max-length-break": "128",
        "mini-batch-words": "1024",
        workspace: "128",
        "max-length-factor": "2.0",
        "skip-cost": "true",
        "cpu-threads": "0",
        quiet: "true",
        "quiet-translation": "true",
        "gemm-precision": files.model.endsWith("intgemm8.bin")
          ? "int8shiftAll"
          : "int8shiftAlphaAll",
        alignment: "soft",
      })
        .map(([k, v]) => `            ${k}: ${v}\n`)
        .join("")}            `;
      const [s = "", t = ""] = pair.split("-");
      return new bergamot.TranslationModel(
        s,
        t,
        config,
        aligned(join(at, files.model), 256),
        null,
        vocabs,
        null,
      );
    };
    const run = () => {
      try {
        const models = pairs.split("+").map(model);
        const service = new bergamot.BlockingService({ cacheSize: 0 });
        const out: string[] = [];
        for (let k = 0; k < chunk.length; k += batch) {
          const msgs = new bergamot.VectorString(),
            opts = new bergamot.VectorResponseOptions();
          for (const t of chunk.slice(k, k + batch)) {
            msgs.push_back(t);
            opts.push_back({
              qualityScores: false,
              alignment: false,
              html: false,
            });
          }
          const res =
            models.length === 1
              ? service.translate(models[0], msgs, opts)
              : service.translateViaPivoting(models[0], models[1], msgs, opts);
          for (let i = 0; i < res.size(); i++)
            out.push(
              res
                .get(i)
                .getTranslatedText()
                .replace(/\s*\n\s*/g, " "),
            );
          msgs.delete();
          opts.delete();
          res.delete();
        }
        post({ out });
      } catch (error) {
        post({ error: String((error as Error)?.stack || error) });
      }
    };
  } catch (error) {
    post({ error: String((error as Error)?.stack || error) });
  }
}
