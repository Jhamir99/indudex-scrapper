import type { z } from "@hono/zod-openapi";
import {
  Advert,
  advertId,
  DESCRIPTION_LIMIT,
} from "../../shared/schemas/advert.js";
import { HttpFailure } from "../../shared/http/http-failure.js";
import type { SourceState } from "../../shared/schemas/source.js";
import type { TakedownList } from "./config/takedowns.js";
import { checkCredentials, type Environment } from "./credentials.js";
import {
  afterDisallowed,
  afterFailure,
  afterSuccess,
  disabled,
  type ScheduleRules,
  selectDue,
} from "./domain/schedule.js";
import type {
  AdapterContext,
  AdvertDraft,
  AdvertStore,
  Clock,
  HttpClient,
  HttpRequestOptions,
  HttpResponse,
  SourceAdapter,
  StopSwitch,
} from "./ports.js";

type Takedowns = Pick<TakedownList, "reasonFor" | "sourceReason">;

export interface RejectedAdvert {
  readonly sourceId: string;
  readonly reason: string;
}

// stored: a valid read replaced the source's set. empty: nothing was read and nothing was
// stored before. failed: the read threw, gave no valid advert, or gave none after having some.
// disallowed: robots.txt closed an address the source needed. In those two the stored set is
// left as it was (FR-4). disabled: the source may not run, and made no request (FR-8, FR-9).
// stopped: the stop switch cut the read; nothing was stored and the state is untouched (FR-7).
export type SourceOutcome =
  "stored" | "empty" | "failed" | "disallowed" | "disabled" | "stopped";

export interface SourceRunResult {
  readonly source: string;
  readonly outcome: SourceOutcome;
  // Valid adverts handed to the store.
  readonly stored: number;
  // Adverts that failed validation, each with its reason (FR-1).
  readonly rejected: readonly RejectedAdvert[];
  // Valid adverts left out because a takedown covers them (FR-8).
  readonly takenDown: number;
  // Whether the set of advert ids differs from the one stored before.
  readonly changed: boolean;
  readonly reason?: string;
}

export interface SourceRunDependencies {
  readonly http: HttpClient;
  readonly store: AdvertStore;
  readonly credentials?: Readonly<Record<string, string>>;
  readonly takedowns?: Takedowns;
  readonly stopSwitch?: StopSwitch;
  readonly log: (message: string) => void;
}

class RunStopped extends Error {
  override name = "RunStopped";
  constructor() {
    super("the stop switch is active");
  }
}

// Asks the stop switch before every request, so none leaves once it is active (FR-7). It
// remembers having stopped even if an adapter swallows the error.
class StopGuardClient implements HttpClient {
  stopped = false;

  constructor(
    private readonly inner: HttpClient,
    private readonly stopSwitch: StopSwitch | undefined,
  ) {}

  async request(
    url: string,
    options?: HttpRequestOptions,
  ): Promise<HttpResponse> {
    if (this.stopped || (await this.stopSwitch?.isActive())) {
      this.stopped = true;
      throw new RunStopped();
    }
    return this.inner.request(url, options);
  }
}

