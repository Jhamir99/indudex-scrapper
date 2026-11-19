import { z } from "@hono/zod-openapi";
import type { StoredAdvert } from "../../shared/schemas/advert.js";
import { titleCalmer } from "./calm-titles.js";
import { contractOf } from "./contract.js";
import {
  compileScreens,
  requiredDegrees,
  requiredLanguages,
  type ScreenCatalogues,
} from "./screens.js";
import { workModeOf } from "./work-mode.js";
import { yearsRange } from "./years.js";

export const AdvertFacts = z.strictObject({
  workMode: z.enum(["onsite", "hybrid", "remote"]).nullable(),
  contract: z
    .strictObject({
      kind: z.enum([
        "permanent",
        "temporary",
        "agency",
        "agency-to-permanent",
        "temporary-to-permanent",
        "training",
        "freelance",
      ]),
      months: z.int().positive().optional(),
    })
    .nullable(),
  workingTime: z
    .strictObject({
      kind: z.enum(["full", "part"]),
      hours: z.int().positive().optional(),
    })
    .nullable(),
  // The largest figure of years asked (what the card shows) and the smallest (what the filter
  // reads, so a cap does not hide an advert that also asks less).
  years: z
    .strictObject({ most: z.number().positive(), least: z.number().positive() })
    .nullable(),
  // Degree ids of the `degrees` catalogue and language codes of the `languages` one.
  degrees: z.array(z.string().min(1)),
  languages: z.array(z.string().min(1)),
  // The title, brought down when written in capitals (FR-4).
  title: z.string().min(1),
});
export type AdvertFacts = z.infer<typeof AdvertFacts>;

export interface FactSources extends ScreenCatalogues {
  // Every title of the build: how they write each word says how a title in capitals is written.
  readonly titles: Iterable<string>;
  // The sources whose terms forbid altering their content (config/untranslated.yml).
  readonly keptAsWritten: ReadonlySet<string>;
}

type FactInput = Pick<
  StoredAdvert,
  | "source"
  | "title"
  | "location"
  | "description"
  | "workMode"
  | "contract"
  | "hours"
  | "employmentType"
  | "years"
>;

// A source's own years are believed, none included (a field that says 0 asks none); the others
// are read from the title and the text.
function yearsOf(advert: FactInput): AdvertFacts["years"] {
  if (advert.years !== undefined)
    return advert.years > 0
      ? { most: advert.years, least: advert.years }
      : null;
  return yearsRange(advert.title, advert.description);
}

// The facts the filters and the matching rules need, read once per advert (FR-8: pure, offline).
export function createFactReader(sources: FactSources) {
  const screens = compileScreens(sources);
  const calm = titleCalmer(sources.titles, sources.keptAsWritten);
  return {
    facts(advert: FactInput): AdvertFacts {
      return {
        workMode: workModeOf(advert),
        ...contractOf(advert),
        years: yearsOf(advert),
        degrees: requiredDegrees(advert.description, screens),
        languages: requiredLanguages(advert.description, screens),
        title: calm(advert),
      };
    },
  };
}
