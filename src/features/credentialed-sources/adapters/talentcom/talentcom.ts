import { partnerFeed } from "../../partner-feed.js";

// Talent.com's publisher programme: its XML feed, each advert linking to Talent.com's page.
export const talentcom = partnerFeed({
  id: "talentcom",
  name: "Talent.com",
  short: "Talent.com",
  url: "https://employers.talent.com/publishers",
  licence:
    "Talent.com's publisher programme: its adverts, each linking to Talent.com's page for the advert",
  variable: "TALENTCOM_FEED_URL",
});
