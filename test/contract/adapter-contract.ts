import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runSource } from "../../src/features/crawl-core/runner.js";
import type { SourceAdapter } from "../../src/features/crawl-core/ports.js";
import { SourceDefinition } from "../../src/shared/schemas/source.js";
import { InMemoryAdvertStore } from "../fakes/advert-store.js";
import { FakeHttpClient } from "../fakes/http-client.js";

export const FIXTURES_DIRECTORY = fileURLToPath(
  new URL("../fixtures/", import.meta.url),
);

// `test/fixtures/<id>/routes.json` maps each address the adapter asks for to the saved file
// that answers it, e.g. { "https://brz.example/feed.xml": "feed.xml" }.
export async function loadFixtureRoutes(
  source: string,
): Promise<Record<string, string>> {
  const folder = join(FIXTURES_DIRECTORY, source);
  const routes = JSON.parse(
    await readFile(join(folder, "routes.json"), "utf8"),
  ) as Record<string, string>;
  const answers: Record<string, string> = {};
  for (const [url, file] of Object.entries(routes)) {
    answers[url] = await readFile(join(folder, file), "utf8");
  }
  return answers;
}

const CONTACT_KEY = /mail|phone|contact|tel|fax|person|recruiter/i;
const EMAIL_ADDRESS = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;

// What every registered adapter must meet (FR-1, FR-2, FR-12): valid licence data, only valid
// adverts from its saved responses, and no person data. Returns the problems found.
export async function checkAdapterContract(
  adapter: SourceAdapter,
  routes: Readonly<Record<string, string>>,
): Promise<string[]> {
  const problems: string[] = [];
  const definition = SourceDefinition.safeParse(adapter.definition);
  if (!definition.success) {
    problems.push(`licence data: ${definition.error.issues[0]?.message}`);
    return problems;
  }

  const store = new InMemoryAdvertStore();
  const credentials = Object.fromEntries(
    definition.data.credentialVariables.map((name) => [name, `test-${name}`]),
  );
  const result = await runSource(adapter, {
    http: new FakeHttpClient(routes),
    store,
    credentials,
    log: () => {},
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
