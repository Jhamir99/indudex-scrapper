// The legacy's test/site-reader.test.mjs (JustJans/indudex@ec79858), carried whole (legacy resync T003): its imports pointed at
// this repo.
// ➤ One pass over an employer's site: which vacancy pages it reads, what it does with a page
// ➤ that does not answer, and when a site is barren. The network is a stand-in: each test
// ➤ site answers from a table, so no polite gap is kept between two calls to one host.
import { harness } from "./harness.mjs";
import {
  readSite,
  isBarren,
  isBlockless,
  hostOf,
  listed,
  joinTitles,
  toRaw,
  worthReadingAgain,
  useShown,
  outdatedBy,
  twinsOf,
} from "./careers-shim.mjs";
import { idFor } from "./careers-shim.mjs";
import { useLookup, useNoGap } from "./careers-shim.mjs";

// ➤ The stand-in network has no names to look up: each host is its own server.
useLookup(() => []);
useNoGap();

const { eq, done } = harness("site reader");
useShown(null);

const POSTING = (title) =>
  `<script type="application/ld+json">${JSON.stringify({ "@type": "JobPosting", title, hiringOrganization: { name: "Acme" }, jobLocation: { address: { addressLocality: "Bilbao", addressCountry: "ES" } } })}</script>`;
const answers = new Map(); // ➤ URL → [status, body]
const asked = [];
globalThis.fetch = async (url) => {
  asked.push(String(url));
  const [status, body] = answers.get(String(url)) || [404, ""];
  return new Response(body, { status });
};

// ➤ A test site: its sitemap lists `pages` (URL → [status, body]), newest first.
let sites = 0;
function site(pages) {
  const host = `site${++sites}.example`;
  const list = Object.keys(pages)
    .map(
      (u, i) =>
        `<url><loc>${u}</loc><lastmod>2026-09-${String(28 - Math.min(i, 27)).padStart(2, "0")}</lastmod></url>`,
    )
    .join("");
  answers.set(`https://${host}/robots.txt`, [200, "User-agent: *\nAllow: /"]);
  answers.set(`https://${host}/sitemap.xml`, [200, `<urlset>${list}</urlset>`]);
  for (const [u, a] of Object.entries(pages)) answers.set(u, a);
  return { host, sitemap: `https://${host}/sitemap.xml` };
}
let pageNo = 0;
const page = () => `https://p${++pageNo}.example/jobs/${pageNo}`;
const pagesOf = (n, answer) =>
  Object.fromEntries(Array.from({ length: n }, () => [page(), answer]));
