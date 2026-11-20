import type { KeptRegisterCompany } from "../../shared/storage/registers-file.js";
import {
  cleanName,
  companyKey,
  displayName,
  townKey,
  usable,
} from "./company-key.js";
import {
  type CompanyRow,
  type DirectoryOffer,
  mainCountry,
} from "./directory.js";
import type { Registered } from "./register-join.js";

// What a company's card shows beyond its row of the directory (legacy builder/company-cards.mjs,
// without the careers page, which comes with 016-career-sites): what its register says (activity,
// size, which register), the register companies that belong to it, and what its offers say of it
// (what it hires for, where, the pay and the work mode its adverts state). Each field only when
// there is something to say.
export interface CompanyCard {
  // [group, offers] of the three occupation groups it hires most for.
  groups?: [string, number][];
  // [occupation family, offers] of the six it hires most for.
  families?: [string, number][];
  // [town, country, offers] of the three towns with most of its offers ("" for offers placed in a
  // country only), and in how many towns it has offers.
  towns?: [string, string, number][];
  townCount?: number;
  // [low, high, currency, period, adverts stating a pay].
  pay?: [number, number, string, string, number];
  // Adverts saying remote, hybrid and on site.
  modes?: [number, number, number];
  // From the register: its activity's class, the register, the people it employs.
  activity?: string;
  register?: string;
  people?: number;
  // [name, town, register] of the register companies that belong to the employer.
  companies?: [string, string, string][];
  // For a register company: the employer it belongs to, that employer's offers in its town today,
  // and its website.
  employer?: string;
  offersInTown?: number;
  website?: string;
}

// The order of the modes' counts.
export const CARD_MODES = ["remote", "hybrid", "onsite"] as const;

// The key a card is filed under: an employer's name; a register company's country and name, so
// "Siemens SA" of Madrid does not read Siemens's card (legacy app/lib/company-key.ts cardKey).
export const cardKey = (name: unknown, country = ""): string =>
  country ? `${country}:${companyKey(name)}` : companyKey(name);

// The employer an offer names, keyed as the directory's rows are: none for a name that is not one.
const employerOf = (name: string) => {
  const clean = cleanName(name);
  return usable(clean) ? companyKey(clean) : "";
};

interface Tally {
  groups: Map<string, number>;
  families: Map<string, number>;
  towns: Map<string, { n: number; name: string; country: string }>;
  pay: Map<string, (readonly [number, number])[]>;
  paid: number;
  modes: [number, number, number];
}

const tally = (): Tally => ({
  groups: new Map(),
  families: new Map(),
  towns: new Map(),
  pay: new Map(),
  paid: 0,
  modes: [0, 0, 0],
});
const bump = (counts: Map<string, number>, key: string) =>
  counts.set(key, (counts.get(key) ?? 0) + 1);
const SMALL = /\p{Ll}/u;

// What one offer says of its employer. Each offer counts once in an occupation group, however many
// of its families are in it. A town is keyed as the directory keys towns, and said as its first
// offer written in small letters writes it ("Berlin", not "BERLIN").
function count(
  t: Tally,
  offer: DirectoryOffer,
  groupOf: (family: string) => string,
) {
  for (const group of new Set(offer.families.map(groupOf).filter(Boolean)))
    bump(t.groups, group);
  for (const family of new Set(offer.families)) bump(t.families, family);
  // An offer with no town is placed by its country; one with neither is not placed.
  if (offer.town || (offer.country && offer.country !== "zz")) {
    const town = `${offer.country}|${offer.town ? townKey(offer.town) : ""}`;
    const said = t.towns.get(town) ?? {
      n: 0,
      name: "",
      country: offer.country,
    };
    said.n++;
    if (
      offer.town &&
      (!said.name || (!SMALL.test(said.name) && SMALL.test(offer.town)))
    )
      said.name = offer.town;
    t.towns.set(town, said);
  }
  const pay = offer.pay;
  if (pay && Number.isFinite(pay.low) && Number.isFinite(pay.high)) {
    t.paid++;
    const kind = `${pay.currency}|${pay.period}`;
    const list = t.pay.get(kind) ?? [];
    list.push([pay.low, pay.high]);
    t.pay.set(kind, list);
  }
  const mode = CARD_MODES.indexOf(
    offer.workMode as (typeof CARD_MODES)[number],
  );
  if (mode >= 0) t.modes[mode] = (t.modes[mode] ?? 0) + 1;
}

const top = (counts: Map<string, number>, k: number): [string, number][] =>
  [...counts].toSorted((a, b) => b[1] - a[1]).slice(0, k);

// The pay its adverts state, in the currency and period most of them use: from the lowest to the
// highest figure, or, with five adverts or more, without the lowest and the highest tenth and never
// without less than one of each, so one advert's slip (a monthly pay written as yearly) does not
// stretch it: rounding the tenth kept the ends of five and six adverts (DAB-13).
const share = (sorted: readonly number[], q: number): number =>
  sorted[
    q < 0.5
      ? Math.max(1, Math.floor(q * sorted.length))
      : Math.min(sorted.length - 2, Math.ceil(q * sorted.length) - 1)
  ] ?? 0;

