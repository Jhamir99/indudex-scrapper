import { describe, expect, it } from "vitest";
import {
  checkAdapterContract,
  loadFixtureRoutes,
} from "../../../test/contract/adapter-contract.js";
import { FakeHttpClient } from "../../../test/fakes/http-client.js";
import { fakeContext, readDrafts } from "../../../test/fakes/source-adapter.js";
import { HttpFailure } from "../../shared/http/http-failure.js";
import { runSource } from "../crawl-core/runner.js";
import { InMemoryAdvertStore } from "../../../test/fakes/advert-store.js";
import { jobtome } from "./adapters/jobtome/jobtome.js";
import { talentcom } from "./adapters/talentcom/talentcom.js";
import { whatjobs } from "./adapters/whatjobs/whatjobs.js";
import { countryCode } from "../../shared/catalogues/country-names.js";
import { parseJobFeed } from "./partner-feed.js";

const read = async (
  adapter: typeof talentcom,
  variable: string,
  source: string,
) => {
  const routes = await loadFixtureRoutes(source);
  const http = new FakeHttpClient({
    "https://feeds.example/secret-123": routes[`test-${variable}`]!,
  });
  const logged: string[] = [];
  const drafts = await readDrafts(
    adapter,
    fakeContext({
      http,
      credentials: { [variable]: "https://feeds.example/secret-123" },
      log: (line) => logged.push(line),
    }),
  );
  return { drafts, logged };
};

describe("the partner programmes' feeds (credentialed sources FR-5)", () => {
  it("map each saved feed into valid adverts", async () => {
    for (const adapter of [talentcom, whatjobs, jobtome])
      expect(
        await checkAdapterContract(
          adapter,
          await loadFixtureRoutes(adapter.definition.id),
        ),
      ).toEqual([]);
  });

  it("pass the legacy's own case: the usual <job> fields, CDATA and entities undone (test/builder.test.mjs)", () => {
    const xml =
      '<?xml version="1.0"?><source><publisher>Talent.com</publisher><job><title><![CDATA[Site Engineer]]></title><date><![CDATA[Fri, 05 Sep 2026 08:00:00 GMT]]></date><referencenumber>ab12</referencenumber><url><![CDATA[https://www.talent.com/view?id=ab12]]></url><company><![CDATA[Van Oord]]></company><city>Rotterdam</city><state>Zuid-Holland</state><country>NL</country><description><![CDATA[<p>Dredging &amp; reclamation works.</p>]]></description><jobtype>fulltime</jobtype></job><job><title>No link</title><url>x</url></job></source>';
    const jobs = parseJobFeed(xml);
    expect(jobs).toHaveLength(1);
    const [job] = jobs;
    expect([
      job?.sourceId,
      job?.title,
      job?.company,
      job?.location,
      countryCode(job?.country ?? "", new Map()),
      job?.city,
      job?.url,
      job?.description,
      job?.posted,
    ]).toEqual([
      "ab12",
      "Site Engineer",
      "Van Oord",
      "Rotterdam, Zuid-Holland, NL",
      "nl",
      "Rotterdam",
      "https://www.talent.com/view?id=ab12",
      "Dredging & reclamation works.",
      "2026-09-05",
    ]);
  });

  it("read each naming of the fields, the country's language, remote and the last day", async () => {
    const talent = await read(talentcom, "TALENTCOM_FEED_URL", "talentcom");
    expect(
      talent.drafts.map((draft) => [
        draft.source,
        draft.country,
        draft.language,
        draft.remote,
      ]),
    ).toEqual([
      ["talentcom", "nl", "nl", false],
      ["talentcom", "de", "de", true],
    ]);
    const what = await read(whatjobs, "WHATJOBS_FEED_URL", "whatjobs");
    expect(what.drafts).toEqual([
      {
        source: "whatjobs",
        sourceId: "wj-55",
        title: "Maintenance Technician",
        company: "Shannon Process Ltd",
        location: "Limerick, Munster, IE",
        country: "ie",
        city: "Limerick",
        remote: false,
        url: "https://www.whatjobs.com/job/wj-55",
        description: "PLC fault finding & preventive maintenance.",
        posted: "2026-11-10",
        expires: "2026-12-10",
        occupationCodes: {},
        language: "en",
      },
    ]);
  });

  it("read a country written as a name, and leave out a job with no country read or no https address", async () => {
    const { drafts, logged } = await read(
      jobtome,
      "JOBTOME_FEED_URL",
      "jobtome",
    );
    expect(
      drafts.map((draft) => [draft.sourceId, draft.country, draft.language]),
    ).toEqual([["jt-7", "es", "es"]]);
    expect(logged).toContain(
      "left out: 1 with no country read, 1 with no https address",
    );
  });

  it("never let the feed's address out of a failure", async () => {
    const store = new InMemoryAdvertStore();
    const result = await runSource(talentcom, {
      http: new FakeHttpClient({
        "https://feeds.example/pub/secret-123": new HttpFailure(
          "server-error",
          "https://feeds.example/pub/secret-123",
          3,
          503,
        ),
      }),
      store,
      credentials: {
        TALENTCOM_FEED_URL: "https://feeds.example/pub/secret-123",
      },
      log: () => {},
      today: "2026-11-17",
    });
    expect(result.outcome).toBe("failed");
    expect(result.reason).toBe(
      "the Talent.com feed did not answer (server-error, HTTP 503)",
    );
  });

  it("are intermediaries, each with its own variable and credit", () => {
    expect(
      [talentcom, whatjobs, jobtome].map((adapter) => [
        adapter.definition.kind,
        adapter.definition.credentialVariables,
        adapter.definition.licence.credit,
      ]),
    ).toEqual([
      ["via", ["TALENTCOM_FEED_URL"], "via Talent.com"],
      ["via", ["WHATJOBS_FEED_URL"], "via WhatJobs"],
      ["via", ["JOBTOME_FEED_URL"], "via Jobtome"],
    ]);
  });
});
