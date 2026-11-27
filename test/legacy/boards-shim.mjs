// The legacy's builder/adapters/boards.ts and builder/http.ts as its tests read them: career sites' copy of the board
// reader, its `readBoard` run on a fetch client over whatever `globalThis.fetch` the test put in place (the legacy's tests
// stub it), and `useLookup` (the legacy's DNS stand-in) doing nothing here.
import { FetchClient } from "../../src/shared/http/fetch-client.ts";
import { withHttp } from "../../src/features/career-sites/legacy/http.ts";
import * as boards from "../../src/features/career-sites/legacy/boards.ts";

export * from "../../src/features/career-sites/legacy/boards.ts";
const clock = {
  now: () => new Date(),
  sleep: () => Promise.resolve(),
};
const client = () =>
  new FetchClient({
    clock,
    userAgent: "IndudexBot/test",
    fetch: (url, init) => globalThis.fetch(url, init),
  });
export const readBoard = (...args) =>
  withHttp(client(), () => boards.readBoard(...args));
export const useLookup = () => undefined;
