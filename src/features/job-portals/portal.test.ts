import { describe, expect, it } from "vitest";
import { fakeContext, readDrafts } from "../../../test/fakes/source-adapter.js";
import { countryNames } from "../../shared/catalogues/country-names.js";
import { HttpFailure } from "../../shared/http/http-failure.js";
import type {
  AdvertDraft,
  HttpClient,
  SourceMemory,
} from "../crawl-core/ports.js";
import { pageBudget } from "../crawl-core/page-budget.js";
import { portalSource } from "./family.js";
import {
  countryOf,
  cutTown,
  forgetUnlisted,
  PortalMemory,
  toDraft,
} from "./portal.js";
import type { Portal } from "./portal-list.js";

const portal: Portal = {
  name: "Acme Jobs",
  host: "jobs.acme.example",
  country: "de",
  sitemap: "https://jobs.acme.example/sitemap.xml",
  match: "/job/",
};
const vacancy = (title: string, day = "2026-11-20") =>
  `<script type="application/ld+json">{"@type":"JobPosting","title":"${title}","datePosted":"${day}","hiringOrganization":{"name":"Acme GmbH"},"jobLocation":{"address":{"addressLocality":"Köln","addressCountry":"DE"}},"description":"<p>Wartung von Anlagen.</p>"}</script>`;
const sitemap = (...urls: [string, string][]) =>
  `<urlset>${urls.map(([url, day]) => `<url><loc>${url}</loc><lastmod>${day}</lastmod></url>`).join("")}</urlset>`;

// A stand-in network: a table of answers; an answer may be an error, and every address asked is noted.
function network(answers: Record<string, string | Error>) {
  const asked: string[] = [];
  const http: HttpClient = {
    async request(url, options = {}) {
      asked.push(url);
      const answer = answers[url];
      if (answer === undefined)
        throw new HttpFailure("client-error", url, 1, 404);
      if (answer instanceof Error) throw answer;
      return options.binary
        ? {
            status: 200,
            url,
            headers: {},
            body: "",
            bytes: new TextEncoder().encode(answer),
          }
        : { status: 200, url, headers: {}, body: answer };
    },
  };
  return { http, asked };
}

async function pass(
  answers: Record<string, string | Error>,
  fields: {
    memory?: SourceMemory;
    previous?: AdvertDraft[];
    budget?: number;
    one?: Portal;
  } = {},
) {
  const { http, asked } = network(answers);
  let remembered: SourceMemory | undefined;
  let backlog = -1;
  const drafts = await readDrafts(
    portalSource(fields.one ?? portal),
    fakeContext({
      http,
      today: "2026-11-26",
      memory: fields.memory,
      previous: fields.previous ?? [],
      remember: (memory) => {
        remembered = memory;
      },
      backlog: (pages) => {
        backlog = pages;
      },
      isOurs: (words) => /ingenieur|techniker|elektriker/i.test(words),
      ...(fields.budget === undefined
        ? {}
        : { pageBudget: pageBudget(fields.budget) }),
    }),
  );
  return {
    drafts,
    asked,
    backlog,
    memory: PortalMemory.parse(remembered),
  };
}

const ONE = "https://jobs.acme.example/job/elektriker-1";
const TWO = "https://jobs.acme.example/job/ingenieur-2";
const NOT_OURS = "https://jobs.acme.example/job/koch-3";