// Reads one source and stores its valid adverts, inside the source's failure boundary: it never
// throws (FR-3). The runner stops here (FR-11): no gate, dedupe, translation or publication.
export async function runSource(
  adapter: SourceAdapter,
  dependencies: SourceRunDependencies,
): Promise<SourceRunResult> {
  const { definition } = adapter;
  const source = definition.id;
  const { store, takedowns, log } = dependencies;
  const credentials = dependencies.credentials ?? {};
  const http = new StopGuardClient(dependencies.http, dependencies.stopSwitch);
  const context: AdapterContext = {
    http,
    credentials,
    log: (message) => log(`${source}: ${message}`),
  };

  const valid = new Map<string, Advert>();
  const rejected: RejectedAdvert[] = [];
  let takenDown = 0;
  const result = (
    outcome: SourceOutcome,
    fields: { stored?: number; changed?: boolean; reason?: string } = {},
  ): SourceRunResult => ({
    source,
    outcome,
    stored: fields.stored ?? 0,
    rejected,
    takenDown,
    changed: fields.changed ?? false,
    ...(fields.reason === undefined ? {} : { reason: fields.reason }),
  });
  const stopped = () => {
    log(`${source}: stopped by the stop switch, nothing stored`);
    return result("stopped", { reason: "stopped by the stop switch" });
  };
  const failed = (error: unknown): SourceRunResult => {
    if (http.stopped) return stopped();
    const message = error instanceof Error ? error.message : String(error);
    const reason = withoutValues(message, credentials);
    const outcome =
      error instanceof HttpFailure && error.kind === "disallowed"
        ? "disallowed"
        : "failed";
    log(`${source}: ${outcome}: ${reason}`);
    return result(outcome, { reason });
  };

  try {
    const previous = await store.readAdverts(source);
    for await (const draft of adapter.fetchAdverts(context)) {
      const conversion = toAdvert(adapter, draft);
      if (!conversion.success) {
        rejected.push({ sourceId: draft.sourceId, reason: conversion.reason });
      } else if (takedowns?.reasonFor(conversion.advert)) {
        takenDown += 1;
      } else if (valid.has(conversion.advert.id)) {
        rejected.push({
          sourceId: draft.sourceId,
          reason: "sourceId: repeated in the same read",
        });
      } else {
        valid.set(conversion.advert.id, conversion.advert);
      }
    }
    if (http.stopped) return stopped();
    for (const { sourceId, reason } of rejected) {
      log(`${source}: rejected ${sourceId}: ${reason}`);
    }
    if (takenDown > 0) log(`${source}: ${takenDown} adverts taken down`);

    if (valid.size === 0 && rejected.length > 0) {
      return failed(new Error(`no valid advert: ${rejected.length} rejected`));
    }
    // A source that had adverts and now answers none is more likely down than emptied
    // (legacy `suspectDrop`): it keeps what it had.
    if (valid.size === 0 && takenDown === 0 && previous.length > 0) {
      return failed(
        new Error(`read no adverts after ${previous.length}: kept`),
      );
    }
    if (valid.size === 0) {
      log(`${source}: read no adverts`);
      return result("empty");
    }

    await store.replaceAdverts(source, [...valid.values()]);
    const before = new Set(previous.map((advert) => advert.id));
    const changed =
      before.size !== valid.size ||
      [...valid.keys()].some((id) => !before.has(id));
    log(
      `${source}: ${valid.size} adverts${rejected.length > 0 ? `, ${rejected.length} rejected` : ""}`,
    );
    return result("stored", { stored: valid.size, changed });
  } catch (error) {
    return failed(error);
  }
}

export interface RunDependencies {
  readonly http: HttpClient;
  readonly store: AdvertStore;
  readonly clock: Clock;
  readonly rulesFor: (source: string) => ScheduleRules;
  readonly takedowns: Takedowns;
  readonly stopSwitch: StopSwitch;
  // Where credentials are read from: process.env in a real run (FR-9).
  readonly environment: Environment;
  readonly log: (message: string) => void;
}

export interface RunResult {
  readonly sources: readonly SourceRunResult[];
  // True when the stop switch kept the run from starting or cut it short.
  readonly stopped: boolean;
}

type Gate =
  | { readonly allowed: true; readonly credentials: Record<string, string> }
  | { readonly allowed: false; readonly reason: string };

// Whether a source may run at all: not taken down, and with its credentials (FR-8, FR-9).
function gate(adapter: SourceAdapter, dependencies: RunDependencies): Gate {
  const { definition } = adapter;
  const takedown = dependencies.takedowns.sourceReason(definition.id);
  if (takedown) return { allowed: false, reason: `taken down: ${takedown}` };
  const check = checkCredentials(definition, dependencies.environment);
  if (!check.ready) return { allowed: false, reason: check.reason };
  return { allowed: true, credentials: check.credentials };
}

