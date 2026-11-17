import { load } from "cheerio";
import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { parseDay } from "../../../../shared/kit/dates.js";
import { pageText, plainText, titleCase } from "../../../../shared/kit/text.js";
import { withoutContacts } from "../../contacts.js";
import { publicFeed } from "../../family.js";

// Escola del Treball de Barcelona, a public vocational school: its job board, open to anyone, with
// the offers companies send its graduates, by department (electricity, electronics, machining,
// maintenance, construction, IT, wood, chemistry). Its content may be reused freely, citing the
// Generalitat de Catalunya (CC0); no robots.txt. An offer names the studies it asks for, not a post:
// the title is that qualification's name ("Tècnic/a superior en Mecatrònica industrial"). The
// contact person, the phone, the e-mail and the street are not kept. Some offers are restricted to
// registered graduates (they ask for an ID number and a birth date): they are left out.
const BASE = "https://apps.escoladeltreball.org";
const BOARD = `${BASE}/borsatreball`;
// The departments whose graduates do our work; administration, graphic arts and sport are left out.
export const DEPARTMENTS = [
  "ELI",
  "ELO",
  "MET",
  "MAN",
  "CON",
  "INF",
  "FUS",
  "QUI",
  "alt",
];
// An offer older than this when the list shows it has closed: its page is not asked for.
export const RECENT_DAYS = 120;
export const listUrl = (department: string) =>
  `${BOARD}/consultar?departament=${department}`;
export const offerUrl = (id: string) => `${BOARD}/ofertes/${id}`;

// The pages mix their template in UTF-8 with texts kept in Windows-1252: each byte sequence that
// is valid UTF-8 is read as such, every other byte as Windows-1252 ("d’obres" keeps its
// apostrophe).
export function decodeMixed(bytes: Uint8Array): string {
  const latin = Buffer.from(bytes).toString("latin1");
  return latin.replace(
    /[\xC2-\xDF][\x80-\xBF]|[\xE0-\xEF][\x80-\xBF]{2}|[\xF0-\xF4][\x80-\xBF]{3}|[\x80-\xFF]/g,
    (match) =>
      match.length > 1
        ? Buffer.from(match, "latin1").toString("utf8")
        : new TextDecoder("windows-1252").decode(
            Uint8Array.of(match.charCodeAt(0)),
          ),
  );
}

export interface Row {
  readonly day: string;
  readonly id: string;
}

// A department's list: each row's first day and its offer.
export function parseList(html: string): Row[] {
  const $ = load(html);
  return $("tr")
    .toArray()
    .flatMap((row): Row[] => {
      const day = parseDay($(row).find("td").first().text().trim());
      const id = /\/borsatreball\/ofertes\/(\d+)/.exec(
        $(row).find('a[href*="/borsatreball/ofertes/"]').attr("href") ?? "",
      )?.[1];
      return day && id ? [{ day, id }] : [];
    });
}

