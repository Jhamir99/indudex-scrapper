// ➤ Company boards on applicant-tracking systems with a documented public API: one entry
// ➤ per company in config/companies.yml, the whole board read on every build (absence of
// ➤ an advert means it closed). These boards carry no occupation code, so their adverts
// ➤ are classified by title later. Greenhouse, Ashby, Lever and SmartRecruiters are read
// ➤ with Argus's own parsers (scan.mjs); this file only adds the posting date and the
// ➤ remote flag the bot does not need. Recruitee and Personio have no parser in Argus yet:
// ➤ theirs follow the fields their public API documents.
// The legacy's builder/adapters/boards.ts (JustJans/indudex@ec79858), copied (career sites T002): only its imports changed, and its lists read from config/. Its own
// comments keep their marks.
import { existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import yaml from "./yaml.js";
import {
  LIST_WAIT_MS,
  get,
  getJson,
  getText,
  type GetOptions,
} from "./http.js";
import { robotsOf, allowed, robotsPath } from "./robots.js";
import {
  parseGreenhouse,
  parseAshby,
  parseLever,
  parseSmartRecruiters,
} from "../argus/scan.js";
import {
  modeWord,
  mostFlexible,
  tagMode,
} from "../../../shared/kit/mode-words.js";
import { decodeEntities } from "../../../shared/kit/entities.js";
import { text, TEXT_KEPT } from "./page-text.js";
import { pageName } from "./crawl.js";
import { crawlGapMs } from "./pace.js";
import { sleep } from "./pace.js";
import type { Licence, RawOffer } from "./adapter.js";
import { MINUTE_MS, dayBefore } from "./time.js";

// ➤ An advert as a board lists it: wrapBoardAdvert gives it its source and its company.
export type BoardAdvert = Omit<
  RawOffer,
  "source" | "sourceId" | "title" | "location"
> & {
  sourceId: string;
  title: string;
  location: string;
};
export type BoardOptions = GetOptions & { most?: number };
// ➤ How a platform is read. Each parser takes its platform's answer as that platform documents it.
export type Board = {
  licence: Licence;
  url: (slug: string, offset?: number) => string;
  parse: (answer: unknown, slug: string, company?: string) => BoardAdvert[];
  gapMs?: number;
  xml?: boolean;
  daily?: boolean;
  vendor?: boolean;
  deadlineMs?: number;
  callsAnHour?: number;
  request?: (slug: string, got: number) => GetOptions;
  count?: (answer: unknown) => number;
  more?: (answer: unknown, got: number, first: unknown) => boolean;
  read?: (
    slug: string,
    opts: BoardOptions,
    company?: string,
  ) => Promise<BoardAdvert[]>;
  needsDetail?: (p: BoardAdvert) => boolean;
  detailVersion?: number;
  detail?: (
    p: BoardAdvert,
    opts?: BoardOptions,
  ) => Promise<Partial<BoardAdvert>>;
};
// ➤ A company as the lists name it: its name, its board on each platform, what the lists add.
export type Company = {
  name: string;
  found?: boolean;
  lang?: string;
  country?: string;
} & Record<string, unknown>;
type Pay = { min?: number; max?: number; currency?: string; interval?: string };

const ROOT = dirname(
  dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url))))),
);
const TRAFFIT_PAGE = 100; // ➤ the most Traffit gives in one call

const day = (v: unknown) => {
  const d = v ? new Date(v as string | number) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : "";
};
const remoteWord = (s: unknown) => /remote/i.test(String(s || ""));
// ➤ Where the work is done: `mode` is the board's own field; `modeTag` a LinkedIn tag in the
// ➤ whole advert, read before the text is cut to its first 4,000 characters (the tags sit at
// ➤ the end). builder/work-mode.ts weighs them.
// ➤ Workday says when, not the day: "Posted Today", "Posted Yesterday", "Posted 3 Days Ago", "Posted 30+ Days Ago".
const agoDay = (s: unknown) => {
  const m = String(s || "").match(/(\d+)\+?\s*days?/i);
  const n = /today/i.test(String(s))
    ? 0
    : /yesterday/i.test(String(s))
      ? 1
      : m
        ? Number(m[1])
        : null;
  return n === null ? "" : dayBefore(n);
};
// ➤ HR-Manager writes "/Date(1791583199000+0200)/": milliseconds, then the zone the day is meant
// ➤ in. A day before 1970 ("/Date(-62135596800000)/") is its way of saying none.
const msDay = (s: unknown) => {
  const m = String(s || "").match(/\/Date\((-?\d+)(?:([+-])(\d\d)(\d\d))?\)/);
  if (!m || Number(m[1]) <= 0) return "";
  const shift = m[2]
    ? (m[2] === "-" ? -1 : 1) * (Number(m[3]) * 60 + Number(m[4])) * MINUTE_MS
    : 0;
  return new Date(Number(m[1]) + shift).toISOString().slice(0, 10);
};
// ➤ A Workday slug is "tenant.dc/site" ("aviva.wd1/External"); an Oracle one "host/site".
const wdParts = (slug: string) => {
  const [tenantDc, site] = String(slug).split("/");
  const [tenant, dc = "wd3"] = tenantDc.split(".");
  return [tenant, dc, site || "External"];
};
// ➤ A Workday place opened by a European country's three-letter code ("ESP - ANY CITY", "ESP - MD - LAS
// ➤ ROZAS"): the code becomes the country's name at the end, the region's two letters go (MD: Maryland).
const ISO3: Record<string, string> = {
  ESP: "Spain",
  FRA: "France",
  DEU: "Germany",
  NLD: "Netherlands",
  BEL: "Belgium",
  GBR: "United Kingdom",
  IRL: "Ireland",
  ITA: "Italy",
  CHE: "Switzerland",
  AUT: "Austria",
  NOR: "Norway",
  DNK: "Denmark",
  SWE: "Sweden",
  FIN: "Finland",
  PRT: "Portugal",
  POL: "Poland",
  CZE: "Czechia",
  SVK: "Slovakia",
  HUN: "Hungary",
  ROU: "Romania",
  BGR: "Bulgaria",
  GRC: "Greece",
  HRV: "Croatia",
  SVN: "Slovenia",
  EST: "Estonia",
  LVA: "Latvia",
  LTU: "Lithuania",
  LUX: "Luxembourg",
  MLT: "Malta",
  CYP: "Cyprus",
  ISL: "Iceland",
  SRB: "Serbia",
  BIH: "Bosnia and Herzegovina",
  MNE: "Montenegro",
  MKD: "North Macedonia",
  ALB: "Albania",
  MDA: "Moldova",
  TUR: "Turkey",
};
// ➤ A Workday vacancy's reference is its first bullet ("R-2026038246"), but some boards put the worker
// ➤ type or the town there ("Regular Employee", "Guyancourt"): then its address, which names it alone.
const workdayRef = (p: { bulletFields?: string[]; externalPath?: string }) => {
  const b = String(p.bulletFields?.[0] || "");
  return /\d/.test(b) && !/\s/.test(b) ? b : String(p.externalPath || b);
};
export const workdayPlace = (s: unknown) => {
  const m = String(s || "").match(
    /^([A-Z]{3})(?:\s*-\s*|\s+|$)(?:[A-Z]{2}\s*-\s*)?(.*)$/,
  );
  return m && ISO3[m[1]]
    ? [m[2].trim(), ISO3[m[1]]].filter(Boolean).join(", ")
    : String(s || "");
};
const oraParts = (slug: string) => {
  const i = String(slug).indexOf("/");
  return i < 0 ? [String(slug), "CX_1"] : [slug.slice(0, i), slug.slice(i + 1)];
};

// ➤ Ashby's pay: the Salary part of its compensation summary, unless the employer chose not
// ➤ to show pay on its board.
function ashbyPay(job: Ashby) {
  if (job.shouldDisplayCompensationOnJobPostings === false) return null;
  const s = (job.compensation?.summaryComponents || []).find(
    (c) => c?.compensationType === "Salary",
  );
  return s
    ? {
        min: s.minValue,
        max: s.maxValue,
        currency: s.currencyCode,
        period: s.interval,
        partTime: job.employmentType === "PartTime",
      }
    : null;
}
const TEAMTAILOR_MODES: Record<string, string> = {
  onsite: "onsite",
  hybrid: "hybrid",
  fully: "remote",
};
const FLATCHR_KINDS: Record<string, string> = {
  1: "CDI",
  2: "CDD",
  3: "Stage",
  4: "Intérim",
  5: "Freelance",
  6: "Alternance",
};
const PERSONIO_YEARS: Record<string, number> = {
  "lt-1": 0,
  "1-2": 1,
  "2-5": 2,
  "5-7": 5,
  "7-10": 7,
  "10-15": 10,
  ht15: 15,
};
// ➤ A Zoho vacancy's own page carries its record in a script («JSON.parse('[{…Job_Description…}]')»): the text, the
// ➤ day it opened and its type, which the careers page's list leaves out on about half of its sites (1 November 2026).
// ➤ The script's string read as JavaScript reads it, escape by escape.
const jsString = (s: string) =>
  s.replace(/\\(x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|.)/g, (_, e: string) =>
    e.length > 1
      ? String.fromCharCode(parseInt(e.slice(1), 16))
      : e === "n"
        ? "\n"
        : e === "t"
          ? "\t"
          : e,
  );
// ➤ Varbi's table of a vacancy's facts: its header cell names the fact, the next cell gives it, in Swedish or English.
const VARBI_FIELDS: [string, RegExp][] = [
  [
    "contract",
    /^(?:anställningsform|employment type|type of employment|form of employment)$/i,
  ],
  [
    "hours",
    /^(?:anställningens omfattning|omfattning|extent|extent of employment|working hours)$/i,
  ],
  [
    "expires",
    /^(?:sista ansökningsdag|last day of application|last application date|apply by)$/i,
  ],
];
export function easycruitDetailOf(html: unknown) {
  const page = String(html || "");
  const block = (page.match(
    /class="jd-description"[^>]*>([\s\S]*?)<div class="(?:bottom-buttons|four columns jd-apply)/,
  ) || [])[1];
  const deadline = text(
    (page.match(/class="jd-deadline"[^>]*>([\s\S]*?)<\/div>/) || [])[1] || "",
  ).match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  const out: { description?: string; expires?: string } = {};
  if (block && text(block)) out.description = text(block);
  if (deadline)
    out.expires = `${deadline[3]}-${deadline[2].padStart(2, "0")}-${deadline[1].padStart(2, "0")}`;
  return out;
}
export function varbiDetailOf(html: unknown) {
  const out: Record<string, string> = {};
  for (const m of String(html || "").matchAll(
    /<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi,
  )) {
    const label = text(m[1]).trim(),
      value = text(m[2]).trim();
    const field = value && VARBI_FIELDS.find(([, re]) => re.test(label))?.[0];
    if (field && !out[field])
      out[field] = field === "expires" ? day(value) : value;
  }
  return out;
}
export function zohoDetailOf(html: unknown, id: unknown) {
  const raw = String(html || "").match(
    /JSON\.parse\('(\[\{[\s\S]*?\}\])'\)/,
  )?.[1];
  if (!raw) return {};
  let list: unknown;
  try {
    list = JSON.parse(jsString(raw));
  } catch {
    return {};
  }
  const job: ZohoRecord =
    (Array.isArray(list) ? (list as (ZohoRecord | null)[]) : []).find(
      (j) => String(j?.id) === String(id),
    ) || {};
  const out: {
    description?: string;
    posted?: string;
    employmentType?: string[];
  } = {};
  if (job.Job_Description) out.description = text(job.Job_Description);
  if (job.Date_Opened) out.posted = day(job.Date_Opened);
  if (typeof job.Job_Type === "string" && job.Job_Type)
    out.employmentType = [job.Job_Type];
  return out;
}
// ➤ Breezy's list gives a job's department and type, no text: each job's page (open to robots) has it whole in its
// ➤ «description» block, before the apply buttons. 9 to 43 characters were stored against 2,500 to 6,400 on the page (the
// ➤ diary's live check, 1 November 2026).
export const breezyText = (html: unknown) =>
  text(
    String(html || "").match(
      /<div class="description">([\s\S]*?)<\/div>\s*<div class="apply-container"/,
    )?.[1] || "",
  );
const zohoYears = (v: unknown) => {
  const s = String(v || "").trim();
  if (!s) return null;
  if (
    /^(keine|none|no|débutant|debutant|sin experiencia|aucune|fresher|0)$/i.test(
      s,
    )
  )
    return 0;
  const n = s.match(/(\d{1,2})/);
  return n ? Number(n[1]) : null;
};
const DVINCI_CONTRACT: Record<string, string> = {
  UNLIMITED: "permanent",
  LIMITED: "befristet",
};
const DVINCI_HOURS: Record<string, string> = {
  FULL_TIME: "full time",
  PART_TIME: "part time",
  MARGINAL_EMPLOYMENT: "minijob",
};
// ➤ HireHive's first pay band that has figures.
const hirehivePay = (tiers: (HirehiveTier | null)[] | undefined) => {
  const t = (tiers || []).find(
    (x) => x && x.type !== "none" && Number(x.min_value) > 0,
  );
  return t
    ? {
        min: Number(t.min_value),
        max: Number(t.max_value) || Number(t.min_value),
        currency: t.currency_code,
        period: t.interval,
      }
    : null;
};
const GREENHOUSE_FIELDS =
  /employment type|contract type|time type|vertragsart|arbeitszeit|type de contrat|tipo de contrato/i;
