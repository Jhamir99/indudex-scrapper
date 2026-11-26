// The legacy's test/tidy-titles.test.mjs (JustJans/indudex@ec79858), carried whole (legacy resync T008): its imports pointed at
// this repo.
// ➤ A shown title without its gender mark or its advert's number, in every language it is shown in (23 November 2026,
// ➤ the published titles read before the owner's meeting).
import { harness } from "./harness.mjs";
import { tidyTitle } from "../../src/features/publication/tidy-titles.ts";

// Its `tidyTitles` loop is the publication's build (src/features/publication/build.ts), the same loop here.
const tidyTitles = (records, asWritten = new Set()) => {
  let changed = 0;
  for (const r of records) {
    if (asWritten.has(r.s)) continue;
    let any = false;
    for (const field of ["t", "te", "ts", "tc", "tf", "tn", "td"]) {
      const tidied =
        typeof r[field] === "string" && r[field] ? tidyTitle(r[field]) : "";
      if (tidied && tidied !== r[field]) {
        r[field] = tidied;
        any = true;
      }
    }
    if (any) changed++;
  }
  return changed;
};

const { eq, done } = harness("tidy-titles");

eq(
  [
    "Technolog lakování (m/ž)",
    "Automatyk [K/M]",
    "Process Engineer (m/f/*)",
    "Brauerjobs Braumeister (m,w,d)",
    "Tecnólogo de herramientas (H/M)",
    "Elektroniker – Wartung [K/M/N]",
    "Qualitätsingenieur (m/w/div.)",
  ].map(tidyTitle),
  [
    "Technolog lakování",
    "Automatyk",
    "Process Engineer",
    "Brauerjobs Braumeister",
    "Tecnólogo de herramientas",
    "Elektroniker – Wartung",
    "Qualitätsingenieur",
  ],
  "a gender mark goes, in any language and either bracket",
);
eq(
  [
    "Automation Engineer (ID: 3911)",
    "Technolog výroby (M/Ž) (A14075)",
    "Verfahrensingenieur für Prozessanlagen – [1245]",
    "INSTAL·LADOR/A ELECTRICISTA (REF:32623)",
    "Production Engineer | 100% – 57331",
    "Product Owner técnico – D-2947",
    "Design Engineer - 1745",
  ].map(tidyTitle),
  [
    "Automation Engineer",
    "Technolog výroby",
    "Verfahrensingenieur für Prozessanlagen",
    "INSTAL·LADOR/A ELECTRICISTA",
    "Production Engineer | 100%",
    "Product Owner técnico",
    "Design Engineer",
  ],
  "the advert's number at the end goes",
);
eq(
  [
    "Graduate Industrial Design Engineer - (2027 start)",
    "Process Engineer Netherlands - 2027",
    "Planning Engineer A/Craft (Part145)",
    "Engineer (AI/ML)",
    "C/C++ Developer (Embedded)",
    "Electricista (Barcelona)",
  ].map(tidyTitle),
  [
    "Graduate Industrial Design Engineer - (2027 start)",
    "Process Engineer Netherlands - 2027",
    "Planning Engineer A/Craft (Part145)",
    "Engineer (AI/ML)",
    "C/C++ Developer (Embedded)",
    "Electricista (Barcelona)",
  ],
  "a year, a rule, a field and a place stay",
);

// ➤ A run of spaces or brackets a hundred thousand long is read at once, not over and over (#1057).
const started = performance.now();
for (const hostile of [
  " ".repeat(100_000) + "x",
  "(".repeat(100_000),
  "( m / ".repeat(20_000),
  "- 1".repeat(30_000) + "a",
])
  tidyTitle(hostile);
eq(
  performance.now() - started < 1000,
  true,
  "a hostile title takes less than a second",
);

const records = [
  {
    s: "careers",
    t: "Technolog laserů (m/ž)",
    te: "Laser technologist (m/f)",
    ts: "Tecnólogo de láseres (h/m)",
  },
  { s: "kept", t: "Tècnic (REF:32623)" },
  { s: "careers", t: "(m/w/d)" },
];
eq(tidyTitles(records, new Set(["kept"])), 1, "one record changed");
eq(
  records,
  [
    {
      s: "careers",
      t: "Technolog laserů",
      te: "Laser technologist",
      ts: "Tecnólogo de láseres",
    },
    { s: "kept", t: "Tècnic (REF:32623)" },
    { s: "careers", t: "(m/w/d)" },
  ],
  "every language's title, but a source's that asks to be left as written, and never down to nothing",
);

done();
