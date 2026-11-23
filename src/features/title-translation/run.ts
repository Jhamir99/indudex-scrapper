import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  cachePath,
  readTranslatorFile,
  TRANSLATOR_FILES,
  writeTranslatorFile,
} from "../../shared/storage/title-caches.js";
import { type Engine, translateTitles } from "./legs.js";
import {
  afterUnended,
  answersOf,
  groupQueue,
  inHalves,
  nextChunk,
  type QueuedTitle,
} from "./queue.js";
import type { WantedTitle } from "./translate.js";

// The site's translator (legacy builder/mt/translate-titles.mjs, word for word but for types): the titles the last
// publication found its caches lacking (mt-wanted.json), through the method into the site's languages, into the
// caches the next publication applies. The list is its queue, Spain's offers first, then the most offered; what is
// done leaves it. A run stops starting work after its minutes, so the next hour's never overlaps it, and writes the
// caches every ten minutes and at the end, so a run cut short keeps most of its work. Each cache is written by a
// process of its own (merge.ts), one language at a time: written here, the caches' memory stayed with the run, which
// with the engine's workers (200 to 300 MB each) rose past 2 GB on 27 October 2026.

const FLUSH_MS = 10 * 60_000;
// The merge as a script Node runs as it is: merge.ts from src (tsx, tests), merge.js from dist.
const MERGE = fileURLToPath(
  new URL(
    import.meta.url.endsWith(".ts") ? "./merge.ts" : "./merge.js",
    import.meta.url,
  ),
);

export interface TranslatorRun {
  // The processor's state folder: the queue, the caches and the run's own files.
  readonly stateDirectory: string;
  // The engine's folder (MT_DIR): its models/ name the directions there are.
  readonly mtDirectory: string;
  readonly minutes?: number;
  readonly workers?: number;
  readonly group?: number;
  // The engine's settings, or a translate of its own (tests).
  readonly engine?: Engine;
  readonly now?: () => number;
  readonly log?: (line: string) => void;
}

export interface TranslatorResult {
  readonly titles: number;
  readonly written: number;
  readonly unanswered: number;
  readonly left: number;
  // A run that wrote nothing, or got no answer for most of its titles, failed (the alert tells the operator).
  readonly failed: boolean;
}

