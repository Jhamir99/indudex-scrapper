import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { parseDay } from "../../../../shared/kit/dates.js";
import { plainText, titleCase } from "../../../../shared/kit/text.js";
import { publicFeed } from "../../family.js";

// Wallonia: every offer Le Forem publishes, its own and its partners' (temporary-work agencies,
// Jobat), as open data on the Walloon portal ODWB (CC BY-SA 4.0, no key), updated every day: one
// JSON export of the offers. DISABLED AND FLAGGED (public-feeds FR-6): the export sits under
// /api/, which ODWB's robots.txt closes to every robot (as it does every download route of the
// dataset, read 17 November 2026). The legacy switched robots.txt off for it as an official
// open-data channel; this scrapper obeys robots.txt without exceptions (operator's decision,
// 2026-11-17), so it stays off until ODWB opens the export to robots or gives leave. Never read
// so far: its fixture is built from the format the legacy documents.
// Title, employer, towns, dates, contract and the Forem's own occupation; no ISCO code and no
// advert text, so the title decides, read in French and Dutch.
export const EXPORT_FIELDS = [
  "numerooffreforem",
  "titreoffre",
  "nomemployeur",
  "lieuxtravaillocalite",
  "datedebutdiffusion",
  "datefindiffusion",
  "url",
  "metier",
  "typecontrat",
  "regimetravail",
  "languescodeiso2",
];
// The dataset keeps a few hundred offers that closed: the adapter leaves them out by their last
// day (the legacy asked the server to).
export const EXPORT = `https://www.odwb.be/api/explore/v2.1/catalog/datasets/offres-d-emploi-forem/exports/json?select=${EXPORT_FIELDS.join(",")}`;

// The languages an offer asks, as codes (66 % of the open offers, 1 November 2026).
const LANGUAGES = new Set(["fr", "nl", "en", "de", "es", "it", "pt", "pl"]);

interface Offer {
  readonly url?: string;
  readonly titreoffre?: string;
  readonly lieuxtravaillocalite?: string | readonly string[];
  readonly numerooffreforem?: string | number;
  readonly nomemployeur?: string;
  readonly metier?: string;
  readonly typecontrat?: string;
  readonly regimetravail?: string;
  readonly datedebutdiffusion?: string;
  readonly datefindiffusion?: string;
  readonly languescodeiso2?: string | readonly string[];
}

const list = (value: string | readonly string[] | undefined): string[] =>
  typeof value === "string" ? [value] : [...(value ?? [])];

export function parseForem(json: string): AdvertDraft[] {
  const offers: unknown = JSON.parse(json);
  return (Array.isArray(offers) ? (offers as (Offer | null)[]) : []).flatMap(
    (offer): AdvertDraft[] => {
      const title = plainText(offer?.titreoffre ?? "");
      const url = (offer?.url ?? "").trim();
      const sourceId = String(offer?.numerooffreforem ?? "").trim();
      if (!sourceId || !title || !url.startsWith("https://")) return [];
      const city = titleCase(
        plainText(list(offer?.lieuxtravaillocalite)[0] ?? ""),
      );
      const languages = [
        ...new Set(
          list(offer?.languescodeiso2)
            .map((code) => code.toLowerCase())
            .filter((code) => LANGUAGES.has(code)),
        ),
      ];
      // The occupation, the contract, the hours and the languages asked: the only words an offer
      // has besides its title.
      const facts = [
        offer?.metier,
        offer?.typecontrat,
        offer?.regimetravail,
        languages.length > 0 ? `Langues: ${languages.join(", ")}` : "",
      ]
        .map((fact) => plainText(fact ?? ""))
        .filter(Boolean)
        .join(" · ");
      const draft: AdvertDraft = {
        source: "forem",
        sourceId,
        title,
        company: plainText(offer?.nomemployeur ?? ""),
        location: [city, "Belgique"].filter(Boolean).join(", "),
        country: "be",
        city,
        remote: false,
        url,
        description: facts,
        occupationCodes: {},
        // The offers are Le Forem's: French unless the title says otherwise (the processor reads
        // both languages).
        language: "fr",
      };
      const posted = parseDay(offer?.datedebutdiffusion);
      const expires = parseDay(offer?.datefindiffusion);
      if (posted) draft.posted = posted;
      if (expires) draft.expires = expires;
      return [draft];
    },
  );
}

async function* readForem(context: AdapterContext): AsyncIterable<AdvertDraft> {
  const open = parseForem((await context.http.request(EXPORT)).body).filter(
    (draft) => !draft.expires || draft.expires >= context.today,
  );
  context.log(`${open.length} open offers`);
  yield* open;
}

export const forem = publicFeed({
  definition: {
    id: "forem",
    kind: "feed",
    licence: {
      name: "Le Forem, offres d'emploi (ODWB)",
      short: "Le Forem",
      url: "https://www.odwb.be/explore/dataset/offres-d-emploi-forem/",
      licence: "CC BY-SA 4.0",
      credit: "Source : Le Forem, Open Data Wallonie-Bruxelles",
    },
    needsCredentials: false,
    credentialVariables: [],
    disabledReason:
      "its export sits under /api/, which ODWB's robots.txt closes to every robot; enable it only once ODWB opens the export or gives leave",
  },
  read: readForem,
});
