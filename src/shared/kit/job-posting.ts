import * as cheerio from "cheerio";
import type { SourcePay } from "../schemas/advert.js";
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
      postings.push({
        title,
        company: textOf(field(node, "hiringOrganization")),
        locality,
        region,
        country: /^[A-Za-z]{2}$/.test(country) ? country.toLowerCase() : "",
        location,
        url: textOf(field(node, "url")) || pageUrl,
        description:
          typeof description === "string" ? pageText(description) : "",
        posted: parseDay(textOf(field(node, "datePosted"))),
        validThrough: parseDay(textOf(field(node, "validThrough"))),
        employmentType: many(field(node, "employmentType"))
          .map(textOf)
          .filter(Boolean)
          .slice(0, 4),
        remote: telecommute || /remote/i.test(location),
        pay: salaryOf(node),
      });
    }
  }
  return postings;
}
