import * as cheerio from "cheerio";
import { DESCRIPTION_LIMIT, type SourcePay } from "../schemas/advert.js";
import { fold } from "./fold.js";
import { parseDay } from "./dates.js";
import { statedPay } from "./stated-pay.js";
import { pageText, plainText } from "./text.js";

// A schema.org JobPosting as plain fields. Sites follow the schema loosely, so every field is
// read leniently and may be "" (or undefined for days).
export interface JobPosting {
  readonly title: string;
  readonly company: string;
  readonly locality: string;
  readonly region: string;
  // Lower-case ISO 3166-1 alpha-2, or "" when the block does not give one.
  readonly country: string;
  // Locality, region and country as written, or whatever the address says.
  readonly location: string;
  readonly url: string;
  readonly description: string;
  readonly posted: string | undefined;
  readonly validThrough: string | undefined;
  // FULL_TIME, TEMPORARY… or the site's own words.
  readonly employmentType: readonly string[];
  readonly remote: boolean;
  // The pay its `baseSalary` states, as the fields give it (pay FR-1).
  readonly pay: SourcePay | undefined;
  // The weekly hours its `workHours` writes ("40", "40 hours per week") and the years of experience its
  // `experienceRequirements` names, when it states them (job portals T003; the legacy's of 1 November 2026).
  readonly hours?: string;
  readonly years?: number;
}

type Node = Record<string, unknown>;

const isNode = (value: unknown): value is Node =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const many = (value: unknown): unknown[] =>
  value === undefined || value === null
    ? []
    : Array.isArray(value)
      ? value
      : [value];

const field = (node: unknown, key: string): unknown =>
  isNode(node) ? node[key] : undefined;

// A value as one line of text: a string, the first of a list, or an object's name.
function textOf(value: unknown): string {
  if (typeof value === "string") return plainText(value);
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return textOf(value[0]);
  if (isNode(value))
    return textOf(value["name"] ?? value["@value"] ?? value["text"]);
  return "";
}

// Part time when the posting says so and not also full time.
function partTimeOnly(types: unknown): boolean {
  const kinds = many(types).map((type) =>
    String(type)
      .toUpperCase()
      .replace(/[^A-Z]/g, ""),
  );
  return kinds.includes("PARTTIME") && !kinds.includes("FULLTIME");
}

// The pay a posting states in `baseSalary` (legacy `salaryOf`). Sites fill the block loosely: the
// amount in `value` or in `minValue` and `maxValue`, the period on the amount or on the salary,
// the currency on the salary or on the posting (`salaryCurrency`).
export function salaryOf(node: unknown): SourcePay | undefined {
  const base = many(field(node, "baseSalary"))[0];
  if (!isNode(base)) return undefined;
  const amount = isNode(base["value"])
    ? base["value"]
    : { value: base["value"] };
  return statedPay({
    min: amount["minValue"] ?? amount["value"],
    max: amount["maxValue"] ?? amount["value"],
    currency: base["currency"] || field(node, "salaryCurrency"),
    period: amount["unitText"] || base["unitText"],
    partTime: partTimeOnly(field(node, "employmentType")),
  });
}

// Hand-written blocks often leave a real newline or tab inside a string, which strict JSON
// refuses and search engines forgive (legacy `repairJson`). Only control characters inside
// strings are escaped, so a block that is truly broken still fails.
export function repairJson(json: string): string {
  const escapes: Record<string, string> = {
    "\n": "\\n",
    "\r": "\\r",
    "\t": "\\t",
  };
  let out = "";
  let inString = false;
  let escaped = false;
  for (const character of json) {
    if (escaped) escaped = false;
    else if (character === "\\") escaped = true;
    else if (character === '"') inString = !inString;
    else if (inString && character < " ") {
      out += escapes[character] ?? " ";
      continue;
    }
    out += character;
  }
  return out;
}

function parseBlock(block: string): unknown {
  const json = block.replace(/^\s*<!--|-->\s*$/g, "");
  try {
    return JSON.parse(json);
  } catch {
    try {
      return JSON.parse(repairJson(json));
    } catch {
      return undefined;
    }
  }
}

// A title written with HTML ("Konstrukteur <br> Stuttgart <h2>Ihre Vorteile</h2>"): a heading in
// it is a subtitle and goes, unless it is all there is.
function titleOf(value: string): string {
  return plainText(value.replace(/<h[1-6][\s\S]*$/i, "")) || plainText(value);
}

