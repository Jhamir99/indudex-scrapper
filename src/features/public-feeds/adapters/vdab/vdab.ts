import { z } from "@hono/zod-openapi";
import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { parseDay } from "../../../../shared/kit/dates.js";
import { pageText, plainText, titleCase } from "../../../../shared/kit/text.js";
import { withoutContacts } from "../../contacts.js";
import {
  type DetailPages,
  publicFeed,
  withDetailPages,
} from "../../../crawl-core/feed-family.js";
import { stated } from "../../stated.js";

// Flanders: every vacancy VDAB, its public employment service, shows (its own, the agencies' and
// its partners'), read through the search its own site makes (/rest/vindeenjob/v4, with the key
// its page sends every visitor). Its disclaimer names no bots and asks no leave, and robots.txt
// leaves /rest/ open. A search answers at most 200 pages of 100: each of our job domains is cut
// by working time, then by education level, then by experience, until every part fits. A vacancy
// brings its title, employer, town and first day; its own record (text, the profile it asks, what
// it offers) is asked once and kept, 3,000 a pass. The whole search is read once a day; the passes
// between only ask records and close nothing. One gone from a whole pass is closed.
const SEARCH = "https://www.vdab.be/rest/vindeenjob/v4/vacatureLight/zoek";
const RECORD = (id: string) =>
  `https://www.vdab.be/rest/vindeenjob/v4/vacatures/${encodeURIComponent(id)}`;
// The key VDAB's own page sends every visitor to these calls.
const KEY = "b277002f-e1fa-4fc5-868a-fdab633c3851";
const HEADERS = { accept: "application/json", "vej-key-monitor": KEY };
const PAGE = 100;
// 200 pages of 100, less a margin for vacancies added while reading.
export const MOST = 19_900;
// Records asked a pass, at the host's pace (config/crawl.yml): the legacy asked 3,000 a day.
export const RECORDS_A_PASS = 3000;

// The job domains our occupations fall in: technique, construction, ICT, production, research
// and development, maintenance.
export const DOMAINS = [
  "JOBCAT22",
  "JOBCAT03",
  "JOBCAT10",
  "JOBCAT21",
  "JOBCAT20",
  "JOBCAT17",
];
// A domain is read by working time first: the search's filter gives every vacancy's hours, which
// the light results leave out.
export const WORKING_TIMES: readonly (readonly [string, string])[] = [
  ["V", "voltijds"],
  ["D", "deeltijds"],
];
export type Criteria = Record<string, string[]>;
type Cut = readonly [string, readonly string[]];
// How a search too big is cut: by education, then by experience (every vacancy has both).
export const CUTS: readonly Cut[] = [
  ["diplomaCodes", ["A", "B", "C", "D", "E", "F"]],
  ["ervaringCodes", ["0", "1", "2", "3", "4"]],
];

interface Listed {
  readonly id?: { readonly id?: string | number };
  readonly vacaturefunctie?: {
    readonly naam?: string;
    readonly arbeidscircuitLijn?: string;
  };
  readonly gesloten?: boolean;
  readonly tewerkstellingsLocatieRegioOfAdres?: string;
  readonly vacatureBedrijfsnaam?: string;
  readonly tijdsregeling?: readonly string[];
  readonly ervaring?: string;
  readonly eerstePublicatieDatum?: string;
}

interface Html {
  readonly html?: string;
}
interface Record_ {
  readonly functie?: { readonly omschrijving?: Html };
  readonly profiel?: {
    readonly vereisteKwalificaties?: Html;
    readonly aanbod?: { readonly aanbodEnVoordelen?: Html };
  };
}

// The experience a vacancy asks, in its own field: «Minstens 2 jaar ervaring». «Beperkte ervaring
// ( < 2 jaar )» is less than two years and «Geen ervaring» none: no years (read as two in 35,375 of
// 122,188 vacancies by an earlier reader, 1 November 2026).
export const yearsOf = (experience: string | undefined): number =>
  Number(/\bminstens\s+(\d{1,2})\s+jaar/i.exec(experience ?? "")?.[1]) || 0;

// A page of the search's results. `hours` is the working time of the search that brought it.
// The first line of the text holds what the list says (kind of job, working time, experience);
// the record's text follows after a line break.
export function parseVdab(
  json: string,
  hours = "",
): { readonly size: number; readonly drafts: AdvertDraft[] } {
  const results =
    (JSON.parse(json) as { resultaten?: (Listed | null)[] } | null)
      ?.resultaten ?? [];
  // `size` counts every result, closed vacancies included: a page of fewer than PAGE is the last.
  const drafts = results.flatMap((vacancy): AdvertDraft[] => {
    const sourceId = vacancy?.id?.id;
    const title = plainText(vacancy?.vacaturefunctie?.naam ?? "");
    if (!sourceId || !title || vacancy.gesloten) return [];
    const city = titleCase(
      plainText(vacancy.tewerkstellingsLocatieRegioOfAdres ?? ""),
    );
    const facts: string[] = [];
    for (const fact of [
      vacancy.vacaturefunctie?.arbeidscircuitLijn,
      ...(vacancy.tijdsregeling ?? []),
      hours,
      vacancy.ervaring,
    ]) {
      const text = plainText(fact ?? "");
      if (text && !facts.some((f) => f.toLowerCase() === text.toLowerCase()))
        facts.push(text);
    }
    const draft: AdvertDraft = {
      source: "vdab",
      sourceId: String(sourceId),
      title,
      company: plainText(vacancy.vacatureBedrijfsnaam ?? ""),
      location: [city, "België"].filter(Boolean).join(", "),
      country: "be",
      city,
      remote: false,
      url: `https://www.vdab.be/vindeenjob/vacatures/${sourceId}`,
      description: facts.join(" · "),
      occupationCodes: {},
      language: "nl",
      // The kind of job («Vast», «Interim», «Tijdelijk»), the search's working time and the
      // experience the vacancy's own field asks.
      ...stated({
        contract: plainText(vacancy.vacaturefunctie?.arbeidscircuitLijn ?? ""),
        hours,
        ...(yearsOf(vacancy.ervaring) > 0
          ? { years: yearsOf(vacancy.ervaring) }
          : {}),
      }),
    };
    const posted = parseDay(vacancy.eerstePublicatieDatum);
    if (posted) draft.posted = posted;
    return [draft];
  });
  return { size: results.length, drafts };
}

