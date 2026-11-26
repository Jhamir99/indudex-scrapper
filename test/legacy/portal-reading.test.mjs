// The legacy's test/portal-reading.test.mjs (JustJans/indudex): a portal read whole with a stand-in network, carried with
// its pages and expectations; only its calls go through a prelude, since our reader is a source adapter over a context
// (job portals T006). Left out: its case of a page read again by an older reader (reader versions are not ported).
import { harness } from "./harness.mjs";
import {
  readPortal as read,
  portalPage as page,
} from "../../src/features/job-portals/portal.ts";
import { readPortalList } from "../../src/features/job-portals/portal-list.ts";
import { createTitleReader } from "../../src/features/gate/index.ts";
import { HttpFailure } from "../../src/shared/http/http-failure.ts";
import { readPageFacts } from "../../src/bin/page-facts.ts";
import { gateCatalogues } from "../gate/catalogues.ts";

const { eq, done } = harness("portal reading");
const isOurs = createTitleReader(await gateCatalogues());
const loadPortals = ({ all = false } = {}) =>
  readPortalList().filter((p) => all || !p.off);
const portalPage = (portal, html, url) =>
  page(portal, html, url, readPageFacts);
const http = {
  async request(url, options = {}) {
    if (pages[url] === undefined)
      throw new HttpFailure("client-error", url, 1, 404);
    return options.binary
      ? {
          status: 200,
          url,
          headers: {},
          body: "",
          bytes: new TextEncoder().encode(pages[url]),
        }
      : { status: 200, url, headers: {}, body: pages[url] };
  },
};
// The legacy's readPortal(portal, store, budget): its store is the source's memory, its counts the pass's log line.
async function readPortal(portal, store, budget = {}) {
  let left = budget.left ?? Infinity;
  let line = "";
  const adverts = [];
  const context = {
    http,
    credentials: {},
    log: (l) => (line = l),
    previous: [],
    today: new Date().toISOString().slice(0, 10),
    memory: store.pages ? store : undefined,
    remember: (m) => Object.assign(store, m),
    isOurs,
    pageBudget: {
      take: () => (left > 0 ? (left--, true) : false),
      get left() {
        return left;
      },
    },
    backlog: () => {},
    pageFacts: readPageFacts,
  };
  for await (const draft of read(portal, context)) adverts.push(draft);
  const [listed, , fetched] = line.match(/\d+/g).map(Number);
  return { listed, fetched, adverts };
}
const cnrsPage = `<html><body><h1>Technicien en électronique (H/F)</h1>
<h3 class="h6 mb-1">Lieu de Travail</h3> <p>91190 GIF SUR YVETTE</p>
<h3 class="h4">Les Missions</h3><p>Concevoir les cartes des détecteurs.</p><h2>Votre Profil</h2></body></html>`;
const pages = {
  "https://emploi.cnrs.fr/robots.txt": "User-agent: *\nDisallow: /Candidat/\n",
  "https://emploi.cnrs.fr/Sitemaps/OffresSiteMapProviderResult.ashx": `<?xml version="1.0"?><urlset><url><loc>https://emploi.cnrs.fr/Offres.aspx</loc></url>
<url><loc>emploi.cnrs.fr/Offres/CDD/UMR1-ABC-001/Default.aspx</loc></url><url><loc>emploi.cnrs.fr/Offres/Doctorant/UMR2-DEF-001/Default.aspx</loc></url></urlset>`,
  "https://emploi.cnrs.fr/Offres/CDD/UMR1-ABC-001/Default.aspx": cnrsPage,
  "https://lists.example.fr/offres": '<a href="/offre/1">1</a>',
  "https://lists.example.fr/offres?page=2": '<a href="/offre/2">2</a>',
  "https://lists.example.fr/offres?page=3": '<a href="/offre/3">3</a>',
};
globalThis.fetch = async (url) =>
  pages[url]
    ? new Response(pages[url], { status: 200 })
    : new Response("", { status: 404 });

