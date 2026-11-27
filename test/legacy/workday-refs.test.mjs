// The legacy's test/workday-refs.test.mjs (JustJans/indudex@ec79858), carried whole (legacy resync T002): its imports pointed at
// this repo.
// ➤ A Workday board's first bullet is usually the vacancy's reference, but some boards put the worker
// ➤ type or the town there (builder/adapters/boards.ts, readWorkday): each vacancy is still read once.
// ➤ The network is a stand-in: the list answers from a table.
import { harness } from "./harness.mjs";
import { useLookup } from "./boards-shim.mjs";
import { ATS, readBoard } from "./boards-shim.mjs";

const { eq, done } = harness("workday refs");
useLookup(() => []);
const posting = (i, bullet) => ({
  title: `Engineer ${i}`,
  externalPath: `/job/Guyancourt/Engineer-${i}_JOBREQ_${i}`,
  locationsText: "Guyancourt",
  postedOn: "Posted Today",
  bulletFields: [bullet],
});
let list = {
  total: 3,
  jobPostings: [
    posting(1, "Regular Employee"),
    posting(2, "Regular Employee"),
    posting(3, "Graduate"),
  ],
};
globalThis.fetch = async (url) =>
  String(url).endsWith("/wday/cxs/acme/Careers/jobs")
    ? new Response(JSON.stringify(list), { status: 200 })
    : new Response("", { status: 404 });

const all = await readBoard("workday", "acme.wd3/Careers", "", {
  gapMs: 0,
  tries: 1,
  timeoutMs: 2000,
});
eq(
  [all.length, new Set(all.map((p) => p.sourceId)).size],
  [3, 3],
  "three vacancies sharing two worker types are three adverts, each with its own reference",
);
eq(
  ATS.workday
    .parse(
      { jobPostings: [posting(4, "R-2026038246"), posting(5, "Guyancourt")] },
      "acme.wd3/Careers",
    )
    .map((p) => p.sourceId),
  ["R-2026038246", "/job/Guyancourt/Engineer-5_JOBREQ_5"],
  "a first bullet that is a reference stays the reference; a town gives way to the address",
);
list = { total: 2, jobPostings: [posting(6, "FR01"), posting(7, "FR01")] };
eq(
  (
    await readBoard("workday", "acme.wd3/Careers", "", {
      gapMs: 0,
      tries: 1,
      timeoutMs: 2000,
    })
  ).length,
  2,
  "two vacancies whose first bullet looks like one reference are still two: the board is read by address",
);
done();