// The searches that cover one domain, each under the cap: the domain whole if it fits, else cut
// by the next criterion, and so on.
export async function plan(
  criteria: Criteria,
  count: (criteria: Criteria) => Promise<number>,
  cuts: readonly Cut[] = CUTS,
): Promise<{ criteria: Criteria; n: number }[]> {
  const n = await count(criteria);
  const [cut, ...rest] = cuts;
  if (n <= MOST || !cut) return [{ criteria, n }];
  const parts: { criteria: Criteria; n: number }[] = [];
  for (const value of cut[1])
    parts.push(
      ...(await plan({ ...criteria, [cut[0]]: [value] }, count, rest)),
    );
  return parts;
}

// A vacancy's own record: the text, the profile it asks («Gezocht profiel») and what it offers,
// which the search leaves out. The contact person, e-mail and phone it names are never read.
export function withRecord(draft: AdvertDraft, json: string): AdvertDraft {
  const record = JSON.parse(json) as Record_ | null;
  const body = [
    record?.functie?.omschrijving?.html,
    record?.profiel?.vereisteKwalificaties?.html,
    record?.profiel?.aanbod?.aanbodEnVoordelen?.html,
  ]
    .map((html) => withoutContacts(pageText(html ?? "")))
    .filter(Boolean)
    .join("\n");
  return body
    ? { ...draft, description: `${draft.description}\n${body}` }
    : draft;
}

// The text an earlier pass read, after the line the list gives. Between whole passes the listed
// advert is the stored one, text and all: only its first line is the list's.
function withKnown(draft: AdvertDraft, known: AdvertDraft): AdvertDraft {
  const body = known.description.slice(known.description.indexOf("\n") + 1);
  return {
    ...draft,
    description: `${draft.description.split("\n")[0]}\n${body}`,
  };
}

const RECORDS: DetailPages = {
  most: RECORDS_A_PASS,
  address: (draft) => RECORD(draft.sourceId),
  request: { headers: HEADERS },
  read: withRecord,
  keep: withKnown,
  // The list's line has no line break: a text after one is a record read.
  wasRead: (known) => known.description.includes("\n"),
};

// The day of the last whole search: it is read once a day.
const Memory = z.strictObject({ wholePassDay: z.iso.date() });

async function* read(context: AdapterContext): AsyncIterable<AdvertDraft> {
  const memory = Memory.safeParse(context.memory);
  if (
    context.previous.length > 0 &&
    memory.success &&
    memory.data.wholePassDay === context.today
  ) {
    // Between whole passes: only the records of the vacancies kept. Nothing is closed (what
    // closed waits for the next whole pass) and nothing new is found.
    yield* withDetailPages(context.previous, context, RECORDS);
    return;
  }

  const search = async (criteria: Criteria, page: number, size: number) =>
    (
      await context.http.request(SEARCH, {
        method: "POST",
        headers: { ...HEADERS, "content-type": "application/json" },
        body: JSON.stringify({
          criteria,
          pagina: page,
          zoekmodus: "C2",
          paginaGrootte: size,
        }),
      })
    ).body;
  const count = async (criteria: Criteria) =>
    (
      JSON.parse(await search(criteria, 0, 1)) as {
        totaalAantal?: number;
      } | null
    )?.totaalAantal ?? 0;

  const listed = new Map<string, AdvertDraft>();
  for (const domain of DOMAINS) {
    for (const [code, hours] of WORKING_TIMES) {
      const parts = await plan(
        { jobdomeinCodes: [domain], arbeidsduurCodes: [code] },
        count,
      );
      for (const { criteria, n } of parts) {
        for (let page = 0; page * PAGE < Math.min(n, MOST + PAGE); page++) {
          const { size, drafts } = parseVdab(
            await search(criteria, page, PAGE),
            hours,
          );
          for (const draft of drafts) listed.set(draft.sourceId, draft);
          if (size < PAGE) break;
        }
      }
    }
  }
  if (listed.size === 0) throw new Error("the search answered nothing");
  context.remember({ wholePassDay: context.today });
  context.log(`${listed.size} vacancies in ${DOMAINS.length} domains`);
  yield* withDetailPages(listed.values(), context, RECORDS);
}

export const vdab = publicFeed({
  definition: {
    id: "vdab",
    kind: "feed",
    licence: {
      name: "VDAB, vacatures",
      short: "VDAB",
      url: "https://www.vdab.be/vindeenjob/vacatures",
      licence: "Read as its own site shows them; each vacancy links to VDAB",
      credit: "Bron: VDAB",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  read,
});
