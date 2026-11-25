import { describe, expect, it } from "vitest";
import { withPageFacts } from "../features/crawl-core/page-facts.js";
import { readPageFacts } from "./page-facts.js";

// The legacy's `withLabels` cases (JustJans/indudex test/labels.test.mjs), through the crawl's composed reader and
// crawl-core's merge (job portals T003).
const withLabels = <J extends object>(job: J, html: string) =>
  withPageFacts(job, readPageFacts(html));

describe("a vacancy page's labelled facts (job portals FR-3)", () => {
  it("adds the page's contract beside the block's hours, and lets what the block said stand", () => {
    expect(
      withLabels(
        { title: "Elektriker", employmentType: ["FULL_TIME"] },
        "<p>Vertragsart: unbefristet</p>",
      ),
    ).toMatchObject({ contract: "unbefristet" });
    expect(
      withLabels(
        { title: "Elektriker", contract: "CDD" },
        "<p>Contrat : CDI</p>",
      ).contract,
    ).toBe("CDD");
  });

  it("reads a labelled field before a field with no label, which fills only what is left", () => {
    expect(
      withLabels(
        { title: "Elektriker" },
        "<p>Vertragsart: Arbeitnehmerüberlassung</p><span>Unbefristet</span><span>Vollzeit</span>",
      ),
    ).toEqual({
      title: "Elektriker",
      contract: "Arbeitnehmerüberlassung",
      hours: "Vollzeit",
    });
  });

  it("reads a page's labelled pay and last day where its block gave none", () => {
    const job = withLabels<{
      title: string;
      description: string;
      pay?: unknown;
      expires?: string;
    }>(
      { title: "Data Scientist", description: "x" },
      "<ul><li><strong>Salary:</strong> £90,000 - £105,000 per annum + Bonus</li><li>Bewerbungsfrist</li><li>08.11.2026</li></ul>",
    );
    expect([job.pay, job.expires]).toEqual([
      { min: 90000, max: 105000, currency: "GBP", period: "year" },
      "2026-11-08",
    ]);
  });
});
