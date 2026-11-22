import type { Offer } from "../../shared/schemas/published/offer.js";

// The front page's backdrop (legacy builder/backdrop.ts): today's offers in six columns behind the
// count and the search bar, only there for the look. The newest from the employers' own boards and
// sites (no intermediaries), one country after another so it shows the pile's spread, one offer
// per company; only offers whose title, in every language, and "company · town" keep to one line.

const TITLE = 40;
const META = 40;
const SHOWN = 396; // six columns of 66
// The site's languages and the field that holds the title in each (the legacy web's site.ts).
const TITLE_FIELD = {
  en: "te",
  es: "ts",
  ca: "tc",
  fr: "tf",
  nl: "tn",
  de: "td",
} as const;
const TITLES = ["t", ...Object.values(TITLE_FIELD)] as const;

// The title a page in a language shows: its translation, the Spanish on the Catalan page where
// there is no Catalan, or the title as written (the legacy web's titleIn).
const titleIn = (o: Offer, lang: keyof typeof TITLE_FIELD): string =>
  lang === "ca" ? o.tc || o.ts || o.t : o[TITLE_FIELD[lang]] || o.t;

// Every title and its line short enough to show whole.
const fits = (o: Offer) =>
  (Object.keys(TITLE_FIELD) as (keyof typeof TITLE_FIELD)[]).every((lang) => {
    const title = titleIn(o, lang);
    return Boolean(title) && title.length <= TITLE;
  }) && `${o.c} · ${o.ci}`.length <= META;

export type BackdropOffer = Pick<
  Offer,
  | "id"
  | "t"
  | "te"
  | "ts"
  | "tc"
  | "tf"
  | "tn"
  | "td"
  | "c"
  | "ci"
  | "cc"
  | "u"
  | "s"
  | "p"
  | "w"
>;

export function backdropOffers(
  offers: readonly Offer[],
  isVia: (source: string) => boolean,
  n = SHOWN,
): BackdropOffer[] {
  const byCountry = new Map<string, Offer[]>();
  for (const o of offers.toSorted((a, b) =>
    String(b.d || "").localeCompare(String(a.d || "")),
  )) {
    if (
      !o.u ||
      !o.c ||
      !o.ci ||
      !o.cc ||
      o.cc === "xx" ||
      isVia(o.s) ||
      !fits(o)
    )
      continue;
    const list = byCountry.get(o.cc);
    if (list) list.push(o);
    else byCountry.set(o.cc, [o]);
  }
  // The fullest countries first, then one from each in turn.
  const queues = [...byCountry.values()].toSorted(
    (a, b) => b.length - a.length,
  );
  const out: BackdropOffer[] = [];
  const companies = new Set<string>();
  while (out.length < n && queues.some((queue) => queue.length)) {
    for (const queue of queues) {
      while (queue.length && companies.has(queue[0]?.c ?? "")) queue.shift();
      const o = queue.shift();
      if (!o) continue;
      companies.add(o.c);
      const row: Record<string, unknown> = { id: o.id };
      for (const field of TITLES)
        if (o[field] !== undefined) row[field] = o[field];
      Object.assign(row, { c: o.c, ci: o.ci, cc: o.cc, u: o.u, s: o.s });
      if (o.p) row["p"] = o.p;
      if (o.w) row["w"] = o.w;
      out.push(row as BackdropOffer);
      if (out.length === n) break;
    }
  }
  return out;
}
