import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { parseDay } from "../../../../shared/kit/dates.js";
import { pageText, plainText } from "../../../../shared/kit/text.js";
import { withoutContacts } from "../../contacts.js";
import {
  checkWholePass,
  publicFeed,
  withDetailPages,
} from "../../../crawl-core/feed-family.js";
import { stated } from "../../stated.js";

// Brussels: Actiris, the region's public employment service, through the list its own search
// draws. Its legal notice allows using what its sites show when the source is named; no robots.txt.
// Its own offers only (its partners', VDAB's and Le Forem's are read at their source): a hundred a
// call, each with its title, town and day; an offer's page adds its text, read once and kept. An
// offer gone from a whole pass is closed.
const BASE = "https://www.actiris.brussels";
export const LIST = `${BASE}/api/Offer/GetAllOffers`;
const PAGE = 100;
const LIST_PAGES = 100;
// Own pages read a pass (the legacy read 300 of the offers its gate took).
export const DETAILS_A_PASS = 300;

export const listBody = (page: number) =>
  JSON.stringify({
    pageOption: { page, from: 0, pageSize: PAGE },
    offreFilter: { isOffreActiris: true },
  });
export const offerUrl = (reference: string, type = "Select") =>
  `${BASE}/fr/citoyens/detail-offre-d-emploi/?reference=${encodeURIComponent(reference)}&type=${encodeURIComponent(type)}`;

const REGIMES: Record<string, string> = {
  NO: "temps plein",
  PT: "temps partiel",
};

// The list's contract codes whose label the readers would not know (the legacy's ACTIRIS_CONTRACTS).
const CONTRACTS: Record<string, string> = {
  FPI: "formation professionnelle",
  INDEPENDANT: "independant",
  REMPLACEMENT: "remplacement",
};

interface Listed {
  readonly reference?: string | number;
  readonly titreFr?: string;
  readonly titreNl?: string;
  readonly communeFr?: string;
  readonly communeNl?: string;
  readonly codePays?: string;
  readonly typeOffer?: string;
  readonly dateCreation?: string;
  readonly typeContrat?: string;
  readonly typeContratLibelle?: string;
  readonly regimeTravail?: string;
}

export function parseList(json: string): {
  readonly total: number;
  readonly drafts: AdvertDraft[];
} {
  const body = JSON.parse(json) as { offers?: unknown; total?: number } | null;
  const offers = Array.isArray(body?.offers)
    ? (body.offers as (Listed | null)[])
    : [];
  const drafts = offers.flatMap((offer): AdvertDraft[] => {
    const title = plainText(offer?.titreFr || offer?.titreNl || "").replace(
      /\s+[-–]?\s*\(?(?:H\/F\/X|F\/H\/X|M\/V\/X|H\/F|M\/V)\)?\s*$/i,
      "",
    );
    if (!offer?.reference || !title) return [];
    const town = plainText(offer.communeFr || offer.communeNl || "");
    const country = (offer.codePays || "BE").toLowerCase();
    // The list's own contract and working regime: the only words besides the title until the
    // offer's page is read.
    const facts = [
      offer.typeContratLibelle || offer.typeContrat,
      REGIMES[(offer.regimeTravail ?? "").toUpperCase()],
    ]
      .filter(Boolean)
      .join(", ");
    const draft: AdvertDraft = {
      source: "actiris",
      sourceId: String(offer.reference),
      title,
      company: "",
      location: [town, country === "be" ? "Belgique" : ""]
        .filter(Boolean)
        .join(", "),
      country,
      city: town,
      remote: false,
      url: offerUrl(String(offer.reference), offer.typeOffer || "Select"),
      description: facts,
      occupationCodes: {},
      language: offer.titreFr ? "fr" : "nl",
      // Its list's own contract (CDI, CDD, INTERIM, REMPLACEMENT, STAGE, FPI, INDEPENDANT) and
      // working regime, on every offer (1 November 2026).
      ...stated({
        contract:
          CONTRACTS[(offer.typeContrat ?? "").toUpperCase()] ||
          offer.typeContratLibelle ||
          offer.typeContrat,
        hours: REGIMES[(offer.regimeTravail ?? "").toUpperCase()],
      }),
    };
    const posted = parseDay(offer.dateCreation);
    if (posted) draft.posted = posted;
    return [draft];
  });
  return { total: Number(body?.total) || 0, drafts };
}

// An offer's page: its text from the company's description to the «Postuler» heading or button
// (not the word in a sentence).
export function withPage(draft: AdvertDraft, html: string): AdvertDraft {
  const page = html.replace(
    /<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi,
    " ",
  );
  const from = page.search(
    /Description de l(?:&#x27;|'|’)entreprise|Description de la fonction/,
  );
  if (from < 0) return draft;
  const to = page
    .slice(from)
    .search(/<[^<>]*>\s*(?:Comment )?[Pp]ostuler\b|<footer/);
  const text = pageText(
    page.slice(from, to > 0 ? from + to : from + 20_000),
  ).replace(/^Description de l['’]entreprise\s*/, "");
  if (!text) return draft;
  return {
    ...draft,
    description: [withoutContacts(text), draft.description]
      .filter(Boolean)
      .join("\n"),
  };
}

const withKnown = (draft: AdvertDraft, known: AdvertDraft): AdvertDraft => ({
  ...draft,
  description: known.description,
});

async function* readActiris(
  context: AdapterContext,
): AsyncIterable<AdvertDraft> {
  const listed = new Map<string, AdvertDraft>();
  let total = 0;
  for (let page = 1; page <= LIST_PAGES; page++) {
    const answer = parseList(
      (
        await context.http.request(LIST, {
          method: "POST",
          body: listBody(page),
          headers: {
            "content-type": "application/json",
            "accept-language": "fr",
          },
        })
      ).body,
    );
    total = answer.total || total;
    const before = listed.size;
    for (const draft of answer.drafts) listed.set(draft.sourceId, draft);
    if (listed.size === before || listed.size >= total) break;
  }
  checkWholePass(listed.size, total, "offers");
  yield* withDetailPages(listed.values(), context, {
    most: DETAILS_A_PASS,
    read: withPage,
    keep: withKnown,
    // The list gives a text of its own (contract and regime): a page was read when there is more.
    wasRead: (known, fresh) => known.description !== fresh.description,
  });
}

export const actiris = publicFeed({
  definition: {
    id: "actiris",
    kind: "feed",
    licence: {
      name: "Actiris, Office régional bruxellois de l’emploi",
      short: "Actiris",
      url: "https://www.actiris.brussels/fr/citoyens/offres-d-emploi/",
      licence:
        "Its legal notice allows using what its sites show when the source is named; each offer links to Actiris",
      credit: "Source : Actiris",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  read: readActiris,
});