function payRange(t: Tally): [number, number, string, string, number] | null {
  const [kind, list] =
    [...t.pay].toSorted((a, b) => b[1].length - a[1].length)[0] ?? [];
  if (!kind || !list) return null;
  // A ceiling alone (its low 0) says nothing of the bottom: its top stands for it.
  const lows = list.map(([low, high]) => low || high).toSorted((a, b) => a - b);
  const highs = list.map(([, high]) => high).toSorted((a, b) => a - b);
  const [low = 0, high = 0] =
    list.length >= 5
      ? [share(lows, 0.1), share(highs, 0.9)]
      : [lows[0], highs.at(-1)];
  const [currency = "", period = ""] = kind.split("|");
  return [low, Math.max(low, high), currency, period, t.paid];
}

function summary(t: Tally): CompanyCard {
  const out: CompanyCard = {};
  if (t.groups.size) out.groups = top(t.groups, 3);
  if (t.families.size) out.families = top(t.families, 6);
  if (t.towns.size) {
    out.towns = [...t.towns.values()]
      .toSorted((a, b) => b.n - a.n)
      .slice(0, 3)
      .map((town) => [town.name, town.country, town.n]);
    out.townCount = t.towns.size;
  }
  const pay = payRange(t);
  if (pay) out.pay = pay;
  if (t.modes.some(Boolean)) out.modes = t.modes;
  return out;
}

const fromRegister = (company: KeptRegisterCompany): CompanyCard => ({
  activity: company.nace.replace(/^(\d{4})\d+$/, "$1"),
  register: company.register,
  ...(company.people ? { people: company.people } : {}),
});

// The cards, by card key. An employer's own count is its row's. A company of the same name gives
// the employer's card its activity and size when it is in the country most of the employer's
// offers are in, as it gives the row its town; one of another country is named among its
// companies. The offers that count are those the directory counts (`counted`).
export function companyCards({
  employers,
  joined,
  offers,
  counted = () => true,
  groupOf = () => "",
}: {
  readonly employers: readonly CompanyRow[];
  readonly joined: Pick<Registered, "same" | "listed">;
  readonly offers: Iterable<DirectoryOffer>;
  readonly counted?: (offer: DirectoryOffer) => boolean;
  readonly groupOf?: (family: string) => string;
}): Map<string, CompanyCard> {
  const cards = new Map<string, CompanyCard>();
  const card = (key: string) => {
    let found = cards.get(key);
    if (!found) cards.set(key, (found = {}));
    return found;
  };
  const keyOf = new Map(employers.map((row) => [row, companyKey(row.name)]));
  const employerKeys = new Set(keyOf.values());
  for (const [row, company] of joined.same) {
    const mine = card(keyOf.get(row) ?? "");
    if (mainCountry(row.places) === company.country)
      Object.assign(mine, fromRegister(company));
    else
      (mine.companies ??= []).push([
        displayName(cleanName(company.name)),
        company.town,
        company.register,
      ]);
  }
  // Each employer's register companies by their town, where its offers count for them.
  const inTown = new Map<string, Map<string, CompanyCard[]>>();
  for (const [company, item, row] of joined.listed) {
    const listedCard = Object.assign(
      card(cardKey(company.name, company.country)),
      fromRegister(company),
      item[3] ? { website: item[3] } : {},
    );
    if (!row) continue;
    const key = keyOf.get(row) ?? "";
    const town = `${company.country}|${townKey(company.town)}`;
    Object.assign(listedCard, { employer: row.name, offersInTown: 0 });
    (card(key).companies ??= []).push([
      item[0],
      company.town,
      company.register,
    ]);
    const towns = inTown.get(key) ?? new Map<string, CompanyCard[]>();
    towns.set(town, [...(towns.get(town) ?? []), listedCard]);
    inTown.set(key, towns);
  }
  // What each employer's offers say of it, and its offers in each of its register companies' towns.
  const keys = new Map<string, string>();
  const tallies = new Map<string, Tally>();
  for (const offer of offers) {
    if (!counted(offer)) continue;
    if (!keys.has(offer.employer))
      keys.set(offer.employer, employerOf(offer.employer));
    const key = keys.get(offer.employer) ?? "";
    if (!employerKeys.has(key)) continue;
    let t = tallies.get(key);
    if (!t) tallies.set(key, (t = tally()));
    count(t, offer, groupOf);
    const towns = inTown.get(key);
    if (!towns || !offer.town) continue;
    for (const listedCard of towns.get(
      `${offer.country}|${townKey(offer.town)}`,
    ) ?? [])
      listedCard.offersInTown = (listedCard.offersInTown ?? 0) + 1;
  }
  for (const [key, t] of tallies) Object.assign(card(key), summary(t));
  return new Map(
    [...cards].filter(([, found]) => Object.keys(found).length > 0),
  );
}
