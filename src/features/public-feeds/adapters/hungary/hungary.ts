import { z } from "@hono/zod-openapi";
import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { plainText } from "../../../../shared/kit/text.js";
import { publicFeed } from "../../family.js";

// Hungary: the National Employment Service's vacancies on its Virtual Labour Market Portal
// (vmp.munka.hu), through its public search: our categories, each split by region when the
// portal finds too many to list. Each vacancy is named by its FEOR occupation; the employer shows
// only after signing in and is not read. No robots.txt (404) and no terms of use. Its firewall
// refuses a line for an hour or two after about a dozen requests, even a minute apart: each pass
// reads one category, at most eight requests a minute apart (pace.hosts), and keeps what the
// other categories gave on their last turn. Which category is next and which adverts each gave
// live in the source's memory (public-feeds plan section 5, T023).
const BASE = "https://vmp.munka.hu";
// Technical / engineering, construction, IT, energy / electricity, skilled and manual work,
// production / manufacturing / transport.
export const CATEGORIES = ["19", "9", "13", "8", "22", "24"] as const;
const REGIONS = [
  "Közép-Magyarország",
  "Közép-Dunántúl",
  "Nyugat-Dunántúl",
  "Dél-Dunántúl",
  "Észak-Magyarország",
  "Észak-Alföld",
  "Dél-Alföld",
];
// The most a pass asks, below the dozen its firewall counts: empty categories spend it too.
export const MOST_REQUESTS = 8;

export const searchUrl = (category: string, region = "") =>
  `${BASE}/allas/talalatok?${new URLSearchParams({ kulcsszo: "", tipus: "allas", helyseg: region, kategoria: category })}`;

// What a pass leaves for the next: the category it read last, and the adverts each category gave
// on its last turn.
export const HungaryMemory = z.object({
  last: z.string(),
  categories: z.record(z.string(), z.array(z.string())),
});
export type HungaryMemory = z.infer<typeof HungaryMemory>;

export interface ResultPage {
  readonly drafts: AdvertDraft[];
  // "Találatok listája (26 találat)".
  readonly found: number;
  // "A lista túl sok elemet tartalmaz (442)": too many to list.
  readonly tooMany: number;
}

const ROW =
  /<tr>\s*<td><a href="\/allas\/reszletek\/(\d+)">([\s\S]*?)<\/a><\/td>\s*<td><a[^>]*>([\s\S]*?)<\/a><\/td>\s*<td><a[^>]*>([\s\S]*?)<\/a><\/td>/g;

export function parseResults(html: string): ResultPage {
  const tooMany =
    Number(/túl sok elemet tartalmaz \((\d+)\)/.exec(html)?.[1]) || 0;
  const found =
    Number(/Találatok listája \((\d+) találat\)/.exec(html)?.[1]) || 0;
  const drafts = [...html.matchAll(ROW)].map(
    ([, id, occupation, schooling, place]) => {
      const where = plainText(place ?? "");
      const school = plainText(schooling ?? "")
        .replace(/(,\s*)+/g, ", ")
        .replace(/,\s*$/, "");
      return {
        source: "hungary",
        sourceId: id ?? "",
        // "2118 - Gépészmérnök": the FEOR occupation without its code.
        title: plainText(occupation ?? "").replace(/^\d{4}\s*-\s*/, ""),
        company: "",
        location: [where, "Magyarország"].filter(Boolean).join(", "),
        country: "hu",
        city: where.replace(/\s+\d+\.\s*ker\.$/, ""),
        remote: false,
        url: `${BASE}/allas/reszletek/${id}`,
        description: school ? `Iskolai végzettség: ${school}` : "",
        occupationCodes: {},
        language: "hu",
      } satisfies AdvertDraft;
    },
  );
  return { drafts, found, tooMany };
}

// The category after the one the last pass read; the first when there is no memory.
export function nextCategory(memory: HungaryMemory | undefined): number {
  if (!memory) return 0;
  return (
    (CATEGORIES.indexOf(memory.last as (typeof CATEGORIES)[number]) + 1) %
    CATEGORIES.length
  );
}

async function* readHungary(
  context: AdapterContext,
): AsyncIterable<AdvertDraft> {
  const parsed = HungaryMemory.safeParse(context.memory);
  const memory = parsed.success ? parsed.data : undefined;
  let asked = 0;
  const page = async (category: string, region = "") => {
    asked += 1;
    return parseResults(
      (await context.http.request(searchUrl(category, region))).body,
    );
  };
  const fresh = new Map<string, AdvertDraft>();
  const readNow = new Map<string, string[]>();
  let short = 0;
  let at = nextCategory(memory);
  // A category that lists nothing leaves no mark: the one after it is read in the same pass.
  for (
    let n = 0;
    n < CATEGORIES.length;
    n++, at = (at + 1) % CATEGORIES.length
  ) {
    if (fresh.size > 0 || asked >= MOST_REQUESTS) break;
    const category = CATEGORIES[at] ?? "19";
    const ids: string[] = [];
    readNow.set(category, ids);
    const add = (drafts: readonly AdvertDraft[]) => {
      for (const draft of drafts) {
        fresh.set(draft.sourceId, draft);
        ids.push(draft.sourceId);
      }
    };
    const all = await page(category);
    add(all.drafts);
    if (!all.tooMany) continue;
    // Too many to list: region by region, and what they add up to is checked against the total.
    let got = 0;
    for (const region of REGIONS) {
      if (asked >= MOST_REQUESTS) break;
      const part = await page(category, region);
      add(part.drafts);
      got += part.found;
    }
    short += Math.max(0, all.tooMany - got);
  }

  // What the other categories gave on their last turn stays until their turn comes again.
  const keptIds = new Set(
    Object.entries(memory?.categories ?? {})
      .filter(([category]) => !readNow.has(category))
      .flatMap(([, ids]) => ids),
  );
  const kept = context.previous.filter(
    (draft) => keptIds.has(draft.sourceId) && !fresh.has(draft.sourceId),
  );
  const read = [...readNow.keys()];
  context.remember({
    last: read.at(-1) ?? CATEGORIES[0],
    categories: {
      ...Object.fromEntries(
        Object.entries(memory?.categories ?? {}).filter(
          ([category]) => !readNow.has(category),
        ),
      ),
      ...Object.fromEntries(readNow),
    },
  });
  context.log(
    `category ${read.join(", ")}: ${fresh.size} vacancies${short > 0 ? ` (${short} the regions did not cover)` : ""}, ${kept.length} kept from the others`,
  );
  // An empty pass yields nothing and the family reports it as a failure: the memory is not kept.
  if (fresh.size === 0) return;
  yield* fresh.values();
  yield* kept;
}

export const hungary = publicFeed({
  definition: {
    id: "hungary",
    kind: "feed",
    licence: {
      name: "Nemzeti Foglalkoztatási Szolgálat, Virtuális Munkaerőpiac Portál",
      short: "NFSZ VMP",
      url: "https://vmp.munka.hu/",
      licence: "No terms of use on the portal; each vacancy links to it",
      credit: "Nemzeti Foglalkoztatási Szolgálat (vmp.munka.hu)",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  read: readHungary,
});
