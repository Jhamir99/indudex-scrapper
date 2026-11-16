import { publicFeed } from "../../family.js";
import { parseSyndication } from "../../syndication.js";

// Austria: the Bundesrechenzentrum (the federal IT centre), through the feed of its vacancies
// published on data.gv.at under CC BY 4.0. One call.
export const brz = publicFeed({
  definition: {
    id: "brz",
    kind: "feed",
    licence: {
      name: "Bundesrechenzentrum, Stellenausschreibungen",
      short: "BRZ",
      url: "https://www.data.gv.at/",
      licence:
        "CC BY 4.0, through data.gv.at; each vacancy links to brz-jobs.at",
      credit: "Bundesrechenzentrum, CC BY 4.0 (data.gv.at)",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  pages: ["https://www.brz-jobs.at/Syndication/Xml?referrer=BRZ%20Portal"],
  parse: (xml) =>
    parseSyndication(xml, {
      source: "brz",
      company: "Bundesrechenzentrum",
    }).filter((draft) => draft.url.startsWith("https://www.brz-jobs.at/")),
});
