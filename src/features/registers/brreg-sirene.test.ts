import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type BrregUnit, fromBrreg, readBrreg } from "./brreg.js";
import { csvFields, relevantActivity, titleCase } from "./common.js";
import { placer, readLau } from "./lau.js";
import { fromSireneUnit, readSirene } from "./sirene.js";

// The legacy's test table (test/registers.test.mjs), as a LAU file.
const place = placer(
  readLau(
    [
      "FR\tFR101\t75056\tParis",
      "FR\tFR102\t77001\tAchères-la-Forêt",
      "FR\tFR102\t77002\tAmillis",
      "ES\tES511\t08192\tSantpedor",
      "NO\tNO081\t3007\tRingerike",
    ].join("\n"),
  ),
);

const unit: BrregUnit = {
  organisasjonsnummer: "810547472",
  navn: "SAFEROAD B. BERNTSEN AS",
  organisasjonsform: { kode: "AS" },
  naeringskode1: { kode: "25.110" },
  antallAnsatte: 34,
  forretningsadresse: { kommunenummer: "3007", kommune: "RINGERIKE" },
  hjemmeside: "www.bberntsen.no",
};

const sirene: Record<string, string> = {
  siren: "332252980",
  etatAdministratifUniteLegale: "A",
  statutDiffusionUniteLegale: "O",
  categorieJuridiqueUniteLegale: "5710",
  trancheEffectifsUniteLegale: "41",
  activitePrincipaleUniteLegale: "71.12B",
  nomenclatureActivitePrincipaleUniteLegale: "NAFRev2",
  denominationUniteLegale: "AIRBUS PROTECT",
  nicSiegeUniteLegale: "00029",
};
const get = (record: Record<string, string>) => (name: string) =>
  record[name] ?? "";

let folder: string;
beforeAll(async () => {
  folder = await mkdtemp(join(tmpdir(), "indudex-registers-"));
});
afterAll(async () => {
  await rm(folder, { recursive: true, force: true });
});

describe("which companies count (companies FR-6)", () => {
  it("counts manufacturing, IT, engineering, construction, shipping and software publishing", () => {
    expect(
      [
        "25.110",
        "2511",
        "62.010",
        "71.12",
        "43210",
        "50.20",
        "52.22",
        "58.290",
      ].map(relevantActivity),
    ).toEqual([true, true, true, true, true, true, true, true]);
    expect(
      ["47.110", "56.101", "86.211", "52.10", "58.11", "69.201", ""].map(
        relevantActivity,
      ),
    ).toEqual([false, false, false, false, false, false, false]);
  });

  it("writes register towns in capitals as people do, and reads quoted CSV fields", () => {
    expect(
      ["SAINT-ETIENNE", "L'ISLE-D'ABEAU", "ringerike"].map(titleCase),
    ).toEqual(["Saint-Etienne", "L'Isle-D'Abeau", "Ringerike"]);
    expect(csvFields('332252980,"AIRBUS ""PROTECT""",A,,"71.12B, x"')).toEqual([
      "332252980",
      'AIRBUS "PROTECT"',
      "A",
      "",
      "71.12B, x",
    ]);
  });
});

describe("Brønnøysund (companies FR-6)", () => {
  it("keeps a limited company of the vertical with ten people or more, in its kommune", () => {
    expect(fromBrreg(unit, place)).toEqual({
      id: "810547472",
      name: "SAFEROAD B. BERNTSEN AS",
      country: "no",
      town: "Ringerike",
      nuts: "NO081",
      nace: "25110",
      people: 34,
      website: "www.bberntsen.no",
    });
  });

  it("leaves out fewer than ten people, a sole proprietorship, a bankrupt company and a shop", () => {
    expect([
      fromBrreg({ ...unit, antallAnsatte: 9 }, place),
      fromBrreg({ ...unit, organisasjonsform: { kode: "ENK" } }, place),
      fromBrreg({ ...unit, konkurs: true }, place),
      fromBrreg({ ...unit, naeringskode1: { kode: "47.110" } }, place),
    ]).toEqual([null, null, null, null]);
  });

  it("reads the gzipped bulk file one record at a time", async () => {
    const file = join(folder, "enheter_alle.json.gz");
    await writeFile(
      file,
      gzipSync(
        JSON.stringify([
          unit,
          {
            ...unit,
            organisasjonsnummer: "1",
            organisasjonsform: { kode: "ENK" },
          },
        ]),
      ),
    );
    expect((await readBrreg(file, place)).map((company) => company.id)).toEqual(
      ["810547472"],
    );
  });
});

describe("Sirene (companies FR-6)", () => {
  it("keeps a French company of the vertical, its size band read as its lower bound", () => {
    expect(fromSireneUnit(get(sirene))).toEqual({
      id: "332252980",
      name: "AIRBUS PROTECT",
      country: "fr",
      nace: "7112",
      people: 500,
      nic: "00029",
    });
  });

  it("leaves out a withheld record, a sole trader, fewer than ten people, an unknown size, a closed unit and an old classification", () => {
    expect(
      [
        { statutDiffusionUniteLegale: "P" },
        { categorieJuridiqueUniteLegale: "1000" },
        { trancheEffectifsUniteLegale: "03" },
        { trancheEffectifsUniteLegale: "NN" },
        { etatAdministratifUniteLegale: "C" },
        { nomenclatureActivitePrincipaleUniteLegale: "NAFRev1" },
      ].map((change) => fromSireneUnit(get({ ...sirene, ...change }))),
    ).toEqual([null, null, null, null, null, null]);
  });

  it("finds each kept unit's head office in the establishments' file, by its commune", async () => {
    const units = join(folder, "units.csv");
    const sites = join(folder, "sites.csv");
    await writeFile(
      units,
      `${Object.keys(sirene).join(",")}\n${Object.values(sirene).join(",")}\n`,
    );
    await writeFile(
      sites,
      "siret,codeCommuneEtablissement,libelleCommuneEtablissement\n33225298000029,75108,PARIS 8\n99999999900001,77001,X\n",
    );
    execFileSync("zip", ["-qj", join(folder, "units.zip"), units]);
    execFileSync("zip", ["-qj", join(folder, "sites.zip"), sites]);
    expect(
      await readSirene(
        join(folder, "units.zip"),
        join(folder, "sites.zip"),
        place,
      ),
    ).toEqual([
      {
        id: "332252980",
        name: "AIRBUS PROTECT",
        country: "fr",
        town: "Paris 8",
        nuts: "FR101",
        nace: "7112",
        people: 500,
      },
    ]);
  });
});
