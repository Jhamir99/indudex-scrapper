import { z } from "@hono/zod-openapi";
import { publicFeed } from "../../../crawl-core/feed-family.js";
import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { HttpFailure } from "../../../../shared/http/http-failure.js";
import { statedPay } from "../../../../shared/kit/stated-pay.js";

// Adzuna: the aggregator's public API (developer.adzuna.com), with a registered app_id and app_key. The newest adverts
// of each European country and category are asked for once a day (its cadence), sorted by date, within 200 calls a
// day and 2,400 a month counted in the source's memory; what came earlier is kept for thirty days from its day (the
// feed family's `keepUnlisted`). Adverts link to Adzuna's page for the advert: the tracking bounce is replaced by the
// details page, as Argus does. An intermediary: its adverts show in their own section, after the employers' own. The
// legacy's builder/adapters/adzuna.ts.
//
// Flagged off (credentialed sources FR-6, the operator's call of 2026-11-25): Adzuna's terms ask a licence agreement
// for any product that generates revenue (the site will carry ads), its free tier being for evaluation only; and
// api.adzuna.com's robots.txt closes the whole host to every bot. A key alone does not switch it on.

const API = "https://api.adzuna.com/v1/api/jobs";

// Adzuna's European countries, with the language its titles are read in.
export const COUNTRIES: Readonly<Record<string, string>> = {
  es: "es",
  de: "de",
  fr: "fr",
  nl: "nl",
  it: "it",
  at: "de",
  pl: "pl",
  be: "nl",
  ch: "de",
  gb: "en",
};
const CURRENCY: Readonly<Record<string, string>> = {
  gb: "GBP",
  pl: "PLN",
  ch: "CHF",
};
const CATEGORIES = ["engineering-jobs", "it-jobs"];
// Spain's skilled trades and site managers are advertised under maintenance, manufacturing and construction: of their
// month's 762 adverts on 17 October 2026, the legacy's gate kept 126 trades and 155 of the main occupations.
const MORE_CATEGORIES: Readonly<Record<string, readonly string[]>> = {
  es: ["maintenance-jobs", "manufacturing-jobs", "trade-construction-jobs"],
};
export const categoriesOf = (country: string): string[] => [
  ...CATEGORIES,
  ...(MORE_CATEGORIES[country] ?? []),
];
const PAGES = 2;
const PER_PAGE = 50;
const MAX_DAYS_OLD = 3;
// An intermediary never says when an advert closes: one older than a month is taken as closed (the legacy's FUE-17).
const KEEP_DAYS = 30;
export const CALLS_A_DAY = 200;
export const CALLS_A_MONTH = 2400;
const FILL_PAGES = 20;
// Spain, where the site had the fewest offers of its size, is read deeper: four pages a day of the newest, and the
// whole month's stock while fewer than a thousand of its adverts are kept. Germany, the biggest gap, ten pages a day;
// Austria, the Netherlands and France four.
const PAGES_OF: Readonly<Record<string, number>> = {
  es: 4,
  de: 10,
  at: 4,
  nl: 4,
  fr: 4,
};
const DEEP_PAGES: Readonly<Record<string, number>> = { es: 120 };
const DEEP_BELOW = 1000;

// The advert's own page on Adzuna, from the id and the country's domain.
export function detailsUrl(redirectUrl: string, id: string): string {
  const match = /^(https?:\/\/[^/]*adzuna\.[a-z.]+)\//.exec(redirectUrl);
  return match && id ? `${match[1]}/details/${id}` : redirectUrl;
}

interface Ad {
  readonly id?: string | number;
  readonly title?: string;
  readonly company?: { readonly display_name?: string };
  readonly location?: {
    readonly display_name?: string;
    readonly area?: unknown;
  };
  readonly redirect_url?: string;
  readonly description?: string;
  readonly created?: string;
  readonly contract_type?: string;
  readonly contract_time?: string;
  readonly salary_is_predicted?: string | number;
  readonly salary_min?: number;
  readonly salary_max?: number;
}

export function toDraft(ad: Ad, country: string): AdvertDraft {
  const area = Array.isArray(ad.location?.area)
    ? (ad.location.area as unknown[])
    : [];
  const id = String(ad.id ?? "");
  // "permanent" or "contract" (read as not permanent by advert-facts), "full_time" or "part_time".
  const contract = (ad.contract_type ?? "").trim();
  const hours = (ad.contract_time ?? "").trim();
  // The pay the employer gave, never Adzuna's estimate (`salary_is_predicted` "1"); its period is not said, so the pay
  // reader decides it by each country's law.
  const pay =
    String(ad.salary_is_predicted) === "0" && Number(ad.salary_min) > 0
      ? statedPay({
          min: Number(ad.salary_min),
          max: Number(ad.salary_max) || Number(ad.salary_min),
          currency: CURRENCY[country] ?? "EUR",
        })
      : undefined;
  return {
    source: "adzuna",
    sourceId: id,
    title: (ad.title ?? "").trim(),
    company: (ad.company?.display_name ?? "").trim(),
    location: ad.location?.display_name ?? "",
    country,
    city: area.length > 1 ? String(area.at(-1)) : "",
    remote: false,
    url: detailsUrl(ad.redirect_url ?? "", id),
    description: ad.description ?? "",
    posted: (ad.created ?? "").slice(0, 10),
    occupationCodes: {},
    language: COUNTRIES[country] ?? "en",
    ...(contract ? { contract } : {}),
    ...(hours ? { hours } : {}),
    ...(pay ? { pay } : {}),
  };
}