// One scheduled run: only the sources due now, the others untouched and without a request
// (FR-6). A failed or parked source is due again only when its wait has passed (FR-3).
// Sources that may not run are recorded as disabled whether due or not.
export async function runDue(
  adapters: readonly SourceAdapter[],
  dependencies: RunDependencies,
): Promise<RunResult> {
  const { store, clock, stopSwitch, log } = dependencies;
  if (await stopSwitch.isActive()) {
    log("the stop switch is active: nothing runs");
    return { sources: [], stopped: true };
  }
  await sweepTakedowns(adapters, dependencies);
  const states = await store.readStates();
  const allowed = adapters.filter(
    (adapter) => gate(adapter, dependencies).allowed,
  );
  const due = new Set(
    selectDue(
      allowed.map((adapter) => ({ id: adapter.definition.id, adapter })),
      states,
      clock.now(),
    ).map((entry) => entry.adapter),
  );
  log(`${due.size} of ${adapters.length} sources due`);
  const notAllowed = adapters.filter((adapter) => !allowed.includes(adapter));
  return runSources([...notAllowed, ...due], dependencies);
}

// Runs the given sources one after another, due or not. Each runs inside its own failure
// boundary, so a failing source is recorded with its reason and the next one still runs
// (FR-3, FR-4). The stop switch is read before each source (FR-7).
export async function runSources(
  adapters: readonly SourceAdapter[],
  dependencies: RunDependencies,
): Promise<RunResult> {
  const { store, clock, rulesFor, stopSwitch, log } = dependencies;
  const results: SourceRunResult[] = [];
  for (const adapter of adapters) {
    if (await stopSwitch.isActive()) {
      log("the stop switch is active: no further source runs");
      return { sources: results, stopped: true };
    }
    const source = adapter.definition.id;
    const previous = await store.readState(source);
    const access = gate(adapter, dependencies);
    if (!access.allowed) {
      if (
        previous?.status !== "disabled" ||
        previous.reason !== access.reason
      ) {
        await store.writeState(source, disabled(previous, access.reason));
      }
      log(`${source}: disabled: ${access.reason}`);
      results.push({
        source,
        outcome: "disabled",
        stored: 0,
        rejected: [],
        takenDown: 0,
        changed: false,
        reason: access.reason,
      });
      continue;
    }

    const at = clock.now();
    const result = await runSource(adapter, {
      ...dependencies,
      credentials: access.credentials,
    });
    results.push(result);
    if (result.outcome === "stopped")
      return { sources: results, stopped: true };
    await store.writeState(
      source,
      nextState(previous, result, at, rulesFor(source)),
    );
  }
  return { sources: results, stopped: false };
}

function nextState(
  previous: SourceState | undefined,
  result: SourceRunResult,
  at: Date,
  rules: ScheduleRules,
): SourceState {
  const reason = result.reason ?? result.outcome;
  if (result.outcome === "disallowed") {
    return afterDisallowed(previous, { at, reason }, rules);
  }
  if (result.outcome === "failed") {
    return afterFailure(previous, { at, reason }, rules);
  }
  return afterSuccess(
    previous,
    { at, advertCount: result.stored, changed: result.changed },
    rules,
  );
}

// Takedowns also remove what is already stored (FR-8): every source the store knows is swept at
// the start of a run, due or not.
async function sweepTakedowns(
  adapters: readonly SourceAdapter[],
  dependencies: RunDependencies,
): Promise<void> {
  const { store, takedowns, log } = dependencies;
  const sources = new Set([
    ...adapters.map((adapter) => adapter.definition.id),
    ...(await store.readStates()).keys(),
  ]);
  for (const source of sources) {
    const covered = (await store.readAdverts(source))
      .filter((advert) => takedowns.reasonFor(advert))
      .map((advert) => advert.id);
    if (covered.length === 0) continue;
    await store.dropAdverts(source, covered);
    log(`${source}: ${covered.length} stored adverts taken down`);
  }
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
