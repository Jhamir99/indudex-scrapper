// The legacy's sitemap cases (JustJans/indudex test/builder.test.mjs, test/portal-layouts.test.mjs and
// test/crawler-guards.test.mjs), cut out by line range and carried as they were, imports pointed at this repo
// (job portals T002).
import { harness } from "./harness.mjs";
import {
  looksLikeJob,
  parseSitemap,
  withScheme,
} from "../../src/shared/kit/sitemap.ts";

const { ok, eq, done } = harness("sitemap");
{
  const rss = parseSitemap(
    "<rss><channel><item><link>https://kpmg-career.talent-soft.com/Pages/Offre/detailoffre.aspx?idOffre=1442&amp;idOrigine=502</link><pubDate>Tue, 06 Oct 2026 10:00:00 GMT</pubDate><title>Manager VAT</title></item></channel></rss>",
  );
  eq(
    [rss.index, rss.items[0].url, rss.items[0].lastmod],
    [
      false,
      "https://kpmg-career.talent-soft.com/Pages/Offre/detailoffre.aspx?idOffre=1442&idOrigine=502",
      "2026-10-06",
    ],
    "an RSS feed of vacancies read as a sitemap",
  );
  const gc = parseSitemap(
    '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc xmlns="">https://jobs.guidecom.de/jobportal/x/viewAusschreibung/2026-050.html</loc><lastmod xmlns="">1781601494274</lastmod></url></urlset>',
  );
  eq(
    [gc.items.length, gc.items[0].url, gc.items[0].lastmod],
    [
      1,
      "https://jobs.guidecom.de/jobportal/x/viewAusschreibung/2026-050.html",
      "2026-06-16",
    ],
    "a sitemap whose tags carry attributes and whose days are milliseconds",
  );
}
{
  const sm = parseSitemap(
    '<?xml version="1.0"?><urlset><url><loc>https://x.example/vacancies/engineer-12</loc><lastmod>2026-09-01T10:00:00+00:00</lastmod></url><url><loc> https://x.example/about </loc></url></urlset>',
  );
  eq(
    [
      sm.index,
      sm.items.length,
      sm.items[0].url,
      sm.items[0].lastmod,
      sm.items[1].lastmod,
    ],
    [false, 2, "https://x.example/vacancies/engineer-12", "2026-09-01", ""],
    "a sitemap: addresses and lastmod, trimmed",
  );
  eq(
    parseSitemap(
      "<sitemapindex><sitemap><loc>https://x.example/sitemap-jobs.xml</loc></sitemap></sitemapindex>",
    ).index,
    true,
    "a sitemap index is told apart",
  );
  eq(
    [
      looksLikeJob("https://x.example/vacancies/engineer-12"),
      looksLikeJob("https://x.example/de/karriere/stellenangebote/abc"),
      looksLikeJob("https://x.example/ofertas-de-empleo/123"),
      looksLikeJob("https://x.example/about-us"),
      looksLikeJob("https://x.example/blog/jobs-of-the-future"),
      looksLikeJob("https://x.example/IT-Operations-Manager-de-j1186.html"),
      looksLikeJob("https://x.example/about-de-j.html"),
    ],
    [true, true, true, false, true, true, false],
    "addresses that look like vacancy pages",
  );
  eq(
    [
      looksLikeJob(
        "https://acme.factorialhr.com/job_posting/customer-success-manager-310174",
      ),
      looksLikeJob("https://acme.factorialhr.com/"),
    ],
    [true, false],
    "Factorial's vacancies, whose address joins job and posting with an underscore",
  );
  eq(
    [
      looksLikeJob(
        "https://jobs.apleona.com/offer/objektleiter-w-m-d-in-bremen/0021c639-e216-4af7-bab2-37d0c821e8f9",
      ),
      looksLikeJob(
        "https://ingeliance.com/emplois/ingenieur-mecatronique-h-f/",
      ),
      looksLikeJob(
        "https://carrieres.econocom.com/poste/epmor2qfxz-technicien-support-utilisateur-hf/",
      ),
      looksLikeJob(
        "https://www.jansentechniek.nl/werken-bij/elektromonteur-binnendienst",
      ),
      looksLikeJob(
        "https://karriere.reihenhaus.de/offene-stellen/bauleiterin-wmd-berlin",
      ),
      looksLikeJob(
        "https://karriere.kaufmannbau.com/stellenanzeigen/energieberater/",
      ),
      looksLikeJob("https://x.example/offering/consulting"),
    ],
    [true, true, true, true, true, true, false],
    "the words the silent sites name their vacancies with: offer, emplois, poste, werken-bij, offene-stellen, stellenanzeigen",
  );
  eq(
    [
      looksLikeJob(
        "https://sparkasse-bochum.helixjobs.com/_/jobad?prj=100518P41",
      ),
      looksLikeJob("https://x.example/job-ads/123"),
      looksLikeJob("https://x.example/jobadvice"),
    ],
    [true, true, false],
    "HELIX's vacancies, a job ad under /_/jobad",
  );
  eq(
    withScheme("emploi.cnrs.fr/Offres/CDD/X/Default.aspx"),
    "https://emploi.cnrs.fr/Offres/CDD/X/Default.aspx",
    "a sitemap address with no scheme is read over https",
  );
  const started = Date.now();
  parseSitemap(`<urlset>${"<url>".repeat(30_000)}`);
  parseSitemap(`<rss>${"<item>".repeat(30_000)}`);
  ok(Date.now() - started < 2000, "parsers stay linear on hostile pages");
}

done();
