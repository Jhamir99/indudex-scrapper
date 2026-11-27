// The legacy's test/workday-countries.test.mjs (JustJans/indudex@ec79858), carried whole (legacy resync T002): its imports pointed at
// this repo.
// ➤ A Workday site with a country filter is read country by country in Europe, and a vacancy whose
// ➤ town alone does not say its country gets the one it was listed under (builder/adapters/boards.ts).
// ➤ The network is a stand-in: the list answers from a table, by the countries asked for.
import { harness } from "./harness.mjs";
import { useLookup } from "./boards-shim.mjs";
import { readBoard } from "./boards-shim.mjs";

const { eq, done } = harness("workday countries");
useLookup(() => []);
const posting = (i, town) => ({
  title: `Technicien ${i} (H/F)`,
  externalPath: `/job/${town}/Technicien-${i}_R-${i}`,
  locationsText: town,
  postedOn: "Posted Today",
  bulletFields: [`R-${i}`],
});
const facets = (descriptor) => [
  {
    facetParameter: "Location_Country",
    values: [
      { descriptor: "France", id: "fr", count: 2 },
      { descriptor, id: "us", count: 1 },
    ],
  },
];
const lists = {
  fr: {
    total: 2,
    jobPostings: [posting(1, "Roanne"), posting(2, "Paris, France")],
  },
  us: { total: 1, jobPostings: [posting(3, "GREENVILLE, SC")] },
};
let descriptor = "United States of America";
globalThis.fetch = async (url, init = {}) => {
  if (!String(url).endsWith("/wday/cxs/acme/Careers/jobs"))
    return new Response("", { status: 404 });
  const asked = JSON.parse(init.body || "{}").appliedFacets
    ?.Location_Country?.[0];
  const body = asked
    ? lists[asked]
    : {
        total: 3,
        facets: facets(descriptor),
        jobPostings: [...lists.fr.jobPostings, ...lists.us.jobPostings],
      };
  return new Response(JSON.stringify(body), { status: 200 });
};
const read = async () =>
  (
    await readBoard("workday", "acme.wd3/Careers", "", {
      gapMs: 0,
      tries: 1,
      timeoutMs: 2000,
    })
  ).map((p) => p.location);

eq(
  await read(),
  ["Roanne, France", "Paris, France"],
  "France read on its own, each place naming France; the United States not asked for",
);
descriptor = "Atlantis";
eq(
  await read(),
  ["Roanne", "Paris, France", "GREENVILLE, SC"],
  "a filter naming a country the list does not know: the site is read whole, as before",
);
done();
