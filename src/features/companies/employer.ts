import { isAgency } from "./agencies.js";
import { cleanName, companyKey, usable } from "./company-key.js";
import {
  type CompanyAdvert,
  companyOfAdvert,
  letters,
  spelledCompany,
} from "./employer-name.js";
import { writtenNames } from "./written-names.js";

// An advert's employer: its name as shown ("" for none), its key ("" for none) and whether it is an
// agency's (companies FR-1 to FR-4).
export interface Employer {
  readonly name: string;
  readonly key: string;
  readonly agency: boolean;
}

export interface EmployerAdvert extends CompanyAdvert {
  readonly title: string;
  readonly url: string;
  readonly description: string;
}

function hostLetters(url: string): string {
  try {
    return letters(new URL(url).hostname);
  } catch {
    return "";
  }
}

// The reader for one source's adverts, as the legacy's build read them: the source's names as its
// adverts write them first (writtenNames, per source file), then the advert's own name cleaned and
// spelt as its text writes it. `town`: the town the advert is placed in, when known.
export function createEmployerReader(
  sourceAdverts: Iterable<EmployerAdvert>,
): (advert: EmployerAdvert, town?: string) => Employer {
  const named = writtenNames(sourceAdverts);
  return (advert, town = "") => {
    const company = advert.company ?? "";
    const raw = named.has(company)
      ? { ...advert, company: named.get(company) }
      : advert;
    let name = spelledCompany(
      companyOfAdvert(raw),
      advert.url,
      `${advert.title}\n${advert.description}`,
    );
    // A company that is the offer's own town, on a site not of that name, is a board's place where
    // the employer goes («London» on justjobs.co.uk, «Zagreb» on mojposao.hr, «Liège» on
    // leforem.be: 1,663 published offers, 7 November 2026). An employer named after its town keeps
    // its name on its own site (Rehau on rehau.jobs).
    if (
      name &&
      town &&
      letters(name) === letters(town) &&
      !hostLetters(advert.url).includes(letters(name))
    )
      name = "";
    const cleaned = cleanName(name);
    return {
      name,
      key: usable(cleaned) ? companyKey(cleaned) : "",
      agency: isAgency(name),
    };
  };
}
