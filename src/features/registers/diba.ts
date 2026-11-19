import type { RegisterCompany } from "../../shared/schemas/register.js";
import type { HttpClient } from "../crawl-core/ports.js";
import { relevantActivity, titleCase } from "./common.js";
import type { Placer } from "./lau.js";

// The province of Barcelona: the census of activities of the 200-odd town councils that keep it
// with the Diputació (do.diba.cat, CC BY 4.0). It gives no size, so a company counts when one of its
// establishments carries on an activity of the vertical: by its CCAE class (Catalonia's NACE:
// engineering offices and IT included) or, without one, an industrial or productive one (its
// INSPIRE mark) of sections B to F. Companies only, by the tax number's first letter (a person's
// starts with a figure, X, Y or Z).
export const DIBA = {
  licence: "CC BY 4.0",
  credit: "Diputació de Barcelona, Cens municipal d'activitats i establiments",
} as const;

export const dibaPage = (from: number, to: number) =>
  `https://do.diba.cat/api/dataset/establiments/pag-ini/${from}/pag-fi/${to}/format/json`;
const PAGE_SIZE = 1000;

const COMPANY_NIF = /^[ABCDEFHJNUVW]/;
const SECTIONS = new Set(["B", "C", "D", "E", "F"]);

export interface DibaEstablishment {
  readonly rao_social_nif?: string;
  readonly rao_social_nom?: string;
  readonly rel_municipi?: string;
  readonly adreca?: { readonly nom_municipi?: string } | null;
  readonly codi_nace?: string;
  readonly codi_ccae?: string;
  readonly inspire?: string | number;
}

export interface DibaCompany {
  readonly id: string;
  readonly name: string;
  readonly ine: string;
  readonly townName: string;
  readonly nace: string;
}

const clean = (text: unknown) =>
  String(text ?? "")
    .replace(/[\t\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function fromDiba(establishment: DibaEstablishment): DibaCompany | null {
  const nif = String(establishment.rao_social_nif ?? "")
    .toUpperCase()
    .trim();
  const ccae = String(establishment.codi_ccae ?? "").replace(/\D/g, "");
  const name = clean(establishment.rao_social_nom);
  if (!COMPANY_NIF.test(nif) || !name) return null;
  if (
    ccae
      ? !relevantActivity(ccae)
      : String(establishment.inspire) !== "1" ||
        !SECTIONS.has(String(establishment.codi_nace ?? "").trim())
  )
    return null;
  return {
    id: nif,
    name,
    ine: String(establishment.rel_municipi ?? ""),
    townName: establishment.adreca?.nom_municipi ?? "",
    nace: ccae || String(establishment.codi_nace ?? "").trim(),
  };
}

interface DibaAnswer {
  readonly entitats?: number | string;
  readonly elements?: readonly DibaEstablishment[];
}

// The whole census through the polite client (robots.txt asks ten seconds between requests: the
// 44,000 activities take about seven minutes), each company once, placed by its INE code.
export async function readDiba(
  http: HttpClient,
  place: Placer,
  log: (message: string) => void = () => {},
): Promise<RegisterCompany[]> {
  const get = async (from: number, to: number) =>
    JSON.parse((await http.request(dibaPage(from, to))).body) as DibaAnswer;
  const total = Number((await get(1, 1)).entitats) || 0;
  const companies = new Map<string, RegisterCompany>();
  let read = 0;
  for (let from = 1; from <= total; from += PAGE_SIZE) {
    for (const establishment of (await get(from, from + PAGE_SIZE - 1))
      .elements ?? []) {
      read++;
      const company = fromDiba(establishment);
      if (!company || companies.has(company.id)) continue;
      const at = place("es", company.ine);
      companies.set(company.id, {
        id: company.id,
        name: company.name,
        country: "es",
        town: at.town || titleCase(company.townName),
        nuts: at.nuts,
        nace: company.nace,
      });
    }
    log(`diba: ${read} of ${total} activities`);
  }
  return [...companies.values()];
}
