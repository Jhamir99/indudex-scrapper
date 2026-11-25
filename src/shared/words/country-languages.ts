// The languages of each country, the first its main one (legacy builder/gate.mjs). Read by title translation and,
// for a partner feed's adverts that name no language, by credentialed sources (moved here on 2026-11-25).
// A source that names no language (most company boards and careers sites) was read in English
// alone, so "Bauingenieur" or "werktuigbouwkundig ingenieur" fell to the catch-alls. Such an
// advert is now also read in the languages of its country, the ones ESCO has titles for. Spain and Andorra read
// Catalan too (the gate's own Catalan terms, then catalanToo): a Catalan title whose Spanish twin was kept was left
// out, and 90 % of the adverts declare no language (NOB-01).
const COUNTRY_LANGS: Readonly<Record<string, readonly string[]>> = {
  es: ["es", "ca"],
  ad: ["es", "ca"],
  fo: ["da"],
  gl: ["da"],
  fr: ["fr"],
  mc: ["fr"],
  lu: ["fr", "de"],
  be: ["nl", "fr"],
  nl: ["nl"],
  de: ["de"],
  at: ["de"],
  li: ["de"],
  ch: ["de", "fr", "it"],
  it: ["it"],
  sm: ["it"],
  pt: ["pt"],
  se: ["sv"],
  no: ["no"],
  dk: ["da"],
  fi: ["fi", "sv"],
  pl: ["pl"],
  cz: ["cs"],
  sk: ["sk", "cs"],
  lt: ["lt"],
  lv: ["lv"],
  ro: ["ro"],
  md: ["ro"],
  hu: ["hu"],
  hr: ["hr"],
  ba: ["hr"],
  si: ["sl"],
  ee: ["et"],
  is: ["is"],
  mt: ["mt"],
};
export const languagesOfCountry = (cc: string): readonly string[] =>
  Object.hasOwn(COUNTRY_LANGS, cc) ? (COUNTRY_LANGS[cc] ?? []) : [];
