// An ISO 4217 code: the code itself, or a sign or word that names one currency only ("€", "Euro",
// "&euro;", "zł"), alone or repeated ("Euro €"); "kr" and "Fr." where the country tells whose
// crown or franc. A pay that names no currency at all is in its country's, when the country has
// one: 2,600 pays left unread on 24 October 2026 named none, their sites writing "45000" in a
// country of one currency. SEEK, the job board, takes a job's currency from its location the same
// way, unless the employer picks another (the legacy's docs/research/salary.md). A sign several
// currencies share ("$") or a word this list does not know is still refused.

const NAMES: Readonly<Record<string, string>> = {
  "€": "EUR",
  euro: "EUR",
  euros: "EUR",
  "£": "GBP",
  pound: "GBP",
  pounds: "GBP",
  sterling: "GBP",
  zł: "PLN",
  zl: "PLN",
  zloty: "PLN",
  kč: "CZK",
  kc: "CZK",
  ft: "HUF",
  lei: "RON",
};

const BY_COUNTRY: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  kr: { se: "SEK", no: "NOK", dk: "DKK", fo: "DKK", is: "ISK" },
  fr: { ch: "CHF", li: "CHF" },
  sfr: { ch: "CHF", li: "CHF" },
};

// The countries of one currency (Bulgaria's has been the euro since 1 January 2026).
const OWN: Readonly<Record<string, string>> = {
  gb: "GBP",
  ch: "CHF",
  li: "CHF",
  se: "SEK",
  no: "NOK",
  dk: "DKK",
  fo: "DKK",
  is: "ISK",
  pl: "PLN",
  cz: "CZK",
  hu: "HUF",
  ro: "RON",
  tr: "TRY",
  rs: "RSD",
  ba: "BAM",
  mk: "MKD",
  al: "ALL",
  ua: "UAH",
  md: "MDL",
  ...Object.fromEntries(
    "ad at be bg cy de ee es fi fr gr hr ie it lt lu lv mc me mt nl pt si sk sm va xk"
      .split(" ")
      .map((country) => [country, "EUR"]),
  ),
};

const lookUp = (
  table: Readonly<Record<string, string>>,
  key: string,
): string | undefined => (Object.hasOwn(table, key) ? table[key] : undefined);

// A field that names no currency.
export const NO_CURRENCY = /^(?:|n\/?a|none|null|undefined|-|unknown)$/;

export const cleanCurrency = (value: unknown): string =>
  String(value ?? "")
    .replace(/&amp;/gi, "&")
    .replace(/&euro;|&#8364;|&#x20ac;/gi, "€")
    .replace(/&pound;|&#163;|&#xa3;/gi, "£")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");

// The one currency a sign or word names, alone or with others that name the same, or "".
export function namedCurrency(sign: string, country: string): string {
  const each = cleanCurrency(sign)
    .split(/[\s()/,]+/)
    .filter(Boolean)
    .map((part) => {
      const word = part.replace(/\.$/, "");
      const byCountry = Object.hasOwn(BY_COUNTRY, word)
        ? BY_COUNTRY[word]
        : undefined;
      return (
        lookUp(NAMES, word) ??
        (byCountry
          ? (lookUp(byCountry, country) ?? "")
          : /^[a-z]{3}$/.test(word)
            ? word.toUpperCase()
            : "")
      );
    });
  return each.length > 0 && each.every((code) => code && code === each[0])
    ? (each[0] ?? "")
    : "";
}

// A currency field, with the advert's country for "kr" or for a field that names none.
export function currencyOf(value: unknown, country = ""): string {
  const code = country.toLowerCase();
  return NO_CURRENCY.test(cleanCurrency(value))
    ? (lookUp(OWN, code) ?? "")
    : namedCurrency(String(value ?? ""), code);
}
