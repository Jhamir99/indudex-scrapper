import { load } from "cheerio";
import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { parseDay } from "../../../../shared/kit/dates.js";
import { plainText, sentenceCase } from "../../../../shared/kit/text.js";
import { publicFeed } from "../../family.js";
import { townName } from "../../spanish.js";

// Comunidad de Madrid: the regional employment service's public offers, one page that lists them
// all (the Oficina Virtual de Empleo; robots.txt answers 404, no rules). Its legal notice allows
// reusing contents and data citing the source and the day, unaltered. The list gives each offer's
// occupation (its title column is empty), day, town and page; the employer is not given.
const BASE = "https://oficinavirtualempleo.comunidad.madrid";
export const LIST = `${BASE}/AreaPublica/Ofertas/`;

export function parseMadrid(html: string): AdvertDraft[] {
  const $ = load(html);
  return $("tr")
    .toArray()
    .flatMap((row): AdvertDraft[] => {
      const href = $(row).find('a[href*="DetalleOferta"]').attr("href");
      const cells = $(row)
        .find("td")
        .toArray()
        .map((cell) => plainText($(cell).html() ?? ""));
      if (!href || cells.length < 6) return [];
      // Identifier, title, occupation, day, formation level, place.
      const [identifier, title, occupation, day, level, place] = cells as [
        string,
        string,
        string,
        string,
        string,
        string,
      ];
      // The title is the occupation as the list writes it (its legal notice: unaltered); the
      // description, which is never shown, reads it in sentence case.
      const post = title || occupation;
      if (!post) return [];
      const city = place ? townName(place) : "";
      const draft: AdvertDraft = {
        source: "madrid",
        sourceId: identifier || href,
        title: post,
        company: "",
        location: [city, "Comunidad de Madrid", "España"]
          .filter(Boolean)
          .join(", "),
        country: "es",
        city,
        remote: false,
        url: new URL(href, BASE).href,
        description: [
          occupation && `Ocupación: ${sentenceCase(occupation)}`,
          level && `Nivel formativo: ${sentenceCase(level)}`,
        ]
          .filter(Boolean)
          .join("\n"),
        occupationCodes: {},
        language: "es",
      };
      const posted = parseDay(day);
      if (posted) draft.posted = posted;
      return [draft];
    });
}

async function* readMadrid(
  context: AdapterContext,
): AsyncIterable<AdvertDraft> {
  const drafts = parseMadrid((await context.http.request(LIST)).body);
  context.log(`${drafts.length} offers`);
  yield* drafts;
}

export const madrid = publicFeed({
  definition: {
    id: "madrid",
    kind: "feed",
    licence: {
      name: "Comunidad de Madrid, Oficina Virtual de Empleo",
      short: "Empleo Comunidad de Madrid",
      url: "https://oficinavirtualempleo.comunidad.madrid/AreaPublica/Ofertas/",
      licence:
        "Reuse citing the source and the day, unaltered (Comunidad de Madrid legal notice)",
      credit: "Fuente: Comunidad de Madrid",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  read: readMadrid,
});