// What a pass keeps between days: the day's calls, the month's, and the categories read whole.
const AdzunaMemory = z.object({
  day: z.string(),
  calls: z.number(),
  month: z.string(),
  monthCalls: z.number(),
  filled: z.record(z.string(), z.string()),
});
type AdzunaMemory = z.infer<typeof AdzunaMemory>;

// How a country's category is read today: pages, and days back. A category new to a country (engineering and IT were
// read from the start) is read once for its whole month, as Spain's deep read is, until a read of it ends without
// failing (`filled`).
export function planOf(
  country: string,
  category: string,
  filled: Readonly<Record<string, string>>,
  deep: boolean,
): { fill: boolean; pages: number; days: number } {
  const fill =
    !CATEGORIES.includes(category) && !filled[`${country}/${category}`];
  return {
    fill,
    pages: deep
      ? (DEEP_PAGES[country] ?? PAGES)
      : fill
        ? FILL_PAGES
        : (PAGES_OF[country] ?? PAGES),
    days: deep || fill ? KEEP_DAYS : MAX_DAYS_OLD,
  };
}

async function* read(context: AdapterContext): AsyncIterable<AdvertDraft> {
  const today = context.today;
  const month = today.slice(0, 7);
  const parsed = AdzunaMemory.safeParse(context.memory);
  const memory: AdzunaMemory = parsed.success
    ? parsed.data
    : { day: today, calls: 0, month, monthCalls: 0, filled: {} };
  let calls = memory.day === today ? memory.calls : 0;
  let monthCalls = memory.month === month ? memory.monthCalls : 0;
  const filled = { ...memory.filled };
  const oldest = new Date(
    Date.parse(`${today}T00:00:00Z`) - KEEP_DAYS * 86_400_000,
  )
    .toISOString()
    .slice(0, 10);
  const found = new Map<string, AdvertDraft>();
  let limited = false;
  outer: for (const country of Object.keys(COUNTRIES)) {
    const kept = context.previous.filter(
      (draft) => draft.country === country,
    ).length;
    const deep = Boolean(DEEP_PAGES[country]) && kept < DEEP_BELOW;
    for (const category of categoriesOf(country)) {
      const plan = planOf(country, category, filled, deep);
      let failed = false;
      for (let page = 1; page <= plan.pages; page++) {
        if (calls >= CALLS_A_DAY || monthCalls >= CALLS_A_MONTH) break outer;
        calls++;
        monthCalls++;
        const query = new URLSearchParams({
          app_id: context.credentials["ADZUNA_APP_ID"] ?? "",
          app_key: context.credentials["ADZUNA_APP_KEY"] ?? "",
          results_per_page: String(PER_PAGE),
          max_days_old: String(plan.days),
          sort_by: "date",
          category,
          "content-type": "application/json",
        });
        let results: readonly Ad[];
        try {
          const answer = await context.http.request(
            `${API}/${country}/search/${page}?${query}`,
          );
          results =
            (JSON.parse(answer.body) as { results?: Ad[] }).results ?? [];
        } catch (error) {
          if (error instanceof HttpFailure && error.kind === "rate-limited") {
            limited = true;
            break outer;
          }
          // The address carries the keys: only what failed is logged.
          context.log(
            `${country} ${category} p${page}: ${error instanceof HttpFailure ? `${error.kind}${error.status ? ` (HTTP ${error.status})` : ""}` : "not JSON"}`,
          );
          failed = true;
          break;
        }
        for (const ad of results) {
          const draft = toDraft(ad, country);
          if (draft.url && draft.title && (draft.posted ?? "") >= oldest)
            found.set(draft.sourceId, draft);
        }
        if (results.length < PER_PAGE) break;
      }
      if (plan.fill && !failed) filled[`${country}/${category}`] = today;
    }
  }
  context.remember({ day: today, calls, month, monthCalls, filled });
  context.log(
    `${calls} calls today, ${monthCalls} this month, ${found.size} adverts${limited ? " (rate-limited, the rest waits)" : ""}`,
  );
  yield* found.values();
}

export const adzuna = publicFeed({
  definition: {
    id: "adzuna",
    kind: "via",
    licence: {
      name: "Adzuna",
      short: "Adzuna",
      url: "https://developer.adzuna.com/docs/terms_of_service",
      licence:
        'Adzuna API terms: publishing its ad listings, each labelled "Jobs by Adzuna"',
      credit: "Jobs by Adzuna",
    },
    needsCredentials: true,
    credentialVariables: ["ADZUNA_APP_ID", "ADZUNA_APP_KEY"],
    disabledReason:
      "Adzuna's terms ask a licence agreement for a site that earns money (its free tier is for evaluation: https://developer.adzuna.com/docs/terms_of_service), and api.adzuna.com's robots.txt closes the whole host to every bot (2026-11-25); off until an agreement gives leave to read it",
  },
  keepUnlisted: true,
  read,
});
