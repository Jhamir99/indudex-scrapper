import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { parseDay } from "../../../../shared/kit/dates.js";
import { pageText, plainText } from "../../../../shared/kit/text.js";
import { publicFeed } from "../../../crawl-core/feed-family.js";

// SPIN, the job board several Catalan towns' employment services publish on: a town's list in one
// embedded view (the only address SPIN's robots.txt opens, the one carrying its spinReferer), and
// each offer's page with a JSON-LD JobPosting in its "spinSeo" data. Read: Girona's Servei Municipal
// d'Ocupació, whose site lets its content be reused under a Creative Commons licence (the other towns
// on SPIN ask leave). The town hall publishes for the employer, whose name the offer does not give.
export const LIST =
  "https://spin.girona.cat/webServices/views/?&vt=p76d05foyv&spinReferer=https://web.girona.cat/smo/borsadetreball";
const TOWN = "Girona";
export const offerUrl = (id: string) => `${LIST}&idOferta=${id}`;

export const offerIds = (html: string) => [
  ...new Set([...html.matchAll(/idOferta=(\d+)/g)].map(([, id]) => id ?? "")),
];

interface Posting {
  readonly "@type"?: string;
  readonly title?: string;
  readonly jobLocation?: unknown;
  readonly description?: string;
  readonly datePosted?: string;
  readonly validThrough?: string;
}

// The JobPosting an offer's page keeps in its "spinSeo" data: the object after "jsonld", braces
// counted outside strings.
export function postingOf(html: string): Posting | undefined {
  const at = html.indexOf('"jsonld":');
  const start = at < 0 ? -1 : html.indexOf("{", at);
  if (start < 0) return undefined;
  let depth = 0;
  let inString = false;
  for (let index = start; index < html.length; index++) {
    const character = html[index];
    if (inString) {
      if (character === "\\") index++;
      else if (character === '"') inString = false;
    } else if (character === '"') inString = true;
    else if (character === "{") depth++;
    else if (character === "}" && --depth === 0) {
      try {
        return JSON.parse(html.slice(start, index + 1)) as Posting;
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

export function toDraft(
  posting: Posting | undefined,
  id: string,
): AdvertDraft | undefined {
  if (posting?.["@type"] !== "JobPosting" || !posting.title) return undefined;
  const places = Array.isArray(posting.jobLocation)
    ? posting.jobLocation
    : [posting.jobLocation];
  const locality = (
    places[0] as { address?: { addressLocality?: string } } | undefined
  )?.address?.addressLocality;
  const town = plainText(locality ?? TOWN);
  const draft: AdvertDraft = {
    source: "spin",
    sourceId: id,
    title: plainText(posting.title),
    company: "",
    location: [town, "Catalunya", "España"].filter(Boolean).join(", "),
    country: "es",
    city: town,
    remote: false,
    url: offerUrl(id),
    description: pageText(posting.description ?? ""),
    occupationCodes: {},
    language: "ca",
  };
  const posted = parseDay(posting.datePosted);
  const expires = parseDay(posting.validThrough);
  if (posted) draft.posted = posted;
  if (expires) draft.expires = expires;
  return draft;
}

async function* readSpin(context: AdapterContext): AsyncIterable<AdvertDraft> {
  const previous = new Map(
    context.previous.map((draft) => [draft.sourceId, draft]),
  );
  const ids = offerIds((await context.http.request(LIST)).body);
  let failed = 0;
  for (const id of ids) {
    try {
      const draft = toDraft(
        postingOf((await context.http.request(offerUrl(id))).body),
        id,
      );
      if (draft) yield draft;
    } catch {
      // An offer still listed whose page did not answer keeps what it had.
      failed += 1;
      const known = previous.get(id);
      if (known) yield known;
    }
  }
  context.log(
    `${ids.length} offers listed${failed > 0 ? `, ${failed} pages failed` : ""}`,
  );
}

export const spin = publicFeed({
  definition: {
    id: "spin",
    kind: "feed",
    licence: {
      name: "Ajuntament de Girona, Servei Municipal d'Ocupació",
      short: "SMO Girona",
      url: "https://web.girona.cat/smo/borsadetreball",
      licence:
        "Reuse under the Creative Commons licence its legal notice names",
      credit: "Font: Ajuntament de Girona, Servei Municipal d'Ocupació",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  read: readSpin,
});