const BREEZY_TYPES: Record<string, string> = {
  fullTime: "full time",
  partTime: "part time",
  temporary: "temporary",
  contract: "contractor",
  internship: "internship",
};
const breezyMode = (at: Breezy["location"]) => {
  const kind = String(at?.remote_details?.value || "").replace(
    /-location$/,
    "",
  );
  return modeWord(kind) || (at?.is_remote && !kind ? "remote" : "");
};

// ➤ The platforms' answers, as far as they are read.
type Greenhouse = {
  id?: number;
  company_name?: string;
  first_published?: string;
  updated_at?: string;
  metadata?: ({ name?: string; value?: unknown } | null)[];
};
type Ashby = {
  id?: string;
  isListed?: boolean;
  workplaceType?: string;
  isRemote?: boolean;
  secondaryLocations?: ({ location?: string } | null)[];
  publishedAt?: string;
  employmentType?: string;
  shouldDisplayCompensationOnJobPostings?: boolean;
  compensation?: {
    summaryComponents?: ({
      compensationType?: string;
      minValue?: number;
      maxValue?: number;
      currencyCode?: string;
      interval?: string;
    } | null)[];
  };
};
type Lever = {
  id?: string;
  workplaceType?: string;
  salaryRange?: Pay;
  categories?: { allLocations?: string[]; commitment?: string };
  createdAt?: number;
};
type SmartRecruiters = {
  totalFound?: number;
  content: (
    | {
        id?: string;
        company?: { name?: string };
        releasedDate?: string;
        location?: { remote?: boolean; hybrid?: boolean };
      }
    | undefined
  )[];
};
type Recruitee = {
  id?: number;
  title?: string;
  remote?: boolean;
  hybrid?: boolean;
  on_site?: boolean;
  max_hours?: number;
  max_hours_per_week?: number;
  min_hours_per_week?: number;
  min_hours?: number;
  city?: string;
  country?: string;
  careers_url?: string;
  company_name?: string;
  description?: string;
  requirements?: string;
  published_at?: string;
  created_at?: string;
  salary?: { min?: number; max?: number; currency?: string; period?: string };
  employment_type_code?: string;
};
type WorkablePlace = { city?: string; region?: string; country?: string };
type Workable = {
  shortcode?: string;
  id?: string;
  title?: string;
  full_title?: string;
  locations?: WorkablePlace[];
  location?: WorkablePlace;
  city?: string;
  country?: string;
  url?: string;
  application_url?: string;
  shortlink?: string;
  description?: string;
  published_on?: string;
  created_at?: string;
  remote?: boolean;
  telecommuting?: boolean;
  workplace?: string;
  employment_type?: unknown;
  type?: unknown;
};
type BambooPlace = {
  city?: string;
  state?: string;
  province?: string;
  country?: string;
};
type Bamboo = {
  id?: string | number;
  jobOpeningName?: string;
  atsLocation?: BambooPlace;
  location?: BambooPlace;
  isRemote?: boolean;
  departmentLabel?: string;
  employmentStatusLabel?: unknown;
};
type Named = { id?: string; name?: string };
type Breezy = {
  id?: string;
  name?: string;
  company?: { name?: string };
  location?: {
    is_remote?: boolean;
    city?: string;
    state?: Named;
    country?: Named;
    remote_details?: { value?: string };
  };
  url?: string;
  department?: string;
  type?: Named;
  published_date?: string;
  salary?: string;
};
type Traffit = {
  id?: number;
  url?: string;
  advert?: {
    name?: string;
    locations?: {
      locality?: string;
      region1?: string;
      country?: string;
      iso?: string;
    }[];
    values?: { field_id?: string; value?: unknown }[];
  };
  valid_start?: string;
  valid_end?: string;
  options?: { remote?: string };
};
type HirehiveTier = {
  type?: string;
  min_value?: number;
  max_value?: number;
  currency_code?: string;
  interval?: string;
};
type Hirehive = {
  id?: number;
  title?: string;
  location?: string;
  country?: { name?: string; code?: string };
  hosted_url?: string;
  description?: { text?: string };
  published_date?: string;
  created_date?: string;
  type?: { type?: unknown };
  compensation_tiers?: (HirehiveTier | null)[];
};
type HirehivePage = {
  items?: Hirehive[];
  meta?: { has_next_page?: boolean };
} | null;
type Prospective = {
  id?: number;
  title?: string;
  szas?: Record<string, unknown> & {
    sza_title?: string;
    sza_introduction?: string;
    sza_tasks?: string;
    sza_requirements?: string;
    sza_employment_type?: unknown;
    sza_pensum?: { min?: number; max?: number };
  };
  links?: { directlink?: string };
  start_date?: string;
  end_date?: string;
};
type ProspectivePage = { jobs?: Prospective[]; total?: number } | null;
type Flatchr = {
  id?: string;
  published?: boolean;
  created_at?: string;
  vacancy?: {
    id?: string;
    title?: string;
    slug?: string;
    company?: { name?: string };
    address?: {
      locality?: string;
      administrative_area_level_1?: string;
      country?: string;
    };
    description?: string;
    mission?: string;
    profile?: string;
    skills?: string;
    created_at?: string;
    remote?: string;
    contract_type_id?: number;
    partial?: boolean;
    show_salary?: boolean;
    salary?: number;
    salary_max?: number;
    currency?: string;
    mensuality?: string;
  };
};
const FLATCHR_PERIODS: Record<string, string> = {
  y: "year",
  m: "month",
  h: "hour",
};
type ZohoRecord = {
  id?: string;
  Publish?: boolean;
  Posting_Title?: string;
  Job_Opening_Name?: string;
  City?: string;
  State?: string;
  Country?: string;
  Job_Description?: string;
  Date_Opened?: string;
  Remote_Job?: boolean;
  Job_Type?: unknown;
  Work_Experience?: string;
  Salary?: string | number;
  Currency?: string;
};
type Hibob = {
  id?: string;
  title?: string;
  site?: string;
  country?: string;
  description?: string;
  responsibilities?: string;
  requirements?: string;
  benefits?: string;
  publishedAt?: string;
  workspaceTypeId?: string;
  employmentType?: unknown;
};
type Emply = {
  shortId?: string;
  title?: string;
  location?: string;
  titleAsUrl?: string;
  published?: string;
  deadline?: string;
};
type Pinpoint = {
  id?: string;
  title?: string;
  location?: { city?: string; province?: string; name?: string };
  url?: string;
  description?: string;
  key_responsibilities?: string;
  skills_knowledge_expertise?: string;
  deadline_at?: string;
  workplace_type?: string;
  employment_type?: unknown;
  compensation_visible?: boolean;
  compensation_minimum?: number;
  compensation_maximum?: number;
  compensation_currency?: string;
  compensation_frequency?: string;
};
type Manatal = {
  id?: number;
  position_name?: string;
  location_display?: string;
  city?: string;
  state?: string;
  country?: string;
  hash?: string;
  description?: string;
};
type ManatalPage = { results?: Manatal[]; next?: string | null } | null;
type HrManager = {
  Id?: number;
  Name?: string;
  PositionLocation?: { Name?: string } | null;
  PositionLocationMultiSelection?: ({ Name?: string } | null)[];
  Advertisements?: { Introduction?: string; Content?: string }[];
  Department?: { City?: string; Country?: string };
  AdvertisementUrlSecure?: string;
  AdvertisementUrl?: string;
  Published?: string;
  ApplicationDue?: string;
};
type HrManagerPage = {
  Items?: HrManager[];
  PositionCountSearch?: number;
  CustomerName?: string;
  TransactionStatus?: { StatusCode?: number; Description?: string };
} | null;
type Requisition = {
  requisitionId?: number;
  displayJobTitle?: string;
  locations?: ({ city?: string; country?: string } | null)[];
  externalDescription?: string;
  postingEffectiveDate?: string;
  postingExpirationDate?: string;
};
type CsodPage = {
  data?: { requisitions?: Requisition[]; totalCount?: number };
} | null;
type Talentadore = {
  id?: string | number;
  name?: string;
  city?: string;
  county?: string;
  country?: string;
  location?: string;
  link?: string;
  description_html?: string;
  start_date?: string;
  updated?: string;
  due_date?: string;
};
type Workday = {
  bulletFields?: string[];
  externalPath?: string;
  title?: string;
  locationsText?: string;
  postedOn?: string;
  remoteType?: string;
};
// ➤ A page of a Workday site's list, with the country filter its first page offers.
type WorkdayFacet = {
  facetParameter?: string;
  descriptor?: string;
  id?: string;
  count?: number;
  values?: WorkdayFacet[];
};
type WorkdayPage = {
  total?: number;
  jobPostings?: Workday[];
  facets?: WorkdayFacet[];
} | null;
type WorkdayInfo = {
  jobDescription?: string;
  timeType?: string;
  remoteType?: string;
  endDate?: string;
  startDate?: string;
  jobRequisitionLocation?: { country?: { alpha2Code?: string } };
};
type Oracle = {
  Id?: string | number;
  Title?: string;
  PrimaryLocation?: string;
  LegalEmployerId?: string | number;
  OrganizationId?: string | number;
  ShortDescriptionStr?: string;
  PostedDate?: string;
  WorkplaceTypeCode?: string;
};
type OraclePage = {
  items?: {
    requisitionList?: Oracle[];
    TotalJobsCount?: number;
    organizationsFacet?: { Id?: string | number; Name?: string }[];
  }[];
} | null;
type OracleDetail = {
  ExternalDescriptionStr?: string;
  ExternalResponsibilitiesStr?: string;
  ExternalQualificationsStr?: string;
  JobSchedule?: string;
  ContractType?: string;
  ExternalPostedEndDate?: string;
};
type DvinciPlace = {
  address?: { city?: string };
  name?: string;
  country?: { name?: string; isoA2?: string };
};
type Dvinci = {
  id?: number;
  position?: string;
  jobPublicationURL?: string;
  introduction?: string;
  tasks?: string;
  profile?: string;
  startDate?: string;
  endDate?: string;
  jobOpening?: {
    name?: string;
    location?: string;
    company?: { name?: string };
    locations?: DvinciPlace[];
    contractPeriod?: { internalName?: string };
    workingTimes?: ({ internalName?: string } | null)[];
    salary?: {
      currency?: string;
      value?: { minValue?: number; maxValue?: number; unitText?: string };
    };
  };
};