const cnrs = await readPortal(
  loadPortals().find((p) => p.host === "emploi.cnrs.fr"),
  {},
);
eq(
  [
    cnrs.listed,
    cnrs.adverts.map((a) => [a.url, a.title, a.company, a.location]),
  ],
  [
    1,
    [
      [
        "https://emploi.cnrs.fr/Offres/CDD/UMR1-ABC-001/Default.aspx",
        "Technicien en électronique (H/F)",
        "CNRS",
        "Gif Sur Yvette",
      ],
    ],
  ],
  "the CNRS's sitemap addresses with no scheme are read over https, its fixed-term posts only, each by the portal's own layout",
);
const store = {};
const list = await readPortal(
  {
    name: "A list",
    host: "lists.example.fr",
    country: "fr",
    lists: "https://lists.example.fr/offres",
    listPages: 2,
    match: "/offre/\\d+$",
  },
  store,
  { left: 0 },
);
eq(
  [list.listed, store.listed],
  [2, ["https://lists.example.fr/offre/1", "https://lists.example.fr/offre/2"]],
  "a list is walked as many pages as its portal says, no more",
);

// ➤ Stellenmarkt.de: no sitemap and no title in its addresses, so its search lists by job word are walked
// ➤ (a top job repeated on every page) and every vacancy they name is read.
const sm = loadPortals().find((p) => p.host === "www.stellenmarkt.de");
const smJob = (title, company, town) =>
  `<script type="application/ld+json">{"@context":"http://schema.org","@type":"JobPosting","title":"${title}","datePosted":"2026-10-16","hiringOrganization":{"@type":"Organization","name":"${company}"},"jobLocation":[{"@type":"Place","address":{"@type":"PostalAddress","addressLocality":"${town}","addressRegion":"Hessen","addressCountry":"Deutschland"}}],"description":"<p>Wartung</p>"}</script>`;
const smList = "https://www.stellenmarkt.de/stellenangebote-techniker";
Object.assign(pages, {
  "https://www.stellenmarkt.de/robots.txt": "",
  [smList]:
    '<a href="/anzeige100.html">Top</a><a href="/anzeige1.html">1</a><a href="/anzeige2.html">2</a><a href="/stellenangebote-techniker?page=2">2</a>',
  [`${smList}?page=2`]:
    '<a href="/anzeige100.html">Top</a><a href="/anzeige3.html">3</a>',
  [`${smList}?page=3`]: '<a href="/anzeige100.html">Top</a>',
  "https://www.stellenmarkt.de/anzeige100.html": smJob(
    "Elektroniker für Betriebstechnik (m/w/d)",
    "Stadtwerke Fulda",
    "Fulda",
  ),
  "https://www.stellenmarkt.de/anzeige1.html": smJob(
    "Servicetechniker Kältetechnik (m/w/d)",
    "Kälte Klima GmbH",
    "Kassel",
  ),
  "https://www.stellenmarkt.de/anzeige2.html": smJob(
    "Medizinische Fachangestellte (m/w/d)",
    "Praxis Dr. Weber",
    "Gießen",
  ),
  "https://www.stellenmarkt.de/anzeige3.html": smJob(
    "Techniker Gebäudeautomation (m/w/d)",
    "Hessenwasser",
    "Darmstadt",
  ),
});
const smRead = await readPortal({ ...sm, lists: smList }, {});
eq(
  [
    smRead.listed,
    smRead.fetched,
    smRead.adverts.map((a) => [a.source, a.title, a.company, a.location]),
  ],
  [
    4,
    4,
    [
      [
        "stellenmarkt.de",
        "Elektroniker für Betriebstechnik (m/w/d)",
        "Stadtwerke Fulda",
        "Fulda, Hessen, Deutschland",
      ],
      [
        "stellenmarkt.de",
        "Servicetechniker Kältetechnik (m/w/d)",
        "Kälte Klima GmbH",
        "Kassel, Hessen, Deutschland",
      ],
      [
        "stellenmarkt.de",
        "Medizinische Fachangestellte (m/w/d)",
        "Praxis Dr. Weber",
        "Gießen, Hessen, Deutschland",
      ],
      [
        "stellenmarkt.de",
        "Techniker Gebäudeautomation (m/w/d)",
        "Hessenwasser",
        "Darmstadt, Hessen, Deutschland",
      ],
    ],
  ],
  "Stellenmarkt.de's list walked until a page names nothing new, each vacancy read though its address names no job (the gate sorts them)",
);
eq(
  [
    new RegExp(sm.match).test(
      "https://www.stellenmarkt.de/anzeige26313386.html",
    ),
    new RegExp(sm.match).test(`${smList}?page=2`),
    sm.readAll,
    sm.listPages >= 200,
    []
      .concat(sm.lists)
      .every((u) =>
        /^https:\/\/www\.stellenmarkt\.de\/stellenangebote-[a-z]+$/.test(u),
      ),
  ],
  [true, false, true, true, true],
  "its vacancies, not its list pages; every page read; lists by job word, walked past their 200 pages (techniker: about 3,000 vacancies)",
);