// Each vocational qualification's occupation (ISCO-08), as the official title names it: the
// processor reads Catalan through no index, so the code decides, as IEFP's Portuguese
// classification does. The first that matches; the generic maintenance last.
const CICLE_ISCO: readonly (readonly [RegExp, string])[] = [
  [
    /instal·?.?lacions el[eè]ctriques i autom[aà]tiques|instalaciones el[eé]ctricas y autom[aá]ticas/i,
    "7411",
  ],
  [/sistemes electrot[eè]cnics|sistemas electrot[eé]cnicos/i, "3113"],
  [/automatitzaci[oó] i rob[oò]tica|automatizaci[oó]n y rob[oó]tica/i, "3113"],
  [/energies renovables|energ[ií]as renovables/i, "3113"],
  [/mecatr[oò]nica/i, "3115"],
  [
    /programaci[oó] de la producci[oó]|programaci[oó]n de la producci[oó]n/i,
    "3115",
  ],
  [
    /instal·?.?lacions t[eè]rmiques|instalaciones t[eé]rmicas|t[eè]rmiques i de fluids|t[eé]rmicas y de fluidos/i,
    "3115",
  ],
  [
    /disseny en fabricaci[oó] mec[aà]nica|dise[nñ]o en fabricaci[oó]n mec[aá]nica|modelatge de la informaci[oó]|\bBIM\b/i,
    "3118",
  ],
  [/manteniment electromec[aà]nic|mantenimiento electromec[aá]nico/i, "7233"],
  [/mecanitzaci[oó]|mecanizado/i, "7223"],
  [/soldadura/i, "7212"],
  [/construccions met[aà]l·?.?liques|construcciones met[aá]licas/i, "7214"],
  [
    /frigor[ií]fiques|frigor[ií]ficas|climatitzaci[oó]|climatizaci[oó]n/i,
    "7127",
  ],
  [/producci[oó] de calor/i, "7126"],
  [
    /organitzaci[oó] i control d.?obres|organizaci[oó]n y control de obras/i,
    "3123",
  ],
  [
    /projectes d.?edificaci[oó]|proyectos de edificaci[oó]n|obra civil/i,
    "3112",
  ],
  [
    /telecomunicacions i inform[aà]tics|telecomunicaciones e inform[aá]ticos/i,
    "3522",
  ],
  [
    /instal·?.?lacions de telecomunicacions|instalaciones de telecomunicaciones/i,
    "7422",
  ],
  [
    /administraci[oó] de sistemes inform[aà]tics|administraci[oó]n de sistemas inform[aá]ticos/i,
    "3513",
  ],
  [/desenvolupament d.?aplicacions|desarrollo de aplicaciones/i, "2514"],
  [/sistemes microinform[aà]tics|sistemas microinform[aá]ticos/i, "3512"],
  [/qu[ií]mica industrial|planta qu[ií]mica/i, "3116"],
  [/laboratori|laboratorio/i, "3111"],
  [
    /disseny i moblament|dise[nñ]o y amueblamiento|fusteria|carpinter[ií]a|moble\b|mueble\b/i,
    "7522",
  ],
  [
    /electromec[aà]nica de vehicles|electromec[aá]nica de veh[ií]culos|automoci[oó]/i,
    "7231",
  ],
  [/fabricaci[oó] mec[aà]nica|fabricaci[oó]n mec[aá]nica/i, "7223"],
  [/manteniment|mantenimiento/i, "7233"],
];
export const iscoOf = (studies: string): string | undefined =>
  CICLE_ISCO.find(([pattern]) => pattern.test(studies))?.[1];

// The studies an offer asks for, as the qualification's name: "Mecatrònica industrial DUAL (grau
// superior)" is "Tècnic/a superior en Mecatrònica industrial". An offer that names no studies (the
// "Altres" department's) takes its specialty's name; with neither it has no title to give.
export function titleOf(studies: string, field: string): string {
  const named = studies
    .replace(/\bDUAL\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^altres(?: estudis)?$/i, "");
  const level = /\(grau (superior|mitjà|mitja|bàsic|basic)\)/i.exec(named)?.[1];
  const name = named
    .replace(/\(grau [^)]*\)/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());
  if (!name)
    return field && !/^altres$/i.test(field) ? `Tècnic/a en ${field}` : "";
  if (/^superior$/i.test(level ?? "")) return `Tècnic/a superior en ${name}`;
  if (/^b[àa]sic$/i.test(level ?? "")) return `Professional bàsic en ${name}`;
  return `Tècnic/a en ${name}`;
}

// Towns come in capitals now and then ("RIPOLLET").
const asName = (name: string) =>
  name === name.toUpperCase() ? titleCase(name) : name;

