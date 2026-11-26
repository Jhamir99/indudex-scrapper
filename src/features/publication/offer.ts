import { createHash } from "node:crypto";
import { advertAddress } from "../../shared/kit/advert-address.js";
import { withoutClutter } from "../../shared/kit/clutter.js";
import { decodeFully } from "../../shared/kit/entities.js";
import { fold } from "../../shared/kit/fold.js";
import type { StoredAdvert } from "../../shared/schemas/advert.js";
import type { Offer } from "../../shared/schemas/published/offer.js";
import {
  agencyWorkCode,
  type AdvertFacts,
  contractCode,
  workingTimeCode,
  writtenFacts,
} from "../advert-facts/index.js";
import type { AdvertPay } from "../pay/index.js";
import type { Placement } from "../places/index.js";
import type { AdvertDays } from "./labels/days.js";

// The published offer of one advert, from what each step read of it (FR-5; legacy toRecord in
// builder/normalise.mjs and the fields build-pile.mjs adds). Its fields in the legacy's order, so
// the same advert gives the same bytes.

// A stable id from the advert's address (the legacy's idFor): the same advert keeps it across
// builds, and its copies at one address share it.
export const offerId = (url: string): string =>
  createHash("sha256")
    .update(advertAddress(url))
    .digest("base64url")
    .slice(0, 8);

const PERIOD: Readonly<
  Record<AdvertPay["period"], "y" | "m" | "w" | "d" | "h">
> = {
  year: "y",
  month: "m",
  week: "w",
  day: "d",
  hour: "h",
};
const MODE: Readonly<Record<string, "o" | "h" | "r">> = {
  onsite: "o",
  hybrid: "h",
  remote: "r",
};

// A place as the card shows it: what follows a page's markup is no part of it, its pieces once
// each (Argus's normalizeLocation, at most 300 letters), cut at a word past 160.
const MAX_LOCATION = 300;
const SHOWN_LOCATION = 160;
const wholeWords = (s: string, most: number): string =>
  s.length <= most ? s : s.slice(0, most + 1).replace(/\s+\S*$/u, "");
function shownLocation(location: string): string {
  const parts = withoutClutter(
    location
      .split(/<|&lt;/)[0]
      ?.replace(/\s+/g, " ")
      .trim() ?? "",
  )
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const unique = parts.filter((part) => {
    const key = part.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const joined = unique.join(", ");
  return wholeWords(
    joined.length > MAX_LOCATION ? joined.slice(0, MAX_LOCATION) : joined,
    SHOWN_LOCATION,
  );
}

// What each step read of an advert: the advert as read (mended and cut), its title as published,
// its employer (companies), its place (places), its families and occupations (gate), its facts
// (advert facts), its pay (pay) and its days (labels).
export interface OfferInput {
  readonly advert: StoredAdvert;
  readonly title: string;
  readonly employer: { readonly name: string; readonly agency: boolean };
  readonly placement: Placement;
  // The town the place names when the gazetteer knows none of it.
  readonly townNamed: string;
  readonly families: readonly string[];
  readonly occupations: readonly string[];
  readonly facts: Pick<
    AdvertFacts,
    | "workMode"
    | "contract"
    | "workingTime"
    | "years"
    | "degrees"
    | "languages"
    | "tools"
  >;
  readonly pay: AdvertPay | null;
  readonly days: AdvertDays;
}

// The source's occupation code: ISCO's four digits, or "ssyk:" and Sweden's.
const codeOf = (codes: StoredAdvert["occupationCodes"]): string =>
  codes.isco ? codes.isco.slice(0, 4) : codes.ssyk ? `ssyk:${codes.ssyk}` : "";

export function offerOf(input: OfferInput): Offer {
  const { advert, placement, facts, days } = input;
  // The town shown; its position and code come with `located`.
  const offer: Record<string, unknown> = {
    id: offerId(advert.url),
    t: input.title,
    c: input.employer.name,
    l: shownLocation(advert.location),
    cc: advert.country,
    ci: placement.town?.name ?? input.townNamed,
    d: days.d,
    u: advertAddress(advert.url),
    s: advert.source,
    f: [...input.families],
  };
  const code = codeOf(advert.occupationCodes);
  if (code) offer["k"] = code;
  const years = facts.years;
  if (years && years.most > 0) {
    offer["y"] = years.most;
    if (years.least > 0 && years.least < years.most) offer["yl"] = years.least;
  }
  if (advert.language) offer["tl"] = advert.language;
  if (days.fs) offer["fs"] = days.fs;
  // The contract and working time its source's fields state, else what its text and title write
  // (`{ ...writtenFacts, ...contractOf }`, in that order of keys); then agency work its text states.
  const fields = {
    ct: contractCode(facts.contract),
    wt: workingTimeCode(facts.workingTime),
  };
  const written = writtenFacts({
    title: advert.title,
    description: advert.description,
    source: advert.source,
  });
  for (const [key, value] of [
    ...Object.entries(written),
    ...Object.entries(fields),
  ])
    if (value) offer[key] = value;
  const contract = agencyWorkCode(
    String(offer["ct"] ?? ""),
    advert.description,
  );
  if (contract) offer["ct"] = contract;
  if (input.employer.agency) offer["ag"] = 1;
  if (days.x) offer["x"] = days.x;
  const mode = facts.workMode ? MODE[facts.workMode] : undefined;
  if (mode) offer["w"] = mode;
  if (input.pay) {
    offer["p"] = [
      input.pay.low,
      input.pay.high,
      input.pay.currency,
      PERIOD[input.pay.period],
    ];
    if (input.pay.yearlyEur) offer["pa"] = input.pay.yearlyEur;
  }
  if (facts.degrees.length) offer["dg"] = [...facts.degrees];
  if (facts.languages.length) offer["lg"] = [...facts.languages];
  if (input.occupations.length) offer["e"] = [...input.occupations];
  if (facts.tools.length) offer["tk"] = [...facts.tools];
  return offer as Offer;
}

// The offer on the map: its town's position and its NUTS code. Added after dedupe, as the legacy
// located its records once the copies kept had taken what the others said.
export function located(offer: Offer, placement: Placement): Offer {
  const out: Offer = { ...offer };
  if (placement.town)
    out.g = [placement.town.latitude, placement.town.longitude];
  if (placement.nuts) out.n = placement.nuts;
  return out;
}

// The other towns of a campaign kept once per country, once each, as [town, lat, lon], or [town]
// when the town is not on the map: the place search finds the offer in any of them. In Spanish
// order, whatever the process's language (NOB-16).
export function campaignPlaces(
  offer: Offer,
  others: readonly Offer[],
): NonNullable<Offer["m"]> {
  const seen = new Set([fold(offer.ci)]);
  const out: NonNullable<Offer["m"]> = [];
  for (const other of others) {
    const key = fold(other.ci);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(other.g ? [other.ci, ...other.g] : [other.ci]);
  }
  return out.toSorted((a, b) => a[0].localeCompare(b[0], "es"));
}

// The titles, employer and place with what one reading left escaped, written out: 2,448 entities
// showed on the legacy's site as written ("Project &#038; Service Manager").
const ESCAPED = [
  "t",
  "te",
  "ts",
  "tc",
  "tf",
  "tn",
  "td",
  "c",
  "l",
  "ci",
] as const;
export function unescaped(offer: Offer): Offer {
  let out = offer;
  for (const field of ESCAPED) {
    const was = out[field];
    if (typeof was !== "string" || !was.includes("&")) continue;
    const value = decodeFully(was);
    if (value !== was) out = { ...out, [field]: value };
  }
  return out;
}
