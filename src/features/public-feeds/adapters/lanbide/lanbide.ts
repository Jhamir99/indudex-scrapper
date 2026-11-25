import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { parseDay } from "../../../../shared/kit/dates.js";
import { pageText, plainText } from "../../../../shared/kit/text.js";
import { withoutContacts } from "../../contacts.js";
import { publicFeed } from "../../../crawl-core/feed-family.js";

// Basque Country: Lanbide's open-data JSON of the vacancies it manages (CC BY 4.0, no key). DISABLED
// AND FLAGGED (public-feeds FR-6): its host's robots.txt closes everything ("Disallow: /", read 17
// November 2026). The legacy switched robots.txt off for it, as the address datos.gob.es gives;
// this scrapper obeys robots.txt without exceptions (operator's decision, 2026-11-17, for forem), so
// it stays off until Lanbide opens the file to robots or gives leave. Never read so far: its
// fixture is built from the format the legacy documents. The file is served in Windows-1252, so it
// is decoded by hand; the position text (desPuesto) is the advert body, and there is no employer
// name in the data.
export const FILE = "https://apps.lanbide.euskadi.net/apps/OF_OFERTAS_ODE_JSON";

interface Row {
  readonly url?: string;
  readonly municipio?: string;
  readonly provincia?: string;
  readonly codigo?: string | number;
  readonly desEmpleo?: string;
  readonly desPuesto?: string;
  readonly fecPub?: string;
  readonly fecMod?: string;
}

// The file as text: UTF-8 when it is valid UTF-8, else Windows-1252.
export function decodeLanbide(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

export function parseLanbide(text: string): AdvertDraft[] {
  const data: unknown = JSON.parse(text);
  const rows = (
    Array.isArray(data)
      ? data
      : (Object.values((data ?? {}) as object).find(Array.isArray) ?? [])
  ) as (Row | null)[];
  return rows.flatMap((row): AdvertDraft[] => {
    const sourceId = String(row?.codigo ?? "").trim();
    const title = plainText(row?.desEmpleo ?? "");
    const url = (row?.url ?? "").trim();
    if (!sourceId || !title || !url.startsWith("https://")) return [];
    const town = plainText(row?.municipio ?? "");
    const province = plainText(row?.provincia ?? "");
    const draft: AdvertDraft = {
      source: "lanbide",
      sourceId,
      title,
      company: "",
      location: [town, province, "España"].filter(Boolean).join(", "),
      country: "es",
      city: town,
      remote: false,
      url,
      description: withoutContacts(pageText(row?.desPuesto ?? "")),
      occupationCodes: {},
      language: "es",
    };
    const posted = parseDay(row?.fecPub) ?? parseDay(row?.fecMod);
    if (posted) draft.posted = posted;
    return [draft];
  });
}

async function* readLanbide(
  context: AdapterContext,
): AsyncIterable<AdvertDraft> {
  const answer = await context.http.request(FILE, { binary: true });
  const drafts = parseLanbide(decodeLanbide(answer.bytes ?? new Uint8Array()));
  context.log(`${drafts.length} offers`);
  yield* drafts;
}

export const lanbide = publicFeed({
  definition: {
    id: "lanbide",
    kind: "feed",
    licence: {
      name: "Lanbide, Servicio Vasco de Empleo",
      short: "Lanbide",
      url: "https://datos.gob.es/en/catalogo/a16003011-ofertas-de-empleo-de-lanbide1",
      licence: "CC BY 4.0",
      credit: "Fuente: Lanbide - Servicio Vasco de Empleo",
    },
    needsCredentials: false,
    credentialVariables: [],
    disabledReason:
      "its host's robots.txt closes everything to robots; enable it only once Lanbide opens the file or gives leave",
  },
  read: readLanbide,
});
