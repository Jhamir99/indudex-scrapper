import type { z } from "@hono/zod-openapi";
import {
  Advert,
  advertId,
  DESCRIPTION_LIMIT,
} from "../../shared/schemas/advert.js";
import {
  afterFailure,
  afterSuccess,
  type ScheduleRules,
} from "./domain/schedule.js";
import type {
  AdapterContext,
  AdvertDraft,
  AdvertStore,
  Clock,
  HttpClient,
  SourceAdapter,
} from "./ports.js";

export interface RejectedAdvert {
  readonly sourceId: string;
  readonly reason: string;
}

// stored: a valid read replaced the source's set. empty: a source that had nothing read nothing.
// failed: the read threw, gave no valid advert, or gave none after having some; the stored set
// is left as it was (FR-4).
export type SourceOutcome = "stored" | "empty" | "failed";

export interface SourceRunResult {
  readonly source: string;
  readonly outcome: SourceOutcome;
  // Valid adverts handed to the store.
  readonly stored: number;
  // Adverts that failed validation, each with its reason (FR-1).
  readonly rejected: readonly RejectedAdvert[];
  // Whether the set of advert ids differs from the one stored before.
  readonly changed: boolean;
  readonly reason?: string;
}

export interface SourceRunDependencies {
  readonly http: HttpClient;
  readonly store: AdvertStore;
  readonly credentials?: Readonly<Record<string, string>>;
  readonly log: (message: string) => void;
}

// Reads one source and stores its valid adverts, inside the source's failure boundary: it never
// throws (FR-3). The runner stops here (FR-11): no gate, dedupe, translation or publication.
export async function runSource(
  adapter: SourceAdapter,
  dependencies: SourceRunDependencies,
): Promise<SourceRunResult> {
  const { definition } = adapter;
  const { http, store, log } = dependencies;
  const credentials = dependencies.credentials ?? {};
  const context: AdapterContext = {
    http,
    credentials,
    log: (message) => log(`${definition.id}: ${message}`),
  };

  const valid = new Map<string, Advert>();
  const rejected: RejectedAdvert[] = [];
  const failed = (reason: string): SourceRunResult => {
    const safeReason = withoutValues(reason, credentials);
    log(`${definition.id}: failed: ${safeReason}`);
    return {
      source: definition.id,
      outcome: "failed",
      stored: 0,
      rejected,
      changed: false,
      reason: safeReason,
    };
  };

  try {
    const previous = await store.readAdverts(definition.id);
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
    for (const { sourceId, reason } of rejected) {
      log(`${definition.id}: rejected ${sourceId}: ${reason}`);
    }

    if (valid.size === 0 && rejected.length > 0) {
      return failed(`no valid advert: ${rejected.length} rejected`);
    }
    // A source that had adverts and now answers none is more likely down than emptied
    // (legacy `suspectDrop`): it keeps what it had.
    if (valid.size === 0 && previous.length > 0) {
      return failed(`read no adverts after ${previous.length}: kept`);
    }
    if (valid.size === 0) {
      log(`${definition.id}: read no adverts`);
      return {
        source: definition.id,
        outcome: "empty",
        stored: 0,
        rejected,
        changed: false,
      };
    }

    await store.replaceAdverts(definition.id, [...valid.values()]);
    const before = new Set(previous.map((advert) => advert.id));
    const changed =
      before.size !== valid.size ||
      [...valid.keys()].some((id) => !before.has(id));
    log(
      `${definition.id}: ${valid.size} adverts${rejected.length > 0 ? `, ${rejected.length} rejected` : ""}`,
    );
    return {
      source: definition.id,
      outcome: "stored",
      stored: valid.size,
      rejected,
      changed,
    };
  } catch (error) {
    return failed(error instanceof Error ? error.message : String(error));
  }
}

export interface RunDependencies {
  readonly http: HttpClient;
  readonly store: AdvertStore;
  readonly clock: Clock;
  readonly rulesFor: (source: string) => ScheduleRules;
  readonly log: (message: string) => void;
}

export interface RunResult {
  readonly sources: readonly SourceRunResult[];
}

// Runs the given sources one after another. Each runs inside its own failure boundary, so a
// failing source is recorded with its reason and the next one still runs (FR-3, FR-4).
export async function runSources(
  adapters: readonly SourceAdapter[],
  dependencies: RunDependencies,
): Promise<RunResult> {
  const { store, clock, rulesFor } = dependencies;
  const results: SourceRunResult[] = [];
  for (const adapter of adapters) {
    const source = adapter.definition.id;
    const at = clock.now();
    const previous = await store.readState(source);
    const result = await runSource(adapter, dependencies);
    const rules = rulesFor(source);
    const state =
      result.outcome === "failed"
        ? afterFailure(
            previous,
            { at, reason: result.reason ?? "failed" },
            rules,
          )
        : afterSuccess(
            previous,
            { at, advertCount: result.stored, changed: result.changed },
            rules,
          );
    await store.writeState(source, state);
    results.push(result);
  }
  return { sources: results };
}

// An adapter's error may quote a request that carried a key: no credential value leaves the run.
function withoutValues(
  text: string,
  credentials: Readonly<Record<string, string>>,
): string {
  let safe = text;
  for (const value of Object.values(credentials)) {
    if (value) safe = safe.split(value).join("[credential]");
  }
  return safe;
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
