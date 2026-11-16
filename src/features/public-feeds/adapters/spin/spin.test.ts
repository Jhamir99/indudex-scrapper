import { describe, expect, it } from "vitest";
import {
  checkAdapterContract,
  loadFixtureRoutes,
} from "../../../../../test/contract/adapter-contract.js";
import { FakeHttpClient } from "../../../../../test/fakes/http-client.js";
import {
  fakeContext,
  fakeDraft,
  readDrafts,
} from "../../../../../test/fakes/source-adapter.js";
import { LIST, offerUrl, postingOf, spin } from "./spin.js";

describe("spin (public-feeds FR-1)", () => {
  it("maps the saved answers into valid adverts", async () => {
    expect(
      await checkAdapterContract(spin, await loadFixtureRoutes("spin")),
    ).toEqual([]);
  });

  it("maps an offer's JobPosting", async () => {
    const [draft] = await readDrafts(
      spin,
      fakeContext({
        http: new FakeHttpClient(await loadFixtureRoutes("spin")),
      }),
    );
    expect(draft).toMatchObject({
      source: "spin",
      sourceId: "4862",
      title: "Educador/a social",
      company: "",
      city: "Riudellots de la Selva",
      location: "Riudellots de la Selva, Catalunya, España",
      posted: "2026-11-16",
      expires: "2027-01-16",
      language: "ca",
      url: offerUrl("4862"),
    });
    expect(draft?.description).toContain("Atenció Centrada en la Persona");
  });

  it("reads the object after jsonld whatever its strings hold", () => {
    expect(
      postingOf(
        'x {"jsonld": {"@type":"JobPosting","title":"a } { \\" b"}, "y": 1}',
      ),
    ).toEqual({
      "@type": "JobPosting",
      title: 'a } { " b',
    });
    expect(postingOf("<html></html>")).toBeUndefined();
  });

  it("keeps an offer still listed whose page fails", async () => {
    const http = new FakeHttpClient({
      [LIST]: '<a href="?idOferta=1">1</a>',
      [offerUrl("1")]: new Error("timeout"),
    });
    const known = fakeDraft("spin", "1");
    expect(
      await readDrafts(spin, fakeContext({ http, previous: [known] })),
    ).toEqual([known]);
  });
});
