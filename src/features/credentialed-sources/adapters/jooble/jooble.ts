import { z } from "@hono/zod-openapi";
import { publicFeed } from "../../../crawl-core/feed-family.js";
import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { HttpFailure } from "../../../../shared/http/http-failure.js";
import { pageText } from "../../../../shared/kit/text.js";

// Jooble, through the API it gives partner sites for free (jooble.org/api/about): the aggregator's adverts, each
// linking to Jooble's page, as its programme asks. An intermediary, so the site shows these in their own section,
// after the employers' own adverts. Once a day (its cadence), a few searches per country (the words for engineer,
// technician and developer in the country's language) are asked for, newest first, within a budget of calls; what
// came earlier is kept for thirty days from its day (the feed family's `keepUnlisted`). Keys: JOOBLE_KEY for one
// key, or JOOBLE_KEYS="es=KEY1,de=KEY2" when Jooble gives one per country. The legacy's builder/adapters/jooble.ts.

const API = "https://jooble.org/api/";

// The countries asked for, the name Jooble's location field takes and the language of the words.
export const COUNTRIES: Readonly<Record<string, readonly [string, string]>> = {
  es: ["Spain", "es"],
  pt: ["Portugal", "pt"],
  fr: ["France", "fr"],
  be: ["Belgium", "fr"],
  de: ["Germany", "de"],
  at: ["Austria", "de"],
  ch: ["Switzerland", "de"],
  it: ["Italy", "it"],
  nl: ["Netherlands", "nl"],
  pl: ["Poland", "pl"],
  cz: ["Czech Republic", "cs"],
  gb: ["United Kingdom", "en"],
  ie: ["Ireland", "en"],
  se: ["Sweden", "sv"],
  no: ["Norway", "no"],
  dk: ["Denmark", "da"],
  fi: ["Finland", "en"],
  hu: ["Hungary", "en"],
  ro: ["Romania", "en"],
  gr: ["Greece", "en"],
};
export const WORDS: Readonly<Record<string, readonly string[]>> = {
  es: ["ingeniero", "técnico", "desarrollador"],
  pt: ["engenheiro", "técnico", "programador"],
  fr: ["ingénieur", "technicien", "développeur"],
  de: ["ingenieur", "techniker", "entwickler"],
  it: ["ingegnere", "tecnico", "sviluppatore"],
  nl: ["ingenieur", "technicus", "developer"],
  pl: ["inżynier", "technik", "programista"],
  cs: ["inženýr", "technik", "vývojář"],
  sv: ["ingenjör", "tekniker", "utvecklare"],
  no: ["ingeniør", "tekniker", "utvikler"],
  da: ["ingeniør", "tekniker", "udvikler"],
  en: ["engineer", "technician", "developer"],
};
const PAGES = 2;
const FULL_PAGE = 20;
export const CALLS_A_DAY = 200;
// An intermediary never says when an advert closes: one older than a month is taken as closed (the legacy's FUE-17).
const KEEP_DAYS = 30;

export interface JoobleKeys {
  readonly one: string;
  readonly perCountry: Readonly<Record<string, string>>;
}

// The key for each country: its own, else the one key.
export function keysOf(
  credentials: Readonly<Record<string, string>>,
): JoobleKeys {
  const perCountry = Object.fromEntries(
    (credentials["JOOBLE_KEYS"] ?? "")
      .split(",")
      .map((pair) => pair.trim().split("="))
      .filter(
        (pair): pair is [string, string] =>
          pair.length === 2 && Boolean(pair[0]) && Boolean(pair[1]),
      ),
  );
  return { one: credentials["JOOBLE_KEY"] ?? "", perCountry };
}

interface Job {
  readonly id?: string | number;
  readonly link?: string;
  readonly title?: string;
  readonly company?: string;
  readonly location?: string;
  readonly snippet?: string;
  readonly updated?: string;
}

export function toDraft(job: Job, country: string): AdvertDraft {
  return {
    source: "jooble",
    sourceId: String(job.id || job.link || ""),
    title: (job.title ?? "").trim(),
    company: (job.company ?? "").trim(),
    location: job.location ?? "",
    country,
    city: "",
    remote: false,
    url: job.link ?? "",
    description: pageText(job.snippet ?? ""),
    posted: (job.updated ?? "").slice(0, 10),
    occupationCodes: {},
    language: COUNTRIES[country]?.[1] ?? "en",
  };
}

// The jobs of an answer, each id as its text: Jooble's ids are 19-digit numbers, past what a JavaScript number holds
// exactly, so read as numbers two adverts could share one (the legacy's `String(j.id)` did).
export function parseJobs(body: string): readonly Job[] {
  const answer = JSON.parse(
    body,
    (key, value: unknown, context?: { source?: string }) =>
      key === "id" && typeof value === "number" && context?.source
        ? context.source
        : value,
  ) as { jobs?: Job[] } | null;
  return answer?.jobs ?? [];
}

// The calls made on a day, so a second pass of the same day spends only what is left.
const JoobleMemory = z.object({ day: z.string(), calls: z.number() });

async function* read(context: AdapterContext): AsyncIterable<AdvertDraft> {
  const keys = keysOf(context.credentials);
  const memory = JoobleMemory.safeParse(context.memory);
  let calls =
    memory.success && memory.data.day === context.today ? memory.data.calls : 0;
  const oldest = new Date(
    Date.parse(`${context.today}T00:00:00Z`) - KEEP_DAYS * 86_400_000,
  )
    .toISOString()
    .slice(0, 10);
  const found = new Map<string, AdvertDraft>();
  let limited = false;
  outer: for (const [country, [place, language]] of Object.entries(COUNTRIES)) {
    const key = keys.perCountry[country] || keys.one;
    if (!key) continue;
    for (const word of WORDS[language] ?? WORDS["en"] ?? []) {
      for (let page = 1; page <= PAGES; page++) {
        if (calls >= CALLS_A_DAY) break outer;
        calls++;
        let jobs: readonly Job[];
        try {
          const answer = await context.http.request(
            `${API}${encodeURIComponent(key)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ keywords: word, location: place, page }),
            },
          );
          jobs = parseJobs(answer.body);
        } catch (error) {
          if (error instanceof HttpFailure && error.kind === "rate-limited") {
            limited = true;
            break outer;
          }
          // The address carries the key: only what failed is logged.
          context.log(
            `${country} ${word} p${page}: ${error instanceof HttpFailure ? `${error.kind}${error.status ? ` (HTTP ${error.status})` : ""}` : "not JSON"}`,
          );
          break;
        }
        for (const job of jobs) {
          const draft = toDraft(job, country);
          if (draft.url && draft.title && (draft.posted ?? "") >= oldest)
            found.set(draft.sourceId, draft);
        }
        if (jobs.length < FULL_PAGE) break;
      }
    }
  }
  context.remember({ day: context.today, calls });
  context.log(
    `${calls} calls today, ${found.size} adverts${limited ? " (rate-limited, the rest waits)" : ""}`,
  );
  yield* found.values();
}

export const jooble = publicFeed({
  definition: {
    id: "jooble",
    kind: "via",
    licence: {
      name: "Jooble",
      short: "Jooble",
      url: "https://jooble.org/api/about",
      licence:
        "Jooble's partner API: its adverts, each linking to Jooble's page for the advert",
      credit: "via Jooble",
    },
    needsCredentials: true,
    credentialVariables: [["JOOBLE_KEY", "JOOBLE_KEYS"]],
  },
  keepUnlisted: true,
  read,
});
