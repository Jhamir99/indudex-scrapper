import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SourceState, SourceStatus } from "../../shared/schemas/source.js";
import type { Machine } from "./machine.js";
import {
  composeSummary,
  lastTranslation,
  openProblems,
  publicationSummary,
  type SummaryInput,
} from "./summary.js";
import { Told } from "./told.js";

const state = (status: "enabled" | "parked") =>
  ({ status }) as unknown as SourceState;
const startedAt = new Date(2026, 10, 25, 15, 0, 0);
const sources = (entries: Record<string, SourceStatus>) =>
  new Map(Object.entries(entries));
const input = (overrides: Partial<SummaryInput> = {}): SummaryInput => ({
  version: "20261125T140012Z",
  offers: 74835,
  optional: 21204,
  startedAt,
  seconds: 95,
  sources: sources({ brz: "enabled", vdab: "enabled", bund: "disabled" }),
  translation: {
    at: new Date("2026-11-25T13:55:00Z"),
    titles: 2725,
    written: 13625,
    unanswered: 0,
  },
  diskUsed: 41,
  freeMemoryGB: 3.84,
  told: [],
  ...overrides,
});

describe("the summary after a publication (FR-9, FR-10)", () => {
  it("says all is well, then the version, the crawl, the translator and the server", () => {
    expect(composeSummary(input())).toEqual({
      title: "Indudex: publicada la de las 15:00",
      message: [
        "Todo bien.",
        "Publicación 20261125T140012Z: subida a las 15:01 tras 1 min, con 74.835 ofertas (21.204 de oficios opcionales).",
        "Rastreo: 3 fuentes; 2 al día, 0 fallando, 0 aparcadas, 1 desactivadas.",
        `Traductor: 13.625 traducciones escritas de 2.725 títulos en su última vuelta, a las ${new Date("2026-11-25T13:55:00Z").toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}.`,
        "Servidor: disco al 41 %, 3,8 GB de memoria libres.",
      ].join("\n"),
      kind: "info",
    });
  });

  it("puts what needs a look first: open problems, failing and parked sources", () => {
    const { message } = composeSummary(
      input({
        told: ["failed-crawl", "late-translate", "disk"],
        sources: sources({
          a: "failed",
          b: "failed",
          c: "failed",
          d: "failed",
          e: "failed",
          f: "failed",
          g: "parked",
          h: "enabled",
        }),
        translation: {
          at: new Date("2026-11-25T13:55:00Z"),
          titles: 1,
          written: 1,
          unanswered: 3,
        },
      }),
    );
    const lines = message.split("\n");
    expect(lines[0]).toBe(
      "Ojo: ha fallado el rastreo; la traducción lleva horas sin terminar bien; el disco está casi lleno; 6 fuentes fallan (a, b, c, d, e…); 1 fuente aparcada (g).",
    );
    expect(lines[2]).toBe(
      "Rastreo: 8 fuentes; 1 al día, 6 fallando, 1 aparcadas, 0 desactivadas.",
    );
    expect(lines[3]).toMatch(
      /^Traductor: 1 traducción escrita de 1 título en su última vuelta, a las \d\d:\d\d; 3 sin respuesta\.$/,
    );
  });

  it("leaves the translator out when it has not translated yet", () => {
    const { message } = composeSummary(input({ translation: null }));
    expect(message).not.toContain("Traductor");
  });

  it("names only the problems it knows", () => {
    expect(
      openProblems(["failed-publish", "late-backup", "ssd", "stop", "odd"]),
    ).toEqual([
      "ha fallado la publicación",
      "la copia de seguridad lleva horas sin terminar bien",
      "el SSD avisa de un problema",
      "STOP está puesto",
    ]);
  });
});

describe("the translator's last run", () => {
  it("is the last one with titles, from its log", () => {
    const log = [
      "[2026-11-25 12:10:01] mt: 400 titles translated (2000 translations written, 2 without an answer) in 38 min; 100 left in the list",
      "[2026-11-25 13:10:01] mt: no list of titles yet (the next build writes it)",
      "[2026-11-25 13:10:02] mt: 0 titles translated (0 translations written, 0 without an answer) in 0 min; 0 left in the list",
    ].join("\n");
    expect(lastTranslation(log)).toEqual({
      at: new Date("2026-11-25T12:10:01Z"),
      titles: 400,
      written: 2000,
      unanswered: 2,
    });
    expect(lastTranslation("")).toBeNull();
  });

  it("reads the JSON lines of its log too", () => {
    const log = [
      '{"level":"info","time":"2026-11-27T03:10:01.000Z","process":"translate","msg":"mt: 120 titles translated (600 translations written, 0 without an answer) in 12 min; 0 left in the list"}',
      '{"level":"info","time":"2026-11-27T04:10:01.000Z","process":"translate","msg":"mt: no list of titles yet (the next build writes it)"}',
    ].join("\n");
    expect(lastTranslation(log)).toEqual({
      at: new Date("2026-11-27T03:10:01.000Z"),
      titles: 120,
      written: 600,
      unanswered: 0,
    });
  });
});

describe("the summary's inputs", () => {
  let directory: string;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "summary-"));
  });
  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it("are read from the version, the store, the translator's log, the server and the alerts", async () => {
    const published = join(directory, "published");
    const version = "20261125T140012Z";
    await mkdir(join(published, version), { recursive: true });
    await writeFile(
      join(published, "current.json"),
      JSON.stringify({ v: 1, version }),
    );
    await writeFile(
      join(published, version, "status.json"),
      JSON.stringify({
        generated_at: "2026-11-25T14:00:12.000Z",
        crawled_at: "",
        offers: 120,
        optional: 20,
        found: 300,
        sources: 2,
        dropped: {},
        duplicates: { sameUrl: 0, sameRole: 4 },
        by_country: {},
        by_country_optional: {},
      }),
    );
    const translatorLog = join(directory, "translate.log");
    await writeFile(
      translatorLog,
      "[2026-11-25 12:10:01] mt: 4 titles translated (20 translations written, 0 without an answer) in 1 min; 0 left in the list\n",
    );
    const told = new Told(join(directory, "told"));
    await told.set("ok-crawl");
    await told.set("ssd-read");
    await told.set("failed-backup");
    const machine: Machine = {
      uptimeSeconds: () => 0,
      diskUsedPercent: async () => 12,
      diskFreeGB: async () => 0,
      freeMemoryGB: async () => 2,
      ssdReport: async () => "",
    };
    const notice = await publicationSummary({
      publishedDirectory: published,
      storeDirectory: directory,
      store: {
        readStates: async () =>
          new Map([
            ["brz", state("enabled")],
            ["nva", state("parked")],
          ]),
      },
      translatorLogPath: translatorLog,
      machine,
      told,
      startedAt,
      seconds: 30,
    });
    expect(notice.message.split("\n")).toEqual([
      "Ojo: ha fallado la copia de seguridad; 1 fuente aparcada (nva).",
      "Publicación 20261125T140012Z: subida a las 15:00 tras 30 s, con 120 ofertas (20 de oficios opcionales).",
      "Rastreo: 2 fuentes; 1 al día, 0 fallando, 1 aparcadas, 0 desactivadas.",
      expect.stringMatching(
        /^Traductor: 20 traducciones escritas de 4 títulos en su última vuelta, a las \d\d:\d\d\.$/,
      ),
      "Servidor: disco al 12 %, 2 GB de memoria libres.",
    ]);
  });
});
