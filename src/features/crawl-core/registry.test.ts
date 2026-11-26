import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  checkAdapterContract,
  FIXTURES_DIRECTORY,
  loadFixtureRoutes,
} from "../../../test/contract/adapter-contract.js";
import {
  fakeDefinition,
  fakeDraft,
  FakeSourceAdapter,
} from "../../../test/fakes/source-adapter.js";
import type { AdvertDraft } from "./ports.js";
import { variablesMissingFromExample } from "./credentials.js";
import { registeredAdapters } from "./registry.js";

describe("registered adapters (FR-1, FR-2, FR-12)", () => {
  it("have unique ids", () => {
    const ids = registeredAdapters.map((adapter) => adapter.definition.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("have their credential variables listed in .env.example (FR-9)", async () => {
    const example = await readFile(
      new URL("../../../.env.example", import.meta.url),
      "utf8",
    );
    expect(
      variablesMissingFromExample(
        registeredAdapters.map((adapter) => adapter.definition),
        example,
      ),
    ).toEqual([]);
  });

  // A job portal without saved answers is covered by the portal family's tests and the live pass (job portals FR-9).
  for (const adapter of registeredAdapters.filter(
    (one) =>
      one.definition.kind !== "portal" ||
      existsSync(join(FIXTURES_DIRECTORY, one.definition.id)),
  )) {
    it(`${adapter.definition.id} meets the adapter contract with its fixture`, async () => {
      const routes = await loadFixtureRoutes(adapter.definition.id);
      expect(await checkAdapterContract(adapter, routes)).toEqual([]);
    });
  }
});

describe("the adapter contract check", () => {
  const routes = { "https://fake.example/feed": "<rss/>" };
  const reads = { fetches: ["https://fake.example/feed"] };

  it("passes a good adapter", async () => {
    const good = new FakeSourceAdapter(
      fakeDefinition("fake"),
      [fakeDraft("fake", "1")],
      reads,
    );
    expect(await checkAdapterContract(good, routes)).toEqual([]);
  });

  it("fails bad licence data", async () => {
    const definition = fakeDefinition("fake");
    const bad = new FakeSourceAdapter(
      { ...definition, licence: { ...definition.licence, url: "not a url" } },
      [fakeDraft("fake", "1")],
    );
    expect(await checkAdapterContract(bad, routes)).toEqual([
      expect.stringMatching(/^licence data: /),
    ]);
  });

  it("fails an invalid advert and a read that stores nothing", async () => {
    const bad = new FakeSourceAdapter(
      fakeDefinition("fake"),
      [fakeDraft("fake", "1", { country: "Austria" })],
      reads,
    );
    expect(await checkAdapterContract(bad, routes)).toEqual([
      "fixture read: failed no valid advert: 1 rejected",
      "advert 1: country: a lower-case ISO 3166-1 code",
    ]);
  });

  it("fails an adapter that asks for an address its fixture does not answer", async () => {
    const bad = new FakeSourceAdapter(fakeDefinition("fake"), [], {
      fetches: ["https://fake.example/other"],
    });
    expect(await checkAdapterContract(bad, routes)).toEqual([
      "fixture read: failed no fake route for https://fake.example/other",
    ]);
  });

  it("fails a contact field and an e-mail address in a shown field", async () => {
    const withContact = {
      ...fakeDraft("fake", "1"),
      contactEmail: "hr@fake.example",
    } as AdvertDraft;
    const withAddress = fakeDraft("fake", "2", {
      company: "Write to jane.doe@fake.example",
      description: "Questions: jobs@fake.example",
    });
    const bad = new FakeSourceAdapter(
      fakeDefinition("fake"),
      [withContact, withAddress],
      reads,
    );
    expect(await checkAdapterContract(bad, routes)).toEqual([
      'advert 1: Unrecognized key: "contactEmail"',
      "advert 2: e-mail address in company",
    ]);
  });
});
