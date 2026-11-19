import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FakeClock } from "../../../test/fakes/clock.js";
import { FakeHttpClient } from "../../../test/fakes/http-client.js";
import { FakeStopSwitch } from "../../../test/fakes/stop-switch.js";
import { readRegisters } from "../../shared/storage/registers-file.js";
import {
  type DibaEstablishment,
  dibaPage,
  fromDiba,
  readDiba,
} from "./diba.js";
import { placer, readLau } from "./lau.js";
import { RegisterUsageError, runRegister } from "./registers.js";

const LAU = "ES\tES511\t08192\tSantpedor\nNO\tNO081\t3007\tRingerike\n";
const place = placer(readLau(LAU));

// The legacy's test record (test/registers.test.mjs).
const establishment: DibaEstablishment = {
  rao_social_nif: "B61866612",
  rao_social_nom: "MARTISA SOLDADURA S.L.",
  rel_municipi: "08192",
  adreca: { nom_municipi: "SANTPEDOR" },
  codi_nace: "C",
  codi_ccae: "",
  inspire: "1",
};

let folder: string;
beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), "indudex-registers-"));
});
afterEach(async () => {
  await rm(folder, { recursive: true, force: true });
});

describe("Barcelona's census (companies FR-6)", () => {
  it("keeps an industrial workshop of section C, a company by its tax number", () => {
    expect(fromDiba(establishment)).toEqual({
      id: "B61866612",
      name: "MARTISA SOLDADURA S.L.",
      ine: "08192",
      townName: "SANTPEDOR",
      nace: "C",
    });
    expect(
      fromDiba({
        ...establishment,
        codi_nace: "M",
        codi_ccae: "7112",
        inspire: "0",
      }),
    ).not.toBeNull();
  });

  it("leaves out a person's tax number, an association, and a shop by section or by class", () => {
    expect(
      [
        { rao_social_nif: "38123456Z" },
        { rao_social_nif: "X1234567L" },
        { rao_social_nif: "G08123456" },
        { codi_nace: "G", inspire: "0" },
        { codi_ccae: "4711" },
      ].map((change) => fromDiba({ ...establishment, ...change })),
    ).toEqual([null, null, null, null, null]);
  });

  it("reads every page through the client, each company once, placed by its INE code", async () => {
    const http = new FakeHttpClient({
      [dibaPage(1, 1)]: JSON.stringify({
        entitats: 3,
        elements: [establishment],
      }),
      [dibaPage(1, 1000)]: JSON.stringify({
        entitats: 3,
        elements: [
          establishment,
          establishment,
          { ...establishment, rao_social_nif: "38123456Z" },
        ],
      }),
    });
    expect(await readDiba(http, place)).toEqual([
      {
        id: "B61866612",
        name: "MARTISA SOLDADURA S.L.",
        country: "es",
        town: "Santpedor",
        nuts: "ES511",
        nace: "C",
      },
    ]);
  });
});

const run = async (overrides: Partial<Parameters<typeof runRegister>[0]>) => {
  const lau = join(folder, "lau.tsv");
  await writeFile(lau, LAU);
  return runRegister({
    register: "brreg",
    files: [],
    lau,
    store: folder,
    http: new FakeHttpClient(),
    clock: new FakeClock("2026-11-19T20:00:00Z"),
    stopSwitch: new FakeStopSwitch(),
    log: () => {},
    ...overrides,
  });
};

describe("the registers tool (companies FR-6)", () => {
  it("writes a register's companies into the store with its licence", async () => {
    const file = join(folder, "enheter.json.gz");
    await writeFile(
      file,
      gzipSync(
        JSON.stringify([
          {
            organisasjonsnummer: "810547472",
            navn: "SAFEROAD B. BERNTSEN AS",
            organisasjonsform: { kode: "AS" },
            naeringskode1: { kode: "25.110" },
            antallAnsatte: 34,
            forretningsadresse: { kommunenummer: "3007" },
          },
        ]),
      ),
    );
    const path = await run({ files: [file] });
    expect(JSON.parse(await readFile(path ?? "", "utf8"))).toMatchObject({
      register: "brreg",
      licence: "NLOD 2.0",
      savedAt: "2026-11-19T20:00:00.000Z",
    });
    expect(
      (await readRegisters(folder)).map((company) => company.name),
    ).toEqual(["SAFEROAD B. BERNTSEN AS"]);
  });

  it("refuses the wrong files, and reads nothing while the stop switch is set", async () => {
    await expect(run({ files: [] })).rejects.toThrow(RegisterUsageError);
    const stopSwitch = new FakeStopSwitch();
    stopSwitch.active = true;
    expect(await run({ register: "diba", stopSwitch })).toBeNull();
  });
});
