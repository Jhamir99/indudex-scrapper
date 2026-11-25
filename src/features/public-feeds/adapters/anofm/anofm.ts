import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { parseDay } from "../../../../shared/kit/dates.js";
import { pageText, plainText } from "../../../../shared/kit/text.js";
import { withoutContacts } from "../../contacts.js";
import { checkWholePass, publicFeed } from "../../../crawl-core/feed-family.js";

// Romania: ANOFM, the public employment service, through the list its own job search draws
// (mediere.anofm.ro). No robots.txt and no terms beyond cookies; public information is reusable
// under Romanian law. The list answers a hundred offers a call, each with its occupation's COR code
// (ISCO-08's at four digits), employer, place and last day. The contact person, e-mail and phone it
// carries are never read, and contacts written into the text are cut out. An offer gone from a
// whole pass is closed. (The legacy opened the search page first for a session; the list no
// longer needs one.)
const BASE = "https://mediere.anofm.ro";
export const LIST = `${BASE}/api/entity/vw_public_job_posting`;
const PAGE = 100;
const LIST_PAGES = 200;

export const listBody = (page: number) =>
  JSON.stringify({
    current: page,
    rowCount: PAGE,
    sort: { created_at: "desc" },
  });
export const offerUrl = (id: string | number) =>
  `${BASE}/app/module/mediere/job/${id}`;

const WORK_MODES: [RegExp, AdvertDraft["workMode"]][] = [
  [/telemunc|la distan/i, "remote"],
  [/hibrid|mixt/i, "hybrid"],
  [/sediu|teren/i, "onsite"],
];

interface Row {
  readonly id?: string | number;
  readonly occupation?: string;
  readonly cor_name?: string;
  readonly address_locality_name?: string;
  readonly work_regime_name?: string;
  readonly job_domain_name?: string;
  readonly contract_type_name?: string;
  readonly work_type_name?: string;
  readonly education_level_name?: string;
  readonly professional_experience_name?: string;
  readonly employer_name?: string;
  readonly description?: string;
  readonly created_at?: string;
  readonly job_expiry_date?: string;
}

// «BIHOR > ORADEA» → «Oradea».
const titled = (text: string) =>
  text
    .toLowerCase()
    .replace(
      /(^|[\s-])(\p{L})/gu,
      (_, gap: string, letter: string) => gap + letter.toUpperCase(),
    );

export function parseAnofm(json: string): {
  readonly total: number;
  readonly drafts: AdvertDraft[];
} {
  const body = JSON.parse(json) as {
    rows?: unknown;
    total?: number | string;
  } | null;
  const rows = Array.isArray(body?.rows) ? (body.rows as (Row | null)[]) : [];
  const drafts = rows.flatMap((row): AdvertDraft[] => {
    if (!row?.id || !(row.occupation || row.cor_name)) return [];
    const occupation = plainText(
      row.occupation || (row.cor_name ?? "").replace(/^\d+\s*-\s*/, ""),
    );
    const [county = "", town = ""] = (row.address_locality_name ?? "")
      .split(">")
      .map((part) => part.trim());
    const city = titled(town || county);
    const region = county && titled(county) !== city ? titled(county) : "";
    const isco = /^(\d{4})\d*/.exec(row.cor_name ?? "")?.[1];
    const workMode = WORK_MODES.find(([pattern]) =>
      pattern.test(row.work_regime_name ?? ""),
    )?.[1];
    const facts = [
      row.job_domain_name,
      row.contract_type_name,
      row.work_type_name,
      row.education_level_name,
      row.professional_experience_name,
    ]
      .map((fact) => (fact ?? "").trim())
      .filter(Boolean)
      .join(" · ");
    const draft: AdvertDraft = {
      source: "anofm",
      sourceId: String(row.id),
      // Occupations come in capitals: kept as a sentence.
      title: occupation.charAt(0) + occupation.slice(1).toLowerCase(),
      company: plainText(row.employer_name ?? ""),
      location: [city, region, "România"].filter(Boolean).join(", "),
      country: "ro",
      city,
      remote: workMode === "remote",
      url: offerUrl(row.id),
      description: withoutContacts(
        [pageText(row.description ?? ""), facts].filter(Boolean).join("\n"),
      ),
      occupationCodes: isco ? { isco } : {},
      language: "ro",
    };
    if (workMode) draft.workMode = workMode;
    const posted = parseDay(row.created_at);
    const expires = parseDay(row.job_expiry_date);
    if (posted) draft.posted = posted;
    if (expires) draft.expires = expires;
    return [draft];
  });
  return { total: Number(body?.total) || 0, drafts };
}

async function* readAnofm(context: AdapterContext): AsyncIterable<AdvertDraft> {
  const listed = new Map<string, AdvertDraft>();
  let total = 0;
  for (let page = 1; page <= LIST_PAGES; page++) {
    const answer = parseAnofm(
      (
        await context.http.request(LIST, {
          method: "POST",
          body: listBody(page),
          headers: {
            "content-type": "application/json",
            accept: "application/json",
          },
        })
      ).body,
    );
    total = answer.total || total;
    const before = listed.size;
    for (const draft of answer.drafts) listed.set(draft.sourceId, draft);
    if (listed.size === before || listed.size >= total) break;
  }
  checkWholePass(listed.size, total, "offers");
  yield* listed.values();
}

export const anofm = publicFeed({
  definition: {
    id: "anofm",
    kind: "feed",
    licence: {
      name: "ANOFM, Agenția Națională pentru Ocuparea Forței de Muncă",
      short: "ANOFM",
      url: "https://mediere.anofm.ro/app/module/mediere/jobs",
      licence:
        "Romania's public employment service offers, read as its own search lists them; each offer links to ANOFM",
      credit: "via ANOFM",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  read: readAnofm,
});
