import { shownTitle } from "../../shared/kit/shown-title.js";
import type { StoredAdvert } from "../../shared/schemas/advert.js";
import type { Offer } from "../../shared/schemas/published/offer.js";
import type { SourceKind } from "../../shared/schemas/source.js";
import type { AdvertFacts } from "../advert-facts/index.js";
import { calmTitle, spellingsOf } from "../../shared/kit/calm-titles.js";
import type { DirectoryOffer } from "../companies/index.js";
import {
  agenciesByShare,
  companyKey,
  createEmployerReader,
} from "../companies/index.js";
import {
  type DedupeAdvert,
  dedupe,
  placeKey,
  withoutTaken,
} from "../dedupe/index.js";
import {
  CLOSED,
  HYGIENE,
  OUTSIDE_EUROPE,
  type GateDecision,
  type GateInput,
} from "../gate/index.js";
import type { AdvertPay, PayInput } from "../pay/index.js";
import {
  FOR_A_CLIENT,
  type PlaceInput,
  type Placement,
} from "../places/index.js";
import { advertDays } from "./labels/days.js";
import {
  applyTitles,
  LANGUAGES,
  TITLE_FIELD,
} from "../title-translation/index.js";
import { campaignPlaces, located, offerOf, unescaped } from "./offer.js";
import { tidyTitle } from "./tidy-titles.js";
import type { StoreReading } from "./read-store.js";

// The steps in the legacy's order over what the store gave (plan section 2): each advert placed,
// gated, named, read for its facts, pay and days, and given its title as published; then, over
// every source, the expired and year-old offers out, the copies of an advert taken down, the
// duplicates, the campaigns' other towns, the titles in capitals and what was left escaped.

export interface BuildSteps {
  readonly gate: { decide(advert: GateInput): GateDecision };
  readonly placer: {
    place(input: PlaceInput): Placement;
    namedPlace(
      input: Pick<PlaceInput, "country" | "location" | "city" | "title"> & {
        readonly company?: string;
        readonly url?: string;
      },
    ): { readonly country: string; readonly town: string };
  };
  readonly facts: { facts(advert: StoredAdvert): AdvertFacts };
  readonly pay: { pay(advert: PayInput): AdvertPay | null };
}

// An advert taken down, remembered by what its copies are matched on, so they stay out after the
// scrapper has swept it from the store; kept while its address is in the takedowns list.
export interface TakenRecord {
  readonly url: string;
  readonly company: string;
  readonly title: string;
  readonly language?: string | undefined;
  readonly place: string;
}

export interface BuildInput {
  readonly reading: StoreReading;
  readonly steps: BuildSteps;
  // Each source's kind (the registry's), for which copy dedupe keeps.
  readonly kinds: ReadonlyMap<string, SourceKind>;
  // The sources whose terms forbid altering their content: their titles stay as written.
  readonly untranslated: ReadonlySet<string>;
  // The skilled trades' families: their offers are published, apart from the main occupations'.
  readonly optionalFamilies: ReadonlySet<string>;
  // The adverts taken down remembered from earlier builds, and whether an address is still taken.
  readonly remembered: readonly TakenRecord[];
  readonly stillTaken: (url: string) => boolean;
  readonly today: string;
  // Called at the end of each stage, for the log.
  readonly stage?: (name: string) => void;
  // Each language's cache of translated titles (the translator's), by language.
  readonly caches?: Readonly<Record<string, ReadonlyMap<string, string>>>;
}

export interface BuildCounts {
  found: number;
  outsideVertical: number;
  outsideEurope: number;
  hygiene: number;
  closed: number;
  noLink: number;
  stale: number;
  expired: number;
  old: number;
  withdrawn: number;
}

export interface Built {
  // Every offer kept, the skilled trades' too, in dedupe's order.
  readonly offers: readonly Offer[];
  // Each offer's placement by its id, and those of the copies a campaign stands for: the towns in use.
  readonly placements: ReadonlyMap<string, Placement>;
  readonly campaignPlacements: readonly Placement[];
  // The offers as the directory and the cards read them.
  readonly directory: readonly DirectoryOffer[];
  readonly counts: BuildCounts;
  readonly duplicates: { readonly sameUrl: number; readonly sameRole: number };
  readonly taken: readonly TakenRecord[];
  // Whether an offer is in a main family (not only the skilled trades').
  readonly inMain: (offer: Offer) => boolean;
}

const DAY_MS = 86_400_000;
const MODE_NAME: Readonly<Record<string, string>> = {
  o: "onsite",
  h: "hybrid",
  r: "remote",
};

interface Read {
  offer: Offer;
  placement: Placement;
  place: string;
  kind: SourceKind;
  // Its text places staff with a client (the legacy's `fc`, for the build alone).
  forClient: boolean;
}

// The legacy's dedupe placed an advert by the town its location names (placeKey's GeoNames town),
// else by its country and the town as written: a town read from the text is placed later.
const dedupePlace = (offer: Offer, placement: Placement) =>
  placeKey({
    geonameId:
      placement.from === "location" ? placement.town?.geonameId : undefined,
    country: offer.cc,
    town: offer.ci,
  });

