import { describe, expect, it } from "vitest";
import {
  checkAdapterContract,
  loadFixtureRoutes,
} from "../../../../../test/contract/adapter-contract.js";
import {
  fakeContext,
  readDrafts,
} from "../../../../../test/fakes/source-adapter.js";
import type { HttpClient } from "../../../crawl-core/ports.js";
import { anofm, parseAnofm, withoutContacts } from "./anofm.js";

const rows = (from: number, count: number) =>
  Array.from({ length: count }, (_, k) => ({
    id: from + k,
    occupation: "INGINER ELECTRONIST",
  }));

// The list as pages of `size` rows out of `total`, by the page the body asks.
function listServer(
  total: number,
  size: number,
  stopAt = Infinity,
): HttpClient {
  return {
    async request(url, options) {
      const page = (JSON.parse(options?.body ?? "{}") as { current: number })
        .current;
      const from = (page - 1) * size;
      const count =
        page >= stopAt ? 0 : Math.max(0, Math.min(size, total - from));
      return {
        status: 200,
        url,
        headers: {},
        body: JSON.stringify({ total, rows: rows(from + 1, count) }),
      };
    },
  };
}

describe("anofm (public-feeds FR-1)", () => {
  it("maps the saved list into valid adverts", async () => {
    expect(
      await checkAdapterContract(anofm, await loadFixtureRoutes("anofm")),
    ).toEqual([]);
  });

  it("maps a row: the occupation as a sentence, town and county, COR's ISCO code, work mode", () => {
    const [draft] = parseAnofm(
      JSON.stringify({
        total: 1,
        rows: [
          {
            id: 7,
            occupation: "INGINER AUTOMATIST",
            cor_name: "215101 - inginer automatist",
            address_locality_name: "BIHOR > ORADEA",
            work_regime_name: "Hibrid",
            employer_name: "Electro SRL",
            description:
              "Scrieți la hr@electro.ro sau 0745 123 456. Detalii: www.electro.ro",
            job_domain_name: "Inginerie",
            created_at: "2026-11-10 08:00:00",
            job_expiry_date: "2026-12-10",
          },
        ],
      }),
    ).drafts;
    expect(draft).toMatchObject({
      sourceId: "7",
      title: "Inginer automatist",
      company: "Electro SRL",
      location: "Oradea, Bihor, România",
      city: "Oradea",
      workMode: "hybrid",
      remote: false,
      url: "https://mediere.anofm.ro/app/module/mediere/job/7",
      occupationCodes: { isco: "2151" },
      posted: "2026-11-10",
      expires: "2026-12-10",
    });
    expect(draft?.description).toBe("Scrieți la sau . Detalii:\nInginerie");
  });

  it("cuts out contacts but keeps dates", () => {
    expect(
      withoutContacts("Contract 01/12/2026 - 28/02/2027, tel +40 21 312 3456"),
    ).toBe("Contract 01/12/2026 - 28/02/2027, tel");
  });

  it("pages up to the total and fails a pass well short of it", async () => {
    expect(
      await readDrafts(anofm, fakeContext({ http: listServer(250, 100) })),
    ).toHaveLength(250);
    await expect(
      readDrafts(anofm, fakeContext({ http: listServer(250, 100, 2) })),
    ).rejects.toThrow("100 offers read of the 250 it counts");
  });
});
