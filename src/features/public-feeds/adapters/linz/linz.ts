import { publicFeed } from "../../../crawl-core/feed-family.js";
import { parseSyndication } from "../../syndication.js";

// Austria: the City of Linz and its companies, through the feed of their vacancies that the city
// publishes on data.gv.at under CC BY 4.0. Same platform and feed as the Bundesrechenzentrum's
// (brz); its <location> says "intern und extern", so the place is Linz and the subtitle names the
// unit. robots.txt closes only the login and sign-up pages.
export const FEED = "https://jobs.linz.at/Syndication/Xml?referrer=Homepage";

export const linz = publicFeed({
  definition: {
    id: "linz",
    kind: "feed",
    licence: {
      name: "Stadt Linz, Stellenangebote",
      short: "Linz",
      url: "https://www.data.gv.at/",
      licence:
        "CC BY 4.0, through data.gv.at; each vacancy links to jobs.linz.at",
      credit: "Stadt Linz, CC BY 4.0 (data.gv.at)",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  pages: [FEED],
  parse: (xml) =>
    parseSyndication(xml, {
      source: "linz",
      company: "Stadt Linz",
      city: "Linz",
    }).filter((draft) => draft.url.startsWith("https://jobs.linz.at/")),
});
