// Staffing and recruitment agencies, by their name: the words they call themselves by in our languages, and the big
// brands whose names say nothing of it (Randstad, Adecco). Their adverts on their own sites then read "via the
// agency's site", not "via the employer's site" (the owner, 29 October 2026). A name in doubt stays an employer's.
import { fold } from "../../shared/kit/fold.js";

const WORDS = [
  // Spanish and Catalan
  "ett",
  "empresa de trabajo temporal",
  "trabajo temporal",
  "treball temporal",
  "seleccion de personal",
  "seleccio de personal",
  "recursos humanos",
  "recursos humans",
  "headhunter",
  "headhunters",
  // English
  "recruitment",
  "recruiting",
  "recruiters",
  "staffing",
  "executive search",
  "employment agency",
  "resourcing",
  // Dutch
  "uitzendbureau",
  "uitzendbureaus",
  "uitzenden",
  "detachering",
  "detacheringsbureau",
  "werving en selectie",
  "personeel",
  // German
  "personaldienstleistung",
  "personaldienstleistungen",
  "personaldienstleister",
  "personalservice",
  "personalvermittlung",
  "personalberatung",
  "personalmanagement",
  "zeitarbeit",
  "arbeitnehmeruberlassung",
  "vermittelt von",
  // French
  "interim",
  "travail temporaire",
  "cabinet de recrutement",
  "recrutement",
  // Polish
  "agencja pracy",
  // Brands
  "randstad",
  "adecco",
  "manpower",
  "manpowergroup",
  "experis",
  "academic work",
  "hays",
  "michael page",
  "page personnel",
  "robert half",
  "robert walters",
  "gi group",
  "start people",
  "tempo team",
  "tempo-team",
  "persona service",
  "dis ag",
  "amadeus fire",
  "kelly services",
  "orizon",
  "brunel",
  "proman",
  "groupe actual",
  "actual talent",
  "adequat",
  "expectra",
  "harvey nash",
  "computer futures",
  "urban linker",
  "ymatch",
  "groupjob",
  "eurofirms",
  "nortempo",
  "temporing",
  "flexiplan",
  "accent jobs",
  "forum jobs",
  "select hr",
  "ago jobs",
  "trixxo",
  "itzu jobs",
  "staffworx",
  "work selection",
];
// "CARO Personal GmbH", "Piening Personal", "Personal- und Unternehmensberatung": "Personal" before a legal form, at the
// end of the name or before "- und" is a staffing firm's ("Personal" alone is a word of other names).
// Built without the u flag, as the legacy built it: its «\p{L}» and «\p{N}» are the characters p, {, L, N
// and }, not letters and figures. Kept as it read.
const RULE = new RegExp(
  `(?:^|[^\\p{L}\\p{N}])(?:${WORDS.map((w) => w.replace(/[-]/g, "[- ]")).join("|")}|personal (?:gmbh|ag|kg|se|service|management)|personal- und|personal$)(?![\\p{L}\\p{N}])`,
  "u",
);

export const isAgency = (name: string | null | undefined): boolean =>
  Boolean(name) && RULE.test(fold(String(name)));

// An employer whose adverts place staff with a client often enough is an agency whatever its name says (Morson,
// TEKsystems, Tecdata Engineering's «para proyecto en cliente»): every advert of one with at least `CLIENT_SHARE.least`
// adverts, `CLIENT_SHARE.share` of them or more marked so (places' `FOR_A_CLIENT`), is flagged. `keyOf`: an employer's
// key. Returns how many adverts it flagged (the legacy's 7c2bf8df `agenciesByShare`).
export const CLIENT_SHARE = { least: 5, share: 0.2 };
export function agenciesByShare(
  adverts: readonly {
    readonly company: string;
    readonly agency: boolean;
    readonly forClient: boolean;
  }[],
  keyOf: (name: string) => string,
): Set<number> {
  const employers = new Map<string, { n: number; forClient: number }>();
  for (const advert of adverts) {
    if (!advert.company) continue;
    const key = keyOf(advert.company);
    const employer = employers.get(key) ?? { n: 0, forClient: 0 };
    employer.n++;
    if (advert.forClient) employer.forClient++;
    employers.set(key, employer);
  }
  const flagged = new Set<number>();
  adverts.forEach((advert, at) => {
    const employer =
      advert.company && !advert.agency
        ? employers.get(keyOf(advert.company))
        : undefined;
    if (
      employer &&
      employer.n >= CLIENT_SHARE.least &&
      employer.forClient / employer.n >= CLIENT_SHARE.share
    )
      flagged.add(at);
  });
  return flagged;
}
