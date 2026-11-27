// The legacy's test/hunt-platforms.test.mjs (JustJans/indudex@ec79858), carried whole (legacy resync T003): its imports pointed at
// this repo.
// ➤ Three platforms the hunter (builder/tools/hunt.ts) met in Common Crawl's host graph and read
// ➤ wrong: softgarden's career sites (the board named in their JSON-LD, not the first softgarden host
// ➤ on the page), d.vinci easy and dvinci.de (the same list as dvinci-hr.com, on their own host) and
// ➤ Softy (its offers numbered under "/offers/", their fields in the page's data; left alone until
// ➤ its terms' leave is given). The pages are cut down from the real ones of 17 October 2026; the
// ➤ network is a stand-in.
import { harness } from "./harness.mjs";
import { useLookup } from "./careers-shim.mjs";
import {
  detectPlatform,
  softgardenBoard,
  platformLists,
  looksLikeJob,
  hostName,
  careerLinks,
  isBoardHost,
} from "../../src/features/career-sites/legacy/crawl.ts";
import { ATS, readBoard } from "./boards-shim.mjs";
import { resolve, listed, platformPosting, isSofty } from "./careers-shim.mjs";
import { robotsOf } from "./careers-shim.mjs";

const { eq, done } = harness("hunt platforms");
useLookup(() => []);
const answers = new Map(); // ➤ URL → [status, body]
const asked = [];
globalThis.fetch = async (url) => {
  asked.push(String(url));
  const [status, body] = answers.get(String(url)) || [404, ""];
  return new Response(body, { status });
};
const opts = { gapMs: 0, tries: 1, timeoutMs: 2000 };

// ➤ softgarden. A career site: its own name first (canonical address), a sister firm's board, the board in its JSON-LD, then the analytics.
const careerSite = `<title>Ausbildung und Werkstudentenjobs</title><link rel="canonical" href="https://apprenticeship-and-students-acme-group.career.softgarden.de"/>
<a href="https://acme-logistics.softgarden.io/de/vacancies">Acme Logistics</a>
<script type="application/ld+json">{"@context":"http://schema.org/","@type":"EmployerAggregateRating","itemReviewed":{"@type":"Organization","@id":"https://acme-group.softgarden.io/#organization","name":"Acme Group","url":"https://apprenticeship-and-students-acme-group.career.softgarden.de","sameAs":"https://acme-group.softgarden.io"}}</script>
<script>var u="https://matomo.softgarden.io/";</script>`;
const site =
  "https://apprenticeship-and-students-acme-group.career.softgarden.de/";
eq(
  [detectPlatform(site, careerSite), softgardenBoard(site, careerSite)],
  [{ vendor: "softgarden" }, "acme-group"],
  "a career site is read through the board its JSON-LD names, not through the site's own name",
);
// ➤ On the employer's own domain the analytics come first.
const ownDomain = `<script>var u="https://matomo.softgarden.io/";</script><script type="application/ld+json">{"itemReviewed":{"@type":"Organization","@id":"https:\\/\\/berufmitsinn.softgarden.io\\/#organization"}}</script>`;
eq(
  softgardenBoard("https://www.berufsstartmitsinn.example/", ownDomain),
  "berufmitsinn",
  "on the employer's domain: the JSON-LD's board, never softgarden's analytics",
);
// ➤ Most career sites have no such JSON-LD: their footer's imprint lives on the board; a sister firm's site and board may come first.
const sisters =
  '<a href="https://itt-sicherheitsdienste.career.softgarden.de/">ITT</a><a href="https://itt-sicherheitsdienste.softgarden.io/de/vacancies">Stellen</a><script>var u="https://matomo.softgarden.io/";</script><a href="https://certificate.softgarden.io/avant">Siegel</a><a href="https://avant-gebaeudedienste.softgarden.io/imprint">Impressum</a>';
