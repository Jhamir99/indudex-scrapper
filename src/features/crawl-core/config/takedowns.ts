import { z } from "@hono/zod-openapi";
import { SourceId } from "../../../shared/schemas/source.js";
import { loadConfig } from "../../../shared/config/load-config.js";

// Why the takedown was done ("employer's request, 2026-11-15"). Never a person's name or address.
const Reason = z.string().min(1);

// config/takedowns.yml (FR-8).
export const Takedowns = z.strictObject({
  sources: z.array(z.strictObject({ id: SourceId, reason: Reason })),
  companies: z.array(
    z.strictObject({ name: z.string().min(1), reason: Reason }),
  ),
  adverts: z.array(z.strictObject({ url: z.url(), reason: Reason })),
});
export type Takedowns = z.infer<typeof Takedowns>;

// What an advert is matched on: stored adverts and drafts alike.
export interface TakedownTarget {
  readonly source: string;
  readonly company: string;
  readonly url: string;
}

// Case, accents, punctuation and spacing do not tell two employer names apart.
export function companyKey(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

// One page under several addresses: tracking parameters, a fragment and a trailing slash
// do not make another advert. A "#/" fragment is a single-page app's route and is kept.
export function advertUrlKey(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return url.trim();
  }
  // A copy of the keys: deleting while walking the live iterator skips the next key.
  for (const key of Array.from(parsed.searchParams.keys())) {
    if (/^utm_/i.test(key)) parsed.searchParams.delete(key);
  }
  if (!parsed.hash.startsWith("#/")) parsed.hash = "";
  return parsed.toString().replace(/\?$/, "").replace(/\/$/, "");
}

export class TakedownList {
  private readonly sources: Map<string, string>;
  private readonly companies: Map<string, string>;
  private readonly adverts: Map<string, string>;

  constructor(takedowns: Takedowns) {
    this.sources = new Map(takedowns.sources.map((t) => [t.id, t.reason]));
    this.companies = new Map(
      takedowns.companies.map((t) => [companyKey(t.name), t.reason]),
    );
    this.adverts = new Map(
      takedowns.adverts.map((t) => [advertUrlKey(t.url), t.reason]),
    );
  }

  sourceReason(source: string): string | undefined {
    return this.sources.get(source);
  }

  // The reason an advert is taken down, or undefined when it is not.
  reasonFor(advert: TakedownTarget): string | undefined {
    return (
      this.sources.get(advert.source) ??
      (advert.company
        ? this.companies.get(companyKey(advert.company))
        : undefined) ??
      this.adverts.get(advertUrlKey(advert.url))
    );
  }
}

export async function loadTakedowns(directory?: string): Promise<TakedownList> {
  return new TakedownList(
    await loadConfig("takedowns.yml", Takedowns, directory),
  );
}
