import type { SourceDefinition } from "../../shared/schemas/source.js";

export type Environment = Readonly<Record<string, string | undefined>>;

export type CredentialCheck =
  | { readonly ready: true; readonly credentials: Record<string, string> }
  | {
      readonly ready: false;
      readonly missing: string[];
      readonly reason: string;
    };

// FR-9: a source's keys come only from the environment. A missing or blank variable keeps the
// source disabled; the reason names the variables, never a value, so it is safe to log and store.
export function checkCredentials(
  definition: SourceDefinition,
  environment: Environment,
): CredentialCheck {
  const credentials: Record<string, string> = {};
  const missing: string[] = [];
  for (const name of definition.credentialVariables) {
    const value = environment[name]?.trim();
    if (value) credentials[name] = value;
    else missing.push(name);
  }
  if (missing.length === 0) return { ready: true, credentials };
  return {
    ready: false,
    missing,
    reason: `missing credentials: ${missing.join(", ")}`,
  };
}

// The variables declared by the given sources that `.env.example` does not list.
export function variablesMissingFromExample(
  definitions: readonly SourceDefinition[],
  exampleText: string,
): string[] {
  const listed = new Set(
    exampleText
      .split(/\r?\n/)
      .map((line) => /^\s*#?\s*([A-Z][A-Z0-9_]*)=/.exec(line)?.[1])
      .filter((name) => name !== undefined),
  );
  const declared = definitions.flatMap((d) => d.credentialVariables);
  return [...new Set(declared)].filter((name) => !listed.has(name));
}