eq(
  softgardenBoard(
    "https://avant-gebaeudedienste.career.softgarden.de/",
    sisters,
  ),
  "avant-gebaeudedienste",
  "with no JSON-LD: the board of its imprint, not a sister firm's site it links to first",
);
eq(
  softgardenBoard("https://acme.softgarden.io/de/vacancies", careerSite),
  "acme",
  "a board's own address names it",
);
eq(
  softgardenBoard(
    "https://www.acme.example/karriere",
    '<a href="https://certificate.softgarden.io/acme">Siegel</a><script src="https://matomo.softgarden.io/m.js"></script><script src="https://acme.softgarden.io/assets/widget.js"></script>',
  ),
  "acme",
  "a widget on the company's page: the board it loads, not softgarden's seal or analytics",
);
eq(
  softgardenBoard(
    "https://ausbildung-acme.career.softgarden.de/",
    '<link rel="canonical" href="https://ausbildung-acme.career.softgarden.de"/><a href="https://acme.softgarden.io/de/vacancies">Alle Stellen</a>',
  ),
  "acme",
  "a board the career site names beats the site's own name",
);
eq(
  softgardenBoard(
    "https://fbg.career.softgarden.de/",
    '<link rel="canonical" href="https://fbg.career.softgarden.de"/><script>var u="https://matomo.softgarden.io/";</script>',
  ),
  "fbg",
  "a career site with no JSON-LD: its own name, as before",
);
eq(
  softgardenBoard(
    "https://www.acme.example/",
    '<script>var u="https://matomo.softgarden.io/";</script>',
  ),
  "",
  "softgarden's analytics alone name no board",
);
// ➤ Where a hunt on a platform's tenant looks first: a career site's home (moved to the employer's domain or not), Softy's and umantis' lists.
eq(
  [
    platformLists(
      "https://acme.career.softgarden.de",
      "acme.career.softgarden.de",
    ),
    platformLists("https://karriere.acme.example", "acme.career.softgarden.de"),
    platformLists("https://ens-lyon.softy.pro", "ens-lyon.softy.pro"),
    platformLists(
      "https://recruitingapp-2084.de.umantis.com",
      "recruitingapp-2084.de.umantis.com",
    ),
    platformLists("https://www.acme.example", "acme.example"),
  ],
  [
    ["https://acme.career.softgarden.de/"],
    ["https://karriere.acme.example/"],
    ["https://ens-lyon.softy.pro/offers"],
    ["https://recruitingapp-2084.de.umantis.com/Jobs/All"],
    [],
  ],
  "a tenant's list first: on its host, or where its host moved",
);

// ➤ d.vinci: its marks, its addresses, its list on each kind of host.
eq(
  [
    detectPlatform("https://fishbull.dvinci-easy.com/de/jobs"),
    detectPlatform("https://Losberger.dvinci.de/de/jobs/72/x"),
    detectPlatform(
      "https://karriere.acme.example/",
      '<link href="https://static.dvinci-easy.com/css/app.css"><iframe src="https://acme.dvinci-hr.com/de/jobs"></iframe>',
    ),
    detectPlatform(
      "https://www.acme.example/",
      '<a href="https://www.dvinci-hr.com/">d.vinci</a>',
    ),
  ],
  [
    { ats: "dvinci", slug: "fishbull.dvinci-easy.com" },
    { ats: "dvinci", slug: "losberger.dvinci.de" },
    { ats: "dvinci", slug: "acme" },
    {},
  ],
  "d.vinci easy and dvinci.de by their host, a dvinci-hr.com account by its name; d.vinci's own site and its files name none",
);
eq(
  [ATS.dvinci.url("fishbull.dvinci-easy.com"), ATS.dvinci.url("acme")],
  [
    "https://fishbull.dvinci-easy.com/jobPublication/list.json",
    "https://acme.dvinci-hr.com/jobPublication/list.json",
  ],
  "the list on the host itself, or on dvinci-hr.com for an account",
);
eq(
  [hostName("losberger.dvinci.de"), hostName("acme.dvinci-hr.com")],
  ["", ""],
  "a d.vinci host names no company (not 'Dvinci')",
);
const dvList = [
  {
    id: 66968,
    position: "Elektroniker für Betriebstechnik (m/w/d)",
    jobPublicationURL:
      "https://fishbull.dvinci-easy.com/de/jobs/66968/elektroniker",
    startDate: "2026-10-01",
    jobOpening: {
      company: { name: "FISHBULL Franz Fischer SE & Co. KG" },
      locations: [
        {
          name: "96465 Neustadt b. Coburg",
          country: { name: "Deutschland", isoA2: "DE" },
          address: { city: "Neustadt b. Coburg" },
        },
      ],
    },
  },
];
answers.set("https://fishbull.dvinci-easy.com/robots.txt", [
  200,
  "User-agent: *\nAllow: /\nSitemap: https://fishbull.dvinci-easy.com/sitemap.xml",
]);
answers.set("https://fishbull.dvinci-easy.com/jobPublication/list.json", [
  200,
  JSON.stringify(dvList),
]);
const dv = await readBoard("dvinci", "fishbull.dvinci-easy.com", "", opts);
eq(
  [
    dv.length,
    dv[0]?.title,
    dv[0]?.location,
    dv[0]?.country,
    dv[0]?.company,
    asked.includes("https://fishbull.dvinci-easy.com/jobPublication/list.json"),
  ],
  [
    1,
    "Elektroniker für Betriebstechnik (m/w/d)",
    "Neustadt b. Coburg, Deutschland",
    "de",
    "FISHBULL Franz Fischer SE & Co. KG",
    true,
  ],
  "a d.vinci easy site read through its own list, the employer named",
);

