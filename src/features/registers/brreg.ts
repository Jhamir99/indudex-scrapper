import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";
import type { RegisterCompany } from "../../shared/schemas/register.js";
import {
  jsonObjects,
  MIN_PEOPLE,
  relevantActivity,
  titleCase,
} from "./common.js";
import type { Placer } from "./lau.js";

// Norway: Enhetsregisteret (Brønnøysundregistrene, NLOD 2.0), its bulk JSON. Limited companies,
// foreign branches and public enterprises; sole proprietorships (ENK) and partnerships are people.
export const BRREG = {
  licence: "NLOD 2.0",
  credit: "Brønnøysundregistrene, Enhetsregisteret",
} as const;

const NO_FORMS = new Set([
  "AS",
  "ASA",
  "NUF",
  "SA",
  "SF",
  "KF",
  "FKF",
  "IKS",
  "BA",
  "STAT",
]);

interface Address {
  readonly kommunenummer?: string;
  readonly kommune?: string;
  readonly poststed?: string;
}
export interface BrregUnit {
  readonly organisasjonsnummer?: string;
  readonly navn?: string;
  readonly organisasjonsform?: { readonly kode?: string };
  readonly naeringskode1?: { readonly kode?: string };
  readonly antallAnsatte?: number;
  readonly forretningsadresse?: Address;
  readonly postadresse?: Address;
  readonly hjemmeside?: string;
  readonly slettedato?: string;
  readonly konkurs?: boolean;
  readonly underAvvikling?: boolean;
  readonly underTvangsavviklingEllerTvangsopplosning?: boolean;
}

export function fromBrreg(
  unit: BrregUnit,
  place: Placer,
): RegisterCompany | null {
  const nace = unit.naeringskode1?.kode ?? "";
  if (
    !NO_FORMS.has(unit.organisasjonsform?.kode ?? "") ||
    unit.slettedato ||
    unit.konkurs ||
    unit.underAvvikling ||
    unit.underTvangsavviklingEllerTvangsopplosning
  )
    return null;
  if (!relevantActivity(nace) || !(Number(unit.antallAnsatte) >= MIN_PEOPLE))
    return null;
  if (!unit.organisasjonsnummer || !unit.navn?.trim()) return null;
  const address = unit.forretningsadresse ?? unit.postadresse ?? {};
  const at = place("no", String(address.kommunenummer ?? ""));
  return {
    id: unit.organisasjonsnummer,
    name: unit.navn.trim(),
    country: "no",
    town: at.town || titleCase(address.kommune ?? address.poststed),
    nuts: at.nuts,
    nace: nace.replace(/\D/g, ""),
    people: Number(unit.antallAnsatte),
    ...(unit.hjemmeside ? { website: unit.hjemmeside } : {}),
  };
}

// The bulk file (enheter_alle.json.gz), read as a stream.
export async function readBrreg(
  file: string,
  place: Placer,
): Promise<RegisterCompany[]> {
  const companies: RegisterCompany[] = [];
  for await (const unit of jsonObjects(
    createReadStream(file).pipe(createGunzip()),
  )) {
    const company = fromBrreg(unit as BrregUnit, place);
    if (company) companies.push(company);
  }
  return companies;
}
