import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { parseDay } from "../../../../shared/kit/dates.js";
import { pageText, plainText } from "../../../../shared/kit/text.js";
import { publicFeed } from "../../family.js";
import { loadIscoUnits } from "../../isco-units.js";

// Czechia: every vacancy the Labour Office holds, as the Ministry of Labour publishes it (open
// data, no key; the national catalogue records no copyright and no database right). One JSON for
// the whole country, refreshed daily, served gzipped (fetch unpacks it). Each vacancy carries a
// CZ-ISCO code whose first four digits are its ISCO-08 unit group: only those of our scope
// (config/isco-units.yml) are kept. Municipalities come as codes, named through the ministry's
// codelist. The contact people the file also holds are never read.
export const VACANCIES =
  "https://data.mpsv.cz/od/soubory/volna-mista/volna-mista.json.gz";
export const MUNICIPALITIES =
  "https://data.mpsv.cz/od/soubory/ciselniky/obce.json";
const PAGE = "https://up.gov.cz/volna-mista-v-cr/-/vm/";
// CZ-ISCO files four occupations under 2141 that ISCO-08 does not count as engineering:
// logistics (21413), transport (21414), crisis management (21415), security systems (21416).
const NOT_ENGINEERING = new Set(["21413", "21414", "21415", "21416"]);

// A coded value: "CzIsco/31152", or an object holding it.
type Coded = string | { readonly id?: string } | null | undefined;
type Words = { readonly cs?: string } | null | undefined;

interface Vacancy {
  readonly zverejnovat?: Coded;
  readonly profeseCzIsco?: Coded;
  readonly mistoVykonuPrace?: {
    readonly pracoviste?: readonly ({
      readonly adresa?: { readonly obec?: Coded } | null;
    } | null)[];
  } | null;
  readonly portalId?: string | number;
  readonly pozadovanaProfese?: Words;
  readonly zamestnavatel?: { readonly nazev?: string } | null;
  readonly upresnujiciInformace?: Words;
  readonly datumVlozeni?: string | null;
  readonly expirace?: string | null;
}

// "CzIsco/31152" → "31152".
const codeOf = (value: Coded): string =>
  String((typeof value === "object" ? value?.id : value) ?? "")
    .split("/")
    .pop() ?? "";

// Municipality codes to names ("554782" → "Praha").
export function parseMunicipalities(json: string): Map<string, string> {
  const list = (
    JSON.parse(json) as {
      polozky?: { kod?: string | number; nazev?: Words }[];
    }
  ).polozky;
  return new Map(
    (list ?? []).map((town) => [
      String(town.kod),
      (town.nazev?.cs ?? "").trim(),
    ]),
  );
}

export function toDraft(
  vacancy: Vacancy,
  towns: ReadonlyMap<string, string>,
  units: ReadonlySet<string>,
): AdvertDraft | undefined {
  // "ano", "anoeu", "anosp": to be published.
  if (!(codeOf(vacancy.zverejnovat) || "ano").startsWith("ano"))
    return undefined;
  const isco = codeOf(vacancy.profeseCzIsco);
  if (NOT_ENGINEERING.has(isco) || !units.has(isco.slice(0, 4)))
    return undefined;
  const title = plainText(vacancy.pozadovanaProfese?.cs ?? "");
  if (!vacancy.portalId || !title) return undefined;
  const site = vacancy.mistoVykonuPrace?.pracoviste?.[0];
  const city = towns.get(codeOf(site?.adresa?.obec)) ?? "";
  const draft: AdvertDraft = {
    source: "mpsv",
    sourceId: String(vacancy.portalId),
    title,
    company: plainText(vacancy.zamestnavatel?.nazev ?? ""),
    location: [city, "Česko"].filter(Boolean).join(", "),
    country: "cz",
    city,
    remote: false,
    url: `${PAGE}${vacancy.portalId}`,
    description: pageText(vacancy.upresnujiciInformace?.cs ?? ""),
    occupationCodes: { isco: isco.slice(0, 4) },
    language: "cs",
  };
  const posted = parseDay(vacancy.datumVlozeni);
  const expires = parseDay(vacancy.expirace);
  if (posted) draft.posted = posted;
  if (expires) draft.expires = expires;
  return draft;
}

async function* readMpsv(context: AdapterContext): AsyncIterable<AdvertDraft> {
  const units = await loadIscoUnits();
  const vacancies =
    (
      JSON.parse((await context.http.request(VACANCIES)).body) as {
        polozky?: (Vacancy | null)[];
      }
    ).polozky ?? [];
  // Without the codelist the adverts still go out, with the country as their only place.
  let towns = new Map<string, string>();
  try {
    towns = parseMunicipalities(
      (await context.http.request(MUNICIPALITIES)).body,
    );
  } catch (error) {
    context.log(
      `municipality names unread: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  let kept = 0;
  for (const vacancy of vacancies) {
    const draft = vacancy ? toDraft(vacancy, towns, units) : undefined;
    if (draft) {
      kept += 1;
      yield draft;
    }
  }
  context.log(`${kept} of ${vacancies.length} vacancies in our occupations`);
}

export const mpsv = publicFeed({
  definition: {
    id: "mpsv",
    kind: "feed",
    licence: {
      name: "Úřad práce ČR, volná místa (MPSV open data)",
      short: "Úřad práce ČR",
      url: "https://data.mpsv.cz/web/data/volna-mista-za-celou-cr",
      licence:
        "Open data of the Czech Ministry of Labour and Social Affairs (no copyright and no database right claimed, per data.gov.cz)",
      credit: "Zdroj: Ministerstvo práce a sociálních věcí, Úřad práce ČR",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  read: readMpsv,
});