export const ATS: Record<string, Board> = {
  greenhouse: {
    licence: {
      name: "Greenhouse Job Board API",
      short: "Greenhouse",
      url: "https://docs.greenhouse.io/job-board.html",
      licence: "Public job board API",
      credit: "",
      needsKey: false,
    },
    url: (slug) =>
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=true`,
    // ➤ The parser leaves out empty entries, so the raw list it is paired with does too. Each job names its employer
    // ➤ («Prolific Academic Ltd»): a board the scout found shows it instead of its address («Prolificacademicltd»).
    parse: (j, slug, company = slug) => {
      const jobs = (
        (j as { jobs?: (Greenhouse | null)[] } | null)?.jobs || []
      ).filter(Boolean);
      return parseGreenhouse({ jobs }, company).map((p, i) => ({
        sourceId: String(jobs[i]?.id || ""),
        title: p.title,
        location: p.location,
        url: p.url,
        company: String(jobs[i]?.company_name || "").trim(),
        // ➤ The day it was first published: `updated_at` is the last edit, another day on most adverts (128 of one board
        // ➤ "posted" on 29 October, 1 November 2026).
        description: text(p.description),
        posted: day(jobs[i]?.first_published || jobs[i]?.updated_at),
        remote: remoteWord(p.location),
        mode: "",
        modeTag: tagMode(p.description),
        // ➤ The board's own fields for the contract and the hours, where it keeps them ("Employment Type": "Full-time",
        // ➤ "Contract type": "CDI", "Time Type": "Part time"; four boards in eight).
        employmentType: (jobs[i]?.metadata || [])
          .filter(
            (m) =>
              GREENHOUSE_FIELDS.test(String(m?.name || "")) &&
              typeof m?.value === "string",
          )
          .map((m) => String(m?.value))
          .slice(0, 3),
      }));
    },
  },
  ashby: {
    licence: {
      name: "Ashby Job Board API",
      short: "Ashby",
      url: "https://developers.ashbyhq.com/docs/public-job-posting-api",
      licence: "Public job board API",
      credit: "",
      needsKey: false,
    },
    url: (slug) =>
      `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}?includeCompensation=true`,
    // ➤ A posting marked isListed: false is for its direct link only, as Ashby's documentation says (LEC-16).
    parse: (j, slug, company = slug) => {
      const jobs = (
        (j as { jobs?: (Ashby | null)[] } | null)?.jobs || []
      ).filter((x) => x && x.isListed !== false);
      return parseAshby({ jobs }, company).map((p, i) => {
        const job: Ashby = jobs[i] || {};
        const mode =
          modeWord(job.workplaceType) ||
          (job.isRemote === true ? "remote" : "");
        // ➤ Every place a posting names ("Europe / Warsaw / Kyiv"), not only the first.
        const all = [
          ...new Set(
            [
              p.location,
              ...(job.secondaryLocations || []).map((s) => s?.location),
            ].filter(Boolean),
          ),
        ];
        return {
          sourceId: String(job.id || ""),
          title: p.title,
          location: all.length > 1 ? all.join(" / ") : p.location,
          url: p.url,
          description: text(p.description),
          posted: day(job.publishedAt),
          remote: mode === "remote",
          mode,
          modeTag: tagMode(p.description),
          pay: ashbyPay(job),
          employmentType: [job.employmentType].filter(Boolean), // ➤ FullTime, PartTime, Intern, Contract, Temporary
        };
      });
    },
  },
  lever: {
    licence: {
      name: "Lever Postings API",
      short: "Lever",
      url: "https://github.com/lever/postings-api",
      licence: "Public postings API",
      credit: "",
      needsKey: false,
    },
    url: (slug) =>
      `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`,
    gapMs: 1000, // ➤ api.lever.co's robots.txt asks for a second between requests
    parse: (arr, slug, company = slug) =>
      parseLever(arr, company).map((p, i) => {
        const job: Lever = (arr as (Lever | null)[])[i] || {};
        const mode = modeWord(job.workplaceType);
        const s = job.salaryRange;
        // ➤ Every place a posting names ("Europe / Italy / Amsterdam"), not only the first.
        const all = [...new Set(job.categories?.allLocations || [])];
        const location = all.length > 1 ? all.join(" / ") : p.location;
        return {
          sourceId: String(job.id || ""),
          title: p.title,
          location,
          url: p.url,
          description: text(p.description),
          posted: day(job.createdAt),
          remote: mode === "remote" || remoteWord(location),
          mode,
          modeTag: tagMode(p.description),
          pay: s
            ? {
                min: s.min,
                max: s.max,
                currency: s.currency,
                period: s.interval,
                partTime: /part/i.test(job.categories?.commitment || ""),
              }
            : null,
          employmentType: [job.categories?.commitment].filter(Boolean), // ➤ the board's own words: "Full-time", "Permanent", "Contract"
        };
      }),
  },
  smartrecruiters: {
    licence: {
      name: "SmartRecruiters Posting API",
      short: "SmartRecruiters",
      url: "https://developers.smartrecruiters.com/docs/posting-api",
      licence: "Public posting API, where the company enables it",
      credit: "",
      needsKey: false,
    },
    url: (slug, offset = 0) =>
      `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings?limit=100&offset=${offset}`,
    // ➤ A hundred per page; the answer says how many there are in all. Big employers list thousands
    // ➤ (Bosch 4,924 on 10 October 2026): up to ten thousand are read, a hundred calls at most.
    more: (j, got) =>
      got < Math.min(Number((j as SmartRecruiters).totalFound) || 0, 10_000),
    // ➤ The list carries no advert text (that is a second call per posting the pile does not make). Each posting names its
    // ➤ employer («ALTEN»), which a board the scout found shows instead of its address.
    parse: (answer, slug, company = slug) => {
      const j = answer as SmartRecruiters;
      return parseSmartRecruiters(j, company)
        .map((p, i) => ({
          sourceId: String(j.content[i]?.id || ""),
          title: p.title,
          location: p.location,
          url: p.url,
          company: String(j.content[i]?.company?.name || "").trim(),
          description: "",
          posted: day(j.content[i]?.releasedDate),
          remote: !!j.content[i]?.location?.remote,
          mode: mostFlexible([
            j.content[i]?.location?.remote && "remote",
            j.content[i]?.location?.hybrid && "hybrid",
          ]),
        }))
        .filter((p) => p.url);
    },
  },
  recruitee: {
    licence: {
      name: "Recruitee Careers Site API",
      short: "Recruitee",
      url: "https://docs.recruitee.com/reference/intro-to-careers-site-api",
      licence: "Public careers site API",
      credit: "",
      needsKey: false,
    },
    url: (slug) =>
      `https://${encodeURIComponent(slug)}.recruitee.com/api/offers/`,
    // ➤ Each offer names its employer («ILF Consulting Engineers Germany GmbH» on the board found as «Jobsger»).
    read: (slug, opts) => readRecruitee(slug, opts),
    parse: (j) =>
      ((j as { offers?: Recruitee[] } | null)?.offers || []).map((p) => {
        const mode = mostFlexible([
          p.remote && "remote",
          p.hybrid && "hybrid",
          p.on_site && "onsite",
        ]);
        // ➤ The hours a week in whichever of its four fields the board fills.
        const hours =
          [p.max_hours, p.max_hours_per_week, p.min_hours_per_week, p.min_hours]
            .map(Number)
            .find((h) => h > 0 && h <= 60) || 0;
        return {
          sourceId: String(p.id || ""),
          title: p.title || "",
          location: [p.city, p.country].filter(Boolean).join(", "),
          url: p.careers_url || "",
          company: String(p.company_name || "").trim(),
          description: [text(p.description), text(p.requirements)]
            .filter(Boolean)
            .join("\n"),
          posted: day(p.published_at || p.created_at),
          remote: mode === "remote",
          mode,
          modeTag: tagMode(`${p.description || ""} ${p.requirements || ""}`),
          pay: p.salary
            ? {
                min: p.salary.min,
                max: p.salary.max,
                currency: p.salary.currency,
                period: p.salary.period,
                hoursPerWeek: hours,
                partTime: /^parttime/.test(p.employment_type_code || ""),
              }
            : null,
          // ➤ "fulltime_permanent", "parttime_fixed_term", "internship"… and the hours a week when it gives them.
          contract: p.employment_type_code || "",
          hours: [p.employment_type_code, hours && `${hours} hours`]
            .filter(Boolean)
            .join(" "),
        };
      }),
  },
  workable: {
    daily: true, // ➤ about a thousand calls a day for an IP, then 429 for a day: read once a day (config/crawl.yml)
    licence: {
      name: "Workable careers widget API",
      short: "Workable",
      url: "https://apply.workable.com/",
      licence: "Public careers widget API",
      credit: "",
      needsKey: false,
    },
    // ➤ `details=true` adds each job's text to the same answer: without it none of the 50,051 adverts had any
    // ➤ (1 November 2026), so no years, tools or degrees could be read in them.
    url: (slug) =>
      `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(slug)}?details=true`,
    // ➤ The widget answer names the company and lists the jobs with their first location.
    parse: (answer, slug, company = slug) => {
      const j = answer as { name?: string; jobs?: Workable[] } | null;
      return (j?.jobs || [])
        .map((p) => {
          const loc: WorkablePlace = p.locations?.[0] || p.location || {};
          return {
            sourceId: String(p.shortcode || p.id || ""),
            title: String(p.title || p.full_title || "").trim(),
            location: [loc.city || p.city, loc.region, loc.country || p.country]
              .filter(Boolean)
              .join(", "),
            url:
              p.url ||
              p.application_url ||
              p.shortlink ||
              `https://apply.workable.com/${slug}/j/${p.shortcode}`,
            description: text(p.description || ""),
            posted: day(p.published_on || p.created_at),
            remote: !!(
              p.remote ||
              p.telecommuting ||
              /remote/i.test(p.workplace || "")
            ),
            mode: p.telecommuting ? "remote" : modeWord(p.workplace),
            modeTag: tagMode(p.description),
            company: j?.name || company,
            employmentType: [p.employment_type || p.type].filter(
              (v) => typeof v === "string" && v,
            ), // ➤ Full-time, Contract, Internship…
          };
        })
        .filter((p) => p.sourceId && p.title);
    },
  },
  teamtailor: {
    licence: {
      name: "Teamtailor careers site (RSS)",
      short: "Teamtailor",
      url: "https://www.teamtailor.com/",
      licence:
        "The employer's own careers site, read through the RSS it publishes",
      credit: "",
      needsKey: false,
    },
    // ➤ The slug is the board's name on teamtailor.com, or the address of a site on the company's own domain.
    url: (slug) =>
      /^https?:\/\//.test(slug)
        ? `${String(slug).replace(/\/$/, "")}/jobs.rss`
        : `https://${encodeURIComponent(slug)}.teamtailor.com/jobs.rss`,
    xml: true,
    read: (slug, opts, company) => readTeamtailor(slug, opts, company),
    // ➤ The RSS has the whole text but no contract or hours: each job's page states them in its block ("FULL_TIME",
    // ➤ "CONTRACTOR"; 2 of 2 read, 1 November 2026), asked once and kept (builder/readers.ts).
    detail: async (p, opts = {}) => {
      const { jobPostings } = await import("./crawl.js");
      const job = jobPostings(await getText(p.url, opts), p.url)[0] || {};
      return {
        ...(job.employmentType?.length
          ? { employmentType: job.employmentType }
          : {}),
        ...(job.pay ? { pay: job.pay } : {}),
        expires: job.expires || p.expires || "",
      };
    },
    // ➤ One RSS item per job: title, link, date, the description as HTML, the location in tt: tags.
    // ➤ The place: the first location's town and country, not its name, often an office's ("Ingeteam
    // ➤ Zamudio"); an empty tag (<tt:name/>) is no tag, or the next location's text is read into it.
    parse: (xml) => {
      const tag = (block: string, name: string) =>
        decodeEntities(
          (block.match(
            new RegExp(
              `<${name}(?:\\s[^>]*)?(?<!/)>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${name}>`,
            ),
          ) || [])[1] || "",
        ).trim();
      const s = String(xml || "");
      const company = tag(s.split("<item>")[0] || "", "title");
      return (s.match(/<item>[\s\S]*?<\/item>/g) || [])
        .map((block) => {
          const status = (
            tag(block, "tt:remoteStatus") || tag(block, "remoteStatus")
          ).toLowerCase();
          const mode = TEAMTAILOR_MODES[status] || "";
          const where = (block.match(
            /<tt:location>[\s\S]*?<\/tt:location>/,
          ) || [block])[0];
          const city = tag(where, "tt:city");
          return {
            sourceId: tag(block, "guid") || tag(block, "link"),
            title: tag(block, "title"),
            location: city
              ? [city, tag(where, "tt:country")].filter(Boolean).join(", ")
              : tag(where, "tt:name") || tag(where, "tt:country"),
            url: tag(block, "link"),
            description: text(tag(block, "description")),
            posted: day(tag(block, "pubDate")),
            remote: mode === "remote",
            mode,
            modeTag: tagMode(tag(block, "description")),
            company,
          };
        })
        .filter((p) => p.url && p.title);
    },
  },
  personio: {
    licence: {
      name: "Personio XML feed",
      short: "Personio",
      url: "https://developer.personio.de/v1.0/reference/get_xml",
      licence: "Public XML feed",
      credit: "",
      needsKey: false,
    },
    url: (slug) => `https://${encodeURIComponent(slug)}.jobs.personio.de/xml`,
    xml: true,
    read: (slug, opts, company) => readPersonio(slug, opts, company),
    parse: (xml, slug) => {
      const tag = (block: string, name: string) =>
        (block.match(
          new RegExp(
            `<${name}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${name}>`,
          ),
        ) || [])[1] || "";
      return (
        String(xml || "").match(/<position>[\s\S]*?<\/position>/g) || []
      ).map((block) => {
        const pid = tag(block, "id").trim();
        const salary = tag(block, "salaryInformation");
        const html = [...block.matchAll(/<value>([\s\S]*?)<\/value>/g)].map(
          (m) => m[1].replace(/^\s*<!\[CDATA\[/, "").replace(/\]\]>\s*$/, ""),
        );
        return {
          sourceId: pid,
          title: tag(block, "name").trim(),
          location: tag(block, "office").trim(),
          url: `https://${slug}.jobs.personio.de/job/${pid}`,
          // ➤ Its keywords («Solar PV, Energy Storage Systems») after the text, where the tools reader finds them.
          description: [...html.map(text), tag(block, "keywords").trim()]
            .filter(Boolean)
            .join("\n"),
          posted: day(tag(block, "createdAt").trim()),
          remote: false,
          mode: "",
          modeTag: tagMode(html.join(" ")),
          contract: tag(block, "employmentType").trim(),
          hours: tag(block, "schedule").trim(), // ➤ permanent, intern, freelance…; full-time, part-time
          // ➤ The years the employer asks, by the low end of its band (lt-1, 1-2, 2-5, 5-7, 7-10, 10-15, ht15): 86 % of its
          // ➤ jobs carry it (1 November 2026).
          ...(PERSONIO_YEARS[tag(block, "yearsOfExperience").trim()] !==
          undefined
            ? { years: PERSONIO_YEARS[tag(block, "yearsOfExperience").trim()] }
            : {}),
          pay: salary
            ? {
                min: tag(salary, "min").trim(),
                max: tag(salary, "max").trim(),
                currency: tag(salary, "currencyCode").trim(),
                period: tag(salary, "type").trim(),
                partTime: tag(block, "schedule").trim() === "part-time",
              }
            : null,
        };
      });
    },
  },
  // ➤ Careers sites hosted by Workday and Oracle: their pages are drawn by JavaScript, so the
  // ➤ reader asks the address the page itself asks for its list, exactly as a browser does.
  // ➤ Not a documented API: each vendor is switched on in config/vendors.yml, off by default.
  // ➤ Five more careers pages that draw their list from a public JSON, the same the page shows
  // ➤ (docs/research/job-apis.md). BambooHR's list carries the title, the place and the
  // ➤ department; the advert's text is on its own page and is not asked for.
  bamboohr: {
    licence: {
      name: "BambooHR careers page",
      short: "BambooHR",
      url: "https://www.bamboohr.com/",
      licence: "The employer's careers page, read through the list it draws",
      credit: "",
      needsKey: false,
    },
    url: (slug) =>
      `https://${encodeURIComponent(slug)}.bamboohr.com/careers/list`,
    parse: (j, slug) =>
      ((j as { result?: Bamboo[] } | null)?.result || []).map((p) => {
        const at: BambooPlace = p.atsLocation || p.location || {};
        return {
          sourceId: String(p.id || ""),
          title: String(p.jobOpeningName || "").trim(),
          location:
            [at.city, at.state || at.province, at.country]
              .filter(Boolean)
              .join(", ") || (p.isRemote ? "Remote" : ""),
          url: `https://${slug}.bamboohr.com/careers/${p.id}`,
          description: [p.departmentLabel, p.employmentStatusLabel]
            .filter(Boolean)
            .join(" · "),
          posted: "",
          remote: !!p.isRemote,
          mode: p.isRemote ? "remote" : "",
          employmentType: [p.employmentStatusLabel].filter(
            (v) => typeof v === "string" && v,
          ), // ➤ "Full-Time", "Part-Time", "Contractor"…
        };
      }),
    // ➤ The list has no text and no day (none of the 32,214 stored adverts had one, 1 November 2026): each opening's own
    // ➤ answer gives them, asked once and kept (builder/readers.ts).
    detail: async (p, opts = {}) => {
      const o =
        (
          await getJson<{
            result?: {
              jobOpening?: { description?: string; datePosted?: string };
            };
          } | null>(`${p.url}/detail`, opts)
        )?.result?.jobOpening || {};
      return {
        ...(o.description ? { description: text(o.description) } : {}),
        posted: day(o.datePosted) || p.posted || "",
      };
    },
  },
  breezy: {
    licence: {
      name: "Breezy HR careers page",
      short: "Breezy HR",
      url: "https://breezy.hr/",
      licence: "The employer's careers page, read through the list it draws",
      credit: "",
      needsKey: false,
    },
    url: (slug) => `https://${encodeURIComponent(slug)}.breezy.hr/json`,
    parse: (j) =>
      (Array.isArray(j) ? (j as Breezy[]) : []).map((p) => {
        const at: NonNullable<Breezy["location"]> = p.location || {};
        return {
          sourceId: String(p.id || ""),
          title: String(p.name || "").trim(),
          company: p.company?.name || "",
          location:
            at.is_remote && !at.city
              ? "Remote"
              : [at.city, at.state?.name, at.country?.name]
                  .filter(Boolean)
                  .join(", "),
          country: String(at.country?.id || "").toLowerCase(),
          url: p.url || "",
          description: [p.department, p.type?.name].filter(Boolean).join(" · "),
          posted: day(p.published_date),
          // ➤ `is_remote` is set on hybrid jobs too: the kind is in `remote_details` («hybrid», «remote», «remote-location»).
          remote: breezyMode(at) === "remote",
          mode: breezyMode(at),
          // ➤ The type's id (fullTime, partTime, temporary, contract), not its name, which comes translated («Vertrag»).
          employmentType: [
            BREEZY_TYPES[p.type?.id ?? ""] || p.type?.name,
          ].filter((v) => typeof v === "string" && v),
          pay: p.salary ? { min: p.salary, max: p.salary } : null, // ➤ «€50,000 – €75,000 / year», read whole by the pay reader
        };
      }),
    // ➤ Each job's page asked once for its text and kept (builder/readers.ts).
    detail: async (p, opts = {}) => {
      const body = breezyText(await getText(p.url, opts));
      return body ? { description: body } : {};
    },
  },
  // ➤ Homerun (the Netherlands): an Atom feed per company, its entries with the job's page on the
  // ➤ company's own careers site, the town and the last change.
  homerun: {
    licence: {
      name: "Homerun careers page (Atom feed)",
      short: "Homerun",
      url: "https://www.homerun.co/",
      licence:
        "The employer's careers page, read through the feed it publishes",
      credit: "",
      needsKey: false,
    },
    url: (slug) => `https://feed.homerun.co/${encodeURIComponent(slug)}`,
    xml: true,
    parse: (xml) =>
      (String(xml || "").match(/<entry>[\s\S]*?<\/entry>/g) || [])
        .map((e) => {
          const inner = (name: string, block = e) =>
            decodeEntities(
              (
                (block.match(
                  new RegExp(
                    `<${name}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${name}>`,
                  ),
                ) || [])[1] || ""
              ).trim(),
            );
          const named = (name: string) =>
            inner(
              "name",
              (e.match(new RegExp(`<${name}>[\\s\\S]*?</${name}>`)) || [""])[0],
            );
          return {
            sourceId: inner("id"),
            title: inner("title"),
            location: named("location"),
            url: (e.match(/<link[^>]*href="([^"]+)"/) || [])[1] || "",
            description: text(inner("description")),
            posted: day(inner("updated").slice(0, 10)),
            remote: /remote/i.test(named("location")),
            employmentType: [named("type")].filter(Boolean), // ➤ Full-time, Internship
          };
        })
        .filter((p) => p.title && p.url),
  },
  // ➤ Varbi (Sweden's universities, regions and towns): an RSS feed per organisation.
  varbi: {
    licence: {
      name: "Varbi careers page (RSS)",
      short: "Varbi",
      url: "https://www.varbi.com/",
      licence: "The employer's careers page, read through the RSS it publishes",
      credit: "",
      needsKey: false,
    },
    url: (slug) =>
      `https://${encodeURIComponent(slug)}.varbi.com/what:rssfeed/`,
    xml: true,
    parse: (xml) =>
      (String(xml || "").match(/<item>[\s\S]*?<\/item>/g) || [])
        .map((i) => {
          const tag = (name: string) =>
            decodeEntities(
              (
                (i.match(
                  new RegExp(
                    `<${name}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${name}>`,
                  ),
                ) || [])[1] || ""
              ).trim(),
            );
          const link = tag("link");
          // ➤ Its day as written («Fri, 31 Oct 2026 00:00:00 +0200»): the date itself, not moved to UTC and the day before.
          const published = tag("pubDate").match(/(\d{1,2}) (\w{3}) (\d{4})/);
          return {
            sourceId: (link.match(/jobID:(\d+)/) || [])[1] || link,
            title: tag("title"),
            location: "",
            country: "se",
            url: link,
            description: text(tag("description")),
            posted: published
              ? day(`${published[1]} ${published[2]} ${published[3]} 12:00 UTC`)
              : "",
          };
        })
        .filter((p) => p.title && p.url),
    // ➤ Each vacancy's own page writes its contract, its extent and its last day in a table the feed leaves out
    // ➤ («Anställningsform: Tillsvidareanställning», «Anställningens omfattning: Heltid», «Sista ansökningsdag»): asked for
    // ➤ the vacancies of ours (the text corpus, 1 November 2026: 15 of 25 Varbi pages named a working time no card showed).
    detail: async (p, opts = {}) => varbiDetailOf(await getText(p.url, opts)),
  },
  // ➤ Traffit (Poland): the board's published adverts as public JSON, with the place geocoded.
  traffit: {
    licence: {
      name: "Traffit careers page",
      short: "Traffit",
      url: "https://traffit.com/",
      licence: "The employer's careers page, read through the list it draws",
      credit: "",
      needsKey: false,
    },
    url: (slug) =>
      `https://${encodeURIComponent(slug)}.traffit.com/public/job_posts/published`,
    // ➤ Ten a call unless asked for more: 77 boards sat at exactly ten (1 November 2026). A hundred a page, page after
    // ➤ page while they come full: 23 boards sat at the first hundred (Randstad Polska's 1,434, 24 November 2026).
    request: (slug, got) => ({
      headers: {
        "X-Request-Page-Size": String(TRAFFIT_PAGE),
        "X-Request-Current-Page": String(got / TRAFFIT_PAGE + 1),
      },
    }),
    more: (j) => Array.isArray(j) && j.length === TRAFFIT_PAGE,
    parse: (j) =>
      (Array.isArray(j) ? (j as Traffit[]) : [])
        .map((p) => {
          const ad: NonNullable<Traffit["advert"]> = p.advert || {};
          const at: NonNullable<
            NonNullable<Traffit["advert"]>["locations"]
          >[number] = (ad.locations || [])[0] || {};
          return {
            sourceId: String(p.id || ""),
            title: String(ad.name || "").trim(),
            location: [at.locality, at.region1, at.country]
              .filter(Boolean)
              .join(", "),
            country: String(at.iso || "").toLowerCase(),
            // ➤ Every part of the advert but its map: the responsibilities and the offer are a third or more of the text.
            url: String(p.url || "").replace(/\?source=career_page$/, ""),
            description: (ad.values || [])
              .filter(
                (v) =>
                  v.field_id !== "geolocation" && typeof v.value === "string",
              )
              .map((v) => text(String(v.value)))
              .filter(Boolean)
              .join("\n"),
            posted: day(String(p.valid_start || "").slice(0, 10)),
            expires: day(String(p.valid_end || "").slice(0, 10)),
            remote: p.options?.remote === "1",
            mode: p.options?.remote === "1" ? "remote" : "",
          };
        })
        .filter((p) => p.title && p.url),
  },
  // ➤ HireHive (Ireland): the board's jobs as public JSON, a hundred a page.
  hirehive: {
    licence: {
      name: "HireHive careers page",
      short: "HireHive",
      url: "https://hirehive.com/",
      licence: "The employer's careers page, read through the list it draws",
      credit: "",
      needsKey: false,
    },
    url: (slug, got = 0) =>
      `https://${encodeURIComponent(slug)}.hirehive.com/api/v2/jobs?page=${Math.floor(got / 100) + 1}&page_size=100`,
    count: (j) => ((j as HirehivePage)?.items || []).length,
    more: (j) => !!(j as HirehivePage)?.meta?.has_next_page,
    parse: (j) =>
      ((j as HirehivePage)?.items || [])
        .map((p) => ({
          sourceId: String(p.id || ""),
          title: String(p.title || "").trim(),
          location: [p.location, p.country?.name].filter(Boolean).join(", "),
          country: String(p.country?.code || "").toLowerCase(),
          url: p.hosted_url || "",
          description: String(p.description?.text || "").slice(0, TEXT_KEPT),
          posted: day(p.published_date || p.created_date),
          employmentType: [p.type?.type].filter(
            (v) => typeof v === "string" && v && v !== "Other",
          ), // ➤ FullTime, PartTime, Contract, Temporary, Internship
          pay: hirehivePay(p.compensation_tiers),
        }))
        .filter((p) => p.title && p.url),
  },
  // ➤ prospective.ch (Switzerland): a customer's career centre as the public JSON its embedded page
  // ➤ loads, every language at once, five hundred a call; each vacancy links to its own page.
  prospective: {
    licence: {
      name: "prospective.ch career centre",
      short: "prospective",
      url: "https://www.prospective.ch/",
      licence: "The employer's careers page, read through the list it draws",
      credit: "",
      needsKey: false,
    },
    url: (slug, got = 0) =>
      `https://ohws.prospective.ch/public/v1/medium/${encodeURIComponent(slug)}/jobs?lang=de&offset=${got}&limit=500`,
    gapMs: 500, // ➤ every customer's list on one host
    count: (j) => ((j as ProspectivePage)?.jobs || []).length,
    more: (j, got) => got < (Number((j as ProspectivePage)?.total) || 0),
    parse: (j) =>
      ((j as ProspectivePage)?.jobs || [])
        .map((p) => {
          const z: NonNullable<Prospective["szas"]> = p.szas || {};
          const country = String(z["sza_location.country"] || "").trim();
          return {
            sourceId: String(p.id || ""),
            title: String(p.title || z.sza_title || "").trim(),
            location: [
              ...new Set(
                [z["sza_location.city"], z["sza_location.region"], country]
                  .map((s) => String(s || "").trim())
                  .filter(Boolean),
              ),
            ].join(", "),
            country: /^(schweiz|suisse|svizzera|switzerland)$/i.test(country)
              ? "ch"
              : "",
            url: p.links?.directlink || "",
            description: [z.sza_introduction, z.sza_tasks, z.sza_requirements]
              .map(text)
              .filter(Boolean)
              .join("\n"),
            // ➤ Its end day is a placeholder ten years ahead on every vacancy, which the record leaves out (builder/normalise.ts).
            posted: day(p.start_date),
            expires: day(p.end_date),
            // ➤ The employment type (Festanstellung, Befristet, Lernende, Emploi fixe) and the workload: 100 % both ends is full
            // ➤ time, less at most is part time, a range reaching 100 % says neither.
            contract:
              typeof z.sza_employment_type === "string"
                ? z.sza_employment_type
                : "",
            hours:
              Number(z["sza_pensum.max"] ?? z.sza_pensum?.max) === 100
                ? Number(z["sza_pensum.min"] ?? z.sza_pensum?.min) === 100
                  ? "100%"
                  : ""
                : Number(z["sza_pensum.max"] ?? z.sza_pensum?.max) > 0
                  ? `${Number(z["sza_pensum.max"] ?? z.sza_pensum?.max)}%`
                  : "",
          };
        })
        .filter((p) => p.title && p.url),
  },
  // ➤ Flatchr (France): the company's published vacancies as JSON, the place as an address.
  flatchr: {
    licence: {
      name: "Flatchr careers page",
      short: "Flatchr",
      url: "https://www.flatchr.io/",
      licence: "The employer's careers page, read through the list it draws",
      credit: "",
      needsKey: false,
    },
    url: (slug) =>
      `https://careers.flatchr.io/company/${encodeURIComponent(slug)}.json`,
    count: (j) => ((j as { items?: Flatchr[] } | null)?.items || []).length,
    parse: (j, slug) =>
      ((j as { items?: Flatchr[] } | null)?.items || [])
        .filter(
          (i): i is Flatchr & { vacancy: NonNullable<Flatchr["vacancy"]> } =>
            i.published !== false && !!i.vacancy,
        )
        .map((i) => {
          const v = i.vacancy;
          const at: NonNullable<typeof v.address> = v.address || {};
          return {
            sourceId: String(v.id || i.id || ""),
            title: String(v.title || "").trim(),
            company: v.company?.name || "",
            location: [at.locality, at.administrative_area_level_1, at.country]
              .filter(Boolean)
              .join(", "),
            url: v.slug
              ? `https://careers.flatchr.io/fr/company/${slug}/vacancy/${v.slug}/`
              : "",
            description: [
              text(v.description),
              text(v.mission),
              text(v.profile),
              String(v.skills || "")
                .split(";")
                .map((x) => x.trim())
                .filter(Boolean)
                .join(", "),
            ]
              .filter(Boolean)
              .join("\n"),
            posted: day(i.created_at || v.created_at),
            remote: v.remote === "fulltime",
            mode:
              v.remote === "fulltime"
                ? "remote"
                : v.remote === "parttime"
                  ? "hybrid"
                  : "",
            // ➤ The contract by its number, as each vacancy's page writes it (read on 40 companies, 1 November 2026); part
            // ➤ time only when ticked, as an unticked box is the form's default.
            contract: FLATCHR_KINDS[v.contract_type_id ?? ""] || "",
            hours: v.partial === true ? "part time" : "",
            // ➤ The pay when the employer shows it, its period by letter (y, m, h); its skills go with the text, for the tools.
            pay:
              v.show_salary && Number(v.salary) > 0
                ? {
                    min: Number(v.salary),
                    max: Number(v.salary_max) || Number(v.salary),
                    currency: v.currency || "EUR",
                    period: FLATCHR_PERIODS[v.mensuality ?? ""] || "",
                  }
                : null,
          };
        })
        .filter((p) => p.title && p.url),
  },
  // ➤ Zoho Recruit: the careers page carries every job as JSON in a hidden field; the slug is the
  // ➤ site's name and Zoho's region ("amstelbay.eu", "deriv.com"). The company is the name the page gives itself
  // ➤ («MADIFF Polska», «Framtiden i Sverige AB»): the slug made 4,438 published offers read «Madiffpl.Com» (6 November 2026).
  zoho: {
    licence: {
      name: "Zoho Recruit careers page",
      short: "Zoho Recruit",
      url: "https://www.zoho.com/recruit/",
      licence: "The employer's careers page, read through the list it draws",
      credit: "",
      needsKey: false,
    },
    url: (slug) => {
      const [name, tld = "com"] = slug.split(".");
      return `https://${encodeURIComponent(name)}.zohorecruit.${tld}/jobs/Careers`;
    },
    xml: true,
    parse: (html, slug) => {
      const [name, tld = "com"] = slug.split(".");
      const field =
        String(html || "").match(
          /<input[^>]*\bvalue="([^"]*)"[^>]*\bid="jobs"/,
        ) ||
        String(html || "").match(
          /<input[^>]*\bid="jobs"[^>]*\bvalue="([^"]*)"/,
        );
      let list: unknown;
      try {
        list = JSON.parse(decodeEntities(field?.[1] || "[]"));
      } catch {
        list = [];
      }
      const named = pageName(html);
      const company = /^zoho\b/i.test(named) ? "" : named;
      return (Array.isArray(list) ? (list as ZohoRecord[]) : [])
        .filter((p) => p.Publish !== false)
        .map((p) => ({
          sourceId: String(p.id || ""),
          title: String(p.Posting_Title || p.Job_Opening_Name || "").trim(),
          company,
          location: [p.City, p.State, p.Country].filter(Boolean).join(", "),
          url: p.id
            ? `https://${name}.zohorecruit.${tld}/jobs/Careers/${p.id}`
            : "",
          description: text(p.Job_Description),
          posted: day(p.Date_Opened),
          remote: !!p.Remote_Job,
          mode: p.Remote_Job ? "remote" : "",
          employmentType: [p.Job_Type].filter(
            (v) => typeof v === "string" && v,
          ), // ➤ "Full time", "Part time", "Contract", "Training"…
          // ➤ The experience it asks («3 - 5 Years», «Plus de 5 ans», «+5 años»; «Keine», «Débutant» none) and its pay.
          ...(zohoYears(p.Work_Experience) !== null
            ? { years: zohoYears(p.Work_Experience) }
            : {}),
          pay:
            Number(p.Salary) > 0
              ? {
                  min: Number(p.Salary),
                  max: Number(p.Salary),
                  currency: p.Currency || "",
                  period: "",
                }
              : null,
        }))
        .filter((p) => p.title && p.url);
    },
    // ➤ Asked once per vacancy whose list entry lacks its text or its day, or gives a teaser cut with dots («…editing video
    // ➤ content, develo...»: 975 of 27,233 stored, 1 November 2026); one complete costs no call. Version 2 looks again at
    // ➤ the teasers marked asked without a call under the first rule.
    needsDetail: (p) =>
      !p.description ||
      !p.posted ||
      /(?:\.\.\.|…)\s*$/.test(String(p.description).trim()),
    detailVersion: 2,
    detail: async (p, opts = {}) =>
      zohoDetailOf(
        await getText(p.url, opts),
        String(p.sourceId).split(":").pop(),
      ),
  },
  // ➤ HiBob: the careers page asks for its jobs naming the company in a header, as it does here.
  hibob: {
    licence: {
      name: "HiBob careers page",
      short: "HiBob",
      url: "https://www.hibob.com/",
      licence: "The employer's careers page, read through the list it draws",
      credit: "",
      needsKey: false,
    },
    url: (slug) =>
      `https://${encodeURIComponent(slug)}.careers.hibob.com/api/job-ad`,
    request: (slug) => ({ headers: { companyidentifier: slug } }),
    count: (j) =>
      ((j as { jobAdDetails?: Hibob[] } | null)?.jobAdDetails || []).length,
    parse: (j, slug) =>
      ((j as { jobAdDetails?: Hibob[] } | null)?.jobAdDetails || [])
        .map((p) => ({
          sourceId: String(p.id || ""),
          title: String(p.title || "").trim(),
          location: [p.site, p.country].filter(Boolean).join(", "),
          url: p.id ? `https://${slug}.careers.hibob.com/jobs/${p.id}` : "",
          description: [
            text(p.description),
            text(p.responsibilities),
            text(p.requirements),
            text(p.benefits),
          ]
            .filter(Boolean)
            .join("\n"),
          // ➤ "on_site" read through modeWord: compared with 'onsite' it never matched, and no vacancy was on site (1 November 2026).
          posted: day(p.publishedAt),
          remote: modeWord(p.workspaceTypeId) === "remote",
          mode: modeWord(p.workspaceTypeId),
          employmentType: [p.employmentType].filter(
            (v) => typeof v === "string" && v,
          ), // ➤ Permanent, Internship, Apprentice…
        }))
        .filter((p) => p.title && p.url),
  },
  // ➤ Emply (Denmark): the careers page names, in its script, the sections its list call asks for;
  // ➤ each section's vacancies come as JSON, the same vacancy possibly in two sections.
  emply: {
    licence: {
      name: "Emply careers page",
      short: "Emply",
      url: "https://emply.com/",
      licence: "The employer's careers page, read through the list it draws",
      credit: "",
      needsKey: false,
    },
    url: (slug) => `https://${encodeURIComponent(slug)}.career.emply.com/`,
    read: async (slug, opts) => {
      const base = `https://${encodeURIComponent(slug)}.career.emply.com`;
      const sections = emplySections(await getText(`${base}/`, opts));
      const pages: unknown[] = [];
      for (const sectionId of sections) {
        const body = JSON.stringify({
          count: 500,
          offset: 0,
          langCode: "en-GB",
          sectionId,
          filters: [],
          searchText: "",
          sortByProjectDataId: "project_number",
          sortAscending: false,
          light: true,
          isJobAgent: false,
          siteId: null,
        });
        pages.push(
          await getJson(`${base}/api/integration/vacancy/get-page`, {
            ...opts,
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
          }),
        );
      }
      return ATS.emply.parse(pages, slug);
    },
    parse: (pages, slug) => {
      const seen = new Set<string>();
      return ([] as Emply[])
        .concat(
          ...([] as unknown[])
            .concat(pages)
            .map((j) => (j as { vacancies?: Emply[] } | null)?.vacancies || []),
        )
        .filter((p): p is Emply & { shortId: string } =>
          Boolean(p.shortId && !seen.has(p.shortId) && seen.add(p.shortId)),
        )
        .map((p) => ({
          sourceId: String(p.shortId),
          title: String(p.title || "").trim(),
          location: String(p.location || "").trim(),
          url: `https://${slug}.career.emply.com/ad/${p.titleAsUrl || "job"}/${p.shortId}`,
          description: "",
          posted: day(p.published),
          expires: day(p.deadline),
        }))
        .filter((p) => p.title);
    },
  },
  pinpoint: {
    licence: {
      name: "Pinpoint careers page",
      short: "Pinpoint",
      url: "https://www.pinpointhq.com/",
      licence: "The employer's careers page, read through the list it draws",
      credit: "",
      needsKey: false,
    },
    url: (slug) =>
      `https://${encodeURIComponent(slug)}.pinpointhq.com/postings.json`,
    parse: (j) =>
      ((j as { data?: Pinpoint[] } | null)?.data || []).map((p) => ({
        sourceId: String(p.id || ""),
        title: String(p.title || "").trim(),
        location:
          [p.location?.city, p.location?.province].filter(Boolean).join(", ") ||
          p.location?.name ||
          "",
        url: p.url || "",
        description: [
          text(p.description),
          text(p.key_responsibilities),
          text(p.skills_knowledge_expertise),
        ]
          .filter(Boolean)
          .join("\n"),
        posted: "",
        expires: day(p.deadline_at),
        remote: p.workplace_type === "remote",
        mode: ["remote", "hybrid"].includes(p.workplace_type ?? "")
          ? p.workplace_type
          : p.workplace_type === "onsite"
            ? "onsite"
            : "",
        employmentType: [p.employment_type].filter(
          (v) => typeof v === "string" && v,
        ), // ➤ permanent, apprentice, full_time
        pay:
          p.compensation_visible && Number(p.compensation_minimum) > 0
            ? {
                min: Number(p.compensation_minimum),
                max:
                  Number(p.compensation_maximum) ||
                  Number(p.compensation_minimum),
                currency: p.compensation_currency,
                period: p.compensation_frequency,
              }
            : null,
      })),
  },
  dvinci: {
    licence: {
      name: "d.vinci careers page",
      short: "d.vinci",
      url: "https://www.dvinci-hr.com/",
      licence: "The employer's careers page, read through the list it draws",
      credit: "",
      needsKey: false,
    },
    // ➤ The slug is the account on dvinci-hr.com, or the whole host of a d.vinci easy or dvinci.de
    // ➤ site ("acme.dvinci-easy.com"), which answers the same list.
    url: (slug) =>
      String(slug).includes(".")
        ? `https://${slug}/jobPublication/list.json`
        : `https://${encodeURIComponent(slug)}.dvinci-hr.com/jobPublication/list.json`,
    parse: (j) =>
      (Array.isArray(j) ? (j as Dvinci[]) : []).map((p) => {
        const at: DvinciPlace = p.jobOpening?.locations?.[0] || {};
        const salary = p.jobOpening?.salary;
        const range = salary?.value;
        return {
          sourceId: String(p.id || ""),
          title: String(p.position || p.jobOpening?.name || "").trim(),
          company: String(p.jobOpening?.company?.name || "").trim(),
          location: [
            at.address?.city || at.name || p.jobOpening?.location,
            at.country?.name,
          ]
            .filter(Boolean)
            .join(", "),
          country: String(at.country?.isoA2 || "").toLowerCase(),
          url: p.jobPublicationURL || "",
          description: [text(p.introduction), text(p.tasks), text(p.profile)]
            .filter(Boolean)
            .join("\n"),
          posted: day(p.startDate),
          expires: day(p.endDate),
          // ➤ Its own codes for the contract (UNLIMITED, LIMITED) and the hours (FULL_TIME, PART_TIME, MARGINAL_EMPLOYMENT),
          // ➤ and the pay with its unit (YEAR, MONTH, HOUR) when shown.
          contract:
            DVINCI_CONTRACT[p.jobOpening?.contractPeriod?.internalName ?? ""] ||
            "",
          employmentType: (p.jobOpening?.workingTimes || [])
            .map((w) => DVINCI_HOURS[w?.internalName ?? ""])
            .filter(Boolean),
          pay:
            range && Number(range.minValue) > 0
              ? {
                  min: Number(range.minValue),
                  max: Number(range.maxValue) || Number(range.minValue),
                  currency: salary?.currency,
                  period: range.unitText,
                }
              : null,
        };
      }),
  },
  manatal: {
    licence: {
      name: "Manatal careers page",
      short: "Manatal",
      url: "https://www.manatal.com/",
      licence: "The employer's careers page, read through the list it draws",
      credit: "",
      needsKey: false,
    },
    // ➤ Twenty adverts a page, the most it gives (ten without page_size), the page counted from them: counted
    // ➤ from fifty, every page was read five times, and on 27 October 90 of 542 lists, all of over ~110
    // ➤ adverts, ran out of time.
    url: (slug, got = 0) =>
      `https://www.careers-page.com/api/v1.0/c/${encodeURIComponent(slug)}/jobs/?page=${Math.floor(got / 20) + 1}&page_size=20`,
    // ➤ Every customer's list on one host (www.careers-page.com): at the default pace it answered 403 to
    // ➤ 325 of 542 lists from 14 October, while a single request still got 200 (15 October).
    gapMs: 2000,
    // ➤ An agency's list can hold over a thousand adverts (1,227 on an engineering agency's on 28 October), and
    // ➤ inside a crawl a page took five seconds: as long as a careers site the scout found, which still ends
    // ➤ inside the hour's pass (sources.ts).
    deadlineMs: 400_000,
    count: (j) => ((j as ManatalPage)?.results || []).length,
    more: (j) => !!(j as ManatalPage)?.next,
    parse: (j, slug) =>
      ((j as ManatalPage)?.results || []).map((p) => ({
        sourceId: String(p.id || ""),
        title: String(p.position_name || "").trim(),
        location:
          p.location_display ||
          [p.city, p.state, p.country].filter(Boolean).join(", "),
        url: `https://www.careers-page.com/${slug}/job/${p.hash}`,
        description: text(p.description),
        posted: "",
      })),
  },
  // ➤ HR-Manager (Talentech; Denmark and the Nordics): its documented Job Portal API, the slug the
  // ➤ customer's alias. Its notice allows eight calls an hour per method: one call brings the whole
  // ➤ list with the adverts' text. The contact persons it names are never read into the advert.
  hrmanager: {
    licence: {
      name: "HR-Manager Job Portal API",
      short: "HR-Manager",
      url: "https://talentechgroup.atlassian.net/wiki/spaces/DOCS/pages/2062844338/API+Usage+Notice",
      licence: "Public job portal API",
      credit: "",
      needsKey: false,
    },
    url: (slug, got = 0) =>
      `https://api.hr-manager.net/JobPortal.svc/${encodeURIComponent(slug)}/PositionList/json/?incads=true&take=500&skip=${got}`,
    gapMs: 1000, // ➤ every customer on one host, and each answer a whole list with its texts
    callsAnHour: 8, // ➤ the scout's probe keeps to it; the crawler through crawl.yml's sources_a_run
    count: (j) => ((j as HrManagerPage)?.Items || []).length,
    more: (j, got) =>
      got <
      Math.min(Number((j as HrManagerPage)?.PositionCountSearch) || 0, 1000),
    parse: (answer) => {
      const j = answer as HrManagerPage;
      // ➤ A refusal (its quota spent) comes as a status: it must not read as a board that emptied.
      if (j?.TransactionStatus?.StatusCode)
        throw new Error(
          `HR-Manager: ${j.TransactionStatus.Description || "refused"}`,
        );
      return (j?.Items || [])
        .map((p) => {
          const places = [
            ...new Set(
              [p.PositionLocation, ...(p.PositionLocationMultiSelection || [])]
                .map((l) => String(l?.Name || "").trim())
                .filter(Boolean),
            ),
          ];
          const ad: NonNullable<HrManager["Advertisements"]>[number] =
            (p.Advertisements || [])[0] || {};
          return {
            sourceId: String(p.Id || ""),
            title: String(p.Name || "").trim(),
            company: String(j?.CustomerName || "").trim(),
            location:
              places.join(" / ") ||
              [p.Department?.City, p.Department?.Country]
                .filter(Boolean)
                .join(", "),
            url: p.AdvertisementUrlSecure || p.AdvertisementUrl || "",
            description: [text(ad.Introduction), text(ad.Content)]
              .filter(Boolean)
              .join("\n"),
            posted: msDay(p.Published),
            expires: msDay(p.ApplicationDue),
            modeTag: tagMode(ad.Content),
          };
        })
        .filter((p) => p.title && p.url);
    },
  },
  // ➤ Cornerstone (csod.com): the career site gives every visitor a token in its page and draws its
  // ➤ list from Cornerstone's search, a hundred a page; the slug is the company and its career site
  // ➤ ("henkel/1"). Its host asks ten seconds between calls and is called once a pass; the search's
  // ➤ host names no rule.
  cornerstone: {
    licence: {
      name: "Cornerstone career site",
      short: "Cornerstone",
      url: "https://www.cornerstoneondemand.com/",
      licence: "The employer's careers page, read through the list it draws",
      credit: "",
      needsKey: false,
    },
    url: (slug) => {
      const [corp, site = "1"] = String(slug).split("/");
      return `https://${encodeURIComponent(corp)}.csod.com/ux/ats/careersite/${encodeURIComponent(site)}/home?c=${encodeURIComponent(corp)}`;
    },
    gapMs: 1000,
    read: async (slug, opts) => {
      const site = Number(String(slug).split("/")[1] || 1);
      const page = ATS.cornerstone.url(slug);
      const rules = await robotsOf(opts).rules(page);
      if (!allowed(rules, robotsPath(page))) return [];
      // ➤ Its Crawl-delay between the robots.txt just read and the page.
      if (rules.delay) await sleep(crawlGapMs(rules.delay));
      const ctx = csodContext(await getText(page, opts));
      // ➤ A page that gives no token is not an empty board: the read fails and the adverts stay.
      if (
        !ctx?.token ||
        !/^https:\/\/[a-z0-9.-]+\.csod\.com\/$/.test(ctx.cloud)
      )
        throw new Error(`${slug}: its career site gives no token`);
      const out: BoardAdvert[] = [];
      for (let n = 1; n <= 50; n++) {
        const body = JSON.stringify({
          careerSiteId: site,
          careerSitePageId: site,
          pageNumber: n,
          pageSize: 100,
          cultureId: ctx.cultureId,
          searchText: "",
          cultureName: ctx.cultureName,
          states: [],
          countryCodes: [],
          cities: [],
          placeID: "",
          radius: null,
          postingsWithinDays: null,
          customFieldCheckboxKeys: [],
          customFieldDropdowns: [],
          customFieldRadios: [],
        });
        const j = await getJson<CsodPage>(
          `${ctx.cloud}rec-job-search/external/jobs`,
          {
            ...opts,
            method: "POST",
            body,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${ctx.token}`,
              "CSOD-Accept-Language": ctx.cultureName,
            },
          },
        );
        const got = ATS.cornerstone.parse(j, slug, ctx.cultureName);
        out.push(...got);
        if (
          (j?.data?.requisitions || []).length < 100 ||
          out.length >= (j?.data?.totalCount || 0)
        )
          break;
      }
      return out;
    },
    parse: (j, slug, culture = "en-GB") => {
      const [corp, site = "1"] = String(slug).split("/");
      return ((j as CsodPage)?.data?.requisitions || [])
        .filter((p) => p.requisitionId && p.displayJobTitle)
        .map((p) => {
          const place: { city?: string; country?: string } =
            (p.locations || []).find((l) => l?.city || l?.country) || {};
          return {
            sourceId: String(p.requisitionId),
            title: String(p.displayJobTitle).trim(),
            location: [place.city, place.country].filter(Boolean).join(", "),
            country: /^[A-Z]{2}$/.test(place.country || "")
              ? String(place.country).toLowerCase()
              : "",
            url: `https://${corp}.csod.com/ux/ats/careersite/${site}/home/requisition/${p.requisitionId}?c=${corp}`,
            description: text(p.externalDescription),
            posted: csodDay(p.postingEffectiveDate, culture),
            expires: csodDay(p.postingExpirationDate, culture),
          };
        });
    },
  },
  // ➤ TalentAdore (Finland): the careers page names the JSON its list is drawn from, filters and
  // ➤ all; the slug is the careers site's name ("helsinkishipyard.career").
  talentadore: {
    licence: {
      name: "TalentAdore careers page",
      short: "TalentAdore",
      url: "https://www.talentadore.com/",
      licence: "The employer's careers page, read through the list it draws",
      credit: "",
      needsKey: false,
    },
    url: (slug) => `https://${encodeURIComponent(slug)}.talentadore.com/`,
    gapMs: 250, // ➤ every customer's list on one host (ats.talentadore.com), the scout's probe included
    read: async (slug, opts) => {
      const lists = talentadoreLists(
        await getText(ATS.talentadore.url(slug), opts),
      );
      // ➤ A page that names no list is not an empty board: the read fails and the adverts stay.
      if (!lists.length)
        throw new Error(`${slug}: its careers page names no list`);
      const pages: unknown[] = [];
      for (const list of lists) pages.push(await getJson(list, opts));
      return ATS.talentadore.parse(pages, slug);
    },
    parse: (pages) => {
      const seen = new Set<string | number>();
      return ([] as { p: Talentadore; company: string }[])
        .concat(
          ...([] as unknown[]).concat(pages).map((answer) => {
            const j = answer as {
              jobs?: Talentadore[];
              company?: unknown;
            } | null;
            return (j?.jobs || []).map((p) => ({
              p,
              company: typeof j?.company === "string" ? j.company.trim() : "",
            }));
          }),
        )
        .filter(({ p }) => Boolean(p.id && !seen.has(p.id) && seen.add(p.id)))
        .map(({ p, company }) => ({
          sourceId: String(p.id),
          title: String(p.name || "").trim(),
          company,
          location:
            [
              ...new Set(
                [p.city, p.county, p.country]
                  .map((s) => String(s || "").trim())
                  .filter(Boolean),
              ),
            ].join(", ") || String(p.location || "").trim(),
          url: p.link || "",
          description: text(p.description_html),
          posted: day(p.start_date || p.updated),
          expires: day(p.due_date),
          modeTag: tagMode(p.description_html),
        }))
        .filter((p) => p.title && p.url);
    },
  },
  // ➤ EasyCruit (Visma; Norway, Denmark, the Netherlands): the XML list it publishes for the
  // ➤ customer's own site. The list carries no advert text (that is a file per vacancy).
  easycruit: {
    licence: {
      name: "EasyCruit XML feed",
      short: "EasyCruit",
      url: "https://easycruit.com/",
      licence: "Public XML feed",
      credit: "",
      needsKey: false,
    },
    url: (slug) =>
      `https://${encodeURIComponent(slug)}.easycruit.com/export/xml/vacancy/list.xml`,
    xml: true,
    parse: (xml) => {
      const s = String(xml || "");
      // ➤ A page that is not the list (a maintenance page) must not read as a board that emptied.
      if (!/<VacancyList[\s>]/.test(s))
        throw new Error("EasyCruit: the answer is not a vacancy list");
      const tag = (block: string, name: string) =>
        decodeEntities(
          (
            (block.match(
              new RegExp(
                `<${name}(?:\\s[^>]*)?>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${name}>`,
              ),
            ) || [])[1] || ""
          ).trim(),
        );
      return (s.match(/<Vacancy\s[\s\S]*?<\/Vacancy>/g) || [])
        .map((v) => {
          const attr = (name: string) =>
            (v.match(new RegExp(`^<Vacancy[^>]*\\s${name}="([^"]*)"`)) ||
              [])[1] || "";
          // ➤ The first language the vacancy is written in, and its first department's page.
          const version = (v.match(/<Version[\s>][\s\S]*?<\/Version>/) || [
            "",
          ])[0];
          const country = decodeEntities(
            (version.match(/<Country[^>]*\sname="([^"]*)"/) || [])[1] || "",
          );
          return {
            sourceId: attr("id"),
            title: tag(version, "Title"),
            company: tag(version, "AlternativeCompanyName"),
            location: [
              ...new Set(
                [
                  tag(version, "Location"),
                  tag(version, "County"),
                  country,
                ].filter(Boolean),
              ),
            ].join(", "),
            // ➤ The day applications close (`ApplicationDeadline`), not the day it leaves the page (`date_end`); the duration
            // ➤ (permanent, fixed-term-contract) and extent (fulltime) are items of the vacancy.
            url: tag(v, "VacancyURL"),
            description: "",
            posted: day(attr("date_start")),
            expires:
              day(tag(v, "ApplicationDeadline")) || day(attr("date_end")),
            contract:
              (v.match(/<Item[^>]*type="duration"[^>]*\sid="([^"]*)"/) ||
                v.match(/<Item[^>]*id="([^"]*)"[^>]*type="duration"/) ||
                [])[1] || "",
            hours:
              (v.match(/<Item[^>]*type="extent"[^>]*\sid="([^"]*)"/) ||
                v.match(/<Item[^>]*id="([^"]*)"[^>]*type="extent"/) ||
                [])[1] || "",
          };
        })
        .filter((p) => p.sourceId && p.title && p.url);
    },
    // ➤ The XML list holds no advert text: each vacancy's own page does («jd-description»), and the day applications close
    // ➤ («jd-deadline», «Søknadsfrist: 08.11.2026») when the list leaves it empty. Asked for the vacancies of ours (the text
    // ➤ corpus, 1 November 2026: EasyCruit's cards had no text to read years, degrees or languages from).
    detail: async (p, opts = {}) =>
      easycruitDetailOf(await getText(p.url, opts)),
  },
  workday: {
    vendor: true,
    licence: {
      name: "Workday careers site",
      short: "Workday",
      url: "https://www.myworkdayjobs.com/",
      licence:
        "The employer's own careers site, read through the listing call its page makes; no key",
      credit: "",
      needsKey: false,
    },
    url: (slug) => {
      const [tenant, dc, site] = wdParts(slug);
      return `https://${tenant}.${dc}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`;
    },
    request: (slug, offset = 0) => ({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        limit: 20,
        offset,
        appliedFacets: {},
        searchText: "",
      }),
    }),
    count: (j) => ((j as WorkdayPage)?.jobPostings || []).length,
    // ➤ Workday states the total on the first page only; the pages after it say 0.
    more: (j, got, first) =>
      got < Math.min(Number((first as WorkdayPage)?.total) || 0, 1000),
    read: (slug, opts, company) => readWorkday(slug, opts, company),
    // ➤ The list carries no advert text, hours or end day: they are on each vacancy's own answer, the call its page
    // ➤ makes, asked once per vacancy and kept (builder/readers.ts, withDetails): its text, "Full time", "On-site",
    // ➤ the day it closes ("endDate") and the country's code where the place says only "OCONUS-Kosovo".
    detail: async (p, opts = {}) => {
      const u = new URL(p.url);
      const [, , site, ...path] = u.pathname.split("/");
      const j = await getJson<{ jobPostingInfo?: WorkdayInfo } | null>(
        `${u.origin}/wday/cxs/${u.hostname.split(".")[0]}/${site}/${path.join("/")}`,
        {
          ...opts,
          headers: { ...(opts.headers || {}), Accept: "application/json" },
        },
      );
      const info: WorkdayInfo = j?.jobPostingInfo || {};
      const cc = String(
        info.jobRequisitionLocation?.country?.alpha2Code || "",
      ).toLowerCase();
      return {
        description: text(info.jobDescription),
        modeTag: tagMode(info.jobDescription),
        hours: String(info.timeType || ""),
        mode: modeWord(info.remoteType) || p.mode,
        remote: p.remote || modeWord(info.remoteType) === "remote",
        expires: day(info.endDate) || p.expires || "",
        posted: day(info.startDate) || p.posted,
        country: /^[a-z]{2}$/.test(cc) ? cc : p.country, // ➤ the vacancy's own country before the employer's
      };
    },
    // ➤ "2 Locations" says nothing and is left blank.
    parse: (j, slug) => {
      const [tenant, dc, site] = wdParts(slug);
      return ((j as WorkdayPage)?.jobPostings || [])
        .map((p) => ({
          sourceId: workdayRef(p),
          title: String(p.title || "").trim(),
          location: /^\d+\s+locations$/i.test(
            String(p.locationsText || "").trim(),
          )
            ? ""
            : workdayPlace(p.locationsText),
          url: p.externalPath
            ? `https://${tenant}.${dc}.myworkdayjobs.com/en-US/${site}${p.externalPath}`
            : "",
          description: "",
          posted: agoDay(p.postedOn),
          remote:
            remoteWord(p.locationsText) || modeWord(p.remoteType) === "remote",
          mode: modeWord(p.remoteType),
        }))
        .filter((p) => p.url && p.title);
    },
  },
  oracle: {
    vendor: true,
    licence: {
      name: "Oracle Cloud careers site",
      short: "Oracle",
      url: "https://www.oracle.com/human-capital-management/recruiting/",
      licence:
        "The employer's own careers site, read through the listing call its page makes; no key",
      credit: "",
      needsKey: false,
    },
    url: (slug, offset = 0) => {
      const [host, site] = oraParts(slug);
      return `https://${host}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList&finder=findReqs;siteNumber=${site},limit=50,offset=${offset},sortBy=POSTING_DATES_DESC`;
    },
    count: (j) => ((j as OraclePage)?.items?.[0]?.requisitionList || []).length,
    // ➤ Every vacancy the site counts: a ceiling of three thousand left six sites cut there (24 November 2026).
    more: (j, got) =>
      got < (Number((j as OraclePage)?.items?.[0]?.TotalJobsCount) || 0),
    // ➤ The employer is the requisition's legal employer, named in the list's organisations ("Euroclear SA/NV"): the site's
    // ➤ own name is its number, which named 3,830 of 7,608 published offers «CX 1» or «Fa Etjb Saasfaprod1» (1 November 2026).
    parse: (answer, slug) => {
      const j = answer as OraclePage;
      const [host, site] = oraParts(slug);
      const orgs = new Map(
        (j?.items?.[0]?.organizationsFacet || []).map((o) => [
          o.Id,
          String(o.Name || "").trim(),
        ]),
      );
      return (j?.items?.[0]?.requisitionList || [])
        .map((p) => ({
          sourceId: String(p.Id || ""),
          title: String(p.Title || "").trim(),
          location: String(p.PrimaryLocation || ""),
          company:
            orgs.get(p.LegalEmployerId) || orgs.get(p.OrganizationId) || "",
          url: p.Id
            ? `https://${host}/hcmUI/CandidateExperience/en/sites/${site}/requisitions/preview/${p.Id}`
            : "",
          description: text(p.ShortDescriptionStr || ""),
          posted: day(p.PostedDate),
          remote:
            remoteWord(p.PrimaryLocation) ||
            modeWord(p.WorkplaceTypeCode) === "remote",
          mode: modeWord(p.WorkplaceTypeCode),
        }))
        .filter((p) => p.url && p.title);
    },
    // ➤ The list's contract, schedule and text fields are empty (149 of 149, 1 November 2026): each requisition's own call
    // ➤ has them, asked once and kept (builder/readers.ts). Its flexible fields are not read: one names a contact person.
    detail: async (p, opts = {}) => {
      const u = new URL(p.url);
      const [, site, id] =
        u.pathname.match(/\/sites\/([^/]+)\/requisitions\/preview\/(\d+)/) ||
        [];
      if (!site || !id) return {};
      const j = await getJson<{ items?: OracleDetail[] } | null>(
        `${u.origin}/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails?expand=all&onlyData=true&finder=ById;Id=%22${id}%22,siteNumber=${encodeURIComponent(site)}`,
        opts,
      );
      const d: OracleDetail = j?.items?.[0] || {};
      const body = [
        d.ExternalDescriptionStr,
        d.ExternalResponsibilitiesStr,
        d.ExternalQualificationsStr,
      ]
        .map((v) => text(v || ""))
        .filter(Boolean)
        .join("\n");
      return {
        ...(body ? { description: body } : {}),
        hours: String(d.JobSchedule || ""),
        contract: String(d.ContractType || ""),
        expires: day(d.ExternalPostedEndDate) || p.expires || "",
      };
    },
  },
};

