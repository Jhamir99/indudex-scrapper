import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { parseDay } from "../../../../shared/kit/dates.js";
import { plainText } from "../../../../shared/kit/text.js";
import { publicFeed } from "../../family.js";
import { loadIscoUnits } from "../../isco-units.js";

// Lithuania: the Employment Service's vacancies through the state open-data API (data.gov.lt, CC
// BY 4.0, no key). Every vacancy carries an LPK occupation code whose first four digits are its
// ISCO-08 unit group, so the API is asked only for the vacancies still open in our minor groups:
// the gate is the source's own classification. Employer contacts, which the data also holds, are
// never asked for. robots.txt asks 5 s between calls (the client waits as it asks).
const API = "https://get.data.gov.lt/datasets/gov/uzt/ldv/Vieta";
export const FIELDS = [
  "darbo_vietos_id",
  "profesijos_kodas",
  "profesijos_pareigybes_pav",
  "darbdavys",
  "darbo_vietos_adresas",
  "darbo_aprasymas_lt",
  "reik_darbo_patirtis",
  "reik_kompetencijos_lt",
  "reik_gebejimai",
  "reik_issilavinimo_pav",
  "ikelimo_data",
  "galioja_nuo",
  "galioja_iki",
  "vid_darbo_uzmokestis",
  "prelim_darbo_uzmokestis",
  "maks_darbo_uzmokestis",
  "valiuta",
];
const PAGE = "https://uzt.lt/laisvos-darbo-vietos/436/p1/skelbimas/";
// One query per minor group, at most this many rows: a group that fills them is cut, and says so.
const LIMIT = 2000;

// The vacancies of a minor group still open on `today`. (The dataset's own "open today" flag no
// longer matches anything: the last day is the test.) The query is sent as written, its
// punctuation being the API's syntax.
export const groupUrl = (minor: string, today: string) =>
  `${API}?galioja_iki>="${today}"&profesijos_kodas.startswith("${minor}")&limit(${LIMIT})&select(${FIELDS.join(",")})`;

interface Row {
  readonly darbo_vietos_adresas?: string | null;
  readonly darbo_aprasymas_lt?: string | null;
  readonly reik_darbo_patirtis?: string | number | null;
  readonly reik_kompetencijos_lt?: string | null;
  readonly reik_gebejimai?: string | null;
  readonly reik_issilavinimo_pav?: string | null;
  readonly darbo_vietos_id?: string | number | null;
  readonly profesijos_pareigybes_pav?: string | null;
  readonly darbdavys?: string | null;
  readonly ikelimo_data?: string | null;
  readonly galioja_nuo?: string | null;
  readonly galioja_iki?: string | null;
  readonly profesijos_kodas?: string | number | null;
  readonly vid_darbo_uzmokestis?: number | null;
  readonly prelim_darbo_uzmokestis?: number | null;
  readonly maks_darbo_uzmokestis?: number | null;
  readonly valiuta?: string | null;
}

// "Savanorių pr. 176C, Vilnius, Lietuva" → Vilnius: the last part before the country.
export function cityOf(address: string | null | undefined): string {
  const parts = (address ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (/^lietuva$/i.test(parts.at(-1) ?? "")) parts.pop();
  return (parts.at(-1) ?? "").replace(/\s+\d{5}$/, "");
}

// The pay, "monthly, before taxes" in the dataset's own words: the base pay and, on most
// vacancies, the top of its range. Written into the text in Lithuanian, as the source would.
function payLine(row: Row): string {
  const base = row.vid_darbo_uzmokestis || row.prelim_darbo_uzmokestis;
  if (!base) return "";
  const top = row.maks_darbo_uzmokestis;
  const range = top && top > base ? `${base}–${top}` : String(base);
  return `Atlyginimas: ${range} ${row.valiuta || "EUR"} per mėnesį prieš mokesčius`;
}

export function parseUzt(json: string): AdvertDraft[] {
  // The API wraps its rows in a list named "_data".
  const { _data: rows } = (JSON.parse(json) ?? {}) as {
    _data?: (Row | null)[];
  };
  return (rows ?? []).flatMap((row): AdvertDraft[] => {
    const sourceId = String(row?.darbo_vietos_id ?? "").trim();
    const title = plainText(row?.profesijos_pareigybes_pav ?? "");
    if (!row || !sourceId || !title) return [];
    const city = cityOf(row.darbo_vietos_adresas);
    const text = [
      row.darbo_aprasymas_lt,
      row.reik_darbo_patirtis != null && `${row.reik_darbo_patirtis}`,
      row.reik_kompetencijos_lt,
      row.reik_gebejimai,
      row.reik_issilavinimo_pav,
    ]
      .map((part) => String(part || "").trim())
      .filter(Boolean)
      .concat(payLine(row))
      .filter(Boolean)
      .join("\n");
    const isco = /^\d{4}/.exec(String(row.profesijos_kodas ?? ""))?.[0];
    const draft: AdvertDraft = {
      source: "uzt",
      sourceId,
      title,
      company: plainText(row.darbdavys ?? ""),
      location: [city, "Lietuva"].filter(Boolean).join(", "),
      country: "lt",
      city,
      remote: false,
      url: `${PAGE}${encodeURIComponent(sourceId)}`,
      description: text,
      occupationCodes: isco ? { isco } : {},
      language: "lt",
    };
    const posted = parseDay(row.ikelimo_data ?? row.galioja_nuo ?? undefined);
    const expires = parseDay(row.galioja_iki ?? undefined);
    if (posted) draft.posted = posted;
    if (expires) draft.expires = expires;
    return [draft];
  });
}

async function* readUzt(context: AdapterContext): AsyncIterable<AdvertDraft> {
  const minors = [
    ...new Set([...(await loadIscoUnits())].map((unit) => unit.slice(0, 3))),
  ].toSorted();
  let failed = 0;
  for (const minor of minors) {
    // The API answers a web page now and then instead of JSON: that group is skipped this time
    // and the others still come; only a run with nothing at all counts as a failure.
    let drafts: AdvertDraft[];
    try {
      drafts = parseUzt(
        (await context.http.request(groupUrl(minor, context.today))).body,
      );
    } catch (error) {
      failed += 1;
      context.log(
        `${minor}: skipped (${(error instanceof Error ? error.message : String(error)).slice(0, 60)})`,
      );
      continue;
    }
    context.log(
      `${minor}: ${drafts.length}${drafts.length >= LIMIT ? " (the limit: the rest of this group is not read)" : ""}`,
    );
    yield* drafts;
  }
  if (failed === minors.length) throw new Error("every group failed");
}

export const uzt = publicFeed({
  definition: {
    id: "uzt",
    kind: "feed",
    licence: {
      name: "Užimtumo tarnyba, laisvos darbo vietos (data.gov.lt)",
      short: "Užimtumo tarnyba",
      url: "https://data.gov.lt/datasets/2894/",
      licence: "CC BY 4.0",
      credit: "Šaltinis: Užimtumo tarnyba prie LR SADM, per data.gov.lt",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  read: readUzt,
});
