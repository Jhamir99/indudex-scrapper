import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { pageText, plainText } from "../../../../shared/kit/text.js";
import { withoutContacts } from "../../contacts.js";
import {
  publicFeed,
  withDetailPages,
} from "../../../crawl-core/feed-family.js";

// Catalonia: TT Vic (Treball Temporal, Vic, Osona), a temporary-work agency: its list of offers,
// twenty-one a page followed through its "next" link, and each offer's page for its text.
// DISABLED AND FLAGGED (public-feeds FR-6): its legal notice gives private use only and asks express
// leave to modify or reproduce the offers, so it waits for TT Vic's leave, as in the legacy since
// 27 October 2026. Never read so far: its fixture is built from the format the legacy documents.
export const LIST = "https://ttvic.com/ca/ofertes-de-treball-temporal";
const LIST_PAGES = 10;
const DETAILS_A_PASS = 60;

// "OPERARI/A TALLER METALL" → "Operari/a taller metall".
const sentence = (text: string) => {
  const trimmed = text.trim();
  if (trimmed !== trimmed.toUpperCase()) return trimmed;
  const lower = trimmed.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

// A page of the list: a card per offer and the "next" link.
export function parseList(html: string): {
  readonly drafts: AdvertDraft[];
  readonly next: string;
} {
  const drafts = html
    .split(/<h5 class="card-title/)
    .slice(1)
    .flatMap((card): AdvertDraft[] => {
      const link =
        /href="(https:\/\/ttvic\.com\/ca\/ofertes-de-treball-temporal\/info\/[^"#?]+)"[^>]*>([\s\S]*?)<\/a>/.exec(
          card,
        );
      if (!link?.[1]) return [];
      const field = (name: string) =>
        plainText(
          new RegExp(
            `<strong[^>]*>\\s*${name}:?\\s*</strong>([\\s\\S]*?)</p>`,
            "i",
          ).exec(card)?.[1] ?? "",
        );
      const title = sentence(plainText(link[2] ?? ""));
      if (!title) return [];
      const place = field("Ubicaci(?:ó|&oacute;)");
      const sector = field("Sector");
      return [
        {
          source: "ttvic",
          sourceId: link[1].split("/info/")[1] ?? "",
          title,
          company: "",
          location: [place, "Catalunya", "España"].filter(Boolean).join(", "),
          country: "es",
          city: place,
          remote: false,
          url: link[1],
          description: sector ? `Sector: ${sector}` : "",
          occupationCodes: {},
          language: "ca",
        },
      ];
    });
  const next =
    /<li class="next page-item"><a class="page-link" href="([^"]+)"/.exec(
      html,
    )?.[1] ?? "";
  return { drafts, next };
}

// An offer's page: the text under "Descripció de l'oferta" and the requirements, up to the images.
export function withPage(draft: AdvertDraft, html: string): AdvertDraft {
  const body =
    /<h1 class="titol3">([\s\S]*?)<h2>Imatges<\/h2>/.exec(html)?.[1] ?? "";
  if (!body) return draft;
  // The page's headings become lines; a label keeps its value on its line ("Requisits: …").
  const text = pageText(
    body
      .replace(/^[^<]*<\/h1>/, "")
      .replace(/<h1 class="titol3">([\s\S]*?)<\/h1>/gi, "<p>$1</p>")
      .replace(/<\/h2>\s*/gi, ":</h2>"),
  ).replace(/:\s*\n\s*/g, ": ");
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

async function* readTtvic(context: AdapterContext): AsyncIterable<AdvertDraft> {
  const listed = new Map<string, AdvertDraft>();
  let url = LIST;
  for (let page = 0; url && page < LIST_PAGES; page++) {
    const { drafts, next } = parseList((await context.http.request(url)).body);
    for (const draft of drafts) listed.set(draft.sourceId, draft);
    url = next && !next.includes("#") ? next : "";
  }
  yield* withDetailPages(listed.values(), context, {
    most: DETAILS_A_PASS,
    read: withPage,
    keep: withKnown,
  });
}

export const ttvic = publicFeed({
  definition: {
    id: "ttvic",
    kind: "portal",
    licence: {
      name: "TT Vic, ofertes de treball temporal",
      short: "TT Vic",
      url: "https://ttvic.com/ca/avis_legal",
      licence:
        "Its notice gives private use only and asks express leave to modify or reproduce: not read until TT Vic agrees. Each offer links to TT Vic",
      credit: "Font: TT Vic",
    },
    needsCredentials: false,
    credentialVariables: [],
    disabledReason:
      "its legal notice asks express leave to reproduce its offers; enable it only once TT Vic gives it",
  },
  read: readTtvic,
});
