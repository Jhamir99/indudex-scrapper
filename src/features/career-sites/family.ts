import { createHash } from "node:crypto";
import type {
  AdapterContext,
  AdvertDraft,
  SourceAdapter,
} from "../crawl-core/ports.js";
import {
  countryNames,
  type CountryNames,
  placeCountry,
} from "../../shared/catalogues/country-names.js";
import { modeWord } from "../../shared/kit/mode-words.js";
import { statedPay } from "../../shared/kit/stated-pay.js";
import {
  DESCRIPTION_LIMIT,
  SOURCE_FIELD_LIMIT,
} from "../../shared/schemas/advert.js";
import type { Licence, SourceKind } from "../../shared/schemas/source.js";
import { languagesOfCountry } from "../../shared/words/country-languages.js";
import { withDetails } from "./legacy/board-details.js";
import {
  ATS,
  type BoardAdvert,
  type Company,
  readBoard,
  wrapBoardAdvert,
} from "./legacy/boards.js";
import {
  licence as careersLicence,
  readSite,
  siteKey,
  useShown,
  type Site,
  type SiteStore,
} from "./legacy/careers.js";
import { withPass, type PassTools } from "./legacy/pass.js";
import type { RawOffer } from "./legacy/raw-offer.js";
import type { BoardPlatform, CareerSite, CompanyBoard } from "./lists.js";

// One source per entry of the lists (career sites FR-1, FR-12): a careers site read by the legacy's careers reader, a
// company's board by its board reader, each in a pass of its own with the source's polite client, the gate's reading and
// the page facts bound (`withPass`). What the reader keeps between passes lives in the source's memory: a site's
// resolved way in and its pages, a board's vacancies already asked for their details.

const KIND: SourceKind = "careers";

// A source's id from a legacy key: lower case, its dots kept between letters and digits, anything else a dash.
const idPart = (key: string): string =>
  key
    .toLowerCase()
    .split(".")
    .map((part) => part.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""))
    .filter(Boolean)
    .join(".");
const hash = (key: string) =>
  createHash("sha1").update(key).digest("hex").slice(0, 6);
export const siteSourceId = (site: Site): string =>
  `careers.${idPart(siteKey(site)) || hash(siteKey(site))}`;
export const boardSourceId = (platform: string, slug: string): string =>
  `${platform}.${idPart(slug) || hash(slug)}`;

const licenceOf = (legacy: {
  name: string;
  short: string;
  url: string;
  licence: string;
  credit: string;
}): Licence => ({
  name: legacy.name,
  short: legacy.short,
  url: legacy.url,
  licence: legacy.licence,
  credit: legacy.credit || null,
});

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const words = (value: unknown): string | undefined => {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const text = String(value).trim().slice(0, SOURCE_FIELD_LIMIT).trim();
  return text || undefined;
};

// The country of a reader's advert: what its place, title and address name, the world over, its stated country
// weighed in ("" when nothing can be read).
export type CountryOfRaw = (raw: RawOffer) => string;

// The legacy processor's reading of the country, handed in by the entry point (places' `countryOf`); without it (a
// test's), a country's name or a big town of its place (`placeCountry`), else its stated one.
export const countryOfRaw = (
  context: Pick<AdapterContext, "countryOf">,
  names: CountryNames | undefined,
): CountryOfRaw =>
  context.countryOf
    ? (raw) =>
        context.countryOf!({
          url: String(raw.url || ""),
          title: String(raw.title || ""),
          company: String(raw.company || ""),
          location: String(raw.location || ""),
          city: String(raw.city || ""),
          ...(raw.country ? { country: raw.country } : {}),
          ...(raw.lang ? { lang: String(raw.lang) } : {}),
          ...(modeWord(raw.mode) ? { mode: modeWord(raw.mode) } : {}),
        }).country
    : (raw) =>
        raw.country ||
        (names ? placeCountry(String(raw.location || ""), names) : "");

