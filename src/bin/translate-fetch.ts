// `pnpm translate:fetch [pair …]`: the title translator's engine (Firefox's Bergamot WebAssembly) and models,
// fetched from Firefox's Remote Settings into MT_DIR (default state/mt), each file checked against its SHA-256. With
// no pair: into English from every language the offers are written in, and English into the site's languages. The
// operator's tool, run once and when Firefox publishes new models; the only part of the processor that asks the
// network.
import { fetchModels } from "../features/title-translation/fetch-models.js";
import { mtDir } from "../features/title-translation/engine.js";

try {
  const pairs = process.argv.slice(2).filter((argument) => argument !== "--");
  await fetchModels({ dir: mtDir(), ...(pairs.length ? { pairs } : {}) });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
