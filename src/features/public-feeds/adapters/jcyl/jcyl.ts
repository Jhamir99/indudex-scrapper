import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { parseDay } from "../../../../shared/kit/dates.js";
import { pageText, plainText } from "../../../../shared/kit/text.js";
import { withoutContacts } from "../../contacts.js";
import { publicFeed } from "../../../crawl-core/feed-family.js";

// Castilla y León: the Junta's open-data feed of job offers (CC BY 4.0, no key). DISABLED AND
// FLAGGED (public-feeds FR-6): the dataset's address redirects to the Junta's analysis portal
// (analisis.datosabiertos.jcyl.es), whose robots.txt closes /api/, where the export now sits. The
// legacy switched robots.txt off for it; this scrapper obeys robots.txt without exceptions
// (operator's decision, 2026-11-17, for forem), so it stays off until the Junta opens the export
// to robots or gives leave. Never read so far: it is built from the format the legacy documents (a
// list of attribute lists, one per offer, that now and then carries a raw control character inside
// a text, which standard JSON forbids: those bytes are dropped before parsing). The export the
// address leads to today is a different, flat format: this adapter must be updated to it before
// the source is enabled.
export const FILE =
  "https://datosabiertos.jcyl.es/web/jcyl/risp/es/empleo/ofertas-empleo/1284354353012.json";

interface Attribute {
  readonly name?: string;
  readonly text?: unknown;
  readonly date?: unknown;
  readonly valor?: unknown;
}

// One offer's attribute list as a flat object {name: value}: a "valor" list of strings is joined,
// a date "20260902" becomes "2026-09-02".
function flatten(attributes: readonly Attribute[] | undefined) {
  const flat: Record<string, string> = {};
  for (const attribute of attributes ?? []) {
    const name = attribute.name;
    if (!name) continue;
    if (attribute.text !== undefined) flat[name] = String(attribute.text);
    else if (attribute.date !== undefined)
      flat[name] = String(attribute.date).replace(
        /^(\d{4})(\d{2})(\d{2})$/,
        "$1-$2-$3",
      );
    else if (Array.isArray(attribute.valor))
      flat[name] = (attribute.valor as unknown[])
        .map((value) =>
          value && typeof value === "object"
            ? Object.values(value).join(" ")
            : String(value),
        )
        .join(", ");
    else if (attribute.valor !== undefined)
      flat[name] = String(attribute.valor);
  }
  return flat;
}

interface Item {
  readonly element?: { readonly attribute?: readonly Attribute[] };
}

export function parseJcyl(text: string): AdvertDraft[] {
  // Raw control characters (but tab, line feed and carriage return) are not allowed in JSON.
  const clean = Array.from(text.replace(/^\uFEFF/, ""))
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code > 31 || code === 9 || code === 10 || code === 13;
    })
    .join("");
  const doc = JSON.parse(clean) as {
    document?: { list?: Item[] };
    list?: Item[];
  } | null;
  const list = doc?.document?.list ?? doc?.list ?? [];
  return list.flatMap((item): AdvertDraft[] => {
    const offer = flatten(item?.element?.attribute);
    const url = (offer["Enlace al contenido"] ?? "").trim();
    const sourceId = (offer["Identificador"] ?? "").trim();
    const title = plainText(offer["Titulo_es"] ?? "");
    if (!url.startsWith("https://") || !sourceId || !title) return [];
    const city = (offer["LocalidadAsset_NombreLocalidad"] ?? "").trim();
    const province = (offer["Provincia"] ?? "").trim();
    const draft: AdvertDraft = {
      source: "jcyl",
      sourceId,
      title,
      company: "",
      location: [city, province, "España"].filter(Boolean).join(", "),
      country: "es",
      city,
      remote: false,
      url,
      description: withoutContacts(pageText(offer["Descripcion_es"] ?? "")),
      occupationCodes: {},
      language: "es",
    };
    const posted = parseDay(offer["FechaPublicacion"]);
    if (posted) draft.posted = posted;
    return [draft];
  });
}

async function* readJcyl(context: AdapterContext): AsyncIterable<AdvertDraft> {
  const drafts = parseJcyl((await context.http.request(FILE)).body);
  context.log(`${drafts.length} offers`);
  yield* drafts;
}

export const jcyl = publicFeed({
  definition: {
    id: "jcyl",
    kind: "feed",
    licence: {
      name: "Junta de Castilla y León, ofertas de empleo",
      short: "Castilla y León",
      url: "https://datos.gob.es/en/catalogo/a07002862-ofertas-de-empleo1",
      licence: "CC BY 4.0",
      credit: "Fuente: Junta de Castilla y León, datos abiertos",
    },
    needsCredentials: false,
    credentialVariables: [],
    disabledReason:
      "its export sits under /api/ of the Junta's analysis portal, which robots.txt closes to every robot; enable it only once the Junta opens the export or gives leave (and update the adapter to the export's format)",
  },
  read: readJcyl,
});
