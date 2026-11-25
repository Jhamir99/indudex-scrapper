import { partnerFeed } from "../../partner-feed.js";

// WhatJobs' affiliate programme: its XML feed, each advert linking to WhatJobs' page.
export const whatjobs = partnerFeed({
  id: "whatjobs",
  name: "WhatJobs",
  short: "WhatJobs",
  url: "https://www.whatjobs.com/affiliates",
  licence:
    "WhatJobs' affiliate programme: its adverts, each linking to WhatJobs' page for the advert",
  variable: "WHATJOBS_FEED_URL",
});
