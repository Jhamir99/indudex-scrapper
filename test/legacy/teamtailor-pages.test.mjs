// The legacy's test/teamtailor-pages.test.mjs (JustJans/indudex@ec79858), carried whole (legacy resync T002): its imports pointed at
// this repo.
// ➤ Teamtailor's RSS gives a hundred jobs a call (builder/adapters/boards.ts, readTeamtailor): a board
// ➤ of 240 is read in three calls through `offset`, and a site that ignores `offset` is not asked
// ➤ again and again. The network is a stand-in: each address answers from a table.
import { harness } from "./harness.mjs";
import { useLookup } from "./boards-shim.mjs";
import { readBoard } from "./boards-shim.mjs";

const { eq, done } = harness("teamtailor pages");
useLookup(() => []);
const rss = (from, n) =>
  `<rss xmlns:tt="https://teamtailor.com/rss"><channel><title>Acme</title>${Array.from({ length: n }, (_, i) => `<item><title>Engineer ${from + i}</title><link>https://acme.teamtailor.com/jobs/${from + i}-engineer</link><guid>${from + i}</guid><description>x</description></item>`).join("")}</channel></rss>`;
const answers = new Map([
  ["https://acme.teamtailor.com/jobs.rss", rss(0, 100)],
  ["https://acme.teamtailor.com/jobs.rss?offset=100", rss(100, 100)],
  ["https://acme.teamtailor.com/jobs.rss?offset=200", rss(200, 40)],
  ["https://deaf.teamtailor.com/jobs.rss", rss(0, 100)],
  ["https://deaf.teamtailor.com/jobs.rss?offset=100", rss(0, 100)],
]);
const asked = [];
globalThis.fetch = async (url) => {
  asked.push(String(url));
  return answers.has(String(url))
    ? new Response(answers.get(String(url)), { status: 200 })
    : new Response("", { status: 404 });
};
const opts = { gapMs: 0, tries: 1, timeoutMs: 2000 };
const calls = (host) =>
  asked.filter((u) => u.startsWith(`https://${host}/jobs.rss`)).length;

const all = await readBoard("teamtailor", "acme", "", opts);
eq(
  [
    all.length,
    new Set(all.map((p) => p.url)).size,
    calls("acme.teamtailor.com"),
  ],
  [240, 240, 3],
  "a board of 240 jobs: three calls of a hundred, every job once",
);
const deaf = await readBoard("teamtailor", "deaf", "", opts);
eq(
  [deaf.length, calls("deaf.teamtailor.com")],
  [100, 2],
  "a site that answers the same hundred again is left after the second call",
);
done();
