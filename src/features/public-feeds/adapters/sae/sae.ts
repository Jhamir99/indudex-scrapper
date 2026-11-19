import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { parseDay } from "../../../../shared/kit/dates.js";
import {
  fromCapitals,
  plainText,
  titleCase,
} from "../../../../shared/kit/text.js";
import { withoutContacts } from "../../contacts.js";
import { publicFeed } from "../../family.js";
import { stated } from "../../stated.js";
import { townName } from "../../spanish.js";

// Andalusia: the Servicio Andaluz de Empleo's published offers, through the list its own portal
// draws (saempleo.es; one call holds them all). The Junta de Andalucía's legal notice lets anyone
// copy, redistribute and use its sites' content commercially under Creative Commons Attribution
// ("licencia-tipo Creative Commons Reconocimiento 3.0", read by the legacy on 9 October 2026); no
// robots.txt. Title, town, text, days and the occupation's name; the employer is not published,
// and a contact left in the text is not kept.
export const LIST =
  "https://saempleo.es/ags/api/MS-HERMES/hermes/ofertas/ofertaspublicadas";
export const offerUrl = (id: string | number) =>
  `https://saempleo.es/ags/candidaturas/lista-ofertas-publicas/detalle-oferta?ofertaId=${encodeURIComponent(String(id))}`;

interface Named {
  readonly nombre?: string;
}
interface Offer {
  readonly idOferta?: string | number;
  readonly denominacionPuesto?: string;
  readonly municipio?: Named;
  readonly provincia?: Named;
  readonly ocupacionPrincipal?: Named;
  readonly tipoContrato?: Named;
  readonly jornadaLaboral?: Named;
  readonly puestosOfertados?: number;
  readonly textoLibreDifusion?: string;
  readonly fechaInicio?: string;
  readonly fechaFin?: string;
}

// Its titles and names come in capitals, a dash or a bullet sometimes as a lone "¿", and a stray
// punctuation mark ends a line now and then.
const unbroken = (text: string | undefined) =>
  (text ?? "")
    .replace(/\s*¿(?=\s)/g, " -")
    .replace(/\s+[.,;:]$/, "")
    .trim();
const sentence = (text: string | undefined) => fromCapitals(unbroken(text));

export function parseSae(json: string): AdvertDraft[] {
  const offers: unknown = JSON.parse(json);
  return (Array.isArray(offers) ? (offers as (Offer | null)[]) : []).flatMap(
    (offer): AdvertDraft[] => {
      const sourceId = String(offer?.idOferta ?? "").trim();
      const title = plainText(sentence(offer?.denominacionPuesto));
      if (!offer || !sourceId || !title) return [];
      const city = townName(plainText(offer.municipio?.nombre ?? ""));
      const facts = [
        offer.ocupacionPrincipal?.nombre &&
          `Ocupación: ${sentence(offer.ocupacionPrincipal.nombre)}`,
        offer.tipoContrato?.nombre &&
          `Contrato: ${sentence(offer.tipoContrato.nombre)}`,
        offer.jornadaLaboral?.nombre &&
          `Jornada: ${sentence(offer.jornadaLaboral.nombre)}`,
        (offer.puestosOfertados ?? 0) > 1 &&
          `Puestos: ${offer.puestosOfertados}`,
      ].filter(Boolean);
      const draft: AdvertDraft = {
        source: "sae",
        sourceId,
        title,
        company: "",
        location: [
          city,
          titleCase(plainText(offer.provincia?.nombre ?? "")),
          "España",
        ]
          .filter(Boolean)
          .join(", "),
        country: "es",
        city,
        remote: false,
        url: offerUrl(sourceId),
        description: [
          withoutContacts(unbroken(offer.textoLibreDifusion)),
          facts.join(" · "),
        ]
          .filter(Boolean)
          .join("\n"),
        occupationCodes: {},
        language: "es",
        // Its contract and working-day fields («Laboral temporal», «Completa»); the day's kind
        // with its word, so «Completa» reads as a full working day.
        ...stated({
          contract: offer.tipoContrato?.nombre,
          hours: offer.jornadaLaboral?.nombre
            ? `Jornada ${offer.jornadaLaboral.nombre.toLowerCase()}`
            : undefined,
        }),
      };
      // Its days read "30-09-2026 10:26".
      const posted = parseDay(offer.fechaInicio);
      const expires = parseDay(offer.fechaFin);
      if (posted) draft.posted = posted;
      if (expires) draft.expires = expires;
      return [draft];
    },
  );
}

async function* readSae(context: AdapterContext): AsyncIterable<AdvertDraft> {
  const drafts = parseSae(
    (
      await context.http.request(LIST, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      })
    ).body,
  );
  context.log(`${drafts.length} offers`);
  yield* drafts;
}

export const sae = publicFeed({
  definition: {
    id: "sae",
    kind: "feed",
    licence: {
      name: "Servicio Andaluz de Empleo, ofertas publicadas",
      short: "SAE",
      url: "https://saempleo.es/ags/candidaturas/lista-ofertas-publicas/lista",
      licence:
        "Creative Commons Attribution 3.0 (Junta de Andalucía legal notice); each offer links to the SAE",
      credit: "Fuente: Servicio Andaluz de Empleo, Junta de Andalucía",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  read: readSae,
});