// Every JobPosting in a page's JSON-LD blocks (an `@graph`, a list, a `mainEntity` included).
export function jobPostings(html: string, pageUrl: string): JobPosting[] {
  const $ = cheerio.load(html);
  const postings: JobPosting[] = [];
  for (const script of $("script").toArray()) {
    // ASP.NET writes the "+" escaped ("ld&#x2B;json"); cheerio has decoded it.
    if (!/ld\+json/i.test($(script).attr("type") ?? "")) continue;
    const parsed = parseBlock($(script).html() ?? "");
    const nodes = many(field(parsed, "@graph") ?? parsed).flatMap((node) => [
      node,
      ...many(field(node, "mainEntity")),
    ]);
    for (const node of nodes) {
      if (!many(field(node, "@type")).includes("JobPosting")) continue;
      const rawTitle = field(node, "title") ?? field(node, "name");
      const title = titleOf(
        typeof rawTitle === "string" ? rawTitle : textOf(rawTitle),
      );
      if (!title) continue;
      const places = many(field(node, "jobLocation"));
      // A place's address may be a list (a job in several towns): the first one stands.
      const addresses = places.flatMap((place) =>
        many(field(place, "address")),
      );
      const address = addresses.find(isNode) ?? {
        streetAddress: addresses.find((a) => typeof a === "string") ?? "",
      };
      const locality = textOf(field(address, "addressLocality"));
      const region = textOf(field(address, "addressRegion"));
      const country = textOf(field(address, "addressCountry"));
      const telecommute = many(field(node, "jobLocationType")).includes(
        "TELECOMMUTE",
      );
      const location =
        [locality, region, country].filter(Boolean).join(", ") ||
        textOf(field(address, "streetAddress")) ||
        textOf(field(address, "name")) ||
        textOf(places[0]) ||
        (telecommute ? "Remote" : "");
      const description = field(node, "description");
      const years = experienceYears(field(node, "experienceRequirements"));
      postings.push({
        title,
        company: textOf(field(node, "hiringOrganization")),
        locality,
        region,
        country: /^[A-Za-z]{2}$/.test(country) ? country.toLowerCase() : "",
        location,
        url: textOf(field(node, "url")) || pageUrl,
        description: withRequirements(
          typeof description === "string" ? pageText(description) : "",
          node,
        ),
        posted: parseDay(textOf(field(node, "datePosted"))),
        validThrough: parseDay(textOf(field(node, "validThrough"))),
        employmentType: many(field(node, "employmentType"))
          .map(textOf)
          .filter(Boolean)
          .slice(0, 4),
        remote: telecommute || /remote/i.test(location),
        pay: salaryOf(node),
        ...(textOf(field(node, "workHours"))
          ? { hours: textOf(field(node, "workHours")) }
          : {}),
        ...(years !== null ? { years } : {}),
      });
    }
  }
  return postings.length > 0 ? postings : microdataPostings(html, pageUrl);
}

// The years a block's `experienceRequirements` names: its months ({"monthsOfExperience": 60}, five years; fewer than
// twelve, none) or the first number of a text in years ("5-7 Years"); null when it names none ("Enige ervaring").
export function experienceYears(requirements: unknown): number | null {
  const months = Number(
    field(requirements, "monthsOfExperience") ?? Number.NaN,
  );
  if (Number.isFinite(months) && months >= 0) return Math.floor(months / 12);
  const written =
    typeof requirements === "string"
      ? requirements
      : String(field(requirements, "description") || "");
  const match =
    /(\d{1,2})\s*(?:\+|-|–|to)?\s*(?:\d{1,2}\s*)?(?:years?|jahre|ans|años|jaar|anni|anos)\b/i.exec(
      written,
    );
  return match ? Number(match[1]) : null;
}

// What a block keeps outside its description ("qualifications", "educationRequirements", "skills": a whole profile on
// taleez.com; "Python, SageMaker, Kafka"), added when the description does not hold it already.
function withRequirements(description: string, node: unknown): string {
  const extra = [
    "qualifications",
    "educationRequirements",
    "skills",
    "responsibilities",
  ]
    .flatMap((key) => many(field(node, key)))
    .map((value) =>
      pageText(
        typeof value === "string"
          ? value
          : String(
              field(value, "description") ||
                field(value, "name") ||
                field(value, "credentialCategory") ||
                "",
            ),
      ),
    )
    .filter(
      (value) =>
        value && value.length > 2 && !description.includes(value.slice(0, 60)),
    );
  return extra.length > 0 ? `${description}\n${extra.join("\n")}` : description;
}

