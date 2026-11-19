import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { parseDay } from "../../../../shared/kit/dates.js";
import { fromCapitals, plainText } from "../../../../shared/kit/text.js";
import { checkWholePass, publicFeed } from "../../family.js";
import { stated } from "../../stated.js";

// Castilla-La Mancha: the regional employment service's public offers, a JSON API read whole (pages
// of a hundred, with Accept: application/json); its legal notice allows reproducing and spreading
// them under Law 37/2007, citing the source and the day. The post, the company, the town and
// province, the working day, the contract and the pay as written; the e-mail some offers carry is
// not kept. The API's robots.txt answers 401 (no rules).
const PAGE = 100;
// More pages than this is a source grown past what the reader was written for: the pass fails,
// it is not cut short.
const PAGES_AT_MOST = 200;
export const listUrl = (page: number) =>
  `https://empleabilidad-public.jccm.es/api/mostrar-ofertas-publicas?page=${page}&size=${PAGE}`;
export const offerUrl = (id: string | number) =>
  `https://empleo.castillalamancha.es/public/oferta-publica/detalle;id=${id}`;

interface Offer {
  readonly idOferta?: string | number;
  readonly oferta?: string;
  readonly ubicacion?: string;
  readonly empresa?: string;
  readonly jornada?: string;
  readonly tipoContrato?: string;
  readonly salario?: string;
  readonly fechaPostulacionHasta?: string | null;
}
interface Page {
  readonly data?: {
    readonly content?: unknown;
    readonly last?: boolean;
    readonly totalElements?: number;
  };
}

export function parseClm(json: string): {
  readonly total: number | undefined;
  readonly last: boolean;
  readonly drafts: AdvertDraft[];
} {
  const page = JSON.parse(json) as Page | null;
  const content = page?.data?.content;
  const drafts = (
    Array.isArray(content) ? (content as (Offer | null)[]) : []
  ).flatMap((offer): AdvertDraft[] => {
    const sourceId = String(offer?.idOferta ?? "").trim();
    // A title written all in capitals ("SOLDADOR/A MONTADOR/A") is shown as a sentence.
    const title = fromCapitals(plainText(offer?.oferta ?? ""));
    if (!offer || !sourceId || !title) return [];
    // "Torija (Guadalajara)": the town, then its province.
    const [, town = "", province = ""] =
      /^\s*([^(]+?)\s*(?:\(([^)]+)\))?\s*$/.exec(offer.ubicacion ?? "") ?? [];
    const draft: AdvertDraft = {
      source: "clm",
      sourceId,
      title,
      company: plainText(offer.empresa ?? ""),
      location: [town, province && province !== town ? province : "", "España"]
        .filter(Boolean)
        .join(", "),
      country: "es",
      city: town,
      remote: false,
      url: offerUrl(sourceId),
      // Its pay field is on every offer («1.900 € / Mensual sin prorrata Bruto», «… Anual
      // Bruto»): written as it is, for the processor to read.
      description: [
        offer.jornada && `Jornada: ${offer.jornada.toLowerCase()}`,
        offer.tipoContrato && `Contrato: ${offer.tipoContrato.toLowerCase()}`,
        offer.salario &&
          `Salario: ${offer.salario.replace(/\s+/g, " ").trim()}`,
      ]
        .filter(Boolean)
        .join("\n"),
      occupationCodes: {},
      language: "es",
      // Its working-day and contract fields («completa», «indefinido»).
      ...stated({
        contract: offer.tipoContrato,
        hours: offer.jornada
          ? `Jornada ${offer.jornada.toLowerCase()}`
          : undefined,
      }),
    };
    const expires = parseDay(offer.fechaPostulacionHasta ?? undefined);
    if (expires) draft.expires = expires;
    return [draft];
  });
  return {
    total: page?.data?.totalElements,
    last: page?.data?.last === true,
    drafts,
  };
}

async function* readClm(context: AdapterContext): AsyncIterable<AdvertDraft> {
  const listed = new Map<string, AdvertDraft>();
  let total: number | undefined;
  for (let page = 0; ; page++) {
    if (page >= PAGES_AT_MOST)
      throw new Error(`the list runs past ${PAGES_AT_MOST} pages`);
    const answer = parseClm(
      (
        await context.http.request(listUrl(page), {
          headers: { accept: "application/json" },
        })
      ).body,
    );
    total ??= answer.total;
    for (const draft of answer.drafts) listed.set(draft.sourceId, draft);
    if (answer.drafts.length === 0 || answer.last) break;
  }
  if (total !== undefined) checkWholePass(listed.size, total, "offers");
  context.log(`${listed.size} offers`);
  yield* listed.values();
}

export const clm = publicFeed({
  definition: {
    id: "clm",
    kind: "feed",
    licence: {
      name: "Junta de Comunidades de Castilla-La Mancha, empleo",
      short: "Empleo Castilla-La Mancha",
      url: "https://empleo.castillalamancha.es/public/ofertas-publicas",
      licence:
        "Reuse under Law 37/2007 (Castilla-La Mancha legal notice), source and day cited",
      credit: "Fuente: Junta de Comunidades de Castilla-La Mancha",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  read: readClm,
});
