import { stated } from "../../stated.js";
import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { parseDay } from "../../../../shared/kit/dates.js";
import { plainText } from "../../../../shared/kit/text.js";
import { publicFeed } from "../../family.js";

// Latvia: the State Employment Agency's current vacancies (CC0 on data.gov.lv, no key). A CSV
// published daily under a dated name, found through the portal's catalogue. It carries no
// occupation code and no advert text, only the title, a sector, the address, the days, the pay
// and the link: the title decides, downstream.
export const CATALOGUE =
  "https://data.gov.lv/dati/api/3/action/package_show?id=vakances";

// A plain CSV reader: quoted fields, doubled quotes, line breaks inside quotes.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const input = text.replace(/^﻿/, "");
  for (let index = 0; index < input.length; index++) {
    const character = input[index];
    if (quoted) {
      if (character !== '"') field += character;
      else if (input[index + 1] === '"') {
        field += '"';
        index++;
      } else quoted = false;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && input[index + 1] === "\n") index++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += character;
  }
  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.length > 1 || cells[0]);
}

// "Stadiona iela 10, Ozolnieki, Ozolnieku pag., Jelgavas nov." → "Ozolnieki": the last part that
// is not a parish (pag.) or a municipality (nov.).
export function cityOf(place: string): string {
  const parts = place
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  while (parts.length > 1 && /\b(?:nov|pag)\.?$/i.test(parts.at(-1) ?? ""))
    parts.pop();
  return parts.at(-1) ?? "";
}

const COLUMNS = [
  "Vakances_Nr",
  "Aktualizacijas_datums",
  "Vakances_nosaukums",
  "Vakances_kategorija",
  "Pieteiksanas_termins",
  "Vieta",
  "Vakances_paplasinats_apraksts",
  "Alga_no",
  "Alga_lidz",
  "Slodzes_tips",
] as const;

// Latvia's minimum monthly wage (€780 on 1 January 2026), which tells a month from an hour: the
// file states no period.
const MINIMUM_MONTHLY_WAGE = 780;

// Its pay fields, for full-time work only («Viena vesela slodze»): a month from the minimum wage
// up, an hour under €50, nothing in between (legacy `nvaPay`, the legacy's decision 3 in
// docs/research/salary.md).
export function nvaPay(from: string, to: string, workload: string) {
  const low = Number(from) || 0;
  const high = Number(to) || low;
  if (!low || !/vesela/i.test(workload)) return null;
  const period =
    low >= MINIMUM_MONTHLY_WAGE ? "month" : high < 50 ? "hour" : "";
  return period ? { min: low, max: high, currency: "EUR", period } : null;
}

export function parseNva(csv: string): AdvertDraft[] {
  const rows = parseCsv(csv);
  const head = rows.shift() ?? [];
  // A column the file no longer has is a changed format: said, not read as empty fields.
  const missing = COLUMNS.filter((name) => !head.includes(name));
  if (missing.length > 0)
    throw new Error(`NVA's file has no ${missing.join(", ")}`);
  const [id, updated, title, sector, deadline, place, link, from, to, load] =
    COLUMNS.map((name) => head.indexOf(name)) as [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ];
  return rows.flatMap((row) => {
    const url = (row[link] ?? "").trim();
    const sourceId = (row[id] ?? "").trim();
    const name = plainText(row[title] ?? "");
    if (!url.startsWith("https://") || !sourceId || !name) return [];
    const where = (row[place] ?? "").trim();
    const draft: AdvertDraft = {
      source: "nva",
      sourceId,
      title: name,
      company: "",
      location: [where, "Latvija"].filter(Boolean).join(", "),
      country: "lv",
      city: cityOf(where),
      remote: false,
      url,
      description: (row[sector] ?? "").trim(),
      occupationCodes: {},
      language: "lv",
      ...stated({
        pay: nvaPay(row[from] ?? "", row[to] ?? "", row[load] ?? ""),
      }),
    };
    const posted = parseDay(row[updated]);
    const expires = parseDay(row[deadline]);
    if (posted) draft.posted = posted;
    if (expires) draft.expires = expires;
    return [draft];
  });
}

interface Resource {
  readonly format?: string;
  readonly url?: string;
  readonly last_modified?: string;
}

// The newest CSV the catalogue names.
export function newestCsv(json: string): string | undefined {
  const resources =
    (JSON.parse(json) as { result?: { resources?: Resource[] } }).result
      ?.resources ?? [];
  return resources
    .filter((resource) => /csv/i.test(resource.format ?? "") && resource.url)
    .toSorted((a, b) =>
      (b.last_modified ?? "").localeCompare(a.last_modified ?? ""),
    )[0]?.url;
}

async function* readNva(context: AdapterContext): AsyncIterable<AdvertDraft> {
  const csv = newestCsv((await context.http.request(CATALOGUE)).body);
  if (!csv) throw new Error("no CSV in the NVA catalogue entry");
  context.log(`reading ${csv.split("/").pop()}`);
  yield* parseNva((await context.http.request(csv)).body);
}

export const nva = publicFeed({
  definition: {
    id: "nva",
    kind: "feed",
    licence: {
      name: "Nodarbinātības valsts aģentūra, vakances (data.gov.lv)",
      short: "NVA",
      url: "https://data.gov.lv/dati/lv/dataset/vakances",
      licence: "CC0 1.0",
      credit: "Avots: Nodarbinātības valsts aģentūra",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  read: readNva,
});
