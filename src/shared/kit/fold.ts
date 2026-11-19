// The comparison forms of names and words, from Argus's server-bot/text.mjs (v1.11.0) and the legacy
// web's app/lib/name-key.ts, so the processor compares as the legacy did.

// Accents off, case kept ("Électromécanicien" → "Electromecanicien").
export const unaccent = (text: string): string =>
  text.normalize("NFD").replace(/\p{M}/gu, "");

// Accents off and lower case: the form words are matched in. Letters no accent-stripping takes
// apart (ø, ß, ł) stay as they are.
export const fold = (text: string): string => unaccent(text).toLowerCase();

// The letters no accent-stripping takes apart, spelt the way people type them without them.
const LATIN: Readonly<Record<string, string>> = {
  ø: "o",
  æ: "ae",
  œ: "oe",
  ß: "ss",
  ł: "l",
  đ: "d",
  ð: "d",
  þ: "th",
  ı: "i",
  ħ: "h",
};

// Folded, with those letters spelt out too, everything else as it was.
export const foldLetters = (text: string): string =>
  fold(text).replace(/[øæœßłđðþıħ]/g, (letter) => LATIN[letter] ?? letter);

// The form a town's name and a visitor's words are compared in: folded letters and digits,
// anything else a single space.
export const nameKey = (text: string): string =>
  foldLetters(text)
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

// German and Nordic letters as written without them ("Muenchen", "Koeln", "Aarhus", "Tromsoe").
const SPELT_OUT: Readonly<Record<string, string>> = {
  ä: "ae",
  ö: "oe",
  ü: "ue",
  å: "aa",
  ø: "oe",
};

// A name's keys: its key, and its key with those letters spelt out when it has them.
export function nameKeys(text: string): string[] {
  const key = nameKey(text);
  if (!/[äöüåø]/i.test(text)) return [key];
  const spelt = nameKey(
    text
      .toLowerCase()
      .replace(/[äöüåø]/g, (letter) => SPELT_OUT[letter] ?? letter),
  );
  return spelt === key ? [key] : [key, spelt];
}
