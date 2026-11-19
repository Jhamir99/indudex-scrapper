import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { parseDay } from "../../../../shared/kit/dates.js";
import { parseXml, pickAll, pickText } from "../../../../shared/kit/pick.js";
import {
  fromCapitals,
  pageText,
  plainText,
  titleCase,
} from "../../../../shared/kit/text.js";
import { publicFeed } from "../../family.js";
import { stated } from "../../stated.js";

// Catalonia: the Feina Activa XML of the Generalitat's employment service (open data, attribution
// required, no key). One <ad> per vacancy, in Catalan or Spanish; the description is the content
// plus the experience, requirements and studies lines. About 3,800 vacancies in a file of 7 MB.
export const FEED = "https://feinaactiva.gencat.cat/api/offers/offers-xml";

// The feed gives each offer's address on its developers' machine
// (http://localhost:4200/search/offers/detail/FA…): the public page is that path on
// feinaactiva.gencat.cat, in Catalan.
export function publicUrl(url: string, id: string): string {
  const path =
    /\/search\/offers\/detail\/[^/?#\s]+/.exec(url)?.[0] ??
    (id ? `/search/offers/detail/${id}` : "");
  return path ? `https://feinaactiva.gencat.cat/ca${path}` : "";
}

export function parseFeinaActiva(xml: string): AdvertDraft[] {
  return pickAll(parseXml(xml), "ofertes.feinaactiva.ad").flatMap(
    (ad): AdvertDraft[] => {
      const status = pickText(ad, "status");
      const sourceId = pickText(ad, "id");
      const title = fromCapitals(plainText(pickText(ad, "title")));
      const url = publicUrl(pickText(ad, "url"), sourceId);
      if ((status && status !== "PUBLISHED") || !sourceId || !title || !url)
        return [];
      const city = titleCase(plainText(pickText(ad, "city")));
      const region = titleCase(plainText(pickText(ad, "region")));
      // Its page reads "Salari mensual brut des de 1416 fins a 1550": a month, gross, in euros.
      const min = pickText(ad, "salaryMin");
      const max = pickText(ad, "salaryMax");
      const pay =
        min || max
          ? `Salari mensual brut ${[min && `des de ${min}`, max && `fins a ${max}`].filter(Boolean).join(" ")}`
          : "";
      // «Contracte laboral temporal (6 mesos)», «Jornada parcial (20 hores - jornada setmanal)».
      const contract = pickText(ad, "contract");
      const hours = pickText(ad, "workingHours");
      const draft: AdvertDraft = {
        source: "feinaactiva",
        sourceId,
        title,
        company: plainText(pickText(ad, "company")),
        location: [city, region, "España"].filter(Boolean).join(", "),
        country: "es",
        city,
        remote: false,
        url,
        description: [
          ...["content", "experience", "requirements", "studies"].map((name) =>
            pageText(pickText(ad, name)),
          ),
          contract && `Contracte: ${contract}`,
          hours && `Jornada: ${hours}`,
          pay,
        ]
          .filter(Boolean)
          .join("\n"),
        occupationCodes: {},
        language: "ca",
        ...stated({ contract, hours }),
      };
      const posted = parseDay(pickText(ad, "date"));
      if (posted) draft.posted = posted;
      return [draft];
    },
  );
}

async function* readFeinaActiva(
  context: AdapterContext,
): AsyncIterable<AdvertDraft> {
  const drafts = parseFeinaActiva((await context.http.request(FEED)).body);
  context.log(`${drafts.length} offers`);
  yield* drafts;
}

export const feinaactiva = publicFeed({
  definition: {
    id: "feinaactiva",
    kind: "feed",
    licence: {
      name: "Feina Activa, Generalitat de Catalunya",
      short: "Feina Activa",
      url: "https://datos.gob.es/en/catalogo/a09002970-portal-feina-activa-ofertas-de-empleo",
      licence: "Open data of the Generalitat de Catalunya (attribution)",
      credit: "Font: Feina Activa, Generalitat de Catalunya",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  read: readFeinaActiva,
});
