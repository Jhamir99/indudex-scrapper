// The legacy's test/site-lists.test.mjs (JustJans/indudex@ec79858), carried whole (legacy resync T003): its imports pointed at
// this repo.
// ➤ A list a site names in its sitemap (its careers page) and the vacancies it links: how far one pass follows it, and
// ➤ when it is read again. The network is a stand-in, as in site-reader.test.mjs.
import { harness } from "./harness.mjs";
import { readSite, useShown } from "./careers-shim.mjs";
import { useLookup, useNoGap } from "./careers-shim.mjs";

useLookup(() => []);
useNoGap();
const { eq, done } = harness("site lists");
useShown(null);

const POSTING = (title) =>
  `<script type="application/ld+json">${JSON.stringify({ "@type": "JobPosting", title, hiringOrganization: { name: "Acme" }, jobLocation: { address: { addressLocality: "Bilbao", addressCountry: "ES" } } })}</script>`;
const answers = new Map();
const asked = [];
globalThis.fetch = async (url) => {
  asked.push(String(url));
  const [status, body] = answers.get(String(url)) || [404, ""];
  return new Response(body, { status });
};

// A list the sitemap names (the careers page) is followed to every vacancy it links, not the first sixty, within the pass's
// pages; while some are left it is read again the next pass, which reads them and its new one, and one it no longer
// links has closed.
{
  const host = "listy.example",
    list = `https://${host}/careers`;
  const vacancy = (k) => `https://${host}/jobs/engineer-${k}`;
  const listOf = (ks) =>
    `<html><body>${ks.map((k) => `<a href="${vacancy(k)}">Engineer ${k}</a>`).join("")}</body></html>`;
  answers.set(`https://${host}/robots.txt`, [200, "User-agent: *\nAllow: /"]);
  answers.set(`https://${host}/sitemap.xml`, [
    200,
    `<urlset><url><loc>${list}</loc></url></urlset>`,
  ]);
  for (let k = 1; k <= 81; k++)
    answers.set(vacancy(k), [200, POSTING(`Engineer ${k}`)]);
  const ks = Array.from({ length: 80 }, (_, k) => k + 1);
  answers.set(list, [200, listOf(ks)]);
  const store = {};
  const first = await readSite(
    { host, sitemap: `https://${host}/sitemap.xml` },
    store,
    { pagesASite: 71 },
  );
  eq(
    first.adverts.length,
    70,
    "a list is followed as far as the pass reads, past sixty",
  );
  answers.set(list, [200, listOf([...ks.slice(1), 81])]);
  asked.length = 0;
  const second = await readSite(
    { host, sitemap: `https://${host}/sitemap.xml` },
    store,
    { pagesASite: 500 },
  );
  eq(
    [
      second.adverts.length,
      second.adverts.some((a) => a.url === vacancy(1)),
      asked.filter((u) => u.includes("/jobs/")).length,
    ],
    [80, false, 11],
    "the next pass reads the list again: its ten left and its new one, and the one it dropped has closed",
  );
  asked.length = 0;
  await readSite({ host, sitemap: `https://${host}/sitemap.xml` }, store, {
    pagesASite: 500,
  });
  eq(asked.includes(list), false, "a list with nothing left is not read again");
}

done();