export const id = "boards";
export const kind = "board";

// ➤ The vendors whose sites read through the call their own page makes (Workday, Oracle):
// ➤ each is on or off in config/vendors.yml, and off is the default.
export function loadVendors(): Record<string, boolean> {
  const p = join(ROOT, "config", "vendors.yml");
  return existsSync(p)
    ? (yaml.load(readFileSync(p, "utf-8")) as Record<string, boolean> | null) ||
        {}
    : {};
}
// ➤ Whether a platform is read: a vendor only when switched on, any platform not when marked false (LEC-23: SmartRecruiters'
// ➤ robots.txt).
export const platformOn = (ats: string, vendors = loadVendors()) =>
  vendors[ats] !== false && (!ATS[ats].vendor || vendors[ats] === true);

// ➤ The company boards to read: the hand-made list (config/companies.yml), then the hunter's
// ➤ (hunted.yml), the scout's (companies-found.yml) and the triage's (triaged.yml: careers sites
// ➤ found running on an ATS this site reads), marked found; a slug named earlier is
// ➤ left to the earlier list. Each list is read from config and from state/found, where the
// ➤ server keeps what it found on its own. A vendor switched off in vendors.yml is left out.
export function loadCompanies(): Company[] {
  const read = (file: string) =>
    ["config", "state/found"].flatMap((dir) => {
      const p = join(ROOT, ...dir.split("/"), file);
      return existsSync(p)
        ? (
            yaml.load(readFileSync(p, "utf-8")) as {
              companies?: Company[];
            } | null
          )?.companies || []
        : [];
    });
  const vendors = loadVendors();
  const slugOf = (c: Company) =>
    Object.keys(ATS)
      .map((k) => c[k] && `${k}:${String(c[k]).toLowerCase()}`)
      .find(Boolean);
  const on = (c: Company) => {
    const k = Object.keys(ATS).find((k) => c[k]);
    return !k || platformOn(k, vendors);
  };
  const hand = read("companies.yml");
  const seen = new Set(hand.map(slugOf));
  const out = [...hand];
  for (const c of [
    ...read("hunted.yml"),
    ...read("companies-found.yml"),
    ...read("triaged.yml"),
  ]) {
    const key = slugOf(c);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ ...c, found: true });
  }
  return out.filter(on);
}

