import { describe, expect, it } from "vitest";
import { Today } from "../../shared/schemas/published/dataset.js";
import type { Offer } from "../../shared/schemas/published/offer.js";
import { backdropOffers } from "./backdrop.js";

// The legacy's example (test/builder.test.mjs, the front page's backdrop).
const offer = (
  id: string,
  cc: string,
  c: string,
  d: string,
  more: Partial<Offer> = {},
): Offer => ({
  id,
  t: "Process Engineer",
  c,
  l: "",
  ci: "Town",
  cc,
  u: `https://x.test/${id}`,
  s: "greenhouse",
  d,
  f: ["2144"],
  ...more,
});
const pile = [
  offer("a1", "de", "Siemens", "2026-09-24", { w: "h" }),
  offer("a2", "de", "Bosch", "2026-09-23"),
  offer("a3", "de", "Siemens", "2026-09-22"),
  offer("b1", "es", "Navantia", "2026-09-24"),
  offer("c1", "se", "Volvo", "2026-09-20"),
  offer("x1", "fr", "Agency", "2026-09-25", { s: "jooble" }),
  offer("y1", "nl", "Long", "2026-09-25", {
    t: "A title far too long to show whole on the narrowest phone screen",
  }),
  offer("z1", "xx", "Remote Co", "2026-09-25"),
  offer("w1", "it", "Nameless", "2026-09-25", { ci: "" }),
];

describe("the front page's rows (publication FR-8)", () => {
  it("gives the newest first, a country at a time, one per company; no intermediary, long title, remote or townless offer", () => {
    const rows = backdropOffers(pile, (s) => s === "jooble", 5);
    expect(rows.map((o) => o.id)).toEqual(["a1", "b1", "c1", "a2"]);
    expect(rows[0]).toEqual({
      id: "a1",
      t: "Process Engineer",
      c: "Siemens",
      ci: "Town",
      cc: "de",
      u: "https://x.test/a1",
      s: "greenhouse",
      w: "h",
    });
    expect(Today.safeParse({ v: 1, offers: rows, latest: {} }).success).toBe(
      true,
    );
  });

  it("leaves out an offer whose title in a language would not fit", () => {
    expect(
      backdropOffers(
        [
          offer("a", "de", "Siemens", "2026-09-24", {
            te: "An English title far too long for one line here",
          }),
        ],
        () => false,
      ),
    ).toEqual([]);
  });
});
