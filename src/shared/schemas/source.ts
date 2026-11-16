import { z } from "@hono/zod-openapi";

export const SourceId = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "lower-case letters, digits and dashes");

// `credit` is the attribution the source requires next to its adverts ("Jobs by Adzuna");
// null states explicitly that none is required (FR-2).
export const Licence = z.strictObject({
  name: z.string().min(1),
  short: z.string().min(1),
  url: z.url({ protocol: /^https?$/ }),
  licence: z.string().min(1),
  credit: z.string().min(1).nullable(),
});
export type Licence = z.infer<typeof Licence>;

// The kinds ported from the legacy adapters: public and partner feeds, ATS or careers pages,
// job portals that allow republishing, and portals read through an intermediary's partner programme.
export const SourceKind = z.enum(["feed", "careers", "portal", "via"]);
export type SourceKind = z.infer<typeof SourceKind>;

const EnvironmentVariableName = z
  .string()
  .regex(/^[A-Z][A-Z0-9_]*$/, "an environment variable name");

export const SourceDefinition = z
  .strictObject({
    id: SourceId,
    kind: SourceKind,
    licence: Licence,
    needsCredentials: z.boolean(),
    // Only the names of the variables: the values live in the environment (FR-9). Each entry is
    // one variable, or a list of alternatives of which one is enough (Jooble: one key, or one
    // key per country).
    credentialVariables: z
      .array(
        z.union([
          EnvironmentVariableName,
          z.array(EnvironmentVariableName).min(1),
        ]),
      )
      .default([]),
  })
  .refine(
    (source) =>
      source.needsCredentials === source.credentialVariables.length > 0,
    {
      message:
        "needsCredentials must be true exactly when credentialVariables is not empty",
      path: ["credentialVariables"],
    },
  );
export type SourceDefinition = z.infer<typeof SourceDefinition>;

const Timestamp = z.iso.datetime();

const StateFields = {
  lastRunAt: Timestamp.nullable(),
  advertCount: z.int().nonnegative(),
  consecutiveFailures: z.int().nonnegative(),
  // Successful runs in a row that brought nothing new: each one lengthens the wait (FR-6).
  unchangedPasses: z.int().nonnegative().default(0),
  // Reads in a row held as suspect drops (FR-4); added after format version 1, hence the default.
  heldDrops: z.int().nonnegative().default(0),
  nextDueAt: Timestamp.nullable(),
};

const Reason = z.string().min(1);

// FR-10. Every state other than enabled says why.
export const SourceState = z.discriminatedUnion("status", [
  z.strictObject({ status: z.literal("enabled"), ...StateFields }),
  z.strictObject({
    status: z.literal("disabled"),
    reason: Reason,
    ...StateFields,
  }),
  z.strictObject({
    status: z.literal("failed"),
    reason: Reason,
    ...StateFields,
  }),
  z.strictObject({
    status: z.literal("disallowed"),
    reason: Reason,
    ...StateFields,
  }),
  z.strictObject({
    status: z.literal("parked"),
    reason: Reason,
    parkedUntil: Timestamp,
    ...StateFields,
  }),
]);
export type SourceState = z.infer<typeof SourceState>;
export type SourceStatus = SourceState["status"];
