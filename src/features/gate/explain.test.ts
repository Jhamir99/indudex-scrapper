import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FakeClock } from "../../../test/fakes/clock.js";
import { gateCatalogues } from "../../../test/gate/catalogues.js";
import { readCatalogue } from "../../shared/catalogues/read-catalogue.js";
import { type Advert, advertId } from "../../shared/schemas/advert.js";
import { FileAdvertStore } from "../../shared/storage/file-advert-store.js";
import { createGate, formatSummary, writeExplainReport } from "./index.js";

const gate = createGate({
  ...(await gateCatalogues()),
  countries: await readCatalogue("countries"),
});

function advert(
  sourceId: string,
  title: string,
  fields: Partial<Advert> = {},
): Advert {
  return {
    id: advertId("sne", sourceId),
    source: "sne",
    sourceId,
    title,
    company: "Acme",
    location: "Madrid, España",
    country: "es",
    city: "Madrid",
    remote: false,
    url: `https://sne.example/${sourceId}`,
    description: "",
    posted: "2026-11-10",
    occupationCodes: {},
    language: "es",
    attribution: { licence: "CC BY 4.0", credit: null },
    ...fields,
  };
}

let storeDirectory: string;
let outDirectory: string;

beforeEach(async () => {
  storeDirectory = await mkdtemp(join(tmpdir(), "indudex-store-"));
  outDirectory = await mkdtemp(join(tmpdir(), "indudex-out-"));
});

afterEach(async () => {
  await rm(storeDirectory, { recursive: true, force: true });
  await rm(outDirectory, { recursive: true, force: true });
});

describe("the explain report (gate FR-9)", () => {
  it("writes one line per advert left out, gzipped, and counts each reason", async () => {
    const store = new FileAdvertStore(
      storeDirectory,
      new FakeClock("2026-11-19T08:00:00Z"),
    );
    await store.replaceAdverts("sne", [
      advert("1", "Ingeniero mecánico"),
      advert("2", "Dependiente de tienda"),
      advert("3", "Electricista"),
      advert("4", "Ingeniero mecánico", { country: "us" }),
      // Expired: the store hides it, so the report never sees it.
      advert("5", "Dependiente de tienda", { expires: "2026-11-01" }),
    ]);
    const before = await readdir(storeDirectory, { recursive: true });

    const summary = await writeExplainReport(
      await store.readAdverts("sne"),
      gate.decide,
      outDirectory,
    );

    expect(summary).toMatchObject({
      adverts: 4,
      kept: 2,
      trades: 1,
      reasons: [
        ["outside Europe", 1],
        ["outside the vertical", 1],
      ],
    });
    const report = gunzipSync(await readFile(summary.path)).toString("utf8");
    expect(report).toBe(
      [
        "[outside the vertical] Dependiente de tienda | Acme | Madrid, España (sne)",
        "[outside Europe] Ingeniero mecánico | Acme | Madrid, España (sne)",
        "",
      ].join("\n"),
    );
    expect(await readdir(storeDirectory, { recursive: true })).toEqual(before);
    expect(formatSummary(summary)).toContain(
      "4 adverts, 2 kept (50.0 %), 1 of them by the trades",
    );
  });

  it("writes an empty report when nothing is left out", async () => {
    const summary = await writeExplainReport(
      [advert("1", "Ingeniero mecánico")],
      gate.decide,
      outDirectory,
    );
    expect(gunzipSync(await readFile(summary.path)).toString("utf8")).toBe("");
  });
});
