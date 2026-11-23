import { describe, expect, it } from "vitest";
import { goldenFile } from "../../../test/title-translation/golden.js";
import { translateTitles } from "./legs.js";

interface GoldenMethod {
  readonly engine: "same" | "turned";
  readonly lang: string;
  readonly t: string;
  readonly ci: string;
  readonly c: string;
  readonly out: Readonly<Record<string, string>>;
}

// The stand-in engines the golden set was made with (the scratchpad's compare-method.mts).
const ENGINES = {
  same: async (_pair: string, texts: readonly string[]) => texts.map((t) => t),
  turned: async (pair: string, texts: readonly string[]) =>
    texts.map(
      (t) => `${t.split(" ").toReversed().join(" ")} ${pair.split("-")[1]}`,
    ),
};

describe("the method's golden set (title translation FR-6)", () => {
  it("gives what the legacy's method gave with the same stand-in engines", async () => {
    const cases = await goldenFile<GoldenMethod>("method.json");
    expect(cases.length).toBeGreaterThan(200);
    const groups = new Map<string, GoldenMethod[]>();
    for (const c of cases)
      groups.set(`${c.engine}\t${c.lang}`, [
        ...(groups.get(`${c.engine}\t${c.lang}`) ?? []),
        c,
      ]);
    const differ: string[] = [];
    for (const [key, list] of groups) {
      const [engine = "same", lang = ""] = key.split("\t");
      const into = ["en", "es", "ca", "fr", "nl", "de"].filter(
        (l) => l !== lang,
      );
      const out = await translateTitles(
        lang,
        list.map((c) => c.t),
        {
          cities: list.map((c) => c.ci),
          firms: list.map((c) => (c.c ? `${c.c}\t0` : "")),
          into,
        },
        { translate: ENGINES[engine as keyof typeof ENGINES], aina: null },
      );
      list.forEach((c, i) => {
        for (const target of into)
          if ((out[target]?.[i] ?? "") !== (c.out[target] ?? ""))
            differ.push(`${engine} ${lang}→${target}: ${c.t}`);
      });
    }
    expect(differ).toEqual([]);
  }, 180_000);
});
