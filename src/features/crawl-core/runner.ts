import type { z } from "@hono/zod-openapi";
import {
  Advert,
  advertId,
  DESCRIPTION_LIMIT,
} from "../../shared/schemas/advert.js";
import type {
  AdapterContext,
  AdvertDraft,
  AdvertStore,
  HttpClient,
  SourceAdapter,
} from "./ports.js";

export interface RejectedAdvert {
  readonly sourceId: string;
  readonly reason: string;
}

export interface SourceRunResult {
  readonly source: string;
  // Valid adverts handed to the store.
  readonly stored: number;
  // Adverts that failed validation, each with its reason (FR-1).
  readonly rejected: readonly RejectedAdvert[];
}

export interface SourceRunDependencies {
  readonly http: HttpClient;
  readonly store: AdvertStore;
  readonly credentials?: Readonly<Record<string, string>>;
  readonly log: (message: string) => void;
}

// Reads one source and stores its valid adverts. The runner stops here (FR-11): no gate,
// dedupe, translation or publication.
export async function runSource(
  adapter: SourceAdapter,
  dependencies: SourceRunDependencies,
): Promise<SourceRunResult> {
  const { definition } = adapter;
  const { http, store, log } = dependencies;
  const context: AdapterContext = {
    http,
    credentials: dependencies.credentials ?? {},
    log: (message) => log(`${definition.id}: ${message}`),
  };

  const valid = new Map<string, Advert>();
  const rejected: RejectedAdvert[] = [];
  for await (const draft of adapter.fetchAdverts(context)) {
    const result = toAdvert(adapter, draft);
    if (!result.success) {
      rejected.push({ sourceId: draft.sourceId, reason: result.reason });
    } else if (valid.has(result.advert.id)) {
      rejected.push({
        sourceId: draft.sourceId,
        reason: "sourceId: repeated in the same read",
      });
    } else {
      valid.set(result.advert.id, result.advert);
    }
  }

  await store.replaceAdverts(definition.id, [...valid.values()]);
  for (const { sourceId, reason } of rejected) {
    log(`${definition.id}: rejected ${sourceId}: ${reason}`);
  }
  return { source: definition.id, stored: valid.size, rejected };
}

type Conversion =
  | { readonly success: true; readonly advert: Advert }
  | { readonly success: false; readonly reason: string };

// Adds what every source shares (the stable id and the source's attribution, FR-2), caps the
// description and validates the result against the common format (FR-1).
function toAdvert(adapter: SourceAdapter, draft: AdvertDraft): Conversion {
  const { id: source, licence } = adapter.definition;
  if (draft.source !== source) {
    return {
      success: false,
      reason: `source: "${String(draft.source)}" is not "${source}"`,
    };
  }
  const candidate = {
    ...draft,
    id: advertId(source, String(draft.sourceId)),
    description:
      typeof draft.description === "string"
        ? draft.description.slice(0, DESCRIPTION_LIMIT)
        : draft.description,
    attribution: { licence: licence.licence, credit: licence.credit },
  };
  const parsed = Advert.safeParse(candidate);
  if (parsed.success) return { success: true, advert: parsed.data };
  return { success: false, reason: describeIssues(parsed.error) };
}

function describeIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) =>
      issue.path.length > 0
        ? `${issue.path.map(String).join(".")}: ${issue.message}`
        : issue.message,
    )
    .join("; ");
}
