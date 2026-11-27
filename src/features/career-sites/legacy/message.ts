// The legacy's builder/lib/message.ts: what a failure says, whatever was thrown.
export const messageOf = (e: unknown): string =>
  e instanceof Error ? e.message : String(e);
