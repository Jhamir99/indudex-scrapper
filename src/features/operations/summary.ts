import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PublishedStatus } from "../../shared/schemas/published/dataset.js";
import type { SourceState, SourceStatus } from "../../shared/schemas/source.js";
import { PublishedDataset } from "../../shared/storage/published-dataset.js";
import { JOBS } from "./jobs.js";
import type { Machine } from "./machine.js";
import type { Notice } from "./ntfy.js";
import { clock, lasting, number, plural } from "./spanish.js";
import { tailOf } from "./tail.js";
import type { Told } from "./told.js";

export interface LastTranslation {
  readonly at: Date;
  readonly titles: number;
  readonly written: number;
  readonly unanswered: number;
}

export interface SummaryInput {
  readonly version: string;
  readonly offers: number;
  readonly optional: number;
  // When the publication's run started and how long it took.
  readonly startedAt: Date;
  readonly seconds: number;
  readonly sources: ReadonlyMap<string, SourceStatus>;
  readonly translation: LastTranslation | null;
  readonly diskUsed: number;
  readonly freeMemoryGB: number;
  // What the alerts told that is not over yet (Told's names).
  readonly told: readonly string[];
}

// How everything stands, after a publication that went up (FR-9), as the legacy's ops/notice.mjs: the version, the
// crawl's sources, the translator's last run with titles, the server; «Todo bien.» or what needs a look first.
export function composeSummary(input: SummaryInput): Notice {
  const byStatus = (status: SourceStatus) =>
    [...input.sources]
      .filter(([, value]) => value === status)
      .map(([source]) => source)
      .toSorted();
  const failed = byStatus("failed"),
    parked = byStatus("parked");
  const worries = [
    ...openProblems(input.told),
    ...(failed.length
      ? [
          `${plural(failed.length, "fuente falla", "fuentes fallan")} (${named(failed)})`,
        ]
      : []),
    ...(parked.length
      ? [
          `${plural(parked.length, "fuente aparcada", "fuentes aparcadas")} (${named(parked)})`,
        ]
      : []),
  ];
  const endedAt = new Date(input.startedAt.getTime() + input.seconds * 1000);
  const lines = [
    worries.length ? `Ojo: ${worries.join("; ")}.` : "Todo bien.",
    `Publicación ${input.version}: subida a las ${clock(endedAt)} tras ${lasting(input.seconds)}, con ${number(input.offers)} ofertas (${number(input.optional)} de oficios opcionales).`,
    `Rastreo: ${plural(input.sources.size, "fuente", "fuentes")}; ${number(byStatus("enabled").length)} al día, ${number(failed.length)} fallando, ${number(parked.length)} aparcadas, ${number(byStatus("disabled").length + byStatus("disallowed").length)} desactivadas.`,
  ];
  const t = input.translation;
  if (t)
    lines.push(
      `Traductor: ${plural(t.written, "traducción escrita", "traducciones escritas")} de ${plural(t.titles, "título", "títulos")} en su última vuelta, a las ${clock(t.at)}${t.unanswered ? `; ${number(t.unanswered)} sin respuesta` : ""}.`,
    );
  lines.push(
    `Servidor: disco al ${input.diskUsed} %, ${number(Math.round(input.freeMemoryGB * 10) / 10)} GB de memoria libres.`,
  );
  return {
    title: `Indudex: publicada la de las ${clock(input.startedAt)}`,
    message: lines.join("\n"),
    kind: "info",
  };
}

// The problems the alerts told that are not over yet, in words.
export function openProblems(told: readonly string[]): string[] {
  const spoken = new Map(JOBS.map((job) => [job.name as string, job.spoken]));
  return told.flatMap((name) => {
    const [kind, job = ""] = name.split(/-(.+)/);
    const who = spoken.get(job);
    if (kind === "failed" && who) return [`ha fallado ${who}`];
    if (kind === "late" && who) return [`${who} lleva horas sin terminar bien`];
    if (name === "disk") return ["el disco está casi lleno"];
    if (name === "ssd") return ["el SSD avisa de un problema"];
    if (name === "stop") return ["STOP está puesto"];
    return [];
  });
}

// The translator's last run that had titles to translate, from its log (title translation's run.ts, its time in
// UTC): what it wrote, not what it tried, so a run with the engine down does not read as work done.
export function lastTranslation(log: string): LastTranslation | null {
  const runs = [
    ...log.matchAll(
      /^\[(\d{4}-\d\d-\d\d) (\d\d:\d\d:\d\d)\] mt: (\d+) titles translated \((\d+) translations written, (\d+) without an answer\)/gm,
    ),
  ].filter((match) => Number(match[3]) > 0);
  const last = runs.at(-1);
  if (!last) return null;
  return {
    at: new Date(`${last[1]}T${last[2]}Z`),
    titles: Number(last[3]),
    written: Number(last[4]),
    unanswered: Number(last[5]),
  };
}

export interface GatherSummary {
  readonly publishedDirectory: string;
  readonly storeDirectory: string;
  readonly store: { readStates(): Promise<Map<string, SourceState>> };
  readonly translatorLogPath: string;
  readonly machine: Machine;
  readonly told: Told;
  readonly startedAt: Date;
  readonly seconds: number;
}

// The summary's inputs read from the published version, the store, the translator's log, the server and the alerts.
export async function publicationSummary(
  gather: GatherSummary,
): Promise<Notice> {
  const version = await new PublishedDataset(
    gather.publishedDirectory,
  ).current();
  if (!version) throw new Error("no version is current");
  const status = PublishedStatus.parse(
    JSON.parse(
      await readFile(
        join(gather.publishedDirectory, version, "status.json"),
        "utf8",
      ),
    ),
  );
  const states = await gather.store.readStates();
  const log = await tailOf(gather.translatorLogPath, 1024 * 1024);
  return composeSummary({
    version,
    offers: status.offers,
    optional: status.optional,
    startedAt: gather.startedAt,
    seconds: gather.seconds,
    sources: new Map(
      [...states].map(([source, state]) => [source, state.status]),
    ),
    translation: lastTranslation(log),
    diskUsed: await gather.machine.diskUsedPercent(gather.storeDirectory),
    freeMemoryGB: await gather.machine.freeMemoryGB(),
    told: (await gather.told.names()).filter(
      (name) => !name.startsWith("ok-") && name !== "ssd-read",
    ),
  });
}

// Up to five sources by name.
const named = (sources: readonly string[]) =>
  sources.length > 5
    ? `${sources.slice(0, 5).join(", ")}…`
    : sources.join(", ");