describe("a portal's pass (job portals FR-3, FR-4, FR-5)", () => {
  it("reads the listed pages of ours only, and names each advert as the portal's", async () => {
    const { drafts, asked, backlog } = await pass({
      [portal.sitemap as string]: sitemap(
        [ONE, "2026-11-20"],
        [TWO, "2026-11-21"],
        [NOT_OURS, "2026-11-21"],
        ["https://jobs.acme.example/about", "2026-11-21"],
      ),
      [ONE]: vacancy("Elektriker (m/w/d)"),
      [TWO]: vacancy("Ingenieur Verfahrenstechnik"),
    });
    expect(asked).toEqual([portal.sitemap, TWO, ONE]);
    expect(backlog).toBe(0);
    expect(
      drafts.map((draft) => [
        draft.source,
        draft.title,
        draft.country,
        draft.language,
      ]),
    ).toEqual([
      ["jobs.acme.example", "Ingenieur Verfahrenstechnik", "de", "de"],
      ["jobs.acme.example", "Elektriker (m/w/d)", "de", "de"],
    ]);
    expect(drafts[0]).toMatchObject({
      sourceId: TWO,
      url: TWO,
      company: "Acme GmbH",
      location: "Köln, DE",
      posted: "2026-11-20",
    });
  });

  it("keeps what it read until the sitemap's day moves, and forgets a page no longer listed", async () => {
    const first = await pass({
      [portal.sitemap as string]: sitemap(
        [ONE, "2026-11-20"],
        [TWO, "2026-11-21"],
      ),
      [ONE]: vacancy("Elektriker (m/w/d)"),
      [TWO]: vacancy("Ingenieur Verfahrenstechnik"),
    });
    const second = await pass(
      {
        [portal.sitemap as string]: sitemap([ONE, "2026-11-25"]),
        [ONE]: vacancy("Elektriker (m/w/d) Köln"),
      },
      { memory: first.memory, previous: first.drafts },
    );
    expect(second.asked).toEqual([portal.sitemap, ONE]);
    expect(second.drafts.map((draft) => draft.title)).toEqual([
      "Elektriker (m/w/d) Köln",
    ]);
    expect(Object.keys(second.memory.pages)).toEqual([ONE]);
    const third = await pass(
      { [portal.sitemap as string]: sitemap([ONE, "2026-11-25"]) },
      { memory: second.memory, previous: second.drafts },
    );
    expect(third.asked).toEqual([portal.sitemap]);
    expect(third.drafts).toHaveLength(1);
  });

  it("reads at most what the run's budget leaves, and reports the rest as its backlog", async () => {
    const urls = Array.from({ length: 5 }, (_, n): [string, string] => [
      `https://jobs.acme.example/job/techniker-${n}`,
      "2026-11-20",
    ]);
    const answers = Object.fromEntries([
      [portal.sitemap as string, sitemap(...urls)],
      ...urls.map(([url]) => [url, vacancy("Techniker")]),
    ]);
    const { asked, backlog, drafts } = await pass(answers, { budget: 2 });
    expect(asked).toHaveLength(3);
    expect(backlog).toBe(3);
    expect(drafts).toHaveLength(2);
  });

  it("takes a page that answers 404 as closed, keeps one that does not answer and tries it again, and stops at a 429", async () => {
    const before = toDraft(
      { title: "Ingenieur", country: "de", description: "x" },
      portal,
      TWO,
      "2026-11-20",
    ) as AdvertDraft;
    const { drafts, memory } = await pass(
      {
        [portal.sitemap as string]: sitemap(
          [ONE, "2026-11-25"],
          [TWO, "2026-11-25"],
        ),
        [TWO]: new HttpFailure("timeout", TWO, 3),
      },
      {
        previous: [before],
        memory: { pages: { [TWO]: { lastmod: "2026-11-20" } } },
      },
    );
    expect(drafts.map((draft) => draft.sourceId)).toEqual([TWO]);
    expect(memory.pages[ONE]).toEqual({ lastmod: "2026-11-25", none: true });
    expect(memory.pages[TWO]).toMatchObject({ failed: 1 });
    const limited = await pass({
      [portal.sitemap as string]: sitemap(
        [ONE, "2026-11-25"],
        [TWO, "2026-11-25"],
      ),
      [ONE]: new HttpFailure("rate-limited", ONE, 1, 429),
      [TWO]: vacancy("Ingenieur"),
    });
    expect(limited.asked).toEqual([portal.sitemap, ONE]);
    expect(limited.backlog).toBe(1);
  });

  it("leaves out a page robots.txt closes without counting it, and an advert with no country", async () => {
    const { asked, drafts } = await pass(
      {
        [portal.sitemap as string]: sitemap(
          [ONE, "2026-11-20"],
          [TWO, "2026-11-21"],
        ),
        [TWO]: new HttpFailure("disallowed", TWO, 0),
        [ONE]: vacancy("Elektriker"),
      },
      { one: { ...portal, country: undefined } },
    );
    expect(asked).toEqual([portal.sitemap, TWO, ONE]);
    // DE from the page's own block.
    expect(drafts.map((draft) => draft.country)).toEqual(["de"]);
  });
});

