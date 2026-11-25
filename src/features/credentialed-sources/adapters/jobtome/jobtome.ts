import { partnerFeed } from "../../partner-feed.js";

// Jobtome's publisher programme: its XML feed, each advert linking to Jobtome's page.
export const jobtome = partnerFeed({
  id: "jobtome",
  name: "Jobtome",
  short: "Jobtome",
  url: "https://www.jobtome.com/",
  licence:
    "Jobtome's publisher programme: its adverts, each linking to Jobtome's page for the advert",
  variable: "JOBTOME_FEED_URL",
});
