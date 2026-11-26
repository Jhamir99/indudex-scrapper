import { z } from "@hono/zod-openapi";
import { CatalogueHeader, catalogueFile } from "./header.js";

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

// ---- Internal catalogues: read by the processor, never published (FR-6). ----

const Labels = z.strictObject({
  label: Name,
  es: Name,
  ca: Name,
  fr: Name,
  nl: Name,
  de: Name,
  it: Name,
  pl: Name,
});

// Short names of the business registers' activities, for the company cards: NACE Rev. 2
// (sections, divisions and classes), the NACE Rev. 2.1 classes whose code means something else,
// and the Spanish CNAE-2009's own classes.
export const Activities = catalogueFile({
  nace: z.record(z.string().regex(/^(?:[A-U]|\d{2,4})$/), Labels),
  nace21: z.record(z.string().regex(/^\d{4}$/), Labels),
  cnae: z.record(z.string().regex(/^\d{4}$/), Labels),
});
export type Activities = z.output<typeof Activities>;

const TitlesByLanguage = z.record(LanguageCode, z.array(Name));

const EscoOccupation = z.strictObject({
  uri: z.url(),
  title: Name,
  code: EscoCode,
  labels: TitlesByLanguage,
  preferred: TitlesByLanguage,
});

// ISCO-08 through ESCO: the scope's minor groups, their unit groups, and every ESCO occupation
// under them with its job titles per language.
export const IscoTable = catalogueFile({
  langs: z.array(LanguageCode).min(1),
  groups: z.array(
    z.strictObject({
      code: IscoMinorGroup,
      title: Name,
      units: z.array(IscoUnit).min(1),
    }),
  ),
  units: z.record(
    IscoUnit,
    z.strictObject({
      title: Name,
      group: IscoMinorGroup,
      occupations: z.array(EscoOccupation),
      labels: TitlesByLanguage,
      preferred: TitlesByLanguage,
    }),
  ),
  // Titles of neighbouring groups that are out, so a generic "engineer" never covers them.
  blockers: z.record(
    IscoUnit,
    z.strictObject({ title: Name, labels: TitlesByLanguage }),
  ),
  // Both empty at import; their entries' shape is for the rebuild tool to state.
  outside: z.record(z.string(), z.unknown()),
  skipped: z.array(z.unknown()),
});
export type IscoTable = z.output<typeof IscoTable>;

// JobTech's SSYK-2012 concepts and the ISCO-08 unit groups it relates them to, by concept id.
export const SsykIsco = catalogueFile({
  concepts: z.record(
    z.string().min(1),
    z.strictObject({
      ssyk: z.string().regex(/^\d{4}$/),
      label: Name,
      isco: z.array(IscoUnit),
    }),
  ),
});
export type SsykIsco = z.output<typeof SsykIsco>;

// Job titles from national statistics offices' coding indexes, per unit group and language.
export const NationalTitles = catalogueFile({
  sources: z.array(
    z.strictObject({
      id: Name,
      lang: Name,
      name: Name,
      page: z.url(),
      licence: Name,
      titles: z.int().nonnegative(),
      as_of: Name.optional(),
    }),
  ),
  units: z.record(IscoUnit, TitlesByLanguage),
  // The BA's search words, read only in the gate's last, German pass.
  last_pass: z.record(IscoUnit, TitlesByLanguage),
  // Words that, next to a kept title, put it in another occupation.
  contexts: z.record(Name, z.array(Name)),
  // ESCO's titles a national index files outside the scope.
  not_ours: TitlesByLanguage,
});
export type NationalTitles = z.output<typeof NationalTitles>;

// Titles the gate's rules left out that two models placed in a unit group of the scope.
export const ConfirmedTitles = catalogueFile({
  titles: z.record(Name, IscoUnit),
});
export type ConfirmedTitles = z.output<typeof ConfirmedTitles>;

// Each site country's Wikidata item, by country code, next to the header.
export const WikidataCountries = z
  .object({ about: CatalogueHeader })
  .catchall(z.string().regex(/^Q\d+$/, "a Wikidata item"))
  .superRefine((catalogue, context) => {
    for (const key of Object.keys(catalogue))
      if (key !== "about" && !CountryCode.safeParse(key).success)
        context.addIssue({
          code: "custom",
          message: "a lower-case ISO 3166-1 code",
          path: [key],
        });
  });
export type WikidataCountries = z.output<typeof WikidataCountries>;

// A GeoNames place as the file stores it, a tuple to keep 84,000 of them small: id, name,
// country, region (admin1, empty when GeoNames gives none), latitude, longitude, population,
// other names, and its names in the languages visitors write in, when it has any. Steps read
// them as `Place` (places.ts).
const PlaceRow = z.tuple(
  [
    z.int().positive(),
    Name,
    CountryCode,
    z.string(),
    z.number().min(-90).max(90),
    z.number().min(-180).max(180),
    z.int().nonnegative(),
    z.array(Name),
  ],
  z.array(Name),
);
export type PlaceRow = z.output<typeof PlaceRow>;

export const Places = catalogueFile({
  places: z.array(PlaceRow).superRefine((rows, context) => {
    if (new Set(rows.map((row) => row[0])).size !== rows.length)
      context.addIssue({
        code: "custom",
        message: "a GeoNames id appears twice",
      });
  }),
});
export type Places = z.output<typeof Places>;

export const NutsCode = z
  .string()
  .regex(/^[A-Z]{2}[A-Z0-9]{0,3}$/, "a NUTS code");

// NUTS codes and names by country: the Latin name, then the region's own when it differs.
const NutsNames = z.record(
  CountryCode,
  z.record(NutsCode, z.array(Name).min(1).max(2)),
);
const NutsByName = z.record(CountryCode, z.record(Name, NutsCode));

// Each town of `places` (by GeoNames id) in its NUTS 3 unit, and the regions and provinces.
export const Nuts = catalogueFile({
  regions: NutsNames,
  provinces: NutsNames,
  // The names a source may give for an area instead of a town, by country.
  areas: NutsByName,
  otherNames: NutsByName,
  towns: z.record(z.string().regex(/^\d+$/), NutsCode),
});
export type Nuts = z.output<typeof Nuts>;

// For each name our towns go by, the biggest town outside the site's countries with that name,
// as [country, population].
export const Elsewhere = catalogueFile({
  elsewhere: z.record(
    Name,
    z.tuple([CountryCode, z.int().nonnegative()]),
  ),
});
export type Elsewhere = z.output<typeof Elsewhere>;
