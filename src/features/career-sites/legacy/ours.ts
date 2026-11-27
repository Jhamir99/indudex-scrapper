// The legacy's builder/lib/ours.ts as its readers ask it: whether a vacancy's address, a title or a stored advert names a
// job of ours, by the gate's reading crawl-core hands the source (`isOurs`, built by the entry point from the gate). With
// none given, every one is ours, as crawl-core's rule says.
import { addressWords } from "../../../shared/kit/address-words.js";
import { passTools } from "./pass.js";

export { addressWords };
const reads = (title: string, country: string, language = ""): boolean =>
  passTools().isOurs?.(title, country, language) ?? true;

export const namesOurs = (url: string, cc: string): boolean =>
  reads(addressWords(url), cc);
export const titleIsOurs = (title: unknown, cc: string): boolean =>
  reads(String(title || ""), cc);
// A stored advert as the publication reads it: in its own language, else in its country's languages.
export const advertIsOurs = (raw: {
  title?: unknown;
  lang?: string;
  country?: string;
}): boolean =>
  reads(String(raw.title || ""), raw.country || "", raw.lang || "");
