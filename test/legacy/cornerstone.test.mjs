// The legacy's test/cornerstone.test.mjs (JustJans/indudex@ec79858), carried whole (legacy resync T002): its imports pointed at
// this repo, the scout's case left out.
// ➤ Cornerstone: what its career site gives its visitors, its days, and its search read as adverts.
import { harness } from "./harness.mjs";
import { ATS, csodContext, csodDay, platformOn } from "./boards-shim.mjs";

const { eq, done } = harness("cornerstone");
const page =
  '<script>csod.context={"corp":"henkel","cultureID":"2","cultureName":"en-GB","endpoints":{"cloud":"https://eu-fra.api.csod.com/","api":"/"},"token":"eyJ.abc.def","debug":"false"};</script>';
eq(
  csodContext(page),
  {
    token: "eyJ.abc.def",
    cloud: "https://eu-fra.api.csod.com/",
    cultureId: 2,
    cultureName: "en-GB",
  },
  "the token, the search host and the language the page gives",
);
eq(csodContext("<p>no context</p>"), null, "a page without it gives nothing");
eq(
  [
    csodDay("09/10/2026", "en-GB"),
    csodDay("09/10/2026", "en-US"),
    csodDay("-", "en-GB"),
  ],
  ["2026-10-09", "2026-09-10", ""],
  "day first, but month first in American English",
);

const j = {
  data: {
    totalCount: 2,
    requisitions: [
      {
        requisitionId: 89454,
        postingEffectiveDate: "09/10/2026",
        postingExpirationDate: "-",
        displayJobTitle: "Process Engineer (d/f/m)",
        locations: [
          { city: "Düsseldorf", country: "DE" },
          { city: "Düsseldorf", state: "NORDRHEIN-WESTFALEN", country: "DE" },
        ],
        externalDescription: " What you will do ",
      },
      { requisitionId: 1, displayJobTitle: "" },
    ],
  },
};
eq(
  ATS.cornerstone
    .parse(j, "henkel/1", "en-GB")
    .map((a) => [
      a.sourceId,
      a.title,
      a.location,
      a.country,
      a.url,
      a.posted,
      a.expires,
    ]),
  [
    [
      "89454",
      "Process Engineer (d/f/m)",
      "Düsseldorf, DE",
      "de",
      "https://henkel.csod.com/ux/ats/careersite/1/home/requisition/89454?c=henkel",
      "2026-10-09",
      "",
    ],
  ],
  "each requisition with its first place and a link to it on the career site; one without a title is left",
);
// The scout's reading of a Cornerstone address (its builder/tools/scout.ts `slugsIn`) is source discovery's (017).
eq(
  [
    platformOn("cornerstone", { cornerstone: true }),
    platformOn("cornerstone", { cornerstone: false }),
  ],
  [true, false],
  "the owner keeps it read; vendors.yml switches it off (PEA-08)",
);
done();
