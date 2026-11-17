import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { credentialNames } from "../../src/features/crawl-core/credentials.js";
import { runSource } from "../../src/features/crawl-core/runner.js";
import type { SourceAdapter } from "../../src/features/crawl-core/ports.js";
import { SourceDefinition } from "../../src/shared/schemas/source.js";
import { InMemoryAdvertStore } from "../fakes/advert-store.js";
import { FakeHttpClient, type Route } from "../fakes/http-client.js";

export const FIXTURES_DIRECTORY = fileURLToPath(
  new URL("../fixtures/", import.meta.url),
);

// `test/fixtures/<id>/routes.json` maps each address the adapter asks for to the saved file
// that answers it, e.g. { "https://brz.example/feed.xml": "feed.xml" }. A `.pdf` file answers
// as a PDF's bytes (for a request that asks for `binary`), any other as text; an entry may also
// be { "file": "x.json", "binary": true, "contentType": "application/json" } for bytes of any kind
// (a file in windows-1252, say).
export async function loadFixtureRoutes(
  source: string,
): Promise<Record<string, Route>> {
  const folder = join(FIXTURES_DIRECTORY, source);
  const routes = JSON.parse(
    await readFile(join(folder, "routes.json"), "utf8"),
  ) as Record<
    string,
    string | { file: string; binary: true; contentType?: string }
  >;
  const answers: Record<string, Route> = {};
  for (const [url, file] of Object.entries(routes)) {
    if (typeof file === "object") {
      answers[url] = {
        headers: {
          "content-type": file.contentType ?? "application/octet-stream",
        },
        bytes: new Uint8Array(await readFile(join(folder, file.file))),
      };
    } else if (file.endsWith(".pdf")) {
      answers[url] = {
        headers: { "content-type": "application/pdf" },
        bytes: new Uint8Array(await readFile(join(folder, file))),
      };
    } else {
      answers[url] = await readFile(join(folder, file), "utf8");
    }
  }
  return answers;
}

// The day the adapters see in the contract check, so a source whose address carries the day
// (a filter on open vacancies) has one fixture that always matches.
export const CONTRACT_DAY = "2026-11-17";

const CONTACT_KEY = /mail|phone|contact|tel|fax|person|recruiter/i;
const EMAIL_ADDRESS = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;

// What every registered adapter must meet (FR-1, FR-2, FR-12): valid licence data, only valid
// adverts from its saved responses, and no person data. Returns the problems found.
export async function checkAdapterContract(
  adapter: SourceAdapter,
  routes: Readonly<Record<string, Route>>,
): Promise<string[]> {
  const problems: string[] = [];
  const definition = SourceDefinition.safeParse(adapter.definition);
  if (!definition.success) {
    problems.push(`licence data: ${definition.error.issues[0]?.message}`);
    return problems;
  }

  const store = new InMemoryAdvertStore();
  const credentials = Object.fromEntries(
    credentialNames(definition.data).map((name) => [name, `test-${name}`]),
  );
  const result = await runSource(adapter, {
    http: new FakeHttpClient(routes),
    store,
    credentials,
    log: () => {},
    today: CONTRACT_DAY,
  });
  if (result.outcome !== "stored") {
    problems.push(
      `fixture read: ${result.outcome} ${result.reason ?? ""}`.trim(),
    );
  }
  for (const { sourceId, reason } of result.rejected) {
    problems.push(`advert ${sourceId}: ${reason}`);
  }

  for (const advert of await store.readAdverts(definition.data.id)) {
    for (const [key, value] of Object.entries(advert)) {
      if (CONTACT_KEY.test(key)) {
        problems.push(`advert ${advert.sourceId}: contact field ${key}`);
      }
      // The description is never published and may quote an address; the fields shown are not.
      if (
        key !== "description" &&
        typeof value === "string" &&
        EMAIL_ADDRESS.test(value)
      ) {
        problems.push(`advert ${advert.sourceId}: e-mail address in ${key}`);
      }
    }
  }
  return problems;
}
