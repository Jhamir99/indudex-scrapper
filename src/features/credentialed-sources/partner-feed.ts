import { publicFeed } from "../crawl-core/feed-family.js";
import type {
  AdapterContext,
  AdvertDraft,
  SourceAdapter,
} from "../crawl-core/ports.js";
import {
  countryCode,
  countryNames,
} from "../../shared/catalogues/country-names.js";
import { HttpFailure } from "../../shared/http/http-failure.js";
import { decodeEntities } from "../../shared/kit/entities.js";
import { pageText } from "../../shared/kit/text.js";
import { languagesOfCountry } from "../../shared/words/country-languages.js";

// The XML job feeds intermediaries hand their partner sites (Talent.com, WhatJobs, Jobtome: the usual <job> schema with
// title, company, city, country, url, description, date). Each programme is a source of its own, its feed's address in
// its own variable (`TALENTCOM_FEED_URL`, …), the address the programme gives once the operator has signed up; it is
// kept as a secret, never logged. Intermediaries, so the site shows their adverts in their own section, after the
// employers' own, each linking to the intermediary's page as the programmes ask. The legacy's
// builder/adapters/jobfeed.ts, which read them all from one variable (VIA_FEEDS).

const PER_FEED = 50_000;

// One field of a <job>, by whichever of its names the feed uses, its CDATA and entities undone.
function tag(block: string, names: readonly string[]): string {
  for (const name of names) {
    const match = new RegExp(
      `<${name}(?:\\s[^>]*)?>(?:\\s*<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>\\s*)?</${name}>`,
      "i",
    ).exec(block);
    if (match) return decodeEntities(match[1] ?? "").trim();
  }
  return "";
}

// A day as the feed writes it, in any form `Date` reads ("Fri, 05 Sep 2026 08:00:00 GMT", "2026-09-05").
function day(value: string): string | undefined {
  const date = value ? new Date(value) : undefined;
  return date && !Number.isNaN(date.getTime())
    ? date.toISOString().slice(0, 10)
    : undefined;
}

// What the feed's <job> says, before its country is resolved: the legacy's `parseJobFeed`.
export interface FeedJob {
  readonly sourceId: string;
  readonly title: string;
  readonly company: string;
  readonly location: string;
  readonly country: string;
  readonly city: string;
  readonly url: string;
  readonly description: string;
  readonly posted: string | undefined;
  readonly expires: string | undefined;
  readonly remote: boolean;
}

// One job per <job>: the fields of the usual schema, whichever names the feed uses; a job without a title or a web
// address is left out, and a feed stops at 50,000.
export function parseJobFeed(xml: string): FeedJob[] {
  const jobs: FeedJob[] = [];
  for (const match of xml.matchAll(/<job(?:\s[^>]*)?>([\s\S]*?)<\/job>/gi)) {
    const block = match[1] ?? "";
    const title = tag(block, ["title"]);
    const url = tag(block, ["url", "link", "joburl", "apply_url"]);
    if (!title || !/^https?:\/\//.test(url)) continue;
    const city = tag(block, ["city", "location", "town"]);
    const state = tag(block, ["state", "region"]);
    const country = tag(block, ["country", "countrycode"]);
    jobs.push({
      sourceId:
        tag(block, ["referencenumber", "reference", "id", "jobid"]) || url,
      title,
      company: tag(block, ["company", "companyname", "employer", "advertiser"]),
      location: [city, state, country].filter(Boolean).join(", "),
      country,
      city,
      url,
      description: pageText(tag(block, ["description", "summary", "snippet"])),
      posted: day(
        tag(block, ["date", "pubdate", "posted", "dateposted", "created"]),
      ),
      expires: day(tag(block, ["expirationdate", "expires", "validthrough"])),
      remote: /remote|teletrabajo|télétravail|homeoffice/i.test(
        `${tag(block, ["jobtype", "remote", "workplace"])} ${city}`,
      ),
    });
    if (jobs.length >= PER_FEED) break;
  }
  return jobs;
}

export function toDraft(
  job: FeedJob,
  source: string,
  country: string,
): AdvertDraft {
  return {
    source,
    sourceId: job.sourceId,
    title: job.title,
    company: job.company,
    location: job.location,
    country,
    city: job.city,
    remote: job.remote,
    url: job.url,
    description: job.description,
    ...(job.posted ? { posted: job.posted } : {}),
    ...(job.expires ? { expires: job.expires } : {}),
    occupationCodes: {},
    // A feed names no language: its country's first (English where the table names none).
    language: languagesOfCountry(country)[0] ?? "en",
  };
}

export interface Programme {
  readonly id: string;
  readonly name: string;
  readonly short: string;
  readonly url: string;
  readonly licence: string;
  // The variable that holds the feed's address.
  readonly variable: string;
}

// A partner programme's feed as a source: its address from its variable, read once a pass.
export function partnerFeed(programme: Programme): SourceAdapter {
  async function* read(context: AdapterContext): AsyncIterable<AdvertDraft> {
    let xml: string;
    try {
      xml = (
        await context.http.request(
          context.credentials[programme.variable] ?? "",
        )
      ).body;
    } catch (error) {
      // The address is the programme's secret: the failure says only what went wrong.
      throw new Error(
        `the ${programme.short} feed did not answer (${error instanceof HttpFailure ? `${error.kind}${error.status ? `, HTTP ${error.status}` : ""}` : "no answer"})`,
        { cause: error },
      );
    }
    const { byName } = await countryNames();
    let unplaced = 0;
    let insecure = 0;
    for (const job of parseJobFeed(xml)) {
      const country = countryCode(job.country, byName);
      if (!country) {
        unplaced++;
        continue;
      }
      // The store keeps https addresses only.
      if (!job.url.startsWith("https://")) {
        insecure++;
        continue;
      }
      yield toDraft(job, programme.id, country);
    }
    if (unplaced || insecure)
      context.log(
        `left out: ${unplaced} with no country read, ${insecure} with no https address`,
      );
  }

  return publicFeed({
    definition: {
      id: programme.id,
      kind: "via",
      licence: {
        name: programme.name,
        short: programme.short,
        url: programme.url,
        licence: programme.licence,
        credit: `via ${programme.short}`,
      },
      needsCredentials: true,
      credentialVariables: [programme.variable],
    },
    read,
  });
}