const read = async (s, store, budget) => {
  asked.length = 0;
  const r = await readSite(s, store, budget);
  return { ...r, pagesAsked: asked.filter((u) => /\/jobs\//.test(u)).length };
};

// A site that never publishes the block becomes barren, and then reads only a few pages a pass.
const empty = [200, "<html><body>A page about us</body></html>"];
const barrenPages = pagesOf(60, empty);
const barrenStore = {};
let r = await read(site(barrenPages), barrenStore);
eq(
  [r.pagesAsked, r.adverts.length, r.barren],
  [60, 0, true],
  "sixty pages read, none with a JobPosting: the site is barren",
);
const again = { ...pagesOf(5, empty), ...barrenPages };
r = await read(site(again), barrenStore);
eq(
  [r.pagesAsked, r.barren],
  [65, true],
  "a site with no block on any page has its pages read again once from their layout, the new ones too",
);
const more = { ...pagesOf(30, empty), ...again };
r = await read(site(more), barrenStore);
eq(
  [r.pagesAsked, r.backlog, r.barren],
  [10, 20, true],
  "then a barren site reads ten of its thirty new pages, newest first",
);
const found = page();
r = await read(
  site({ [found]: [200, POSTING("Site Engineer")], ...more }),
  barrenStore,
);
eq(
  [r.adverts.map((a) => a.title), r.barren],
  [["Site Engineer"], false],
  "a probe that finds a JobPosting ends the barren spell",
);
eq(
  [
    isBarren({}),
    isBarren(
      Object.fromEntries(
        Array.from({ length: 49 }, (_, i) => [i, { job: null }]),
      ),
    ),
  ],
  [false, false],
  "fewer than fifty pages say nothing yet",
);
const vacancy = [
  200,
  "<html><head><title>Elektroniker (m/w/d) | Acme</title></head><body><h1>Elektroniker (m/w/d)</h1><p>Standort: Bilbao. Jetzt bewerben</p></body></html>",
];
const plainStore = {},
  plain = site(pagesOf(6, vacancy));
r = await read(plain, plainStore);
eq(
  [r.pagesAsked, r.adverts.length],
  [6, 0],
  "six vacancy pages without the block give nothing on the first pass",
);
r = await read(plain, plainStore);
eq(
  [
    r.pagesAsked,
    r.adverts.length,
    r.adverts[0]?.location,
    isBlockless(plainStore.pages),
  ],
  [6, 6, "Bilbao", true],
  "the next pass reads them again from their layout, and they are adverts",
);
r = await read(plain, plainStore);
eq(
  [r.pagesAsked, r.adverts.length],
  [0, 6],
  "and keeps them without reading them again",
);

// A page that does not answer is tried again in the next passes, then given up.
const failing = page(),
  healing = page(),
  fine = page();
const flaky = {
  [failing]: [503, ""],
  [healing]: [503, ""],
  [fine]: [200, POSTING("Electrical Engineer")],
};
const flakyStore = {};
r = await read(site(flaky), flakyStore);
eq(
  [r.pagesAsked, r.adverts.length, r.backlog, flakyStore.pages[failing].failed],
  [3, 1, 2, 1],
  "two pages that did not answer are kept as failed and count as not read yet",
);
flaky[healing] = [200, POSTING("Process Engineer")];
r = await read(site(flaky), flakyStore);
eq(
  [
    r.pagesAsked,
    r.adverts.map((a) => a.title).sort(),
    flakyStore.pages[healing].failed,
  ],
  [2, ["Electrical Engineer", "Process Engineer"], undefined],
  "the next pass tries them again, and one that answers is read",
);
r = await read(site(flaky), flakyStore);
eq(
  [r.pagesAsked, flakyStore.pages[failing].failed, r.backlog],
  [1, 3, 0],
  "a page that never answers is tried three passes in all",
);
r = await read(site(flaky), flakyStore);
eq(r.pagesAsked, 0, "and then it is given up");
eq(
  isBarren(
    Object.fromEntries(
      Array.from({ length: 60 }, (_, i) => [i, { job: null, failed: 1 }]),
    ),
  ),
  false,
  "pages that did not answer do not make a site barren",
);

// A host that says "too many requests", or stops answering, is left until the next pass.
const busy = pagesOf(5, [429, ""]);
const busyStore = {};
r = await read(site(busy), busyStore);
eq(
  [r.pagesAsked, Object.keys(busyStore.pages).length, r.backlog],
  [1, 0, 5],
  '"too many requests" ends the reading, and the page is not kept as read',
);
const down = pagesOf(8, [500, ""]);
r = await read(site(down), {});
eq(
  [r.pagesAsked, r.backlog],
  [5, 8],
  "five pages that do not answer end the reading of the site for this pass",
);
const goneStore = {};
r = await read(site(pagesOf(7, [404, ""])), goneStore);
eq(
  [
    r.pagesAsked,
    r.backlog,
    Object.values(goneStore.pages).filter((p) => p.failed).length,
  ],
  [7, 0, 0],
  "a page that is not there is an answer: read, not failed, and not tried again",
);

// A pass that runs out of time keeps what it read; the rest waits for the next pass.
const lateStore = {};
r = await readSite(
  site(pagesOf(4, [200, POSTING("Test Engineer")])),
  lateStore,
  {},
  () => {},
  {
    until: Date.now() - 1,
  },
);
eq(
  [r.fetched, r.backlog, r.adverts.length],
  [0, 4, 0],
  "a pass whose time is up reads no page and leaves them all for the next one",
);

// A run that has spent its page budget leaves the site for the next run.
r = await read(site(pagesOf(3, empty)), {}, { left: 0 });
eq(
  [r.pagesAsked, r.postponed],
  [0, true],
  "no page budget left: the site is postponed, not read",
);
r = await read(site(pagesOf(3, empty)), {}, { left: 2 });
eq(
  [r.pagesAsked, r.postponed],
  [2, false],
  "a budget that covers part of the site reads that part",
);

// A sitemap that does not answer is a failed read, not a site without vacancies; one that is gone is.
const downSite = site(pagesOf(3, [200, POSTING("Site Engineer")]));
const downStore = {};
await read(downSite, downStore);
answers.set(downSite.sitemap, [503, ""]);
const failed = await read(downSite, downStore).then(
  () => "read",
  (e) => e.message,
);
eq(
  [
    /^503 /.test(failed),
    Object.values(downStore.pages).filter((p) => p.job).length,
  ],
  [true, 3],
  "a sitemap answering 503 fails the pass and the site keeps its adverts",
);
answers.set(downSite.sitemap, [403, ""]);
eq(
  await read(downSite, downStore).then(
    () => "read",
    (e) => e.status,
  ),
  403,
  "so does one answering 403: the site is not emptied",
);
answers.set(downSite.sitemap, [404, ""]);
r = await read(downSite, downStore);
eq(r.adverts.length, 0, "a sitemap that is gone lists nothing");

// A list that falls at once to nothing (a maintenance page served with 200) closes nothing for two passes (LEC-06).
const bigSite = site(pagesOf(6, [200, POSTING("Plant Engineer")]));
const bigStore = {};
await read(bigSite, bigStore);
answers.set(bigSite.sitemap, [
  200,
  "<html><body>Wartungsarbeiten</body></html>",
]);
const kept = [
  (await read(bigSite, bigStore)).adverts.length,
  (await read(bigSite, bigStore)).adverts.length,
  (await read(bigSite, bigStore)).adverts.length,
];
eq(
  kept,
  [6, 6, 0],
  "the site keeps its six adverts two passes, and the third empty list closes them",
);

// A sitemap index whose second child does not answer closes nothing that child named (RAS-12).
const childA = pagesOf(2, [200, POSTING("Pipe Fitter")]),
  childB = pagesOf(2, [200, POSTING("Rigger")]);
const indexed = site({ ...childA, ...childB });
const urlset = (pages) =>
  `<urlset>${Object.keys(pages)
    .map((u) => `<url><loc>${u}</loc></url>`)
    .join("")}</urlset>`;
answers.set(indexed.sitemap, [
  200,
  `<sitemapindex><sitemap><loc>https://${indexed.host}/a.xml</loc></sitemap><sitemap><loc>https://${indexed.host}/b.xml</loc></sitemap></sitemapindex>`,
]);
answers.set(`https://${indexed.host}/a.xml`, [200, urlset(childA)]);
answers.set(`https://${indexed.host}/b.xml`, [200, urlset(childB)]);
const indexedStore = {};
const whole = (await read(indexed, indexedStore)).adverts.length;
answers.set(`https://${indexed.host}/b.xml`, [404, ""]);
eq(
  [whole, (await read(indexed, indexedStore)).adverts.length],
  [4, 4],
  "a child sitemap that fails keeps its vacancies' pages",
);

eq(
  [
    hostOf({ host: "www.acme.de" }),
    hostOf({ sitemap: "https://www.rocketjobs.pl/sitemaps/active-jobs.xml" }),
    hostOf({ feed: "https://jobs.acme.com/jobs.xml" }),
    hostOf({ listing: "https://cegeka.com/en/jobs" }),
    hostOf({}),
  ],
  ["acme.de", "rocketjobs.pl", "jobs.acme.com", "cegeka.com", ""],
  "a site's host, from the address it is read through when the hunter wrote none",
);

// A listing numbered page by page with a fixed number a page (JOIN's five): a page with fewer is the last.
const company = (n, from = 0) =>
  Array.from(
    { length: n },
    (_, i) =>
      `<a href="https://jobs.example/companies/acme/${from + i + 1}-test-engineer">Test Engineer</a>`,
  ).join("");
answers.set("https://jobs.example/robots.txt", [
  200,
  "User-agent: *\nDisallow: /*/lp/",
]);
answers.set("https://jobs.example/companies/acme", [200, company(5)]);
answers.set("https://jobs.example/companies/acme?page=2", [200, company(2, 5)]);
answers.set("https://jobs.example/companies/solo", [
  200,
  company(4).replace(/acme/g, "solo"),
]);
const paged = (s) => ({
  host: "jobs.example",
  listing: `https://jobs.example/companies/${s}`,
  paged: `https://jobs.example/companies/${s}?page={n}`,
  per: 5,
  match: `/companies/${s}/`,
});
asked.length = 0;
const acme = await listed(paged("acme"), { gapMs: 0, tries: 1 });
const solo = await listed(paged("solo"), { gapMs: 0, tries: 1 });
eq(
  [
    acme.length,
    solo.length,
    asked.filter((u) => /page=/.test(u)).length,
    asked.some((u) => u.includes("solo?page=")),
  ],
  [7, 4, 1, false],
  "a full page leads to the next; a page of four of five is the last, and no further page is asked",
);
const data = {
  props: {
    pageProps: {
      initialState: {
        company: { name: "Acme GmbH" },
        jobs: {
          items: [
            { title: "Elektroniker (m/w/d)", country: { iso3166: "DE" } },
            { title: "Koch", country: { iso3166: "AT" } },
          ],
          pagination: { pageCount: 2 },
        },
      },
    },
  },
};
eq(
  joinTitles(
    `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script>`,
  ),
  {
    company: "Acme GmbH",
    items: [
      { title: "Elektroniker (m/w/d)", country: "de" },
      { title: "Koch", country: "at" },
    ],
    pages: 2,
  },
  "a JOIN company page's own data: its name, its vacancies' titles and countries, its pages",
);
eq(
  joinTitles("<html>no data</html>").pages,
  0,
  "a page without that data names nothing",
);

// A sitemap index on a "jobs." host: the child whose own path names vacancies is read, seventh as it is (KPN's way).
const kids = [
  "blog",
  "company",
  "event",
  "option",
  "page",
  "testimonial",
  "vacancy",
];
answers.set("https://jobs.kpn.example/robots.txt", [
  200,
  "User-agent: *\nAllow: /",
]);
answers.set("https://jobs.kpn.example/sitemap.xml", [
  200,
  `<sitemapindex>${kids.map((k) => `<sitemap><loc>https://jobs.kpn.example/sitemap.${k}.xml</loc></sitemap>`).join("")}</sitemapindex>`,
]);
for (const k of kids)
  answers.set(`https://jobs.kpn.example/sitemap.${k}.xml`, [
    200,
    `<urlset><url><loc>https://jobs.kpn.example/${k === "vacancy" ? "vacature/1746/engineer" : k}</loc></url></urlset>`,
  ]);
eq(
  (
    await listed(
      {
        host: "jobs.kpn.example",
        sitemap: "https://jobs.kpn.example/sitemap.xml",
      },
      { gapMs: 0, tries: 1 },
    )
  ).map((i) => i.url),
  ["https://jobs.kpn.example/vacature/1746/engineer"],
  "the vacancies' child of seven is among the six read",
);

// An index naming more vacancy children than six (Maven's 27): every one is read, the others only to six in all.
const many = [
  ...Array.from({ length: 9 }, (_, n) => `jobs-${n}`),
  "blog",
  "page",
];
answers.set("https://maven.example/robots.txt", [
  200,
  "User-agent: *\nAllow: /",
]);
answers.set("https://maven.example/sitemap.xml", [
  200,
  `<sitemapindex>${many.map((k) => `<sitemap><loc>https://maven.example/sitemap-${k}.xml</loc></sitemap>`).join("")}</sitemapindex>`,
]);
for (const k of many)
  answers.set(`https://maven.example/sitemap-${k}.xml`, [
    200,
    `<urlset><url><loc>https://maven.example/${k.startsWith("jobs") ? `job/${k}/engineer` : k}</loc></url></urlset>`,
  ]);
const maven = await listed(
  { host: "maven.example", sitemap: "https://maven.example/sitemap.xml" },
  { gapMs: 0, tries: 1 },
);
eq(
  [maven.length, maven.unread],
  [9, 2],
  "every child named for vacancies is read past six, and the others are left once six are read",
);
eq(
  [
    toRaw(
      { title: "Monteur", company: "Werken bij Actemium" },
      { name: "Actemium NL" },
      "https://x.nl/v/1",
    ).company,
    toRaw(
      { title: "Monteur", company: "Hoofdkantoor" },
      { name: "Equans" },
      "https://x.nl/v/2",
    ).company,
  ],
  ["Actemium", "Equans"],
  "a Dutch careers site's \"Werken bij\" is not the employer's name, nor is a head office",
);

// An eRecruiter list page (jobs.ktm.com's kind): the array its script draws is the site's adverts, places and all.
answers.set("https://jobs.erecruiter.example/robots.txt", [
  200,
  "User-agent: *\nDisallow: /Login/",
]);
answers.set("https://jobs.erecruiter.example/Jobs", [
  200,
  '<a href="/Job/7">Elektriker</a><script>var m = {"Jobs":[{"Id":7,"Title":"Elektriker (m/w/d)","Location":"Linz | Wels","UrlEncodedTitle":"Elektriker"}],"TotalJobsCount":1}</script>',
]);
eq(
  (
    await readSite(
      { name: "Acme Austria", page: "https://jobs.erecruiter.example/Jobs" },
      {},
    )
  ).adverts.map((a) => [a.title, a.company, a.location, a.url]),
  [
    [
      "Elektriker (m/w/d)",
      "Acme Austria",
      "Linz, Wels",
      "https://jobs.erecruiter.example/Job/7/Elektriker",
    ],
  ],
  "an eRecruiter list page is read as the site's adverts",
);

// A Bizneo list on the employer's own domain: the pages its layout was guessed from are read again once,
// and one that is gone since is not asked for in every pass.
const bizneo = (place) => [
  200,
  `<link href="https://assets.bizneo.com/a.css"><h1>Ingeniero de Procesos</h1><div title="Ubicación"><i></i><div><span>${place}</span></div></div>`,
];
answers.set("https://bz.example/robots.txt", [200, "User-agent: *\nAllow: /"]);
answers.set("https://bz.example/jobs", [
  200,
  `<link href="https://assets.bizneo.com/a.css">${["a", "b", "c"].map((x) => `<a href="/jobs/ingeniero-${x}">Ingeniero</a>`).join("")}`,
]);
answers.set("https://bz.example/jobs/ingeniero-a", bizneo("Madrid"));
answers.set("https://bz.example/jobs/ingeniero-b", bizneo("Sevilla"));
const guessed = {
  lastmod: "",
  job: {
    title: "Ingeniero de Procesos",
    location: "Azure",
    quality: "guessed",
  },
  r: 2,
  l: 1,
};
const bzStore = {
  pages: {
    "https://bz.example/jobs/ingeniero-a": guessed,
    "https://bz.example/jobs/ingeniero-b": guessed,
    "https://bz.example/jobs/ingeniero-c": {
      lastmod: "",
      job: null,
      r: 2,
      l: 1,
    },
  },
};
const bzSite = {
  host: "bz.example",
  listing: "https://bz.example/jobs",
  match: "/jobs/",
};
r = await read(bzSite, bzStore);
eq(
  [r.pagesAsked, r.adverts.map((a) => a.location).sort()],
  [3, ["Madrid", "Sevilla"]],
  "a Bizneo site has its guessed pages, and those without an advert, read again: the place from its box",
);
r = await read(bzSite, bzStore);
eq(
  r.pagesAsked,
  0,
  "once: the next pass asks for none of them, the page that is gone neither",
);

// A vacancy listed in several languages is read once, in a language robots.txt leaves open (Rheinmetall's way).
const langs = ["zh", "de", "en", "lt"].flatMap((l) => [
  `https://ml.example/${l}/job/safety_manager/1132682`,
  `https://ml.example/${l}/job/systemingenieur/1116413`,
]);
answers.set("https://ml.example/robots.txt", [
  200,
  "User-agent: *\nDisallow: /zh/job/",
]);
answers.set("https://ml.example/sitemap.xml", [
  200,
  `<urlset>${langs.map((u) => `<url><loc>${u}</loc></url>`).join("")}</urlset>`,
]);
for (const u of langs)
  answers.set(u, [
    200,
    POSTING(u.includes("safety") ? "Safety Manager" : "Systemingenieur"),
  ]);
const mlStore = {};
r = await read(
  { host: "ml.example", sitemap: "https://ml.example/sitemap.xml" },
  mlStore,
);
eq(
  [r.listed, r.fetched, Object.keys(mlStore.pages).map((u) => u.split("/")[3])],
  [2, 2, ["de", "de"]],
  "eight addresses for two vacancies: each read once, in the first language robots.txt lets us read",
);
mlStore.pages = {
  [langs[5]]: { lastmod: "", job: { title: "Safety Manager" }, r: 7 },
};
r = await read(
  { host: "ml.example", sitemap: "https://ml.example/sitemap.xml", lang: "lt" },
  mlStore,
);
eq(
  [r.fetched, Object.keys(mlStore.pages).sort()],
  [1, [langs[5], langs[6]]],
  "a language read already is kept; for the other the site's own language",
);

// A page due to be read again is read for an advert the last publication showed, or for one of ours with no place yet.
const shownSite = { host: "shown.example", country: "de" };
const due = (title, location = "Berlin") => ({
  lastmod: "",
  job: { title, location, description: "x".repeat(1500) },
  r: 2,
});
const shownList = new Set([idFor("https://shown.example/job/1")]);
eq(
  [
    worthReadingAgain(
      due("Vertriebsleiter"),
      "https://shown.example/job/1",
      shownSite,
      shownList,
    ),
    worthReadingAgain(
      due("Elektriker (m/w/d)"),
      "https://shown.example/job/2",
      shownSite,
      shownList,
    ),
    worthReadingAgain(
      due("Elektriker (m/w/d)", ""),
      "https://shown.example/job/3",
      shownSite,
      shownList,
    ),
    worthReadingAgain(
      due("Vertriebsleiter", ""),
      "https://shown.example/job/4",
      shownSite,
      shownList,
    ),
    worthReadingAgain(
      due("Vertriebsleiter"),
      "https://shown.example/job/5",
      shownSite,
      null,
    ),
  ],
  [true, false, true, false, true],
  "a shown advert is read again; one not shown only with no place and a title of ours; without the list, every one",
);

// A page stored with letters lost is read again before the new ones, in half the pass at most.
const fresh = pagesOf(3, [200, POSTING("Ingeniero de Procesos")]);
const broken = pagesOf(3, [200, POSTING("Ingeniero de Calidad")]);
const brokenStore = {
  pages: Object.fromEntries(
    Object.keys(broken).map((u) => [
      u,
      {
        lastmod: "",
        job: {
          title: "Ingeniero de Calidad",
          company: "B�hler AG",
          location: "Z�rich",
          posted: "2026-09-01",
          description: "x".repeat(1500),
        },
        r: 2,
      },
    ]),
  ),
};
await read(site({ ...fresh, ...broken }), brokenStore, { pagesASite: 4 });
eq(
  [
    asked.filter((u) => u in broken).length,
    asked.filter((u) => u in fresh).length,
  ],
  [2, 2],
  "two broken pages read again first, then two new ones",
);
// A vacancy whose sitemap day is over a year old is not read, unless every day the list writes is that old.
{
  const now = Date.parse("2026-11-24");
  const list = [
    { lastmod: "2026-11-20" },
    { lastmod: "2025-03-01T10:00:00+01:00" },
    { lastmod: "" },
    { lastmod: "soon" },
  ];
  const outdated = outdatedBy(list, now);
  eq(
    [
      ...list.map(outdated),
      outdatedBy(
        [{ lastmod: "2015-01-01" }, { lastmod: "2015-01-01" }],
        now,
      )({ lastmod: "2015-01-01" }),
    ],
    [false, true, false, false, false],
    "an address last changed over a year ago is left, one with no day kept, and a list of one old day says nothing",
  );
}

// Two entries read through one address both stay: each is told the other's key, and takes the pages the other read.
{
  const named = {
    name: "GE HEALTHCARE",
    sitemap: "https://careers.ge.example/sitemap.xml",
    match: "/global/",
    found: true,
  };
  const host = {
    name: "GE HealthCare",
    host: "careers.ge.example",
    found: true,
  };
  const elsewhere = { name: "GE", host: "careers.ge.example", found: true };
  const resolved = new Map([
    [host, { sitemap: "https://careers.ge.example/sitemap.xml" }],
    [elsewhere, { sitemap: "https://careers.ge.example/de/sitemap.xml" }],
  ]);
  const twins = twinsOf([named, host, elsewhere], (s) => resolved.get(s));
  eq(
    [
      twins.size,
      twins.get(host).startsWith("careers.ge.example~"),
      twins.get(named),
      twins.has(elsewhere),
    ],
    [2, true, "careers.ge.example", false],
    "an entry by its host and the one naming the address it works out are twins; one reading another address is not",
  );
  const shared = pagesOf(3, [200, POSTING("Ingeniero de mantenimiento")]);
  const s = site(shared);
  const theirs = {};
  await read(s, theirs);
  const mine = {};
  const r = await (async () => {
    asked.length = 0;
    const x = await readSite({ ...s, name: "Acme Twin" }, mine, {}, () => {}, {
      shared: theirs.pages,
    });
    return { ...x, pagesAsked: asked.filter((u) => /\/jobs\//.test(u)).length };
  })();
  eq(
    [r.pagesAsked, r.adverts.length, r.adverts[0].company],
    [0, 3, "Acme"],
    "a twin's pages already read are not fetched again, and give this entry its adverts",
  );
}

done();
