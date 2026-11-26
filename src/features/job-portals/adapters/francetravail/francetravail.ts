import { z } from "@hono/zod-openapi";
import { publicFeed } from "../../../crawl-core/feed-family.js";
import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { HttpFailure } from "../../../../shared/http/http-failure.js";
import { statedPay } from "../../../../shared/kit/stated-pay.js";
import { DESCRIPTION_LIMIT } from "../../../../shared/schemas/advert.js";

// France: the offers of France Travail's public site, read as search engines read it (job portals FR-7; the legacy's
// builder/adapters/francetravail.ts). Its terms say its offers «pourront être réutilisées pour tout usage et notamment
// être rediffusées sur des sites tiers» and its other content is open under the Licence Ouverte; its robots.txt lets in
// each listing's first page. Its sitemaps name a listing per occupation and département, and one per occupation and city;
// those of the site's occupations that are ours are read, a seventh of them each hour, so all of them in seven. A
// listing's first page holds up to twenty offers in its map's data. An offer gone from a listing that had room is closed;
// one that slid off a full listing stays a month from its day. Each offer's own data (the call its page makes, which
// robots.txt leaves open) gives the whole text, contract, hours, years and pay, asked once per offer and kept.
//
// The legacy kept `listing`, `full`, `seen` and `detailed` on its adverts; the store's adverts are strict, so they live
// in the source's memory, by offer.

const SITEMAPS = [
  "https://candidat.francetravail.fr/rechercheoffre/sitemap/croisements-metiers-departements.xml",
  "https://candidat.francetravail.fr/rechercheoffre/sitemap/croisements-metiers-villes.xml",
];
export const SLICES = 7;
const FULL = 20;
const UNDATED_OPEN_DAYS = 30;
const DEADLINE_MS = 45 * 60_000;
export const DETAILS_A_PASS = 3000;
const DAY_MS = 86_400_000;

// The site's own occupations among the sitemap's (code s<sector>m<occupation>): those whose names the gate places in
// ours (9 October 2026), the skilled trades among them; caviste and sommelier (wine) left out by hand.
export const METIERS = new Set(
  "s2m1 s2m3 s2m4 s2m6 s2m7 s5m6 s6m2 s7m1 s7m3 s7m8 s8m15 s9m2 s9m3 s9m26 s13m2 s13m6 s13m14 s15m2 s18m3 s18m7 s18m8 s18m9 s18m13 s19m2 s19m3 s19m5 s19m7 s19m10 s21m4 s21m5 s21m6 s25m12 s26m1 s26m4 s26m6 s26m8 s27m2 s27m3 s27m7 s27m23 s28m7 s28m8 s28m15 s28m18 s29m2 s29m3 s29m7 s31m14 s31m27 s33m1 s33m2 s33m8 s33m19 s35m9 s39m10".split(
    " ",
  ),
);

const listingCode = (url: string) => /\/(s\d+m\d+)[dv]\d/.exec(url)?.[1] ?? "";

// The listings of ours a sitemap names; this hour's slice is every seventh, by the hour.
export function listingsOf(xml: string, metiers = METIERS): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => (match[1] ?? "").trim())
    .filter((url) => metiers.has(listingCode(url)));
}
export const sliceOf = (
  urls: readonly string[],
  hour: number,
  slices = SLICES,
) => urls.filter((_, i) => i % slices === hour % slices);

// The array the listing's map is drawn from, read whole by its brackets.
export function mapOf(page: string): unknown[] {
  const at = page.indexOf("geoloc/map-render:renderMap");
  const start = at < 0 ? -1 : page.indexOf("[{", at);
  if (start < 0) return [];
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let k = start; k < page.length; k++) {
    const c = page[k];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "[" || c === "{") depth++;
    else if (c === "]" || c === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(page.slice(start, k + 1)) as unknown[];
        } catch {
          return [];
        }
      }
    }
  }
  return [];
}

