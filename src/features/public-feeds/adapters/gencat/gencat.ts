import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { parseDay } from "../../../../shared/kit/dates.js";
import { plainText } from "../../../../shared/kit/text.js";
import { publicFeed } from "../../family.js";
import { stated } from "../../stated.js";

// Generalitat de Catalunya: the temporary vacancies of the Government's departments (the offers
// the ATRI portal listed), an open dataset on Catalonia's transparency portal read whole (Socrata,
// no key; the Generalitat's legal notice allows reuse for commercial or non-commercial ends). The
// post, the body that hires, the territory and the days; the offer itself is a PDF, its address
// the advert's. The offers of a post outside Catalonia are left out: the dataset does not say
// where, and an advert needs its country.
export const DATASET =
  "https://analisi.transparenciacatalunya.cat/resource/qwjc-9xp7.json?$limit=50000";

// The territories the dataset names, by the town their services sit in.
const TOWN: Readonly<Record<string, string>> = {
  "comarques de barcelona": "Barcelona",
  "comarques gironines": "Girona",
  ponent: "Lleida",
  "camp de tarragona": "Tarragona",
  "terres de l'ebre": "Tortosa",
  "alt pirineu i aran": "La Seu d'Urgell",
  "comarques centrals": "Manresa",
  penedès: "Vilafranca del Penedès",
};

interface Row {
  readonly oferta?: { readonly url?: string };
  readonly descripcio_lloc?: string;
  readonly ambit_territorial?: string;
  readonly codi?: string;
  readonly organisme?: string;
  readonly departament?: string;
  readonly categoria?: string;
  readonly data_inici_publicacio?: string;
  readonly data_fi_publicacio?: string;
}

export function parseGencat(json: string): AdvertDraft[] {
  const rows: unknown = JSON.parse(json);
  return (Array.isArray(rows) ? (rows as (Row | null)[]) : []).flatMap(
    (row): AdvertDraft[] => {
      const url = (row?.oferta?.url ?? "").trim();
      // The post as the dataset writes it, its number of posts and civil-service group included
      // («2 Arquitecte/a territorial», «…, A2-22.1»): its licence asks that the content not be
      // altered.
      const title = plainText(row?.descripcio_lloc ?? "");
      const where = (row?.ambit_territorial ?? "").trim();
      if (!row || !url.startsWith("https://") || !title) return [];
      if (/^fora de catalunya$/i.test(where)) return [];
      const town = TOWN[where.toLowerCase()] ?? "";
      const draft: AdvertDraft = {
        source: "gencat",
        sourceId: (row.codi ?? url).trim(),
        title,
        company: plainText(row.organisme ?? "") || "Generalitat de Catalunya",
        location: [town, "Catalunya", "España"].filter(Boolean).join(", "),
        country: "es",
        city: town,
        remote: false,
        url,
        // The dataset is of temporary posts.
        description: [
          row.descripcio_lloc,
          row.organisme,
          row.departament && `Departament: ${row.departament}`,
          row.categoria && `Categoria: ${row.categoria}`,
          where && `Àmbit: ${where}`,
          "Contracte: temporal",
        ]
          .filter(Boolean)
          .join("\n"),
        occupationCodes: {},
        language: "ca",
        // The dataset is of temporary posts ("Ofertes de treball de caràcter temporal").
        ...stated({ contract: "temporal" }),
      };
      const posted = parseDay(row.data_inici_publicacio);
      const expires = parseDay(row.data_fi_publicacio);
      if (posted) draft.posted = posted;
      if (expires) draft.expires = expires;
      return [draft];
    },
  );
}

async function* readGencat(
  context: AdapterContext,
): AsyncIterable<AdvertDraft> {
  const drafts = parseGencat((await context.http.request(DATASET)).body);
  context.log(`${drafts.length} offers`);
  yield* drafts;
}

export const gencat = publicFeed({
  definition: {
    id: "gencat",
    kind: "feed",
    licence: {
      name: "Generalitat de Catalunya, Direcció General de Funció Pública",
      short: "Generalitat de Catalunya",
      url: "https://analisi.transparenciacatalunya.cat/d/qwjc-9xp7",
      licence:
        "Reuse for any purpose under the Generalitat's legal notice (open data), source cited",
      credit:
        "Font: Generalitat de Catalunya, Direcció General de Funció Pública",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  read: readGencat,
});