export async function runTranslator(
  run: TranslatorRun,
): Promise<TranslatorResult> {
  const { stateDirectory: state, mtDirectory } = run;
  const minutes = run.minutes ?? 45,
    workers = run.workers ?? 2,
    size = run.group ?? 400;
  const now = run.now ?? (() => Date.now());
  const log = run.log ?? ((line: string) => console.log(line));
  const queuePath = join(state, TRANSLATOR_FILES.wanted);
  const none = { titles: 0, written: 0, unanswered: 0, left: 0, failed: false };
  if (!existsSync(queuePath)) {
    log("mt: no list of titles yet (the next build writes it)");
    return none;
  }
  const started = now();
  let queueAt = statSync(queuePath).mtimeMs;
  // The chunk at work, written before it starts and gone when it ends. A run that never ended one (the method kept
  // busy by a title three hours on 7 November 2026) leaves it behind: the next run does its titles last, one at a
  // time, and a title that alone kept a run from ending is set aside for good (mt-stuck.json).
  const unended = await readTranslatorFile<string[]>(state, "current", []);
  const { setAside, stuck, goLast } = afterUnended(
    unended,
    new Set(await readTranslatorFile<string[]>(state, "stuck", [])),
  );
  if (stuck) {
    await writeTranslatorFile(state, "stuck", [...setAside]);
    log(
      `mt: "${stuck}" alone kept a run from ending: set aside (${TRANSLATOR_FILES.stuck})`,
    );
  }
  if (goLast.size)
    log(
      `mt: ${goLast.size} titles of a chunk a run never ended go last, one at a time`,
    );
  const queue = (
    await readTranslatorFile<WantedTitle[]>(state, "wanted", [])
  ).filter((w) => !setAside.has(w.t));
  const modelsDir = join(mtDirectory, "models");
  const models = new Set(existsSync(modelsDir) ? readdirSync(modelsDir) : []);
  // A server rebuilt without its models would otherwise end every run well having done nothing.
  if (queue.length && !models.size && !run.engine?.translate) {
    log(`mt: no models in ${modelsDir} (pnpm translate:fetch)`);
    return { ...none, left: queue.length, failed: true };
  }
  // Each title grouped by its language and the languages it lacks. Each call takes the first title still waiting and
  // the next ones of its group: done whole, the groups left "TECHNICIEN DE MAINTENANCE", 220 offers, behind 16,000
  // English titles of one offer each (27 October 2026).
  const { groups, noModel } = groupQueue(
    queue,
    run.engine?.translate ? allModels(queue) : models,
    { goLast, size },
  );

  const found: Record<string, [string, string][]> = {};
  const done = new Set<string>(),
    redone = new Set<string>();
  let last = now(),
    written = 0;
  const flush = async () => {
    for (const [lang, rows] of Object.entries(found)) {
      if (!rows.length) continue;
      execFileSync(process.execPath, [MERGE, cachePath(state, lang)], {
        input: JSON.stringify(rows),
        stdio: ["pipe", "inherit", "inherit"],
      });
      written += rows.length;
      found[lang] = [];
    }
    // The queue without what is done, unless a build wrote a new one meanwhile: that one is the list to follow.
    if (existsSync(queuePath) && statSync(queuePath).mtimeMs === queueAt) {
      await writeTranslatorFile(
        state,
        "wanted",
        queue.filter((w) => !done.has(w.t)),
      );
      queueAt = statSync(queuePath).mtimeMs;
    }
    // A title to translate anew leaves that list once written anew in every language it was asked in; the list read
    // again here, so titles added to it meanwhile stay.
    const redo = await readTranslatorFile<string[]>(state, "redo", []);
    const left = redo.filter((t) => !redone.has(t));
    if (left.length < redo.length)
      await writeTranslatorFile(state, "redo", left);
    last = now();
  };

  // A chunk the engine fails on is done again in halves: on 28 October 2026 it aborted on a chunk of 400 English
  // titles, every time, while each half went through.
  const translateItems = (
    src: string,
    items: readonly QueuedTitle[],
    into: readonly string[],
  ) =>
    inHalves(
      (part) =>
        translateTitles(
          src,
          part.map((w) => w.t),
          {
            cities: part.map((w) => w.ci || ""),
            firms: part.map((w) => (w.c ? `${w.c}\t${w.others || 0}` : "")),
            into,
          },
          { workers, batch: 64, ...run.engine },
        ),
      items,
      into,
      (error, part) =>
        log(
          `mt: the engine failed on ${part.length} titles from ${src} (${String(
            (error as Error).message,
          )
            .split("\n")[0]
            ?.slice(
              0,
              80,
            )})${part.length > 1 ? ", done in halves" : `: "${part[0]?.t}" stays in the list`}`,
        ),
    );

  let titles = 0,
    unanswered = 0;
  for (
    let next;
    now() - started <= minutes * 60_000 && (next = nextChunk(groups));
  ) {
    const { g, chunk } = next;
    const list = chunk.map((w) => w.t);
    await writeTranslatorFile(state, "current", list);
    const out = await translateItems(g.src, chunk, g.into);
    rmSync(join(state, TRANSLATOR_FILES.current), { force: true });
    // A title leaves the queue only with an answer in every language it lacked; an empty answer is a slip of the
    // run, and the title waits for the next.
    const answers = answersOf(list, out, g.into);
    for (const lang of g.into)
      (found[lang] ??= []).push(...(answers.found[lang] ?? []));
    for (const t of answers.answered) done.add(t);
    unanswered += answers.unanswered;
    for (const w of chunk) if (w.redo && done.has(w.t)) redone.add(w.t);
    // What it wrote, a line a title, a file a day (UTC): to read what the site shows and keep refining the method.
    const day = new Date(now()).toISOString().slice(0, 10);
    appendFileSync(
      join(state, `mt-new-${day}.jsonl`),
      list
        .map(
          (t, i) =>
            `${JSON.stringify({
              t,
              lang: g.src,
              cc: chunk[i]?.cc,
              n: chunk[i]?.n,
              out: Object.fromEntries(
                g.into.map((l) => [l, out[l]?.[i] || ""]),
              ),
            })}\n`,
        )
        .join(""),
    );
    titles += list.length;
    if (now() - last > FLUSH_MS) await flush();
  }
  await flush();
  const left = queue.length - done.size;
  log(
    `mt: ${titles} titles translated (${written} translations written, ${unanswered} without an answer) in ${Math.round((now() - started) / 60_000)} min; ${left} left in the list${noModel ? `, ${noModel} in a language with no model` : ""}`,
  );
  const failed = titles > 0 && (!written || unanswered > titles / 2);
  if (failed)
    log("mt: the engine gave no answer for most titles: see the lines above");
  return { titles, written, unanswered, left, failed };
}

// With an engine of its own (tests), every direction the queue asks for counts as there.
function allModels(queue: readonly WantedTitle[]): Set<string> {
  const pairs = new Set<string>();
  for (const w of queue) {
    pairs.add(`${w.lang === "no" ? "nb" : w.lang}-en`);
    for (const t of w.into) pairs.add(`en-${t}`);
  }
  return pairs;
}
