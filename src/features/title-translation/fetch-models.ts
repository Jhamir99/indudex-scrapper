import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import zlib from "node:zlib";

// What the translator runs (engine.ts), fetched from Firefox's own servers (legacy builder/mt/fetch.mjs, word for
// word but for types and an injectable fetch): Remote Settings, the service Firefox fetches its translation models
// from, in the "-v2" collections it reads since version 140. The engine's WebAssembly, version 4.0 (the version of
// the loader kept in vendor/bergamot/), and the model files of each direction, every file checked against its
// SHA-256, into the folder MT_DIR names. A file already there is kept when its SHA-256 is the one described. The
// models come compressed with Zstandard, which Node reads.

const RECORDS =
  "https://firefox.settings.services.mozilla.com/v1/buckets/main/collections";
const FILES = "https://firefox-settings-attachments.cdn.mozilla.net/";
export const ENGINE_VERSION = "4.0";
// The languages the site's offers are written in that Firefox has a model for, into English; and English into the
// site's languages (and those the legacy fetched ahead: Italian, Polish, Ukrainian).
const FROM = [
  "bg",
  "bs",
  "ca",
  "cs",
  "da",
  "de",
  "el",
  "es",
  "et",
  "fi",
  "fr",
  "hr",
  "hu",
  "is",
  "it",
  "lt",
  "lv",
  "nb",
  "nl",
  "pl",
  "pt",
  "ro",
  "sk",
  "sl",
  "sq",
  "sr",
  "sv",
  "tr",
  "uk",
];
const INTO = ["es", "ca", "fr", "nl", "de", "it", "pl", "uk"];
export const DEFAULT_PAIRS = [
  ...FROM.map((l) => `${l}-en`),
  ...INTO.map((l) => `en-${l}`),
];

// A record of a Remote Settings collection, as far as the fetch reads it.
export interface RemoteRecord {
  readonly name: string;
  readonly version: string;
  readonly fileType?: string;
  readonly sourceLanguage?: string;
  readonly targetLanguage?: string;
  readonly architecture?: string;
  readonly filter_expression?: string;
  readonly decompressedHash?: string;
  readonly attachment: {
    readonly location: string;
    readonly hash: string;
    readonly filename: string;
  };
}

type Fetch = (url: string) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  arrayBuffer(): Promise<ArrayBuffer>;
}>;

const sha = (buf: Uint8Array) => createHash("sha256").update(buf).digest("hex");
const unzstd = (buf: Buffer): Buffer =>
  typeof zlib.zstdDecompressSync === "function"
    ? zlib.zstdDecompressSync(buf)
    : execFileSync("zstd", ["-d", "-c"], { input: buf, maxBuffer: 1 << 30 });

export async function fetchModels({
  dir,
  pairs = DEFAULT_PAIRS,
  fetch: get = (url) => fetch(url),
  log = (line) => console.log(line),
}: {
  readonly dir: string;
  readonly pairs?: readonly string[];
  readonly fetch?: Fetch;
  readonly log?: (line: string) => void;
}): Promise<void> {
  const records = async (collection: string): Promise<RemoteRecord[]> => {
    const res = await get(`${RECORDS}/${collection}/records`);
    if (!res.ok) throw new Error(`${collection}: ${res.status}`);
    return ((await res.json()) as { data: RemoteRecord[] }).data;
  };
  // A file already there is kept only when it is the one Remote Settings describes now: a name with no version kept
  // an older model under a newer one's version (TRA-08).
  const fetchFile = async (
    rec: RemoteRecord,
    dest: string,
  ): Promise<boolean> => {
    const want =
      rec.decompressedHash ||
      (rec.attachment.filename.endsWith(".zst") ? "" : rec.attachment.hash);
    if (existsSync(dest) && want && sha(readFileSync(dest)) === want)
      return false;
    const res = await get(FILES + rec.attachment.location);
    if (!res.ok)
      throw new Error(`${res.status} for ${rec.attachment.location}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (sha(buf) !== rec.attachment.hash)
      throw new Error(`${rec.name}: not the file Remote Settings describes`);
    const raw = rec.attachment.filename.endsWith(".zst") ? unzstd(buf) : buf;
    if (rec.decompressedHash && sha(raw) !== rec.decompressedHash)
      throw new Error(`${rec.name}: unpacked, not the file described`);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(`${dest}.part`, raw);
    renameSync(`${dest}.part`, dest);
    return true;
  };

  const wasm = (await records("translations-wasm-v2")).find(
    (r) =>
      r.name === "bergamot-translator" &&
      r.version === ENGINE_VERSION &&
      !r.filter_expression,
  );
  if (!wasm)
    throw new Error(
      `no engine ${ENGINE_VERSION} on Remote Settings: the loader in vendor/bergamot/ must be updated with it`,
    );
  log(
    `engine ${(await fetchFile(wasm, join(dir, "engine", "bergamot-translator.wasm"))) ? "fetched" : "already there"}`,
  );
  const all = await records("translations-models-v2");
  for (const pair of pairs) {
    const [s, t] = pair.split("-");
    const files = all.filter(
      (r) =>
        r.sourceLanguage === s &&
        r.targetLanguage === t &&
        !r.filter_expression,
    );
    if (!files.length) {
      log(`${pair} no model`);
      continue;
    }
    // The newest version of the direction, when Remote Settings holds more than one.
    const newest = files
      .map((r) => r.version)
      .toSorted((a, b) => b.localeCompare(a, "en", { numeric: true }))[0];
    const meta: Record<string, string> = {};
    let got = 0;
    for (const r of files.filter((f) => f.version === newest)) {
      const name = `${r.fileType}-${r.name.replace(/\.zst$/, "")}`;
      if (await fetchFile(r, join(dir, "models", pair, name))) got++;
      meta[r.fileType ?? ""] = name;
      meta["architecture"] = r.architecture ?? "";
      meta["version"] = r.version;
    }
    writeFileSync(
      join(dir, "models", pair, "files.json"),
      JSON.stringify(meta),
    );
    log(`${pair} ${newest} ${got ? `${got} files fetched` : "already there"}`);
  }
}
