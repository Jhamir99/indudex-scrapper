import { describe, expect, it } from "vitest";
import { goldenLabels } from "../../../../test/publication/golden.js";
import { writtenFacts } from "../../advert-facts/index.js";
import { deadlineInText, postedInText } from "./days.js";

describe("the labels' golden set (publication FR-3, FR-4)", () => {
  it("reads every case's contract, working time and days as the legacy did", async () => {
    const cases = await goldenLabels();
    expect(cases.length).toBeGreaterThan(2000);
    const differ = cases.filter((c) => {
      const facts = writtenFacts({
        title: c.title,
        description: c.text,
        source: c.source,
      });
      return (
        (facts.ct ?? "") !== (c.ct ?? "") ||
        (facts.wt ?? "") !== (c.wt ?? "") ||
        postedInText(c.text) !== c.posted ||
        deadlineInText(c.text) !== c.deadline
      );
    });
    expect(differ.map((c) => `${c.source}: ${c.title}`)).toEqual([]);
  });
});