// ➤ localjob.de: its list goes on with "seite=N", and past its own adverts its pages link to none (the browser draws them).
const lj = loadPortals().find((p) => p.host === "www.localjob.de");
const ljList = "https://www.localjob.de/stellenangebote/";
Object.assign(pages, {
  "https://www.localjob.de/robots.txt":
    "User-agent: *\nDisallow: /feed/all\nDisallow: /print/",
  [ljList]:
    '<a href="/jobs/16421878/mechatroniker_(m_w_d)_lueneburg_uvex/">1</a><a href="/stellenangebote/?seite=2">2</a>',
  [`${ljList}?page=2`]:
    '<a href="/jobs/16421878/mechatroniker_(m_w_d)_lueneburg_uvex/">1</a>',
  [`${ljList}?seite=2`]:
    '<a href="/jobs/16421883/elektroinstallateur_(m_w_d)/">2</a><a href="/jobs/sde-126080/techniker/">3</a>',
  [`${ljList}?seite=3`]: '<div id="list"></div>',
  "https://www.localjob.de/jobs/16421878/mechatroniker_(m_w_d)_lueneburg_uvex/":
    smJob("Mechatroniker (m/w/d)", "UVEX Safety Gloves", "Lüneburg"),
  "https://www.localjob.de/jobs/16421883/elektroinstallateur_(m_w_d)/": smJob(
    "Elektroinstallateur (m/w/d)",
    "Elektro Peter",
    "Celle",
  ),
});
const ljRead = await readPortal(lj, {});
eq(
  [ljRead.listed, ljRead.adverts.map((a) => [a.source, a.title, a.company])],
  [
    2,
    [
      ["localjob.de", "Mechatroniker (m/w/d)", "UVEX Safety Gloves"],
      ["localjob.de", "Elektroinstallateur (m/w/d)", "Elektro Peter"],
    ],
  ],
  "localjob.de's list walked by its own page word until a page links to none; its own numbered adverts only",
);

// ➤ devjobs.at: its sitemap keeps vacancies posted years ago, every one ending on one day; a year's are shown.
const dj = loadPortals().find((p) => p.host === "devjobs.at");
const djJob = (title, day) =>
  `<script type="application/ld+json">{"@type":"JobPosting","title":"${title}","datePosted":"${day}","validThrough":"2026-12-16","hiringOrganization":{"@type":"Organization","name":"COPA-DATA"},"jobLocation":[{"@type":"Place","address":{"@type":"PostalAddress","addressLocality":"Salzburg","addressCountry":"AT"}}]}</script>`;