export function build(input: BuildInput): Built {
  const { reading, steps, today } = input;
  const counts: BuildCounts = {
    found: reading.counts.found,
    outsideVertical: 0,
    outsideEurope: 0,
    hygiene: 0,
    closed: 0,
    noLink: reading.counts.noLink,
    stale: reading.counts.stale,
    expired: 0,
    old: 0,
    withdrawn: reading.counts.withdrawn,
  };
  const oldest = new Date(Date.parse(`${today}T00:00:00Z`) - 365 * DAY_MS)
    .toISOString()
    .slice(0, 10);
  const takenBySource = new Map<string, StoredAdvert[]>();
  for (const advert of reading.taken)
    takenBySource.set(advert.source, [
      ...(takenBySource.get(advert.source) ?? []),
      advert,
    ]);

  const read: Read[] = [];
  const taken: TakenRecord[] = [];
  // The town the place names, and the country it names: the advert is placed and published in that one (the legacy's
  // false towns: a Polish board's «Niemcy» is in Germany).
  const named = (advert: StoredAdvert) =>
    steps.placer.namedPlace({
      country: advert.country,
      location: advert.location,
      city: advert.city,
      title: advert.title,
      company: advert.company,
      url: advert.url,
    });
  const passOf = new Map(
    reading.passes.map((pass) => [pass.source, pass.adverts]),
  );
  // A source's names as its adverts write them, read over all its adverts (the legacy's file).
  const employerReader = (source: string) =>
    createEmployerReader([
      ...(passOf.get(source) ?? []),
      ...(takenBySource.get(source) ?? []),
    ]);
  for (const [source, adverts] of takenBySource) {
    const employerOf = employerReader(source);
    for (const advert of adverts) {
      const where = named(advert);
      const town = where.town;
      const placement = steps.placer.place({
        ...advert,
        country: where.country,
        agency: false,
      });
      taken.push({
        url: advert.url,
        company: employerOf(advert, town).name,
        title: shownTitle(advert.title),
        language: advert.language,
        place: placeKey({
          geonameId:
            placement.from === "location"
              ? placement.town?.geonameId
              : undefined,
          country: where.country,
          town: placement.town?.name ?? town,
        }),
      });
    }
  }
  for (const pass of reading.passes) {
    const kind = input.kinds.get(pass.source) ?? "feed";
    const employerOf = employerReader(pass.source);
    for (const advert of pass.adverts) {
      const decision = steps.gate.decide(advert);
      if (!decision.kept) {
        if (decision.reason.startsWith(HYGIENE)) counts.hygiene++;
        else if (decision.reason === CLOSED) counts.closed++;
        else if (decision.reason === OUTSIDE_EUROPE) counts.outsideEurope++;
        else counts.outsideVertical++;
        continue;
      }
      const where = named(advert);
      const town = where.town;
      const employer = employerOf(advert, town);
      const placed =
        where.country === advert.country
          ? advert
          : { ...advert, country: where.country };
      const placement = steps.placer.place({
        ...placed,
        agency: employer.agency,
      });
      const facts = steps.facts.facts(advert);
      const offer = offerOf({
        advert: placed,
        title: shownTitle(advert.title),
        employer,
        placement,
        townNamed: town,
        families: decision.families,
        occupations: decision.occupations,
        facts,
        pay: steps.pay.pay(advert),
        days: advertDays(advert, today),
      });
      if (offer.x && offer.x < today) {
        counts.expired++;
        continue;
      }
      // An advert posted over a year ago is one nobody took down; one that names no day counts
      // from the first day it was in the store.
      const day = offer.d || offer.fs;
      if (day && day < oldest) {
        counts.old++;
        continue;
      }
      read.push({
        offer,
        placement,
        place: dedupePlace(offer, placement),
        kind,
        forClient: FOR_A_CLIENT.test(advert.description),
      });
    }
  }
  input.stage?.("store and steps");

  // Every copy of an advert taken down, whatever source carries it: those found now and those
  // remembered, while the list still names them.
  const remembered = [
    ...new Map(
      [...input.remembered, ...taken]
        .filter((record) => input.stillTaken(record.url))
        .map((record) => [JSON.stringify(record), record]),
    ).values(),
  ];
  const untaken = withoutTaken(
    read.map((item) => ({
      ...item,
      company: item.offer.c,
      title: item.offer.t,
      language: item.offer.tl,
    })),
    remembered,
  );
  counts.withdrawn += read.length - untaken.length;

  const items = untaken.map(
    (item, index): DedupeAdvert & { readonly read: Read } => ({
      read: item,
      id: String(index),
      url: item.offer.u,
      kind: item.kind,
      company: item.offer.c,
      title: item.offer.t,
      language: item.offer.tl,
      country: item.offer.cc,
      city: item.offer.ci,
      place: item.place,
      posted: item.offer.d,
      workMode: item.offer.w ? MODE_NAME[item.offer.w] : undefined,
      pay: item.offer.p ? { p: item.offer.p, pa: item.offer.pa } : undefined,
      expires: item.offer.x,
      years: item.offer.y,
    }),
  );
  const deduped = dedupe(items);
  input.stage?.("duplicates");

  // The copy kept with what it inherits (in the legacy's order: mode, pay, last day, years), and a
  // campaign's other towns.
  const placements = new Map<string, Placement>();
  const campaignPlacements: Placement[] = [];
  let offers = deduped.kept.map(({ advert, alsoAt }) => {
    let offer = advert.read.offer;
    const mode =
      advert.workMode === undefined
        ? undefined
        : { onsite: "o", hybrid: "h", remote: "r" }[advert.workMode];
    if (!offer.w && mode) offer = { ...offer, w: mode as Offer["w"] };
    if (!offer.p && advert.pay) {
      const pay = advert.pay as { p: Offer["p"]; pa?: number };
      offer = { ...offer, p: pay.p, ...(pay.pa ? { pa: pay.pa } : {}) };
    }
    if (!offer.x && advert.expires) offer = { ...offer, x: advert.expires };
    if (!offer.y && advert.years) offer = { ...offer, y: advert.years };
    offer = located(offer, advert.read.placement);
    if (alsoAt.length) {
      const m = campaignPlaces(
        offer,
        alsoAt.map((copy) => located(copy.read.offer, copy.read.placement)),
      );
      if (m.length) offer = { ...offer, m };
      for (const copy of alsoAt) campaignPlacements.push(copy.read.placement);
    }
    placements.set(offer.id, advert.read.placement);
    return offer;
  });

  // The employers that place staff with clients, by the share of their adverts that say so (the legacy's agencies.ts).
  const byShare = agenciesByShare(
    offers.map((offer, at) => ({
      company: offer.c,
      agency: offer.ag === 1,
      forClient: deduped.kept[at]?.advert.read.forClient ?? false,
    })),
    companyKey,
  );
  offers = offers.map((offer, at) =>
    byShare.has(at) ? { ...offer, ag: 1 } : offer,
  );

  // Each title in the site's languages from the caches (a copy of each offer, which applyTitles
  // fills), then what one reading left escaped written out, then the titles in capitals brought
  // down by how the build's titles, in every language, write each word; a source that forbids
  // altering its content keeps its own (the legacy's applyTitles, unescapeRecords, calmTitles).
  const copies = offers.map(
    (offer) => ({ ...offer }) as Offer & Record<string, unknown>,
  );
  for (const target of LANGUAGES)
    applyTitles(copies, {
      target,
      cache: input.caches?.[target] ?? new Map(),
      untranslated: input.untranslated,
    });
  offers = copies.map(unescaped);
  const titleFields = [
    "t",
    ...LANGUAGES.map((language) => TITLE_FIELD[language]),
  ] as const;
  const spellings = spellingsOf(
    offers.flatMap((offer) =>
      titleFields
        .map((field) => offer[field])
        .filter((title): title is string => Boolean(title)),
    ),
  );
  offers = offers.map((offer) => {
    if (input.untranslated.has(offer.s)) return offer;
    let out = offer;
    for (const field of titleFields) {
      const title = offer[field];
      if (!title) continue;
      const calm = calmTitle(title, spellings);
      if (calm !== title) out = { ...out, [field]: calm };
    }
    return out;
  });
  // Then every title without its gender mark or the advert's number, after the translations, which are cached by the
  // title as written; a title that is only its mark or its number keeps them (the legacy's tidyTitles).
  offers = offers.map((offer) => {
    if (input.untranslated.has(offer.s)) return offer;
    let out = offer;
    for (const field of titleFields) {
      const title = offer[field];
      if (!title) continue;
      const tidied = tidyTitle(title);
      if (tidied && tidied !== title) out = { ...out, [field]: tidied };
    }
    return out;
  });
  input.stage?.("titles");

  const inMain = (offer: Offer) =>
    offer.f.some((family) => !input.optionalFamilies.has(family));
  const PERIOD_NAME = { y: "y", m: "m", w: "w", d: "d", h: "h" } as const;
  const directory = offers.map((offer): DirectoryOffer => ({
    employer: offer.c,
    families: offer.f,
    country: offer.cc,
    town: offer.ci,
    nuts: offer.n ?? null,
    pay: offer.p
      ? {
          low: offer.p[0],
          high: offer.p[1],
          currency: offer.p[2],
          period: PERIOD_NAME[offer.p[3]],
        }
      : null,
    workMode: offer.w ? (MODE_NAME[offer.w] ?? null) : null,
  }));
  return {
    offers,
    placements,
    campaignPlacements,
    directory,
    counts,
    duplicates: { sameUrl: deduped.sameUrl, sameRole: deduped.sameRole },
    taken: remembered,
    inMain,
  };
}
