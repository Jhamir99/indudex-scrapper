// Title translation's public entry (AGENTS.md, "Features"): for the publication, the language each
// title is written in, the caches applied, the titles still wanted and each language's ten; for the
// translator's run, the method and its legs (later tasks).
export { englishTitle, languageOfPlace, readsAs } from "./language-of.js";
export { type LatestPick, latestPicks } from "./latest.js";
export {
  applyTitles,
  COMING,
  type Language,
  LANGUAGES,
  languageOf,
  languagesOfCountry,
  TITLE_FIELD,
  type WantedTitle,
  wantedTitles,
} from "./translate.js";