describe("a portal's advert (the legacy's portalRaw cases)", () => {
  it("names the portal as its source, cuts an agency's call to apply, and fixes the employer as the list says", () => {
    expect(
      toDraft(
        {
          title: "Ingeniero de procesos",
          company: "Acme",
          location: "Madrid, ES",
          country: "es",
        },
        { name: "Infoempleo", host: "www.infoempleo.com", country: "es" },
        "https://www.infoempleo.com/ofertasdetrabajo/ingeniero-de-procesos/madrid/1/",
        "",
      ),
    ).toMatchObject({
      source: "infoempleo.com",
      title: "Ingeniero de procesos",
      country: "es",
      url: "https://www.infoempleo.com/ofertasdetrabajo/ingeniero-de-procesos/madrid/1/",
    });
    expect(
      toDraft(
        { title: "Elektriker (m/w/d) – Jetzt bewerben!", country: "de" },
        { name: "ARWA", host: "arwa.de", country: "de" },
        "https://arwa.de/job/1",
        "",
      )?.title,
    ).toBe("Elektriker (m/w/d)");
    expect(
      toDraft(
        {
          title: "Regional Engineer",
          company: "Regional Engineer, WTS, CDI",
          country: "fr",
        },
        { name: "Veolia", host: "jobs.veolia.com", employer: "Veolia" },
        "https://jobs.veolia.com/fr/emploi/x/1",
        "",
      )?.company,
    ).toBe("Veolia");
    expect(
      toDraft(
        { title: "Monteur", country: "nl" },
        { name: "Brunel", host: "www.brunel.net", agency: true },
        "https://www.brunel.net/nl-nl/jobs/x",
        "",
      )?.company,
    ).toBe("Brunel");
  });

  it("reads a country a block writes by name, where the legacy left it to its processor", async () => {
    const names = await countryNames();
    const agency: Portal = {
      name: "Burns Sheehan",
      host: "www.burnssheehan.co.uk",
    };
    expect(
      toDraft(
        { title: "Principal Engineer", location: "City of London, London, UK" },
        agency,
        "https://www.burnssheehan.co.uk/job/principal-engineer",
        "",
        names,
      )?.country,
    ).toBe("gb");
    expect(
      toDraft(
        { title: "Engineer", location: "Somewhere" },
        agency,
        "https://www.burnssheehan.co.uk/job/engineer",
        "",
        names,
      ),
    ).toBeUndefined();
  });

  it("cuts the town a portal ends its titles with, and only that portal's", () => {
    expect([
      cutTown("Chef de Chantier H/f le Havre", "Le Havre, Normandie, FR"),
      cutTown("Technicien Lyon Est", "Lyon, FR"),
    ]).toEqual(["Chef de Chantier H/f", "Technicien Lyon Est"]);
  });

  it("reads the country from a locale in the address when the portal gives none", () => {
    expect([
      countryOf(
        { name: "B", host: "b" },
        "https://www.brunel.net/de-at/jobs/x-1",
      ),
      countryOf({ name: "B", host: "b" }, "https://www.brunel.net/en/jobs/x-1"),
      countryOf(
        { name: "B", host: "b", country: "de" },
        "https://www.brunel.net/nl-nl/jobs/x",
      ),
    ]).toEqual(["at", "", "de"]);
  });

  it("keeps a page a portal of only its newest no longer lists for its keepDays (the legacy's case)", () => {
    const pages: Record<string, { lastmod?: string; seen?: string }> = {
      a: { lastmod: "2026-09-01", seen: "2026-10-09" },
      b: { lastmod: "2026-08-01", seen: "2026-08-20" },
      c: { lastmod: "2026-10-10" },
    };
    forgetUnlisted(pages, new Map([["c", "2026-10-10"]]), 45, "2026-10-11");
    const fresh = {
      a: { lastmod: "2026-10-01" },
      b: { lastmod: "2026-10-02" },
    };
    forgetUnlisted(fresh, new Map([["b", "2026-10-02"]]), 0, "2026-10-11");
    expect([Object.keys(pages), pages["c"]?.seen, Object.keys(fresh)]).toEqual([
      ["a", "c"],
      "2026-10-11",
      ["b"],
    ]);
  });
});
