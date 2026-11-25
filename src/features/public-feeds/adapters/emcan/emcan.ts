import { load } from "cheerio";
import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { parseDay } from "../../../../shared/kit/dates.js";
import {
  fromCapitals,
  pageText,
  plainText,
  sentenceCase,
} from "../../../../shared/kit/text.js";
import { withoutContacts } from "../../contacts.js";
import {
  checkWholePass,
  publicFeed,
  withDetailPages,
} from "../../../crawl-core/feed-family.js";
import { townName } from "../../spanish.js";

// Cantabria: the Servicio Cántabro de Empleo's (EMCAN) public offers, through the list its own
// search draws (a page of two hundred holds them all) and each offer's page. Its legal notice sets
// no limit on robots or reuse: reproduction "corresponderá al tipo de licencia que se indique", and
// the Gobierno de Cantabria's portal publishes under CC BY 3.0 ES (read by the legacy on 15 October
// 2026). robots.txt asks ten seconds between calls (kept by the client, and set in config/crawl.yml
// too). The list gives the post, the town and the day; an offer's page adds its occupation, last
// day and text, read once and kept between passes, 60 a pass. No employer is named, and the contact
// the page gives is not kept.
const BASE = "https://empleacantabria.es";
const PORTLET =
  "es_gobcantabria_liferay_empleacan_buscador_ofertas_EmpleacanBuscadorOfertasPortlet";
const PAGE = 200;
const LIST_PAGES = 20;
export const PAGES_A_PASS = 60;
export const listUrl = (page = 1) =>
  `${BASE}/ofertas-cantabria?p_p_id=${PORTLET}&_${PORTLET}_delta=${PAGE}&_${PORTLET}_cur=${page}`;
export const offerUrl = (code: string) =>
  `${BASE}/ofertas-cantabria/-/oferta/${code}`;

// The list: how many offers the search counts, and a row per offer. The title starts with the
// number of posts ("2 FRESADORES/AS."), which goes to the text once the page is read.
export function parseList(html: string): {
  readonly total: number;
  readonly drafts: AdvertDraft[];
  readonly posts: ReadonlyMap<string, number>;
} {
  const $ = load(html);
  const total =
    Number(/Mostrando[^<]*?(\d+)\s+resultados?/.exec(html)?.[1]) || 0;
  const posts = new Map<string, number>();
  const drafts = $("tr")
    .toArray()
    .flatMap((row): AdvertDraft[] => {
      const cells = $(row)
        .find("td")
        .toArray()
        .map((cell) => plainText($(cell).html() ?? ""));
      const code = /\/-\/oferta\/(\d+)/.exec(
        $(row).find('a[href*="/-/oferta/"]').attr("href") ?? "",
      )?.[1];
      if (cells.length < 4 || !code) return [];
      const [, post = "", place = "", day = ""] = cells;
      // "2 FRESADORES/AS.": the number of posts, then the post, often with a closing dot or the
      // hotel's stars.
      const [, count = "1", name = post] = /^(\d+)\s+(.+)$/.exec(post) ?? [];
      const title = fromCapitals(name.replace(/[\s.*]+$/, "").trim());
      if (!title) return [];
      const city = place ? townName(place) : "";
      posts.set(code, Number(count));
      const draft: AdvertDraft = {
        source: "emcan",
        sourceId: code,
        title,
        company: "",
        location: [city, "Cantabria", "España"].filter(Boolean).join(", "),
        country: "es",
        city,
        remote: false,
        url: offerUrl(code),
        description: "",
        occupationCodes: {},
        language: "es",
      };
      const posted = parseDay(day);
      if (posted) draft.posted = posted;
      return [draft];
    });
  return { total, drafts, posts };
}

// An offer's page: the occupation, the last day it is published and its free text; the contact
// block is not read.
export function withPage(
  draft: AdvertDraft,
  html: string,
  posts = 1,
): AdvertDraft {
  const $ = load(html);
  const field = (name: string) =>
    plainText($(`input[name="_${PORTLET}_${name}"]`).attr("value") ?? "");
  const occupation = field("ocupacion");
  const text = withoutContacts(
    pageText($("div.dAdicionales").first().html() ?? ""),
  );
  const facts = [
    occupation && `Ocupación: ${sentenceCase(occupation)}`,
    posts > 1 && `Puestos: ${posts}`,
  ].filter(Boolean);
  const expires = parseDay(field("fechaFinDifusion"));
  const description = [text, facts.join(" · ")].filter(Boolean).join("\n");
  // A page that says nothing leaves the offer as listed, to be read again.
  if (!description) return draft;
  return { ...draft, description, ...(expires ? { expires } : {}) };
}

async function* readEmcan(context: AdapterContext): AsyncIterable<AdvertDraft> {
  const listed = new Map<string, AdvertDraft>();
  const posts = new Map<string, number>();
  let total = 0;
  for (let page = 1; page <= LIST_PAGES; page++) {
    const answer = parseList((await context.http.request(listUrl(page))).body);
    total = answer.total || total;
    const before = listed.size;
    for (const draft of answer.drafts) listed.set(draft.sourceId, draft);
    for (const [code, count] of answer.posts) posts.set(code, count);
    if (listed.size === before || listed.size >= total) break;
  }
  checkWholePass(listed.size, total, "offers");
  yield* withDetailPages(listed.values(), context, {
    most: PAGES_A_PASS,
    read: (draft, html) => withPage(draft, html, posts.get(draft.sourceId)),
    keep: (draft, known) => ({
      ...draft,
      description: known.description,
      ...(known.expires ? { expires: known.expires } : {}),
    }),
  });
}

export const emcan = publicFeed({
  definition: {
    id: "emcan",
    kind: "feed",
    licence: {
      name: "Servicio Cántabro de Empleo (EMCAN), ofertas de empleo",
      short: "Empleo Cantabria",
      url: "https://empleacantabria.es/aviso-legal",
      licence:
        "Its legal notice sets no limit on reading or reuse; the Gobierno de Cantabria publishes under CC BY 3.0 ES. Each offer links to EMCAN",
      credit: "Fuente: Servicio Cántabro de Empleo, Gobierno de Cantabria",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  read: readEmcan,
});