// A legacy reader's advert as crawl-core's draft, or nothing where the store could not keep it (no https address, no
// title). The country is read as the legacy's processor read it (`countryOf`): its place, its title, its address and
// the country it states, the world over; "zz" when nothing can be read (the processor leaves out such a board's advert
// unless its title is marked for a market: FR-10), since the store needs one.
export function careerDraft(
  raw: RawOffer,
  source: string,
  countryOf: CountryOfRaw,
): AdvertDraft | undefined {
  const url = String(raw.url || "");
  const title = String(raw.title || "").trim();
  if (!/^https:\/\//i.test(url) || !title) return undefined;
  const location = String(raw.location || "");
  const stated = String(raw.country || "").toLowerCase();
  const read = countryOf({
    ...raw,
    country: /^[a-z]{2}$/.test(stated) ? stated : "",
  });
  const country = /^[a-z]{2}$/.test(read) ? read : "zz";
  const mode = modeWord(raw.mode);
  const language = /^[a-z]{2}$/.test(String(raw.lang || ""))
    ? String(raw.lang)
    : (languagesOfCountry(country)[0] ?? "en");
  const isco = String(raw.codes?.isco ?? "");
  const ssyk = String(raw.codes?.ssyk ?? "");
  const contract = words(raw.contract);
  const hours = words(raw.hours);
  const types = (Array.isArray(raw.employmentType) ? raw.employmentType : [])
    .map(words)
    .filter((one): one is string => Boolean(one))
    .slice(0, 10);
  const years = Number(raw.years);
  const pay = statedPay(raw.pay);
  return {
    source,
    sourceId: String(raw.sourceId || url),
    title,
    company: String(raw.company || ""),
    location,
    country,
    city: String(raw.city || ""),
    remote: Boolean(raw.remote) || mode === "remote",
    ...(mode ? { workMode: mode } : {}),
    url,
    description: String(raw.description || "").slice(0, DESCRIPTION_LIMIT),
    ...(DAY.test(String(raw.posted || ""))
      ? { posted: String(raw.posted) }
      : {}),
    ...(DAY.test(String(raw.expires || ""))
      ? { expires: String(raw.expires) }
      : {}),
    occupationCodes: {
      ...(/^\d{4}$/.test(isco) ? { isco } : {}),
      ...(ssyk ? { ssyk } : {}),
    },
    language,
    ...(contract ? { contract } : {}),
    ...(hours ? { hours } : {}),
    ...(types.length ? { employmentType: types } : {}),
    ...(raw.years !== undefined &&
    Number.isFinite(years) &&
    years >= 0 &&
    years <= 60
      ? { years }
      : {}),
    ...(pay ? { pay } : {}),
  };
}

// The draft back as the legacy's reader kept it, for what a pass reads of the last one (a board's details).
const asRaw = (draft: AdvertDraft): RawOffer => ({
  ...draft,
  ...(draft.workMode ? { mode: draft.workMode } : {}),
  lang: draft.language,
  codes: draft.occupationCodes,
});

// Each draft once by its id within a read: a board that lists one vacancy once per place under one id (Workable) keeps
// each copy by its address, as the legacy kept its records by address.
function* uniquely(
  drafts: Iterable<AdvertDraft | undefined>,
): Generator<AdvertDraft> {
  const seen = new Set<string>();
  for (const draft of drafts) {
    if (!draft) continue;
    const sourceId = seen.has(draft.sourceId) ? draft.url : draft.sourceId;
    if (seen.has(sourceId)) continue;
    seen.add(sourceId);
    yield sourceId === draft.sourceId ? draft : { ...draft, sourceId };
  }
}

const toolsOf = (context: AdapterContext): PassTools => ({
  http: context.http,
  isOurs: (title, country, language) =>
    context.isOurs(title, country, language),
  pageFacts: (html) => context.pageFacts(html),
});
// A memory as JSON keeps it: what the readers keep holds no function and no undefined.
const asJson = (value: unknown) => JSON.parse(JSON.stringify(value ?? {}));

let names: Promise<CountryNames> | undefined;
const theNames = () => (names ??= countryNames());

// A pass ends with what it read: a careers site stops reading pages a minute before its deadline (a quarter of the time
// for a short one), as the legacy's `readWithDeadline` gave it.
const MINUTE_MS = 60_000;
const until = (deadlineMs: number) =>
  Date.now() + deadlineMs - Math.min(MINUTE_MS, deadlineMs / 4);

// A board's deadline, as the legacy's sources.ts and `sizedDeadline` gave it: its platform's own, else two minutes for
// one the scout found (five on the platforms whose boards may list thousands), else five; grown with the vacancies it
// held at its last read, about 0.35 s each at the paced crawl and the texts of 200 new ones a second apart, up to 25
// minutes (five minutes left the boards of 2,000 vacancies failing every pass, 5 to 9 November 2026).
const SOURCE_DEADLINE_MS = 5 * MINUTE_MS;
const BIG_BOARDS = new Set(["workday", "smartrecruiters"]);
export const SECONDS_A_VACANCY = 0.35;
export function boardDeadline(
  platform: string,
  found: boolean,
  adverts: number,
): number {
  const own =
    ATS[platform]?.deadlineMs ||
    (found && !BIG_BOARDS.has(platform) ? 120_000 : SOURCE_DEADLINE_MS);
  if (!adverts) return own;
  return Math.min(
    25 * MINUTE_MS,
    Math.max(
      own,
      90_000 + Math.round(adverts * SECONDS_A_VACANCY * 1000) + 200_000,
    ),
  );
}

// What a careers site remembers between passes: the way in it worked out and the pages it read.
export type SiteMemory = Pick<
  SiteStore,
  "resolved" | "pages" | "pass" | "name" | "collapsed"
>;

export function siteSource(
  entry: CareerSite,
  disabledReason?: string,
): SourceAdapter {
  const site = entry as Site;
  const id = siteSourceId(site);
  const deadlineMs = entry.found ? 400_000 : 900_000;
  return {
    // JOIN's companies share one host: a group of their own, as the legacy's.
    ...(entry.platform === "join" ? { group: "join" } : {}),
    deadlineMs: () => deadlineMs,
    definition: {
      id,
      kind: KIND,
      licence: licenceOf(careersLicence),
      needsCredentials: false,
      credentialVariables: [],
      ...(disabledReason ? { disabledReason } : {}),
    },
    async *fetchAdverts(context) {
      // The vacancies the site shows, as the legacy's reader reads them (`useShown`): null, all of them.
      useShown(context.shown as Set<string> | null);
      const memory = (context.memory ?? {}) as SiteMemory;
      const store: SiteStore = { ...memory, adverts: [...context.previous] };
      // The run's pages, as the legacy's reader spends them (`budget.left`, one taken a page).
      const run = context.pageBudget;
      // A long queue reads its own pages, a page a second (`gapMs`, asked of the polite client).
      const budget = {
        get left() {
          return run.left;
        },
        set left(value: number) {
          while (run.left > value && run.take());
        },
        ...(context.longQueue
          ? {
              pagesASite: context.longQueue.pagesASite,
              gapMs: context.longQueue.gapMs,
            }
          : {}),
      };
      const read = await withPass(toolsOf(context), () =>
        readSite(site, store, budget, context.log, {
          until: until(context.deadlineMs ?? deadlineMs),
        }),
      );
      if (read.postponed) {
        context.postpone();
        return;
      }
      context.remember(
        asJson({
          resolved: store.resolved,
          pages: store.pages,
          pass: { ok: true },
          ...(store.name ? { name: store.name } : {}),
          ...(store.collapsed ? { collapsed: store.collapsed } : {}),
        }),
      );
      if (read.backlog) context.backlog(read.backlog, read.answered);
      if (read.barren) context.barren();
      const countryOf = countryOfRaw(context, await theNames());
      yield* uniquely(
        read.adverts.map((raw) => careerDraft(raw as RawOffer, id, countryOf)),
      );
    },
  };
}

// What a board remembers between passes: the vacancies asked for their page, with the version of the rule they were
// asked under (the legacy's `detailed`), by address.
type BoardMemory = { readonly details?: Readonly<Record<string, number>> };

export function boardSource(
  company: CompanyBoard,
  platform: BoardPlatform,
  disabledReason?: string,
): SourceAdapter {
  const slug = String(company[platform]);
  const id = boardSourceId(platform, slug);
  const board = ATS[platform];
  return {
    deadlineMs: ({ adverts }) =>
      boardDeadline(platform, Boolean(company.found), adverts),
    definition: {
      id,
      kind: KIND,
      licence: licenceOf(
        board?.licence ?? {
          name: platform,
          short: platform,
          url: "https://schema.org/JobPosting",
          licence: "Public job board",
          credit: "",
        },
      ),
      needsCredentials: false,
      credentialVariables: [],
      ...(disabledReason ? { disabledReason } : {}),
    },
    async *fetchAdverts(context) {
      const tools = toolsOf(context);
      const listed: BoardAdvert[] = await withPass(tools, () =>
        readBoard(
          platform,
          slug,
          company.name,
          company.found ? { tries: 1, timeoutMs: 10_000 } : {},
        ),
      );
      const wrapped = listed.map((one) =>
        wrapBoardAdvert(platform, company as Company, one),
      );
      const details = ((context.memory ?? {}) as BoardMemory).details ?? {};
      const previous = context.previous.map((draft) => ({
        ...asRaw(draft),
        ...(details[draft.url] ? { detailed: details[draft.url] } : {}),
      }));
      const adverts = await withPass(tools, () =>
        withDetails(platform, wrapped, previous, {
          until: until(
            context.deadlineMs ??
              boardDeadline(platform, Boolean(company.found), 0),
          ),
        }),
      );
      if (board?.detail)
        context.remember(
          asJson({
            details: Object.fromEntries(
              adverts
                .filter((one) => one.detailed)
                .map((one) => [one.url, one.detailed]),
            ),
          }),
        );
      const countryOf = countryOfRaw(context, await theNames());
      yield* uniquely(adverts.map((raw) => careerDraft(raw, id, countryOf)));
    },
  };
}