// ➤ The sections an Emply careers page names in its script ("sectionId: '…'").
export const emplySections = (html: unknown) => [
  ...new Set(
    [...String(html || "").matchAll(/sectionId\s*:\s*'([0-9a-f-]{36})'/g)].map(
      (m) => m[1],
    ),
  ),
];
// ➤ The lists a TalentAdore careers page draws ("data-url=…/positions/Q27tqSp/json?v=2&amp;…").
export const talentadoreLists = (html: unknown) => [
  ...new Set(
    [
      ...String(html || "").matchAll(
        /https:\/\/ats\.talentadore\.com\/positions\/[A-Za-z0-9]+\/json[^"'\s<>]*/g,
      ),
    ].map((m) => decodeEntities(m[0])),
  ),
];
// ➤ What a Cornerstone career site gives its visitors in "csod.context={…}": the token its search
// ➤ asks for, the search's host, and the site's language.
export function csodContext(html: unknown) {
  const s = String(html || ""),
    at = s.indexOf("csod.context=");
  if (at < 0) return null;
  let depth = 0,
    end = at + 13,
    inStr = false,
    esc = false;
  for (; end < s.length; end++) {
    const c = s[end];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) break;
  }
  let ctx: {
    endpoints?: unknown;
    token?: string;
    cultureID?: number;
    cultureName?: string;
  };
  try {
    ctx = JSON.parse(s.slice(at + 13, end + 1));
  } catch {
    return null;
  }
  let endpoints = ctx.endpoints as { cloud?: string } | string | undefined;
  if (typeof endpoints === "string") {
    try {
      endpoints = JSON.parse(endpoints) as { cloud?: string };
    } catch {
      endpoints = {};
    }
  }
  return {
    token: ctx.token || "",
    cloud: (typeof endpoints === "object" ? endpoints.cloud : "") || "",
    cultureId: Number(ctx.cultureID) || 1,
    cultureName: ctx.cultureName || "en-US",
  };
}
// ➤ "09/10/2026": day first, but month first in the United States' English.
export const csodDay = (v: unknown, culture = "") => {
  const m = String(v || "").match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
  if (!m) return "";
  const [a, b] = /-US$/i.test(culture) ? [m[2], m[1]] : [m[1], m[2]];
  return `${m[3]}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
};

// ➤ The whole board: one answer for most ATS, page after page where the ATS says there is
// ➤ more; an ATS with a `request` says how the call is made (Workday's list is a POST), one with
// ➤ a `read` reads it its own way (Emply asks its page first). `opts.most`: no page after that many adverts.
// ➤ A Workday site answers at most 2,000 vacancies a search, twenty a call. One with a country filter
// ➤ is asked for its European countries one by one, and a vacancy whose town alone does not say its
// ➤ country gets the one it is listed under ("Roanne": Eiffage kept 180 of ours in France with no
// ➤ country, 17 October 2026). Up to a thousand vacancies, only when the filter names every country
// ➤ as this list knows them; else the site is read whole, so none listed under an unknown name is lost.
// ➤ `opts.most` stops it once that many are read (the hunter judges a board on a sample).
const EUROPE = (() => {
  const { countries } = JSON.parse(
    readFileSync(join(ROOT, "catalogues", "countries.json"), "utf8"),
  ) as {
    countries: { iso: string; name: string; aliases?: string[] }[];
  };
  const names = countries
    .filter((c) => c.iso !== "ua")
    .flatMap((c) =>
      [c.name, ...(c.aliases || [])].map((n): [string, string] => [n, c.name]),
    );
  return new Map(
    [
      ...names,
      ["Slovak Republic", "Slovakia"],
      ["Republic of Ireland", "Ireland"],
      ["Moldova, Republic of", "Moldova"],
    ].map(([n, name]) => [n.toLowerCase(), name]),
  );
})();
// ➤ The world's countries as English names them, and the long forms Workday writes.
const WORLD = (() => {
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  const out = new Set([
    "united states of america",
    "korea, republic of",
    "viet nam",
    "russian federation",
    "taiwan, province of china",
    "hong kong",
    "macao",
  ]);
  for (let a = 65; a <= 90; a++)
    for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b),
        n = names.of(code);
      if (n && n !== code) out.add(n.toLowerCase());
    }
  return out;
})();
export function workdayEuropeGroups(
  first: WorkdayPage,
  { allKnown = false } = {},
) {
  const facets = (first?.facets || []).flatMap((f) => [
    f,
    ...(f.values || []).filter((v) => v.facetParameter),
  ]);
  const country = facets.find(
    (f) => /country/i.test(f.facetParameter || "") && Array.isArray(f.values),
  );
  const values = (country?.values || []).filter(
      (v) => v.id && Number(v.count) > 0,
    ),
    name = (v: WorkdayFacet) => String(v.descriptor || "").toLowerCase();
  if (
    allKnown &&
    values.some((v) => !EUROPE.has(name(v)) && !WORLD.has(name(v)))
  )
    return [];
  return values
    .filter((v) => EUROPE.has(name(v)))
    .sort((a, b) => Number(b.count) - Number(a.count))
    .map((v) => ({
      facets: { [String(country?.facetParameter)]: [v.id] },
      total: Math.min(Number(v.count), 2000),
      country: EUROPE.get(name(v)),
    }));
}
// ➤ A place with the country it was listed under, unless it names it already.
export const inCountry = (place: string, country: string) =>
  String(place || "")
    .toLowerCase()
    .includes(country.toLowerCase())
    ? place
    : [place, country].filter(Boolean).join(", ");
async function readWorkday(slug: string, opts: BoardOptions, company?: string) {
  const a = ATS.workday;
  const page = (offset: number, facets = {}) =>
    getJson<WorkdayPage>(a.url(slug), {
      ...opts,
      method: "POST",
      headers: { ...(opts.headers || {}), "Content-Type": "application/json" },
      body: JSON.stringify({
        limit: 20,
        offset,
        appliedFacets: facets,
        searchText: "",
      }),
    });
  const first = await page(0);
  const total = Number(first?.total) || 0;
  const european = workdayEuropeGroups(first, { allKnown: total <= 1000 });
  // ➤ A site with no country filter (Roche, AstraZeneca, Cisco: cities only) is read whole up to the
  // ➤ 2,000 a search answers; it stopped at a thousand of their 1,087 to 1,367.
  const groups: {
    facets: Record<string, unknown>;
    total: number;
    first?: WorkdayPage;
    country?: string;
  }[] = european.length
    ? european
    : [{ facets: {}, total: Math.min(total, 2000), first }];
  const out = new Map<string, BoardAdvert>();
  for (const g of groups) {
    if (opts.most && out.size >= opts.most) break;
    let j = g.first || (await page(0, g.facets)),
      got = 0;
    // ➤ The filter's own total: the countries' counts add a vacancy once for each country it names.
    const bound = Math.min(Number(j?.total) || g.total, g.total, 2000);
    for (;;) {
      // ➤ By address: Thales's vacancies in Europe shared fourteen first bullets and were read as fourteen.
      for (const p of a.parse(j, slug, company))
        if (!out.has(p.url))
          out.set(
            p.url,
            g.country
              ? { ...p, location: inCountry(p.location, g.country) }
              : p,
          );
      const n = (j?.jobPostings || []).length;
      got += n;
      if (!n || got >= bound || (opts.most && out.size >= opts.most)) break;
      j = await page(got, g.facets);
    }
  }
  return [...out.values()];
}

// ➤ A Recruitee company whose careers site is no longer hosted (its pages lead to recruitee.com/careers_not_hosted) keeps
// ➤ answering its offers on the API, but none can be opened: Rebootmonkey's 4,388 led to Recruitee's home page (the owner,
// ➤ 1 November 2026). Such a board lists nothing; its offers close as any gone from a whole list.
async function readRecruitee(slug: string, opts: BoardOptions) {
  // ➤ The company's own address that ends on recruitee.com itself (careers_not_hosted, then the home page) is not hosted.
  const site = await get(
    `https://${encodeURIComponent(slug)}.recruitee.com/`,
    opts,
  ).catch(() => null);
  await site?.body?.cancel?.().catch?.(() => {});
  let landed: string;
  try {
    landed = site?.redirected ? new URL(site.url).hostname : "";
  } catch {
    landed = "";
  }
  if (/^(?:www\.)?recruitee\.com$/.test(landed)) return [];
  return ATS.recruitee.parse(
    await getJson(ATS.recruitee.url(slug), opts),
    slug,
  );
}

