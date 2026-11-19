import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import type { RegisterCompany } from "../../shared/schemas/register.js";
import { csvFields, relevantActivity, titleCase } from "./common.js";
import type { Placer } from "./lau.js";

// France: the Sirene base (INSEE, Licence Ouverte 2.0). Active legal units with employees, 10 or
// more by their size band, not sole traders (legal category 1000), and not withheld from public
// lists; the town is their head office's.
export const SIRENE = {
  licence: "Licence Ouverte 2.0",
  credit: "INSEE, base Sirene des entreprises et de leurs établissements",
} as const;

// The size bands, read as their lower bound.
const BANDS: Readonly<Record<string, number>> = {
  "11": 10,
  "12": 20,
  "21": 50,
  "22": 100,
  "31": 200,
  "32": 250,
  "41": 500,
  "42": 1000,
  "51": 2000,
  "52": 5000,
  "53": 10000,
};

export type Field = (name: string) => string;

export interface SireneUnit extends Omit<RegisterCompany, "town" | "nuts"> {
  // The head office's establishment number, which finds its town.
  readonly nic: string;
}

export function fromSireneUnit(get: Field): SireneUnit | null {
  if (
    get("etatAdministratifUniteLegale") !== "A" ||
    get("statutDiffusionUniteLegale") !== "O" ||
    get("categorieJuridiqueUniteLegale") === "1000"
  )
    return null;
  const band = get("trancheEffectifsUniteLegale");
  const people = Object.hasOwn(BANDS, band) ? BANDS[band] : undefined;
  const nace = get("activitePrincipaleUniteLegale");
  if (
    !people ||
    get("nomenclatureActivitePrincipaleUniteLegale") !== "NAFRev2" ||
    !relevantActivity(nace)
  )
    return null;
  const name =
    get("denominationUniteLegale") || get("denominationUsuelle1UniteLegale");
  if (!name) return null;
  return {
    id: get("siren"),
    name,
    country: "fr",
    nace: nace.replace(/\D/g, ""),
    people,
    nic: get("nicSiegeUniteLegale"),
  };
}

// A zipped CSV read line by line with the system's `unzip`, each row a field reader by column name.
async function* zipCsv(file: string): AsyncGenerator<Field> {
  const unzip = spawn("unzip", ["-p", file], {
    stdio: ["ignore", "pipe", "inherit"],
  });
  let head: Map<string, number> | null = null;
  for await (const line of createInterface({
    input: unzip.stdout,
    crlfDelay: Infinity,
  })) {
    const fields = csvFields(line);
    if (!head) {
      head = new Map(fields.map((name, at) => [name, at]));
      continue;
    }
    const columns = head;
    yield (name) => fields[columns.get(name) ?? -1] ?? "";
  }
}

// StockUniteLegale.zip, then StockEtablissement.zip for the head offices' towns.
export async function readSirene(
  units: string,
  sites: string,
  place: Placer,
): Promise<RegisterCompany[]> {
  const wanted = new Map<string, SireneUnit>();
  for await (const get of zipCsv(units)) {
    const unit = fromSireneUnit(get);
    if (unit) wanted.set(unit.id + unit.nic, unit);
  }
  const placed = new Map<string, { town: string; nuts: string }>();
  for await (const get of zipCsv(sites)) {
    const siret = get("siret");
    if (!wanted.has(siret)) continue;
    const at = place("fr", get("codeCommuneEtablissement"));
    placed.set(siret, {
      nuts: at.nuts,
      town: at.town || titleCase(get("libelleCommuneEtablissement")),
    });
  }
  return [...wanted].map(([siret, unit]) => ({
    id: unit.id,
    name: unit.name,
    country: unit.country,
    town: placed.get(siret)?.town ?? "",
    nuts: placed.get(siret)?.nuts ?? "",
    nace: unit.nace,
    ...(unit.people ? { people: unit.people } : {}),
  }));
}