// ➤ Softy: its offers' addresses, its sitemap, an offer read from the page's data.
eq(
  [
    "https://ens-lyon.softy.pro/offers/224990",
    "https://ens-lyon.softy.pro/offers?page=1",
    "https://shop.example/offers/black-friday",
    "https://nextpool.softy.pro/offre/134375-ingenieur",
  ].map(looksLikeJob),
  [true, false, false, true],
  "a numbered offer is a vacancy, the list and a shop's offers are not",
);
answers.set("https://ens-lyon.softy.pro/robots.txt", [
  200,
  "User-agent: *\nAllow: /\n\nUser-agent: GPTBot\nDisallow: /\n\nSitemap: https://ens-lyon.softy.pro/sitemap.xml",
]);
answers.set("https://ens-lyon.softy.pro/sitemap.xml", [
  200,
  `<urlset>${["", "/offers?page=1", "/offers/224990", "/offers/225043"].map((p) => `<url><loc>https://ens-lyon.softy.pro${p}</loc><lastmod>2026-10-16 10:55:26</lastmod></url>`).join("")}</urlset>`,
]);
const softy = await resolve(
  {
    host: "ens-lyon.softy.pro",
    urls: ["https://ens-lyon.softy.pro/offers"],
    name: "",
    feeds: false,
  },
  {},
  opts,
  robotsOf(opts),
);
eq(
  [
    softy.sitemap,
    (
      await listed(
        { host: "ens-lyon.softy.pro", sitemap: softy.sitemap },
        opts,
        robotsOf(opts),
      )
    ).map((i) => i.url),
  ],
  [
    "https://ens-lyon.softy.pro/sitemap.xml",
    [
      "https://ens-lyon.softy.pro/offers/224990",
      "https://ens-lyon.softy.pro/offers/225043",
    ],
  ],
  "a Softy site: the hunter finds the sitemap its robots.txt names, and the crawler reads its offers there",
);
const data = {
  component: "templates/main/offer",
  props: {
    company: {
      name: "ens-lyon",
      social_reason: "Ecole Normale Supérieure de Lyon",
    },
    offer: {
      softy_id: 224990,
      title: "Technicien de maintenance - H/F",
      locations: [{ city: "Lyon 7e", zip_code: "69007", country: "France" }],
      description_html:
        "<p>Au sein de la direction du patrimoine&nbsp;: maintenance des b&acirc;timents.</p>",
      searched_profile_html: "<p>BTS MS</p>",
      updated_at: "2026-10-16 10:55:26",
    },
  },
};
const offer = platformPosting(
  `<h1 class="text-3xl font-semibold">Technicien de maintenance - H/F</h1><script data-page="app" type="application/json">${JSON.stringify(data)}</script>`,
  "https://ens-lyon.softy.pro/offers/224990",
);
eq(
  [
    offer?.title,
    offer?.company,
    offer?.location,
    /patrimoine: maintenance des bâtiments\.\s+BTS MS/.test(
      offer?.description || "",
    ),
    offer?.posted,
  ],
  [
    "Technicien de maintenance - H/F",
    "Ecole Normale Supérieure de Lyon",
    "Lyon 7e, France",
    true,
    "",
  ],
  "a Softy offer: its title, employer, place and texts from the page's data; no day, since it says only when it was last changed",
);
// ➤ The real pages escape their slashes ("templates\/main\/offer").
const onOwnDomain = `<script data-page="app" type="application/json">${JSON.stringify(data).replace(/\//g, "\\/")}</script>`;
eq(
  [
    platformPosting(
      onOwnDomain,
      "https://carriere.globe-groupe.example/offers/1",
    )?.title,
    platformPosting(
      onOwnDomain.replace('offer"', 'news"'),
      "https://www.laravel-shop.example/news/1",
    ),
  ],
  ["Technicien de maintenance - H/F", null],
  "a Softy site on the employer's own domain, known by its page's component; another site's page data is not read",
);
eq(
  platformPosting("<h1>Nos offres</h1>", "https://ens-lyon.softy.pro/offers"),
  null,
  "a Softy page with no offer in its data is no vacancy",
);
eq(
  [
    careerLinks(
      '<a href="/offers/224990">Technicien</a><a href="https://recrutement.softy.pro/">Recrutement par Softy</a>',
      "https://ens-lyon.softy.pro/offers",
    ),
    isBoardHost("ens-lyon.softy.pro"),
    isBoardHost("agrimacc-recrutement.softy.pro"),
  ],
  [[], false, false],
  "Softy's own site, which every one of its careers sites links to, is never followed; its careers sites are no job board",
);
eq(
  [
    isSofty("https://ens-lyon.softy.pro/offers"),
    isSofty(
      "https://carriere.globe-groupe.example/",
      '<img src="https://sc.softy.pro/common/data/c/83ea.png">',
    ),
    isSofty("https://carriere.globe-groupe.example/offers", onOwnDomain),
    isSofty(
      "https://www.laravel-shop.example/news/1",
      onOwnDomain.replace('offer"', 'news"'),
    ),
  ],
  [true, true, true, false],
  "a Softy site, which the hunter leaves until its terms' leave is given: by its host, Softy's files or its page's templates",
);

done();