// ➤ Personio's feed gives each job's text in the account's own language only: a job written in another has
// ➤ an empty one (NFON's "AI Consultant Engineer", 1 November 2026), and the feed in English or German has it.
// ➤ Asked only when a job lacks its text.
async function readPersonio(
  slug: string,
  opts: BoardOptions,
  company?: string,
) {
  const a = ATS.personio;
  const jobs = a.parse(await getText(a.url(slug), opts), slug, company);
  for (const lang of ["en", "de"]) {
    const bare = new Map(
      jobs.filter((j) => !j.description).map((j) => [j.sourceId, j]),
    );
    if (!bare.size) break;
    for (const other of a.parse(
      await getText(`${a.url(slug)}?language=${lang}`, opts),
      slug,
      company,
    )) {
      const j = bare.get(other.sourceId);
      if (j && other.description)
        Object.assign(j, {
          description: other.description,
          modeTag: j.modeTag || other.modeTag,
        });
    }
  }
  return jobs;
}

// ➤ Teamtailor's RSS gives a hundred jobs a call: the next hundred come with `offset`, until a page
// ➤ comes back short or brings nothing new. 140 boards had sat at exactly 100 (17 October 2026).
async function readTeamtailor(
  slug: string,
  opts: BoardOptions,
  company?: string,
) {
  const a = ATS.teamtailor,
    out = new Map<string, BoardAdvert>();
  for (let offset = 0; ; offset += 100) {
    const xml = await getText(
      offset ? `${a.url(slug)}?offset=${offset}` : a.url(slug),
      opts,
    );
    const before = out.size;
    for (const p of a.parse(xml, slug, company)) out.set(p.url, p);
    if (
      (String(xml).match(/<item>/g) || []).length < 100 ||
      out.size === before ||
      (opts.most && out.size >= opts.most)
    )
      break;
  }
  return [...out.values()];
}