Object.assign(pages, {
  "https://devjobs.at/robots.txt": "User-agent: *\nAllow: /\nDisallow: /page/",
  "https://devjobs.at/sitemap.xml":
    "<sitemapindex><sitemap><loc>https://devjobs.at/sitemap-job.xml</loc></sitemap><sitemap><loc>https://devjobs.at/sitemap-article.xml</loc></sitemap></sitemapindex>",
  "https://devjobs.at/sitemap-job.xml":
    "<urlset><url><loc>https://devjobs.at</loc></url><url><loc>https://devjobs.at/job/46d06193f1e72e67</loc></url><url><loc>https://devjobs.at/job/34c7a5dff4a68bd6</loc></url></urlset>",
  "https://devjobs.at/job/46d06193f1e72e67": djJob(
    "Application Developer",
    "2023-12-11",
  ),
  "https://devjobs.at/job/34c7a5dff4a68bd6": djJob(
    "Senior Firmware Engineer",
    new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10),
  ),
});
const djRead = await readPortal(dj, {});
eq(
  [
    djRead.listed,
    djRead.fetched,
    djRead.adverts.map((a) => [a.source, a.title, a.company, a.country]),
  ],
  [2, 2, [["devjobs.at", "Senior Firmware Engineer", "COPA-DATA", "at"]]],
  "devjobs.at's job sitemap read whole, a vacancy posted over a year ago left out though its end day is to come",
);
// ➤ Free-Work's «Le poste» box, outside its block: its pay, years and remote work written into the text with their labels.
{
  const block = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: "DevSecOps (F/H)",
    description:
      "<p>Nous recherchons un DevSecOps confirmé pour un client du secteur banque.</p>",
    datePosted: "2026-10-30",
    hiringOrganization: { name: "K-Lagan" },
    jobLocation: {
      address: { addressLocality: "Niort", addressCountry: "FR" },
    },
  };
  const box = [
    "45k-55k €⁄an, 450-580 €⁄j",
    "2 à 5 ans d’expérience",
    "Télétravail partiel",
    "Niort, Nouvelle-Aquitaine",
  ]
    .map(
      (t) =>
        `<span class="w-6 flex"><svg></svg></span><span class="w-full text-sm line-clamp-2" data-v-cad823f7>${t}</span>`,
    )
    .join("");
  const html = `<html><head><script type="application/ld+json">${JSON.stringify(block)}</script></head><body><h1>DevSecOps (F/H)</h1>${box}</body></html>`;
  const job = portalPage(
    loadPortals({ all: true }).find((p) => p.host === "www.free-work.com"),
    html,
    "https://www.free-work.com/fr/tech-it/job-mission/ingenieur-securite/devsecops-f-h-11",
  );
  eq(
    job.description.split("\n").slice(-3),
    [
      "Rémunération : 45k-55k €/an, 450-580 €/j",
      "Expérience : 2 à 5 ans d’expérience",
      "Télétravail : partiel",
    ],
    "Free-Work's box written into the text with its labels",
  );
}
// ➤ myjob.ch's sidebar: the kind and the share of a week written into the text with their labels.
{
  const block = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: "CNC-Mechaniker",
    description:
      "<p>Für unseren Kunden suchen wir einen CNC-Mechaniker mit Erfahrung im Drehen und Fräsen.</p>",
    datePosted: "2026-10-24",
    hiringOrganization: { name: "Lexcon" },
    jobLocation: {
      address: { addressLocality: "Lenzburg", addressCountry: "CH" },
    },
  };
  const html = `<html><head><script type="application/ld+json">${JSON.stringify(block)}</script></head><body><h1>CNC-Mechaniker</h1><ul class="vacancy-details-sidebar__info"><li>Lenzburg</li><li><h3>Festanstellung<!-- --> 100%</h3></li></ul></body></html>`;
  const job = portalPage(
    loadPortals({ all: true }).find((p) => p.host === "www.myjob.ch"),
    html,
    "https://www.myjob.ch/job/cnc-mechaniker-in-der-region-lenzburg/3574784",
  );
  eq(
    job.description.split("\n").slice(-2),
    ["Anstellungsart : Festanstellung", "Pensum : 100%"],
    "myjob.ch's sidebar written into the text with its labels",
  );
}
done();
