import { z } from "@hono/zod-openapi";
import { catalogueFile } from "./header.js";

// The languages the catalogues name things in (FR-5). A name missing in one of them is allowed:
// the English `label` stands in for it.
export const SITE_LANGUAGES = [
  "en",
  "es",
  "ca",
  "fr",
  "nl",
  "de",
  "it",
  "pl",
] as const;
export type SiteLanguage = (typeof SITE_LANGUAGES)[number];

const Name = z.string().min(1);
const Words = z.array(Name);

// `label` is the English name; the other site languages are optional.
const labels = {
  label: Name,
  es: Name.optional(),
  ca: Name.optional(),
  fr: Name.optional(),
  nl: Name.optional(),
  de: Name.optional(),
  it: Name.optional(),
  pl: Name.optional(),
};

// A language of the adverts (ISO 639-1), wider than the site's: ESCO's titles come in 23.
export const LanguageCode = z.string().regex(/^[a-z]{2}$/, "a language code");
export const CountryCode = z
  .string()
  .regex(/^[a-z]{2}$/, "a lower-case ISO 3166-1 code");
export const IscoUnit = z.string().regex(/^\d{4}$/, "an ISCO-08 unit group");
export const IscoMinorGroup = z
  .string()
  .regex(/^\d{3}$/, "an ISCO-08 minor group");
export const EscoCode = z
  .string()
  .regex(/^\d{4}(?:\.\d+)+$/, "an ESCO occupation code");

const TermsByLanguage = z.record(LanguageCode, Words);

// A positional list: the position is what a profile code stores, so an id appears once.
function positional<Entry extends z.ZodType>(
  entry: Entry,
  key: (item: z.output<Entry>) => string,
) {
  return z.array(entry).superRefine((items, context) => {
    const seen = new Set<string>();
    items.forEach((item, index) => {
      const id = key(item);
      if (seen.has(id))
        context.addIssue({
          code: "custom",
          message: `"${id}" appears twice`,
          path: [index],
        });
      seen.add(id);
    });
  });
}

const FamilyGroup = z
  .strictObject({
    id: Name,
    ...labels,
    isco: z.array(IscoMinorGroup).min(1),
    // The skilled trades: offered only to a visitor who picks one of their families.
    optional: z.boolean().optional(),
  })
  .openapi("FamilyGroup");

const Family = z
  .strictObject({
    id: IscoUnit,
    group: Name,
    ...labels,
    isco_title: Name,
    isco: z.array(IscoUnit).min(1),
    // Job titles ESCO lacks, and titles that must not count, per language.
    extra_terms: TermsByLanguage.optional(),
    not_terms: TermsByLanguage.optional(),
  })
  .openapi("Family");

export const Families = catalogueFile({
  groups: positional(FamilyGroup, (group) => group.id),
  families: positional(Family, (family) => family.id),
})
  .superRefine((catalogue, context) => {
    const groups = new Set(catalogue.groups.map((group) => group.id));
    catalogue.families.forEach((family, index) => {
      if (!groups.has(family.group))
        context.addIssue({
          code: "custom",
          message: `no group "${family.group}"`,
          path: ["families", index, "group"],
        });
    });
  })
  .openapi("Families");
export type Families = z.output<typeof Families>;

const Occupation = z
  .strictObject({
    code: EscoCode,
    ...labels,
    // An occupation ESCO dropped: kept in its place, since profile codes name it by position.
    retired: z.boolean().optional(),
  })
  .openapi("Occupation");

export const Occupations = catalogueFile({
  occupations: positional(Occupation, (occupation) => occupation.code),
}).openapi("Occupations");
export type Occupations = z.output<typeof Occupations>;

const Country = z
  .strictObject({
    iso: CountryCode,
    name: Name,
    aliases: Words,
    cities: Words,
  })
  .openapi("Country");

export const Countries = catalogueFile({
  countries: positional(Country, (country) => country.iso),
}).openapi("Countries");
export type Countries = z.output<typeof Countries>;

const Language = z
  .strictObject({ code: LanguageCode, label: Name, names: Words })
  .openapi("Language");

export const Languages = catalogueFile({
  languages: positional(Language, (language) => language.code),
  // Words that make a language asked for, and words that make it only welcome.
  required: Words,
  softened: Words,
}).openapi("Languages");
export type Languages = z.output<typeof Languages>;

const Degree = z
  .strictObject({ id: Name, ...labels, stems: Name })
  .openapi("Degree");

export const Degrees = catalogueFile({
  // The words that make a line about a degree, as a regular expression's alternatives.
  words: Name,
  degrees: positional(Degree, (degree) => degree.id),
}).openapi("Degrees");
export type Degrees = z.output<typeof Degrees>;

const SeniorityLevel = z
  .strictObject({ id: Name, ...labels, negatives: Words })
  .openapi("SeniorityLevel");

export const Seniority = catalogueFile({
  levels: positional(SeniorityLevel, (level) => level.id),
}).openapi("Seniority");
export type Seniority = z.output<typeof Seniority>;

const Veto = z.strictObject({ id: Name, ...labels, terms: Words }).openapi("Veto");

export const Vetoes = catalogueFile({
  vetoes: positional(Veto, (veto) => veto.id),
}).openapi("Vetoes");
export type Vetoes = z.output<typeof Vetoes>;
