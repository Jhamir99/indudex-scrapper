import { type GateRaw, languagesFor } from "./families-of.js";

// Gender marks, which send a title to be read once more (legacy builder/gate.mjs, word for word
// but for types). Catalan titles are read in Spanish by src/shared/words/catalan.ts.

// A title written for the German- or French-speaking market says so with its gender mark
// ("(m/w/d)", "w/m/d", "Techniker:in"; "(H/F)", "F/H"); one whose advert names no country
// ("Emmerthal"), or a country read in another language (South Tyrol's "Bauingenieur (m/w/d)"),
// was read without that language and left out: "Industriemechaniker (m/w/d)", "Technicien de
// maintenance (H/F)". The advert as read again with that language among its own, or null when it
// has it already or carries no such mark. Dutch "(m/v)" would bring a dozen, some wrongly.
const MARKS: Readonly<Record<"de" | "fr", RegExp>> = {
  de: /\((?=[^)]*[wd])[mwfdx](?:\s*[/|,]\s*[mwfdx]){1,3}\)|(?:^|[^a-z])(?:m\/w\/d|w\/m\/d|m\/f\/d|f\/m\/d|d\/m\/w|m\/w\/x|w\/m\/x)(?![a-z])|[a-zäöüß](?::|\*|_)in(?:nen)?(?![a-z])/i,
  fr: /\((?:h\s*\/\s*f|f\s*\/\s*h)(?:\s*\/\s*[xd])?\)|(?:^|[^a-z])(?:h\/f|f\/h)(?![a-z])/i,
};
const MARKET_LANGUAGES = ["de", "fr"] as const;
// The market a title is written for, by its gender mark: 'de', 'fr' or ''.
export const markedFor = (title: string): string =>
  MARKET_LANGUAGES.find((language) => MARKS[language].test(title)) ?? "";

export function markedToo(raw: GateRaw): GateRaw | null {
  const langs: readonly string[] = raw.lang
    ? languagesFor(raw.lang)
    : raw.hintLangs || [];
  const title = String(raw.title || "");
  const add = MARKET_LANGUAGES.filter(
    (l) => !langs.includes(l) && MARKS[l].test(title),
  );
  return add.length
    ? { ...raw, lang: "", hintLangs: [...new Set([...langs, ...add])] }
    : null;
}
