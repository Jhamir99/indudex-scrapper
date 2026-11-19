// Eurostat's LAU table (local administrative units, LAU 2025 / NUTS 2024): each municipality's code
// in its country, its NUTS 3 unit and its name, so a register's company is placed by its
// municipality's official code, in the same province as the offers (legacy readLau and placer in
// builder/tools/registers.mjs). The table is the operator's download, a TSV: country, NUTS 3, LAU
// code, name.

// Where NUTS does not draw what people call a province: the Canary and Balearic islands are NUTS 3
// units grouped into their provinces, and Northern Ireland's 2016 units from 10 on are written
// UKN0A to UKN0G (legacy builder/tools/nuts.mjs MERGED), as the nuts catalogue codes them.
const MERGED: Readonly<Record<string, string>> = {
  ES703: "ES70T",
  ES706: "ES70T",
  ES707: "ES70T",
  ES709: "ES70T",
  ES704: "ES70P",
  ES705: "ES70P",
  ES708: "ES70P",
  ES531: "ES530",
  ES532: "ES530",
  ES533: "ES530",
  UKN10: "UKN0A",
  UKN11: "UKN0B",
  UKN12: "UKN0C",
  UKN13: "UKN0D",
  UKN14: "UKN0E",
  UKN15: "UKN0F",
  UKN16: "UKN0G",
};

// Country → municipality code → [NUTS 3 as the site codes it, name].
export type LauTable = Map<string, Map<string, readonly [string, string]>>;

export function readLau(text: string): LauTable {
  const lau: LauTable = new Map();
  for (const line of text.split("\n")) {
    const [country = "", nuts3 = "", code, name = ""] = line.split("\t");
    if (!code) continue;
    const iso =
      ({ EL: "gr", UK: "gb" } as Record<string, string>)[country] ??
      country.toLowerCase();
    let codes = lau.get(iso);
    if (!codes) lau.set(iso, (codes = new Map()));
    // A name in several languages ("Nordreisa/Ráisa/Raisi") is shown by its first.
    codes.set(code, [
      Object.hasOwn(MERGED, nuts3) ? (MERGED[nuts3] ?? nuts3) : nuts3,
      (name.split("/")[0] ?? "").trim(),
    ]);
  }
  return lau;
}

const prefixOf = (code: string) =>
  code.startsWith("97") ? code.slice(0, 3) : code.slice(0, 2);

export type Placer = (
  country: string,
  code: string,
) => { readonly nuts: string; readonly town: string };

// A municipality code the table lacks (Paris, Lyon and Marseille by district) falls back on the
// unit most of its département's or province's municipalities are in.
export function placer(lau: LauTable): Placer {
  const byPrefix = new Map<string, Map<string, string>>();
  for (const [country, codes] of lau) {
    const tally = new Map<string, Map<string, number>>();
    for (const [code, [nuts3]] of codes) {
      const prefix = prefixOf(code);
      let counts = tally.get(prefix);
      if (!counts) tally.set(prefix, (counts = new Map()));
      counts.set(nuts3, (counts.get(nuts3) ?? 0) + 1);
    }
    byPrefix.set(
      country,
      new Map(
        [...tally].map(([prefix, counts]) => [
          prefix,
          [...counts].toSorted((a, b) => b[1] - a[1])[0]?.[0] ?? "",
        ]),
      ),
    );
  }
  return (country, code) => {
    const hit = lau.get(country)?.get(code);
    if (hit) return { nuts: hit[0], town: hit[1] };
    return { nuts: byPrefix.get(country)?.get(prefixOf(code)) ?? "", town: "" };
  };
}
