import { z } from "@hono/zod-openapi";
import { SourceId } from "../schemas/source.js";
import { loadConfig } from "./load-config.js";
import { advertAddress } from "../kit/advert-address.js";

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
      takedowns.adverts.map((t) => [advertAddress(t.url), t.reason]),
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
      this.adverts.get(advertAddress(advert.url))
    );
  }
}

export async function loadTakedowns(directory?: string): Promise<TakedownList> {
  return new TakedownList(
    await loadConfig("takedowns.yml", Takedowns, directory),
  );
}
