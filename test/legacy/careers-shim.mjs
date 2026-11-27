// The legacy's builder/adapters/careers.ts, builder/http.ts and builder/normalise.ts as its tests read them: career
// sites' copy of the careers reader, its network functions run in a pass with a fetch client over whatever
// `globalThis.fetch` the test put in place, the real gate's reading of a title (`isOurs`) and the crawl's composed
// reader of a page's labelled facts, as the legacy's reader asked its own; `useLookup` and `useNoGap` (the legacy's DNS
// and pace stand-ins) doing nothing here.
import { FetchClient } from "../../src/shared/http/fetch-client.ts";
import {
  withPass,
  withPassNow,
} from "../../src/features/career-sites/legacy/pass.ts";
import * as careers from "../../src/features/career-sites/legacy/careers.ts";
import { createTitleReader } from "../../src/features/gate/index.ts";
import { readCatalogue } from "../../src/shared/catalogues/read-catalogue.ts";
import { readPageFacts } from "../../src/bin/page-facts.ts";

export * from "../../src/features/career-sites/legacy/careers.ts";
export { idFor } from "../../src/features/career-sites/legacy/normalise.ts";

const isOurs = createTitleReader({
  families: await readCatalogue("families"),
  isco: await readCatalogue("isco"),
  ssykIsco: await readCatalogue("ssykIsco"),
  titles: await readCatalogue("titles"),
  confirmedTitles: await readCatalogue("confirmedTitles"),
});
const clock = { now: () => new Date(), sleep: () => Promise.resolve() };
const tools = () => ({
  http: new FetchClient({
    clock,
    userAgent: "IndudexBot/test",
    maxAttempts: 1,
    fetch: (url, init) => globalThis.fetch(url, init),
  }),
  isOurs,
  pageFacts: readPageFacts,
});
const inPass =
  (read) =>
  (...args) =>
    withPass(tools(), () => read(...args));
export const readSite = inPass(careers.readSite);
export const listed = inPass(careers.listed);
export const resolve = inPass(careers.resolve);
// The legacy's http.ts `get` and robots.ts `robotsOf`, each question asked in a pass.
import * as http from "../../src/features/career-sites/legacy/http.ts";
import * as robots from "../../src/features/career-sites/legacy/robots.ts";
export const get = inPass(http.get);
export const robotsOf = (options) => {
  const asked = robots.robotsOf(options);
  return { rules: inPass(asked.rules), may: inPass(asked.may) };
};
export const worthReadingAgain = (...args) =>
  withPassNow(tools(), () => careers.worthReadingAgain(...args));
export const useLookup = () => undefined;
export const useNoGap = () => undefined;
