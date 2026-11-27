// The legacy's test/readers-audit.test.mjs (JustJans/indudex@ec79858), carried whole (legacy resync T003): its imports pointed at
// this repo.
// The generic readers' fixes from the audit (LEC-04 to LEC-23): the path a site's vacancies hang from, Ashby's unlisted
// postings, a board's country, lists that never end, Softy kept off, page chrome and dates, and robots.txt on a board.
import { test } from "vitest";
import assert from "node:assert/strict";
import http from "node:http";
import { vacanciesPath, oneLanguage, readSite } from "./careers-shim.mjs";
import { ATS, wrapBoardAdvert, readBoard } from "./boards-shim.mjs";
import { without, guessPosting } from "../../src/shared/kit/layout.ts";
import { useLookup } from "./careers-shim.mjs";

useLookup(() => []);

test("one vacancy's folder is not the site's path; two addresses share theirs", () => {
  assert.equal(
    vacanciesPath(["https://a.example/de/de/job/R0159966/welder"]),
    "",
  );
  assert.equal(
    vacanciesPath([
      "https://a.example/de/job/R0159966/welder",
      "https://a.example/de/job/R0159967/fitter",
    ]),
    "/de/job/",
  );
});

test("Ashby's postings marked unlisted are left out", () => {
  const jobs = [
    {
      id: "1",
      title: "Welder",
      jobUrl: "https://jobs.ashbyhq.com/a/1",
      location: "Madrid",
    },
    {
      id: "2",
      title: "Fitter",
      jobUrl: "https://jobs.ashbyhq.com/a/2",
      location: "Madrid",
      isListed: false,
    },
  ];
  assert.deepEqual(
    ATS.ashby.parse({ jobs }, "a").map((p) => p.sourceId),
    ["1"],
  );
});

test("an empty country read leaves the list's", () => {
  assert.equal(
    wrapBoardAdvert(
      "breezy",
      { name: "A", country: "es", breezy: "a" },
      { sourceId: "1", country: "" },
    ).country,
    "es",
  );
  assert.equal(
    wrapBoardAdvert(
      "breezy",
      { name: "A", country: "es", breezy: "a" },
      { sourceId: "1", country: "pt" },
    ).country,
    "pt",
  );
});

test("a list that keeps saying «more» stops when a page brings nothing new", async () => {
  let asked = 0;
  const s = http
    .createServer((req, res) => {
      if (req.url === "/robots.txt") {
        res.writeHead(404);
        return res.end();
      }
      asked++;
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          items: [
            { id: 1, title: "Welder", hosted_url: "https://x.example/1" },
          ],
          meta: { has_next_page: true },
        }),
      );
    })
    .listen(0, "127.0.0.1");
  await new Promise((r) => s.once("listening", r));
  const port = s.address().port;
  const ats = {
    ...ATS.hirehive,
    url: (slug, got = 0) => `http://127.0.0.1:${port}/jobs?page=${got}`,
  };
  ATS._loop = ats;
  const out = await readBoard("_loop", "x", { name: "X" }, { gapMs: 1 });
  delete ATS._loop;
  s.close();
  assert.equal(out.length, 1);
  assert.equal(asked, 2);
});

test("a Softy page is not read while vendors.yml keeps it off", async () => {
  const site = {
    host: "acme.example",
    sitemap: "https://acme.example/sitemap.xml",
    name: "Acme",
  };
  const store = {
    pages: {},
    resolved: { "acme.example": { sitemap: site.sitemap } },
    pass: { ok: true },
    adverts: [1],
  };
  const real = globalThis.fetch;
  globalThis.fetch = async (url) =>
    new Response(
      String(url).endsWith("robots.txt")
        ? ""
        : String(url).endsWith("sitemap.xml")
          ? "<urlset><url><loc>https://acme.softy.pro/offre/1</loc></url><url><loc>https://acme.example/jobs/welder-1</loc></url></urlset>"
          : '<script src="//sc.softy.pro/x.js"></script><script data-page="app">{"props":{"offer":{"title":"Soudeur"}}}</script>',
      { status: String(url).endsWith("robots.txt") ? 404 : 200 },
    );
  const r = await readSite(site, store, { pagesASite: 5 });
  globalThis.fetch = real;
  assert.deepEqual(Object.keys(store.pages), [
    "https://acme.example/jobs/welder-1",
  ]);
  assert.equal(r.adverts.length, 0);
});

test("chrome blocks go by their whole name; an advert keeps its own header and its body date", () => {
  assert.equal(
    without("<nav-bar>Madrid</nav-bar><nav>Menu</nav>", ["nav"]),
    "<nav-bar>Madrid</nav-bar> ",
  );
  const page =
    "<html><head><title>Welder - Acme</title></head><body><article><header><h1>Welder</h1><p>Location: Bilbao</p></header>" +
    '<p>Apply now</p><time datetime="2026-11-01">1 Nov</time></article><footer><time datetime="2019-01-01">2019</time></footer></body></html>';
  const job = guessPosting(
    page,
    "https://acme.example/jobs/welder-1",
    Date.parse("2026-11-14"),
  );
  assert.equal(job?.posted, "2026-11-01");
});

test("Catalan, then Spanish, of one vacancy in several languages", () => {
  const items = [
    "https://a.example/de/job/1",
    "https://a.example/es/job/1",
    "https://a.example/ca/job/1",
  ].map((url) => ({
    url,
  }));
  assert.deepEqual(
    oneLanguage(items).map((i) => i.url),
    ["https://a.example/ca/job/1"],
  );
});

// The legacy's own client refusing what robots.txt closes (a `closes` failure, a silent robots.txt) is crawl-core's
// robots client here, tested with it (hop by hop too): that case is left out.
