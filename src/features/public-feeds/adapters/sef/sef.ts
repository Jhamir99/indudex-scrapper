import type { AdvertDraft } from "../../../crawl-core/ports.js";
import { parseDay } from "../../../../shared/kit/dates.js";
import { pageText, plainText } from "../../../../shared/kit/text.js";
import { withoutContacts } from "../../contacts.js";
import { publicFeed } from "../../family.js";

// Region of Murcia: the regional employment service's open offers, a JSON on the region's
// open-data portal (reuse for any purpose under Spain's Law 37/2007, the source cited; no key).
// Title, an HTML body, the municipality and the dates; no occupation code, so the title decides,
// downstream. The contact field is never read, and contacts in the text are cut out.
export const OFFERS = "https://sefapps.carm.es/sefApps/rest/ofertas/ofertas";

interface Offer {
  readonly numeroOferta?: string | number;
  readonly descripcion?: string;
  readonly urlDetalles?: string;
  readonly municipio?: {
    readonly municipio?: string;
    readonly provincia?: { readonly provincia?: string };
  } | null;
  readonly adicionales?: string;
  readonly descNivelProfesional?: string;
  readonly mesesExperiencia?: number | null;
  readonly fechaDeInicio?: string;
  readonly fechaDeFin?: string;
}

// «FORTUNA» → «Fortuna», «LOS ALCÁZARES» → «Los Alcázares».
const titleCase = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .replace(
      /(^|[\s-])(\p{L})/gu,
      (_, gap: string, letter: string) => gap + letter.toUpperCase(),
    );

export function parseSef(json: string): AdvertDraft[] {
  const parsed: unknown = JSON.parse(json);
  const offers = Array.isArray(parsed) ? (parsed as (Offer | null)[]) : [];
  return offers.flatMap((offer): AdvertDraft[] => {
    const url = (offer?.urlDetalles ?? "").trim().replace(/^http:/, "https:");
    const title = plainText(offer?.descripcion ?? "");
    if (!offer?.numeroOferta || !title || !url.startsWith("https://"))
      return [];
    const city = titleCase(offer.municipio?.municipio ?? "");
    const province = titleCase(offer.municipio?.provincia?.provincia ?? "");
    const draft: AdvertDraft = {
      source: "sef",
      sourceId: String(offer.numeroOferta),
      title,
      company: "",
      location: [city, province !== city ? province : "", "España"]
        .filter(Boolean)
        .join(", "),
      country: "es",
      city,
      remote: false,
      url,
      description: withoutContacts(
        [
          pageText(offer.adicionales ?? ""),
          offer.descNivelProfesional
            ? `Nivel profesional: ${offer.descNivelProfesional}`
            : "",
          offer.mesesExperiencia
            ? `Experiencia: ${offer.mesesExperiencia} meses`
            : "",
        ]
          .filter(Boolean)
          .join("\n"),
      ),
      occupationCodes: {},
      language: "es",
    };
    const posted = parseDay(offer.fechaDeInicio);
    const expires = parseDay(offer.fechaDeFin);
    if (posted) draft.posted = posted;
    if (expires) draft.expires = expires;
    return [draft];
  });
}

export const sef = publicFeed({
  definition: {
    id: "sef",
    kind: "feed",
    licence: {
      name: "Servicio Regional de Empleo y Formación, Región de Murcia",
      short: "SEF Murcia",
      url: "https://datosabiertos.regiondemurcia.es/dataset/ofertas-de-empleo-activas-en-la-region-de-murcia",
      licence:
        "Reuse under Law 37/2007 (Región de Murcia open data), source cited",
      credit:
        "Origen de los datos: Servicio Regional de Empleo y Formación, Región de Murcia",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  pages: [OFFERS],
  parse: parseSef,
});
