import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { parseDay } from "../../../../shared/kit/dates.js";
import { plainText } from "../../../../shared/kit/text.js";
import { publicFeed } from "../../../crawl-core/feed-family.js";
import { loadIscoUnits } from "../../isco-units.js";

// Cyprus: the Public Employment Service's vacancies on its platform (PESCPS), through its public
// job search, which needs no account: one search per ISCO unit group of ours
// (config/isco-units.yml, FR-7) with the search's own occupation filter. Each vacancy keeps the
// group it was found under, since its title is Greek. The platform's terms page holds no clause
// and the Department of Labour's only a disclaimer; its robots.txt answers the platform's home
// page (no rules). The contacts on each vacancy's page are never read: only the list is.
// A search answers its whole list on one page here (the legacy paged it in a session at 100
// a page): a group listing fewer rows than it counts is logged.
export const SEARCH = "https://pescps.dl.mlsi.gov.cy/CPSWeb/candidate/f006w";

export interface OccupationOption {
  readonly value: string;
  readonly isco: string;
}

// The occupation filter's options: its own value and the ISCO-08 unit group its label starts with.
export function occupationOptions(html: string): OccupationOption[] {
  const select =
    /<select[^>]*name="OccupationCode"[^>]*>([\s\S]*?)<\/select>/.exec(
      html,
    )?.[1] ?? "";
  return [
    ...select.matchAll(/<option[^>]*value="(\d+)"[^>]*>\s*(\d{4})\s*-/g),
  ].map(([, value = "", isco = ""]) => ({ value, isco }));
}

// "ΠΟΛΙΤΙΚΟΣ ΜΗΧΑΝΙΚΟΣ" → "Πολιτικος μηχανικος": capitals kept as a sentence.
const sentence = (text: string) =>
  text === text.toUpperCase()
    ? text.charAt(0) + text.slice(1).toLocaleLowerCase("el")
    : text;

export function parseResults(
  html: string,
  isco: string,
): { readonly drafts: AdvertDraft[]; readonly found: number } {
  const drafts = [
    ...html.matchAll(
      /<td id="(\d+)_VACANCY_ID_REF"[^>]*>\s*<a[^>]*href="\.\/f006w1\?PK=(\d+)"[^>]*>(\d+)<\/a>/g,
    ),
  ].flatMap(([, row, key, number]): AdvertDraft[] => {
    const cell = (name: string) =>
      plainText(
        new RegExp(`<td id="${row}_${name}"[^>]*>([\\s\\S]*?)</td>`).exec(
          html,
        )?.[1] ?? "",
      );
    const title = sentence(cell("JOB_TITLE"));
    if (!title || !number) return [];
    const draft: AdvertDraft = {
      source: "cyprus",
      sourceId: number,
      title,
      company: "",
      location: "Κύπρος",
      country: "cy",
      city: "",
      remote: false,
      url: `https://pescps.dl.mlsi.gov.cy/CPSWeb/candidate/f006w1?PK=${key}`,
      description: "",
      occupationCodes: { isco },
      language: /[Ͱ-Ͽ]/.test(title) ? "el" : "en",
    };
    const posted = parseDay(cell("VACANCY_CREATION_DATE"));
    if (posted) draft.posted = posted;
    return [draft];
  });
  return {
    drafts,
    found: Number(/JobMatching_numRows=(\d+)/.exec(html)?.[1]) || 0,
  };
}

async function* readCyprus(
  context: AdapterContext,
): AsyncIterable<AdvertDraft> {
  const units = await loadIscoUnits();
  const options = occupationOptions(
    (await context.http.request(SEARCH)).body,
  ).filter((option) => units.has(option.isco));
  if (options.length === 0)
    throw new Error("the search page lists none of our occupations");
  for (const option of options) {
    const { drafts, found } = parseResults(
      (
        await context.http.request(SEARCH, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            __EVENTARGUMENT: "",
            __clearSearch: "0",
            __gridIsDirty: "false",
            __EVENTTARGET: "search",
            OccupationCode: option.value,
            submitButton: "Αναζήτηση",
          }).toString(),
        })
      ).body,
      option.isco,
    );
    if (found > drafts.length)
      context.log(`${option.isco}: ${drafts.length} rows shown of ${found}`);
    yield* drafts;
  }
}

export const cyprus = publicFeed({
  definition: {
    id: "cyprus",
    kind: "feed",
    licence: {
      name: "Δημόσια Υπηρεσία Απασχόλησης (Public Employment Service of Cyprus), PESCPS",
      short: "PES Cyprus",
      url: "https://pescps.dl.mlsi.gov.cy/CPSWeb/candidate/f006w",
      licence:
        "No terms against reuse (the platform's terms page is empty; the Department of Labour's holds a disclaimer); each vacancy links to the platform",
      credit: "Τμήμα Εργασίας, Κυπριακή Δημοκρατία",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  read: readCyprus,
});