const plain = (s: unknown) =>
  String(s ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
const dayBefore = (days: number, today: string) =>
  new Date(Date.parse(`${today}T00:00:00Z`) - days * DAY_MS)
    .toISOString()
    .slice(0, 10);

// "Publié il y a 23 jours", "Publié hier", "Publié aujourd'hui": the day it was posted; «il y a plus de 30 jours», the
// oldest, read as its 30 days at least.
export function postedOn(text: string, today: string): string | undefined {
  const t = text.toLowerCase();
  const days = /aujourd/.test(t)
    ? 0
    : /hier/.test(t)
      ? 1
      : Number(/il y a (?:plus de )?(\d+) jour/.exec(t)?.[1]);
  return Number.isFinite(days) ? dayBefore(days, today) : undefined;
}

// "69 - Lyon 1er Arrondissement Voir l'itinéraire": the town, without its département and district.
export const townOf = (address: unknown) =>
  plain(plain(address).replace(/Voir l.itinéraire/i, ""))
    .replace(/^\d[\dAB]?\d?\s*-\s*/, "")
    .replace(/\s+\d+(er|e|ème)?(\s+arrondissement)?$/i, "")
    .trim();

interface Content {
  readonly id?: string | number;
  readonly title?: string;
  readonly address?: string;
  readonly subtitle?: string;
  readonly description?: string;
  readonly contract?: string;
  readonly subdescription?: string;
}

export interface Listed {
  readonly draft: AdvertDraft;
  readonly listing: string;
  readonly full: boolean;
}

export function parseListing(
  html: string,
  listing: string,
  today: string,
): Listed[] {
  const items = mapOf(html)
    .map((item) => (item as { content?: Content } | null)?.content)
    .filter((content): content is Content =>
      Boolean(content?.id && content.title),
    );
  return items.map((content) => {
    const town = townOf(content.address);
    const city =
      town && !/^[A-ZÀ-Ü' -]+$/.test(town)
        ? town
        : town
            .toLowerCase()
            .replace(
              /(^|[\s'-])(\p{L})/gu,
              (_, a: string, b: string) => a + b.toUpperCase(),
            );
    const posted = postedOn(String(content.subdescription ?? ""), today);
    return {
      draft: {
        source: "francetravail",
        sourceId: String(content.id),
        title: plain(content.title),
        company: plain(content.subtitle).replace(/\s*-\s*$/, ""),
        location: [city, "France"].filter(Boolean).join(", "),
        country: "fr",
        city,
        remote: false,
        url: `https://candidat.francetravail.fr/offres/recherche/detail/${content.id}`,
        description: [plain(content.description), plain(content.contract)]
          .filter(Boolean)
          .join(" · "),
        ...(posted ? { posted } : {}),
        occupationCodes: {},
        language: "fr",
      },
      listing,
      full: items.length >= FULL,
    };
  });
}

// Each offer's own data: the whole text, the contract with its months («CDD - 6 Mois»), the weekly hours («35H/semaine»:
// France's full time is 35), the years when the experience is required («3 An(s)»), the pay («Annuel de 29000.0 Euros
// à 45000.0 Euros»). The languages required are not kept: the store has no field for them (advert facts' decision).
const DETAIL = (id: string) =>
  `https://candidat.francetravail.fr/api-descriptifoffre/offre/${encodeURIComponent(id)}`;
const PERIOD: Record<string, string> = {
  annuel: "year",
  mensuel: "month",
  hebdomadaire: "week",
  horaire: "hour",
};
const text = (s: unknown) =>
  String(s ?? "")
    .replace(/<br\s*\/?>|<\/p>|<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
const euros = (s: string) => Number(s.replace(/\s/g, "").replace(",", "."));
interface Detail {
  readonly descriptif?: string;
  readonly qualification?: string;
  readonly syntheseContrat?: string;
  readonly syntheseHoraire?: string;
  readonly conditionTravailPoste?: {
    readonly listeLibelleTypeHoraire?: string[];
  };
  readonly experienceProfil?: {
    readonly experience?: string;
    readonly estUneExperienceIndispensable?: boolean;
  };
  readonly salaire?:
    string | { readonly libelle?: string; readonly libelleSalaire?: string };
}
type FromDetail = Partial<
  Pick<AdvertDraft, "description" | "contract" | "hours" | "years" | "pay">
>;
export function fromDetail(detail: Detail | null | undefined): FromDetail {
  const out: FromDetail = {};
  const body = [detail?.descriptif, detail?.qualification]
    .map(text)
    .filter(Boolean)
    .join("\n");
  if (body) out.description = body.slice(0, DESCRIPTION_LIMIT);
  const contract = String(detail?.syntheseContrat ?? "")
    .replace(/\s*-\s*Contrat travail\s*$/i, "")
    .replace(/\s*-\s*/g, " ");
  if (contract) out.contract = contract;
  const week = [
    detail?.syntheseHoraire,
    ...(detail?.conditionTravailPoste?.listeLibelleTypeHoraire ?? []),
  ]
    .map((hours) =>
      Number(
        /(\d{1,2}(?:[.,]\d+)?)\s*H\b/i
          .exec(String(hours ?? ""))?.[1]
          ?.replace(",", "."),
      ),
    )
    .find((n) => n > 0);
  if (week)
    out.hours =
      week >= 35 ? "temps plein" : `temps partiel ${Math.round(week)} heures`;
  const experience = detail?.experienceProfil;
  if (experience?.experience)
    out.years = experience.estUneExperienceIndispensable
      ? Number(/^(\d{1,2})\s*An/i.exec(String(experience.experience))?.[1]) || 0
      : 0;
  const salary =
    typeof detail?.salaire === "string"
      ? detail.salaire
      : (detail?.salaire?.libelle ?? detail?.salaire?.libelleSalaire ?? "");
  const pay =
    /^(Annuel|Mensuel|Hebdomadaire|Horaire)\s+de\s+([\d\s.,]+?)\s*Euros(?:\s+à\s+([\d\s.,]+?)\s*Euros)?/i.exec(
      salary,
    );
  if (pay) {
    const stated = statedPay({
      min: euros(pay[2] ?? ""),
      max: pay[3] ? euros(pay[3]) : euros(pay[2] ?? ""),
      currency: "EUR",
      period:
        PERIOD[
          (pay[1] ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
        ] ?? "",
    });
    if (stated) out.pay = stated;
  }
  return out;
}

// What the source remembers of each offer the store's adverts cannot carry.
const OfferMemory = z.object({
  listing: z.string(),
  full: z.boolean(),
  seen: z.string().optional(),
  detailed: z.boolean().optional(),
});
type OfferMemory = z.infer<typeof OfferMemory>;
const FranceTravailMemory = z.object({
  offers: z.record(z.string(), OfferMemory),
});

// This hour's offers and the earlier ones kept: an offer of a listing not read this hour stays (a month from its day, or
// from when it was first seen when it names none); of a listing read this hour, only one seen again, or one of a full
// listing posted within a month.
export function keptFrom(
  now: readonly Listed[],
  previous: readonly AdvertDraft[],
  remembered: Readonly<Record<string, OfferMemory>>,
  readNow: ReadonlySet<string>,
  today: string,
): Listed[] {
  const seen = new Set(now.map((listed) => listed.draft.sourceId));
  const oldest = dayBefore(UNDATED_OPEN_DAYS, today);
  const kept = previous.flatMap((draft): Listed[] => {
    const memory = remembered[draft.sourceId];
    if (!memory || seen.has(draft.sourceId)) return [];
    const day = draft.posted ?? memory.seen ?? today;
    const stays = !readNow.has(memory.listing)
      ? day >= oldest
      : memory.full && (draft.posted ?? "") >= oldest;
    return stays ? [{ draft, listing: memory.listing, full: memory.full }] : [];
  });
  return [...now, ...kept];
}

async function* read(context: AdapterContext): AsyncIterable<AdvertDraft> {
  const parsed = FranceTravailMemory.safeParse(context.memory);
  const remembered = parsed.success ? parsed.data.offers : {};
  const all: string[] = [];
  for (const sitemap of SITEMAPS)
    all.push(...listingsOf((await context.http.request(sitemap)).body));
  if (!all.length) throw new Error("the sitemaps named no listing of ours");
  const mine = sliceOf(all, new Date().getUTCHours());
  const until = Date.now() + DEADLINE_MS - 5 * 60_000;
  const now = new Map<string, Listed>();
  const readNow = new Set<string>();
  for (const url of mine) {
    if (Date.now() > until) break;
    try {
      for (const listed of parseListing(
        (await context.http.request(url)).body,
        url,
        context.today,
      ))
        now.set(listed.draft.sourceId, listed);
      readNow.add(url);
    } catch (error) {
      if (error instanceof HttpFailure && error.kind === "rate-limited") break;
      if (!(error instanceof HttpFailure && error.kind === "disallowed"))
        context.log(
          `${url.slice(45)}: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
  }
  if (!readNow.size) throw new Error("no listing answered");

  const previous = new Map(
    context.previous.map((draft) => [draft.sourceId, draft]),
  );
  const offers = keptFrom(
    [...now.values()],
    context.previous,
    remembered,
    readNow,
    context.today,
  );
  // What earlier passes asked of an offer's own data is carried; the rest is asked, the newest first, until the pass's
  // time or 3,000. An offer that answers 404 or 410 is marked asked: it is gone.
  const detailed = new Set(
    Object.entries(remembered)
      .filter(([, memory]) => memory.detailed)
      .map(([id]) => id),
  );
  const drafts = new Map<string, AdvertDraft>();
  for (const { draft } of offers) {
    const before = previous.get(draft.sourceId);
    drafts.set(
      draft.sourceId,
      detailed.has(draft.sourceId) && before
        ? {
            ...draft,
            description: before.description,
            ...(before.contract ? { contract: before.contract } : {}),
            ...(before.hours ? { hours: before.hours } : {}),
            ...(before.years !== undefined ? { years: before.years } : {}),
            ...(before.pay ? { pay: before.pay } : {}),
          }
        : draft,
    );
  }
  const todo = [...drafts.values()]
    .filter((draft) => !detailed.has(draft.sourceId))
    .toSorted((a, b) => (b.posted ?? "").localeCompare(a.posted ?? ""));
  let asked = 0;
  for (const draft of todo) {
    if (asked >= DETAILS_A_PASS || Date.now() > until + 4 * 60_000) break;
    asked++;
    try {
      const detail = JSON.parse(
        (await context.http.request(DETAIL(draft.sourceId))).body,
      ) as Detail;
      drafts.set(draft.sourceId, { ...draft, ...fromDetail(detail) });
      detailed.add(draft.sourceId);
    } catch (error) {
      if (!(error instanceof HttpFailure)) continue;
      if (error.status === 404 || error.status === 410)
        detailed.add(draft.sourceId);
      else if (error.kind === "rate-limited" || error.kind === "held") break;
    }
  }
  context.remember({
    offers: Object.fromEntries(
      offers.map(({ draft, listing, full }) => [
        draft.sourceId,
        {
          listing,
          full,
          ...(draft.posted
            ? {}
            : { seen: remembered[draft.sourceId]?.seen ?? context.today }),
          ...(detailed.has(draft.sourceId) ? { detailed: true } : {}),
        },
      ]),
    ),
  });
  context.log(
    `${readNow.size} of ${mine.length} listings read (${all.length} of ours), ${now.size} offers seen, ${offers.length} kept, ${asked} offers' own data asked`,
  );
  yield* drafts.values();
}

export const francetravail = publicFeed({
  definition: {
    id: "francetravail",
    kind: "feed",
    licence: {
      name: "France Travail, offres d’emploi",
      short: "France Travail",
      url: "https://candidat.francetravail.fr/offres/emploi",
      licence:
        "Licence Ouverte (Etalab); its terms allow its offers to be reused for any purpose and shown on other sites",
      credit: "Source : France Travail",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  read,
});