// ➤ The robots.txt files of the boards' hosts, read once a run: thousands of boards share one API host.
const boardRobots = robotsOf({ tries: 2, timeoutMs: 15000 });

// ➤ Only web addresses: a board's list can give a «javascript:» or a bare id as an advert's address (LEC-26).
const onTheWeb = (list: BoardAdvert[]) =>
  list.filter((p) => /^https?:\/\//i.test(String(p?.url || "")));
export async function readBoard(
  ats: string,
  slug: string,
  company?: string,
  opts: BoardOptions = {},
): Promise<BoardAdvert[]> {
  const a = ATS[ats];
  // ➤ Every board is read only where its host's robots.txt lets us, an API's as an employer's site:
  // ➤ SmartRecruiters' API says "Disallow: /" to every robot but LinkedIn's (11 October 2026), and a
  // ➤ board that says no lists nothing. One that does not answer is a failed read (the board keeps
  // ➤ its adverts), not a "no".
  const listing = a.url ? a.url(slug, 0) : "";
  if (
    listing &&
    !allowed(
      await (a.vendor ? robotsOf(opts) : boardRobots).rules(listing),
      robotsPath(listing),
    )
  )
    return [];
  if (a.gapMs) opts = { gapMs: a.gapMs, ...opts };
  if (a.read) return onTheWeb(await a.read(slug, opts, company));
  // ➤ A board that gives its whole list in one answer waits for it as for a feed (LIST_WAIT_MS): Lever's Jobgether (4,633
  // ➤ adverts, 50 MB) and Veeva timed out pass after pass.
  if (!a.more)
    opts = { ...opts, timeoutMs: Math.max(opts.timeoutMs || 0, LIST_WAIT_MS) };
  if (a.xml)
    return onTheWeb(a.parse(await getText(a.url(slug), opts), slug, company));
  const out: BoardAdvert[] = [],
    ids = new Set<string>();
  let got = 0,
    first: unknown = null;
  // ➤ No page past one that brings nothing new: a list that kept saying «more» was asked 600 pages without end (LEC-13).
  // ➤ No ceiling besides: 200 pages cut Manatal's lists at 4,000 (Lifelancer's) until 24 November 2026.
  for (;;) {
    const req: GetOptions = a.request ? a.request(slug, got) : {};
    const j = await getJson<
      { content?: unknown[]; jobs?: unknown[] } & unknown[]
    >(a.url(slug, got), {
      ...opts,
      ...req,
      headers: { ...(opts.headers || {}), ...(req.headers || {}) },
    });
    first ??= j;
    const page = a.parse(j, slug, company),
      fresh = page.filter((p) => !ids.has(p.sourceId || p.url));
    for (const p of fresh) ids.add(p.sourceId || p.url);
    out.push(...fresh);
    got += (a.count ? a.count(j) : (j.content || j.jobs || j).length) || 0;
    if (
      !a.more ||
      !fresh.length ||
      !a.more(j, got, first) ||
      (opts.most && out.length >= opts.most)
    )
      break;
  }
  return onTheWeb(out);
}

// ➤ One advert of a board, as the pile wants it: what the board said, with the company the
// ➤ list names (the board's own name wins for a board the scout found, where the slug was a
// ➤ guess) and an id that carries the slug, so two boards never share one.
export function wrapBoardAdvert(
  ats: string,
  company: Company,
  p: BoardAdvert,
): RawOffer & BoardAdvert {
  return {
    source: ats,
    city: "",
    codes: {},
    lang: company.lang || "",
    expires: "",
    ...p,
    country: p.country || company.country || "", // ➤ an empty country read no longer covers the list's (LEC-21)
    company: company.found && p.company ? p.company : company.name,
    sourceId: `${company[ats]}:${p.sourceId}`,
  };
}
