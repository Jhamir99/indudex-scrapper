import { advertAddress } from "../../shared/kit/advert-address.js";
import type { SourceKind } from "../../shared/schemas/source.js";
import { jobKey } from "./role.js";

// One copy of each advert across sources (legacy builder/dedupe.mjs): first by address, then by
// the role (company and title) in the same place. An aggregator's copy has another address but the
// same words. A board's copy beats a feed's: it is the page the employer maintains.

// An advert as dedupe reads it, from the steps before: its address and its source's kind, the
// employer's name (companies), the title as published (shownTitle), its language, its country and
// place (places, through placeKey), the day it was posted ("" when none), and what a copy kept
// inherits when it lacks it: the work mode and years (advert facts), the pay (pay), the last day.
export interface DedupeAdvert {
  readonly id: string;
  readonly url: string;
  readonly kind: SourceKind;
  readonly company: string;
  readonly title: string;
  readonly language?: string | undefined;
  readonly country: string;
  readonly place: string;
  readonly posted: string;
  readonly workMode?: string | undefined;
  readonly pay?: unknown;
  readonly expires?: string | undefined;
  readonly years?: number | undefined;
}

// A copy kept: the advert with what it inherits from its other copies, and the copies a campaign or
// a remote job stands for, so the place search finds it in each of their towns.
export interface KeptAdvert<T extends DedupeAdvert> {
  readonly advert: T;
  readonly alsoAt: readonly T[];
}

export interface Deduped<T extends DedupeAdvert> {
  readonly kept: readonly KeptAdvert<T>[];
  // Copies that fell for having the address of another, and for being the same role in its place.
  readonly sameUrl: number;
  readonly sameRole: number;
}

// The legacy's ranks: an employer's careers site or ATS board ("board") over a public feed; a job
// portal and an intermediary ("via") below both.
const RANK: Readonly<Record<SourceKind, number>> = {
  careers: 2,
  feed: 1,
  portal: 0,
  via: 0,
};

// Where an advert is: its GeoNames town, so "Munich" and "München" are one place; else its country
// and the town as written.
export const placeKey = ({
  geonameId,
  country,
  town,
}: {
  readonly geonameId?: number | null | undefined;
  readonly country: string;
  readonly town: string;
}): string =>
  geonameId ? `#${geonameId}` : `${country}|${town.toLowerCase()}`;

// A company and title in more towns than this is one campaign an agency runs everywhere
// ("in any of our locations"), not that many jobs: it stays once per country, and the copies
// it stands for go with it (`alsoAt`) so the place search finds it in each of their towns.
export const CAMPAIGN_TOWNS = 10;
// A job done from anywhere: its source says remote (its work mode), or its title does ("100 % remote", «100 % remoto», «full
// remote», «télétravail complet»).
const REMOTE_TITLE =
  /\b(?:100\s?%\s?(?:remote|remoto|remota|télétravail|teletrabajo|en remoto)|fully remote|full remote|remote only|vollständig remote|komplett remote|télétravail complet|teletrabajo 100)\b/i;
const remoteJob = (advert: DedupeAdvert) =>
  advert.workMode === "remote" || REMOTE_TITLE.test(advert.title);

interface Copy<T> {
  readonly advert: T;
  readonly address: string;
}

// Of two copies, the board's; from the same kind of source, the one posted first, and a copy that
// names no day does not beat one that does; on the same day, the lower address, so the copy kept
// does not hang on the order the sources are read in (NOA-22).
function better<T extends DedupeAdvert>(it: Copy<T>, than: Copy<T>): boolean {
  const rank = RANK[it.advert.kind];
  const thanRank = RANK[than.advert.kind];
  if (rank !== thanRank) return rank > thanRank;
  if (it.advert.posted !== than.advert.posted)
    return (
      !!it.advert.posted &&
      (!than.advert.posted || it.advert.posted < than.advert.posted)
    );
  return it.address < than.address;
}

// What the copy kept does not say and another copy does: the mode, the pay (with its yearly
// euros), the last day to apply, the years asked.
const INHERITED = ["workMode", "pay", "expires", "years"] as const;

function inheriting<T extends DedupeAdvert>(best: T, copies: readonly T[]): T {
  let advert = best;
  for (const field of INHERITED) {
    if (advert[field] !== undefined) continue;
    const said = copies.find((copy) => copy[field] !== undefined);
    if (said) advert = { ...advert, [field]: said[field] };
  }
  return advert;
}

// A place added to a role's set.
const add = (sets: Map<string, Set<string>>, role: string, place: string) => {
  const set = sets.get(role);
  if (set) set.add(place);
  else sets.set(role, new Set([place]));
};

export function dedupe<T extends DedupeAdvert>(
  adverts: readonly T[],
): Deduped<T> {
  // By address: the first read, unless a copy of a higher kind comes after it.
  const byAddress = new Map<string, Copy<T>>();
  let sameUrl = 0;
  for (const advert of adverts) {
    const address = advertAddress(advert.url);
    const before = byAddress.get(address);
    if (before) {
      sameUrl++;
      if (RANK[advert.kind] > RANK[before.advert.kind])
        byAddress.set(address, { advert, address });
      continue;
    }
    byAddress.set(address, { advert, address });
  }
  // Each role's places, and the places a remote copy of it is filed in.
  const roles = new Map<Copy<T>, string>();
  const towns = new Map<string, Set<string>>();
  const remoteAt = new Map<string, Set<string>>();
  for (const copy of byAddress.values()) {
    const role = jobKey(copy.advert);
    roles.set(copy, role);
    if (!role) continue;
    add(towns, role, copy.advert.place);
    if (remoteJob(copy.advert)) add(remoteAt, role, copy.advert.place);
  }
  const kept: KeptAdvert<T>[] = [];
  const groups = new Map<string, { campaign: boolean; copies: Copy<T>[] }>();
  for (const copy of byAddress.values()) {
    const role = roles.get(copy) ?? "";
    if (!role) {
      kept.push({ advert: copy.advert, alsoAt: [] });
      continue;
    }
    // A fully remote job is one job wherever its copies are filed: EWOR's "SaaS Co-Founder / CCO
    // (100 % remote)" stood in fourteen places (1 November 2026). A copy that names no mode, in the
    // place a remote copy of the same job names, is that job: Ashby said remote and the employer's
    // site only Berlin (549 such pairs, 1 November 2026). One that says on site or hybrid is not
    // that remote job (NOA-23).
    const remote =
      remoteJob(copy.advert) ||
      (!copy.advert.workMode &&
        (remoteAt.get(role)?.has(copy.advert.place) ?? false));
    const campaign = remote || (towns.get(role)?.size ?? 0) > CAMPAIGN_TOWNS;
    const key = `${role}@${remote ? "remote" : campaign ? `country ${copy.advert.country}` : copy.advert.place}`;
    const group = groups.get(key);
    if (group) group.copies.push(copy);
    else groups.set(key, { campaign, copies: [copy] });
  }
  let sameRole = 0;
  for (const { campaign, copies } of groups.values()) {
    const best = copies.reduce((a, b) => (better(b, a) ? b : a));
    sameRole += copies.length - 1;
    const others = copies.filter((copy) => copy !== best);
    kept.push({
      advert: inheriting(
        best.advert,
        copies.map((copy) => copy.advert),
      ),
      alsoAt: campaign ? others.map((copy) => copy.advert) : [],
    });
  }
  return { kept, sameUrl, sameRole };
}