// An offer's page: its fields by their labels. A page with none (a restricted offer asks for an
// ID number) gives nothing.
export function parseOffer(
  html: string,
  id: string,
  posted: string,
): AdvertDraft | undefined {
  const $ = load(html);
  const fields = new Map<string, string>();
  // A row may hold two pairs ("Telèfons: … Municipi: …"): every label has its own value.
  $("th").each((_, header) => {
    const label = $(header).text().replace(/:\s*$/, "").trim();
    const cell = $(header).next("td");
    if (label && cell.length > 0)
      fields.set(label, pageText(cell.html() ?? "").replace(/^-$/, ""));
  });
  const field = (label: string) => fields.get(label) ?? "";
  const studies = field("Estudis").replace(/^altres(?: estudis)?$/i, "");
  const speciality = field("Especialitat");
  const title = titleOf(studies, speciality);
  if (!title) return undefined;
  // Towns come in capitals now and then ("RIPOLLET").
  const town = asName(field("Municipi"));
  const province = asName(field("Provincia"));
  const facts = (
    [
      ["Especialitat", speciality],
      ["Estudis", studies],
      ["Contracte", field("Contracte")],
      ["Horari", field("Horari")],
      ["Incorporació", field("Incorporació")],
      ["Sou (brut/any)", field("Sou (brut/any)")],
      ["Idiomes", field("Idiomes")],
    ] as const
  )
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`);
  const isco = iscoOf(studies) ?? iscoOf(speciality);
  const draft: AdvertDraft = {
    source: "escoladeltreball",
    sourceId: id,
    title,
    company: plainText(field("Empresa")),
    location: [town, province !== town ? province : "", "España"]
      .filter(Boolean)
      .join(", "),
    country: "es",
    city: town,
    remote: false,
    url: offerUrl(id),
    description: [withoutContacts(field("Descripció")), ...facts]
      .filter(Boolean)
      .join("\n"),
    occupationCodes: isco ? { isco } : {},
    language: "ca",
  };
  const day = parseDay(posted);
  const expires = parseDay(field("Data de finalització"));
  if (day) draft.posted = day;
  if (expires) draft.expires = expires;
  return draft;
}

const dayBefore = (today: string, days: number) => {
  const day = new Date(`${today}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - days);
  return day.toISOString().slice(0, 10);
};

async function* readEscola(
  context: AdapterContext,
): AsyncIterable<AdvertDraft> {
  const read = async (url: string) =>
    decodeMixed(
      (await context.http.request(url, { binary: true })).bytes ??
        new Uint8Array(),
    );
  const since = dayBefore(context.today, RECENT_DAYS);
  // An offer read before is not asked for again while it is open.
  const known = new Map(
    context.previous.map((draft) => [draft.sourceId, draft]),
  );
  const seen = new Set<string>();
  let kept = 0;
  let restricted = 0;
  for (const department of DEPARTMENTS) {
    for (const row of parseList(await read(listUrl(department)))) {
      if (seen.has(row.id) || row.day < since) continue;
      seen.add(row.id);
      const before = known.get(row.id);
      if (before && (!before.expires || before.expires >= context.today)) {
        kept += 1;
        yield before;
        continue;
      }
      let offer: AdvertDraft | undefined;
      try {
        offer = parseOffer(await read(offerUrl(row.id)), row.id, row.day);
      } catch (error) {
        context.log(
          `${row.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
        continue;
      }
      if (!offer) {
        restricted += 1;
        continue;
      }
      if (offer.expires && offer.expires < context.today) continue;
      kept += 1;
      yield offer;
    }
  }
  context.log(
    `${kept} open of ${seen.size} recent, ${restricted} restricted or empty`,
  );
}

export const escoladeltreball = publicFeed({
  definition: {
    id: "escoladeltreball",
    kind: "feed",
    licence: {
      name: "Escola del Treball de Barcelona, borsa de treball",
      short: "Escola del Treball",
      url: "https://apps.escoladeltreball.org/borsatreball/consultar",
      licence: "CC0, reuse citing the Generalitat de Catalunya",
      credit: "Font: Escola del Treball de Barcelona, Generalitat de Catalunya",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  read: readEscola,
});
