import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import {
  fromCapitals,
  pageText,
  plainText,
} from "../../../../shared/kit/text.js";
import { withoutContacts } from "../../contacts.js";
import { checkWholePass, publicFeed } from "../../family.js";
import { stated } from "../../stated.js";

// South Tyrol: the offers on eJob, the Province of Bolzano's job exchange, through the search its
// own page sends, a hundred at a time. Only what is published there: by employers, by private
// agencies and by the province's labour service. Its search also shows AMS Tirol's offers (whose
// own site closes its search to robots), private job boards' and Trento's (read at its source):
// those are left out. robots.txt closes only the candidates' area; the province's legal notes hold
// only a disclaimer. The person named beside a public office is not kept, nor a contact in the
// text.
const BASE = "https://ejob.civis.bz.it";
export const SEARCH = `${BASE}/rest/public/web/offerte/paged`;
const PAGE = 100;
const PAGES_AT_MOST = 50;
// The sources of its own offers, as its search names them.
export const OWN = [
  "Direkt vom Unternehmen",
  "Arbeitsagenturen",
  "AMS Südtirol",
];

interface Offer {
  readonly id?: number;
  readonly titolo?: string;
  readonly externalUrl?: string | null;
  readonly externalId?: string | null;
  readonly luogoLavoro?: string;
  readonly professione?: { readonly descr_i?: string };
  readonly tipoContratto?: { readonly value?: string };
  readonly offertaAnonima?: boolean;
  readonly nomeDitta?: string | null;
  readonly descr?: string;
  readonly dataInserimento?: number;
  readonly dataScadenza?: number;
}
interface Paged {
  readonly offerte?: unknown;
  readonly totalItems?: number;
}
type Body = (Paged & { readonly paginatedOffers?: Paged }) | null;

// The day an epoch in milliseconds falls on.
const dayOf = (milliseconds: number | undefined) =>
  Number(milliseconds) > 0
    ? new Date(Number(milliseconds)).toISOString().slice(0, 10)
    : undefined;

// Titles come in German or in Italian: the processor reads each in its own language.
const GERMAN =
  /[äöüß]|\((?:m\/w|w\/m)(?:\/[dx])?\)|\b(?:und|mit|für|im|zur|zum|der|die|das|bei)\b|mitarbeiter|leiter|techniker|elektriker|monteur|facharbeiter|koch|kellner|verkäufer|fahrer|mechaniker|ingenieur|tischler|maurer|kraft|informatik|buchhaltung|rezeption|sachbearbeiter|lehrling|meister|helfer/i;
export const titleLanguage = (title: string) =>
  GERMAN.test(title) ? "de" : "it";

// "Bolzano", "Tirolo  (Burgraviato)": the town before its district.
const townOf = (text: string) =>
  plainText(text).replace(/\s*\([^)]*\)\s*$/, "");

export function parseBolzano(json: string): {
  readonly total: number | undefined;
  readonly drafts: AdvertDraft[];
} {
  const body = JSON.parse(json) as Body;
  const paged = body?.paginatedOffers ?? body;
  const list = Array.isArray(paged?.offerte)
    ? (paged.offerte as (Offer | null)[])
    : [];
  const drafts = list.flatMap((offer): AdvertDraft[] => {
    const own = (offer?.id ?? 0) > 0;
    const sourceId = own
      ? String(offer?.id)
      : (offer?.externalId ?? offer?.externalUrl ?? "");
    const url = own
      ? `${BASE}/it/offerDetailPublic/${offer?.id}`
      : (offer?.externalUrl ?? "");
    const title = fromCapitals(
      plainText(offer?.titolo ?? "").replace(/\s+-\s*$/, ""),
    );
    if (!offer || !title || !sourceId || !url.startsWith("https://")) return [];
    const town = townOf(offer.luogoLavoro ?? "");
    const facts = [
      offer.professione?.descr_i && `Professione: ${offer.professione.descr_i}`,
      // Its contract field («tempo indeterminato», «tempo determinato o stagionale», «lavoro
      // interinale»), on 94.5 % of the offers.
      offer.tipoContratto?.value && `Contratto: ${offer.tipoContratto.value}`,
    ].filter(Boolean);
    const draft: AdvertDraft = {
      source: "bolzano",
      sourceId,
      title,
      company: offer.offertaAnonima
        ? ""
        : plainText(offer.nomeDitta ?? "").replace(/\s*\([^)]*\)\s*$/, ""),
      location: [town, "Italia"].filter(Boolean).join(", "),
      country: "it",
      city: town,
      remote: false,
      url,
      description: [
        withoutContacts(pageText(offer.descr ?? "")),
        facts.join(" · "),
      ]
        .filter(Boolean)
        .join("\n"),
      occupationCodes: {},
      language: titleLanguage(title),
      // Its contract field («tempo indeterminato», «lavoro interinale»), on 94.5 % of offers.
      ...stated({ contract: offer.tipoContratto?.value }),
    };
    const posted = dayOf(offer.dataInserimento);
    const expires = dayOf(offer.dataScadenza);
    if (posted) draft.posted = posted;
    if (expires) draft.expires = expires;
    return [draft];
  });
  return { total: paged?.totalItems, drafts };
}

async function* readBolzano(
  context: AdapterContext,
): AsyncIterable<AdvertDraft> {
  const listed = new Map<string, AdvertDraft>();
  for (const source of OWN) {
    // Each procedure's count is read on its first page: one that names none, or a list read short
    // of it, is no whole pass.
    const read = new Set<string>();
    let declared: number | undefined;
    for (let page = 1; ; page++) {
      if (page > PAGES_AT_MOST)
        throw new Error(`"${source}" runs past ${PAGES_AT_MOST} pages`);
      const answer = await context.http.request(
        `${SEARCH}?start=${page}&itemPage=${PAGE}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json;charset=UTF-8",
            accept: "application/json",
          },
          body: JSON.stringify({
            queryFilter: "",
            requiredFieldList: [`PROVENIENZA_DE:${source}`],
          }),
        },
      );
      const { total, drafts } = parseBolzano(answer.body);
      const before = listed.size;
      for (const draft of drafts) {
        listed.set(draft.sourceId, draft);
        read.add(draft.sourceId);
      }
      if (page === 1) declared = total;
      if (listed.size === before || page * PAGE >= Number(declared)) break;
    }
    if (declared !== 0)
      checkWholePass(read.size, Number(declared), `offers of "${source}"`);
  }
  if (listed.size === 0) throw new Error("the search found no offer");
  context.log(`${listed.size} offers`);
  yield* listed.values();
}

export const bolzano = publicFeed({
  definition: {
    id: "bolzano",
    kind: "feed",
    licence: {
      name: "Provincia autonoma di Bolzano, eJob",
      short: "eJob Alto Adige",
      url: "https://ejob.civis.bz.it/",
      licence:
        "No terms against reuse (the province's legal notes hold a disclaimer); each offer links to eJob or to the employer's page",
      credit: "Provincia autonoma di Bolzano - Alto Adige, eJob",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  read: readBolzano,
});