// The older way of marking a vacancy up: microdata (itemtype JobPosting, itemprop fields), read leniently: a property is
// its content attribute, else the text inside its tag.
function microdataPostings(html: string, pageUrl: string): JobPosting[] {
  if (!/itemtype\s*=\s*["']https?:\/\/schema\.org\/JobPosting["']/i.test(html))
    return [];
  const prop = (name: string): string => {
    const match = new RegExp(
      `<([a-z0-9]+)[^>]*itemprop\\s*=\\s*["']${name}["'][^>]*?(?:\\scontent\\s*=\\s*["']([^"']*)["'][^>]*)?>`,
      "i",
    ).exec(html);
    if (!match) return "";
    if (match[2] !== undefined) return pageText(match[2]).trim();
    const after = html.slice(match.index + match[0].length);
    const close = after.search(new RegExp(`</${match[1]}\\s*>`, "i"));
    return pageText(
      close >= 0 ? after.slice(0, close) : after.slice(0, 400),
    ).trim();
  };
  const title = prop("title") || prop("name");
  if (!title) return [];
  const locality = prop("addressLocality");
  const region = prop("addressRegion");
  const country = prop("addressCountry");
  // SAP SuccessFactors writes the whole place in the street's field ("Bogota, CO").
  const location =
    [locality, region, country].filter(Boolean).join(", ") ||
    prop("streetAddress");
  return [
    {
      title,
      company: prop("hiringOrganization"),
      locality,
      region,
      country: /^[A-Za-z]{2}$/.test(country) ? country.toLowerCase() : "",
      location,
      url: pageUrl,
      description: prop("description"),
      posted: parseDay(prop("datePosted")),
      validThrough: parseDay(prop("validThrough")),
      employmentType: [],
      remote: /remote/i.test(location),
      pay: undefined,
    },
  ];
}

// A block whose description is only part of the advert its page shows (Inforca: 599 characters in its block, «Bac+4» and
// «15 ans d'expérience» in the page's next blocks; welcomekit's «Type de contrat : CDI» after its text): the page's text
// is taken instead, from the line where the description starts (or the line after the advert's title) up to the first
// of the page's own endings (apply, share, similar jobs, a contact block, a cookie notice), only when it is much longer
// than the description and holds most of its words, so it is that advert and not a list (the legacy's `wholeAdvert`,
// docs/research/whole-advert.md). A <dialog> is a box over the page, never the advert.
const ENDING =
  /^(?:postuler|postulez|apply|apply now|apply for this job|jetzt bewerben|jetzt online bewerben|online bewerben|bewerben|solliciteer|solliciteren|candidatar|candidatar-se|inscribirse|aplicar|enviar candidatura|share|partager|teilen|delen|compartir|similar jobs|related jobs|more jobs|offres similaires|ofertas similares|buscar ofertas|ahnliche jobs|ahnliche stellen|weitere stellen|vergelijkbare vacatures|kontakt|kontakte|ansprechpartner\w*|contact|contactpersoon|retour|back to|zuruck|terug|gerer le consentement|cookie\w*|facebook|twitter|linkedin|xing|whatsapp|datenschutz\w*|impressum|privacy|lees meer|read more|weiterlesen)(?![a-z])/;
// A line of a picture or a script written into the page ("data:image/png;base64,…"): the advert's text has ended.
const BLOB = /[A-Za-z0-9+/=]{120,}/;
const LONGER_BY = 150;
const wordsOf = (text: string): Set<string> =>
  new Set(
    fold(text)
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length >= 4),
  );
const normal = (text: string): string =>
  fold(text)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
export function wholeAdvert<J extends { description: string; title: string }>(
  job: J,
  html: string,
): J {
  const summary = job.description.trim();
  if (!summary) return job;
  const lines = pageText(
    html.replace(
      /<(script|style|noscript|svg|template|nav|header|footer|form|select|dialog)[\s\S]*?<\/\1>/gi,
      " ",
    ),
  )
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const head = normal(summary).slice(0, 40);
  let from =
    head.length >= 20
      ? lines.findIndex((line, i) =>
          `${normal(line)} ${normal(lines[i + 1] ?? "")}`.includes(head),
        )
      : -1;
  if (from < 0) {
    const title = normal(job.title);
    const at = title ? lines.findIndex((line) => normal(line) === title) : -1;
    from = at < 0 ? -1 : at + 1;
  }
  if (from < 0) return job;
  const kept: string[] = [];
  for (const line of lines.slice(from)) {
    if (
      (line.length <= 60 &&
        ENDING.test(fold(line).replace(/^[^a-z0-9]+/, ""))) ||
      BLOB.test(line)
    )
      break;
    kept.push(line);
  }
  const page = kept.join("\n");
  if (
    page.length < summary.length + LONGER_BY ||
    page.length < summary.length * 1.3
  )
    return job;
  const own = wordsOf(summary);
  const there = wordsOf(page);
  if (
    own.size &&
    [...own].filter((word) => there.has(word)).length < own.size * 0.6
  )
    return job;
  return { ...job, description: page.slice(0, DESCRIPTION_LIMIT) };
}
