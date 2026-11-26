// Legacy builder/mt/aina.mjs (JustJans/indudex@b0cd182), word for word but for types, lint and paths.
// Catalan straight from Spanish with Projecte Aina's model (Barcelona Supercomputing Center, Apache-2.0), in place of the
// route through English for a title written in Spanish. Firefox's models only pair with English, and the route loses what
// Spanish and Catalan share («Operario» → "Operator" → «Operador», «Beca» → "Internship" → «Pràctiques», «Bolsa de
// trabajo» → "Work Bag" → «Bossa de treball»). Judged blind on two samples of 200 of Spain's titles written in Spanish
// (9 November 2026), with the checks below: Aina better 89, the route better 29, about the same 123; wrong 0 against 31
// (docs/research/translation-between-languages.md, «Catalan from Spanish on the site»).
// The model runs in a Python worker of its own (aina_worker.py) with CTranslate2, from ~/mt-aina (venv/ and model/, or
// AINA_DIR); without it, every title keeps the usual route.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { vocab } from "./data.js";
import { otherNames } from "./method/places.js";

const DIR = process.env.AINA_DIR || join(homedir(), "mt-aina");
const PYTHON = join(
  DIR,
  "venv",
  process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
);
const MODEL = join(DIR, "model");
// The worker, vendored as the legacy kept it (vendor/aina/aina_worker.py at the repo root).
const WORKER = fileURLToPath(
  new URL("../../../vendor/aina/aina_worker.py", import.meta.url),
);
// Whether this machine has the model: the usual route everywhere else (the laptop, the tests).
export const ainaHere = () =>
  existsSync(PYTHON) && existsSync(join(MODEL, "model.bin"));

// Names Aina copies untouched, to stand in for the company and the product names a title holds (110 of 110 in a test;
// not "Shopify", which it made "Botiga").
const STANDS = [
  "Kafka",
  "Zalando",
  "Siemens",
  "Volkswagen",
  "Nokia",
  "Xerox",
  "Bosch",
  "Lidl",
  "Oracle",
];
// The dashes that part a title. Aina sometimes drops a short last part ("… arquitecto paisajista - NVTL" lost the
// company), so fewer of them in its Catalan than in the Spanish keeps the usual route. Read part by part, short parts
// came back invented ("Villacastin" → "Cala Millor Garden", "Noche" → "Cap de setmana").
const DASHES = /\s[–—-]\s/gu;
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const VOCAB: Record<
  string,
  Readonly<Record<string, number>>
> = Object.fromEntries(["es", "ca", "en"].map((l) => [l, vocab(l)]));
const words = (x: unknown) =>
  String(x)
    .toLowerCase()
    .match(/\p{L}{2,}/gu) || [];
const fold = (s: unknown) =>
  String(s)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/l·l/g, "ll");

// Written in Spanish when Firefox's English changed at least half of the title's words; a title it left as it was is
// English, and Aina would leave it so. A word with a capital that comes out the same counts neither way when it is a
// name or a code ("Fresador CNC Heidenhain" is Spanish), and as English when English titles write it a hundred times or
// more ("Software Developer Java - Remoto" is English: Aina made it «Programari Developer Java», 9 November 2026).
export function writtenInSpanish(title: string, english: string) {
  const seen = new Set(words(english));
  const counted = (String(title).match(/\p{L}{2,}/gu) || []).filter(
    (x) =>
      !(
        /^\p{Lu}/u.test(x) &&
        seen.has(x.toLowerCase()) &&
        (VOCAB.en[x.toLowerCase()] || 0) < 100
      ),
  );
  return (
    counted.length > 0 &&
    counted.filter((x) => !seen.has(x.toLowerCase())).length / counted.length >=
      0.5
  );
}

// A text's letter trigrams, accents and case folded, with how often each comes.
const grams = (s: string) => {
  const t = ` ${fold(s)
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()} `,
    g = new Map<string, number>();
  for (let i = 0; i < t.length - 2; i++) {
    const k = t.slice(i, i + 3);
    g.set(k, (g.get(k) || 0) + 1);
  }
  return g;
};

// How much a Catalan text looks like the Spanish it came from: the letter trigrams they share (Dice, accents and case
// folded). Spanish and Catalan are close, so Aina's Catalan, read straight from the Spanish, looks like it at least about
// as much as the route's through English; one that looks like it far less was made up («Profesionales Java» came back
// «Formació Java»: 0.26 against the route's 0.78, while no other of 135 titles fell more than 0.06 below it).
export function likeness(a: string, b: string) {
  const x = grams(a),
    y = grams(b);
  let both = 0,
    n = 0;
  for (const [k, v] of x) {
    both += Math.min(v, y.get(k) || 0);
    n += v;
  }
  for (const v of y.values()) n += v;
  return n ? (2 * both) / n : 0;
}
const UNLIKE = 0.2;
const SHORT = 0.7;
const tokens = (s: string) => (String(s).match(/[\p{L}\p{N}]+/gu) || []).length;

// The places of Spain and Andorra by their names (GeoNames, catalogues/codes/places.json), each with all its names, for
// a town Aina puts in that the title does not name («… a domicilio Valladolid.» came back «… a domicili Lleida.»). A name
// Catalan titles also use as a word («posada», «naval», «grau»: 30 times or more) counts only for a town of 50,000 people.
// A row of the places' catalogue: id, name, country, …, people, its other names, its local names.
type PlaceRow = [
  unknown,
  string,
  string,
  unknown,
  unknown,
  unknown,
  number,
  string[]?,
  string[]?,
];
let PLACES: Map<string, Set<string>> | null = null;
const places = (): Map<string, Set<string>> => {
  if (PLACES) return PLACES;
  const found = new Map<string, Set<string>>();
  PLACES = found;
  const list = (
    JSON.parse(
      readFileSync(
        new URL("../../../catalogues/codes/places.json", import.meta.url),
        "utf8",
      ),
    ) as { places: PlaceRow[] }
  ).places;
  for (const [, name, cc, , , , people, alt = [], local = []] of list) {
    if (cc !== "es" && cc !== "ad") continue;
    const all = [name, ...alt, ...local]
      .filter((n) => /^\p{Lu}/u.test(n))
      .map(fold)
      .filter((n) => n.length >= 3);
    for (const n of all) {
      if ((VOCAB["ca"]?.[n] || 0) >= 30 && (people || 0) < 50_000) continue;
      found.set(n, new Set([...(found.get(n) || []), ...all]));
    }
  }
  return PLACES;
};
// Whether the Catalan names a place of Spain the Spanish does not, under none of its names.
export function newPlace(spanish: string, out: string) {
  const src = ` ${fold(spanish).replace(/[^\p{L}\p{N}]+/gu, " ")} `;
  const has = (n: string) => src.includes(` ${n} `);
  const caps =
    String(out).match(
      /\p{Lu}[\p{L}'’·-]*(?:\s+(?:(?:de|del|la|el|les|i|d'|l')\s+)?\p{Lu}[\p{L}'’·-]*){0,3}/gu,
    ) || [];
  for (const run of caps) {
    const parts = run.split(/\s+/);
    for (let a = 0; a < parts.length; a++)
      for (let b = a + 1; b <= parts.length; b++) {
        const name = fold(
          parts
            .slice(a, b)
            .join(" ")
            .replace(/[^\p{L}\s'’·-]+$/u, ""),
        );
        const names = places().get(name);
        if (names && !has(name) && ![...names].some(has)) return true;
      }
  }
  return false;
}

// The company and the product names found in the text, each behind a stand-in the text does not hold, the longest first
// ("Microsoft Dynamics" before "Dynamics"); null when there are more than stand-ins.
export function hide(
  text: string,
  keep: readonly string[],
): { text: string; back: [string, string][] } | null {
  const free = STANDS.filter((s) => !text.includes(s)),
    back: [string, string][] = [];
  let t = text;
  for (const k of [...new Set(keep.filter(Boolean))].toSorted(
    (a, b) => b.length - a.length,
  )) {
    const re = new RegExp(`(?<![\\p{L}\\d])${escape(k)}(?![\\p{L}\\d])`, "gu");
    if (!re.test(t)) continue;
    if (!free.length) return null;
    const stand = free.shift() ?? "";
    t = t.replace(re, stand);
    back.push([stand, k]);
  }
  return { text: t, back };
}

// A word Spanish and Catalan titles write about as often.
const even = (w: string) => {
  const r =
    ((VOCAB["ca"]?.[w.toLowerCase()] || 0) + 1) /
    ((VOCAB["es"]?.[w.toLowerCase()] || 0) + 1);
  return r >= 0.5 && r <= 2;
};

// The capitalised words of the title that the site's Spanish and Catalan titles write about as often (within twice:
// names, towns, "SAP", "Java"; not "Software" or "Senior", which Catalan writes «programari» and «sènior»): names and
// towns the lists lack ("AGO TECHNICS" came back «Tècnica», "Weelde" «Resca»). Aina must keep them too.
export function keptWords(title: string) {
  return [
    ...new Set(
      String(title).match(/(?<![\p{L}\d])\p{Lu}[\p{L}\d'’]{2,}/gu) || [],
    ),
  ].filter(even);
}

// Each stand-in back in its place; null when Aina lost one or wrote "⁇" (a character its vocabulary lacks).
export function show(
  out: string | undefined,
  back: readonly [string, string][],
) {
  if (!out || !String(out).trim() || out.includes("⁇")) return null;
  let t = out;
  for (const [stand, k] of back) {
    if (!t.includes(stand)) return null;
    t = t.split(stand).join(k);
  }
  return t;
}

// Catalan for many Spanish titles at once ({ text, keep, towns, words, route } each); null where it did not come back
// whole: a name, a town or a kept word lost, "⁇", a part dropped, the title given back as it was (no Spanish read in it),
// a place the title does not name, far less like the Spanish than the route's Catalan (`route`), or a "|" in the title
// (Aina's vocabulary lacks it). Towns are not hidden: behind a stand-in "Soldador o Mecánico - Madrid" came back «Mecànic
// o soldat»; Aina keeps them as written.
// A title for Aina: the Spanish, the names to keep, the towns it names, the words it must keep, and the Catalan the
// route through English gave.
export interface AinaJob {
  readonly i?: number;
  readonly text: string;
  readonly keep?: readonly string[];
  readonly towns?: readonly string[];
  readonly words?: readonly string[];
  readonly route?: string;
}
export type AinaTranslator = (texts: string[]) => string[];

// A part the Catalan lost: a dash of the Spanish, or one of two things joined («Electricista y Mecánico» came back
// «electricista» alone).
const count = (t: string, re: RegExp): number => (t.match(re) || []).length;
const lostParts = (text: string, out: string): boolean =>
  count(out, DASHES) < count(text, DASHES) ||
  count(out, /\s[io]\s/gu) < count(text, /\s[yoe]\s/gu);

export function catalan(
  titles: readonly AinaJob[],
  translate: AinaTranslator = aina,
): (string | null)[] {
  const jobs = titles.map(({ text, keep = [] }) =>
    text.includes("|") ? null : hide(text, keep),
  );
  const outs = translate(jobs.flatMap((j) => (j ? [j.text] : [])));
  let k = 0;
  return jobs.map((j, i) => {
    if (!j) return null;
    const {
      text,
      towns = [],
      words: kept = [],
      route = "",
    } = titles[i] ?? { text: "" };
    const out = show(outs[k++], j.back);
    if (out === null) return null;
    if (
      out.toLowerCase().replace(/\W+/g, "") ===
      text.toLowerCase().replace(/\W+/g, "")
    )
      return null;
    // A town or a word kept counts under any of its names (the legacy's ec79858).
    const holds = (w: string): boolean =>
      [w, ...otherNames(w)].some((n) =>
        out.toLowerCase().includes(n.toLowerCase()),
      );
    if (!towns.filter((t) => text.includes(t)).every(holds)) return null;
    if (!kept.every(holds)) return null;
    if (lostParts(text, out)) return null;
    if (route && likeness(text, route) - likeness(text, out) > UNLIKE)
      return null;
    // Under seven words in ten of the Spanish's, and fewer than the route's, is a title cut short («Técnico de
    // Ascensores OTIS Coruña» came back «Ascensores OTIS Coruña»: the only two of 254 under 0.7, 9 November 2026).
    if (
      route &&
      tokens(out) < SHORT * tokens(text) &&
      tokens(out) < tokens(route)
    )
      return null;
    return newPlace(text, out) ? null : out;
  });
}

// Aina over many texts at once, through its worker: one JSON text a line in, one out, in order. A worker that has not
// ended in fifteen minutes is stopped (400 titles take about two), so it never holds the translator's run as the hung
// title of 7 November 2026 did.
export function aina(texts: string[]): string[] {
  if (!texts.length) return [];
  const run = spawnSync(PYTHON, ["-I", WORKER, MODEL, "1"], {
    input: texts.map((t) => JSON.stringify(t)).join("\n") + "\n",
    encoding: "utf8",
    maxBuffer: 1 << 28,
    timeout: 15 * 60_000,
    killSignal: "SIGKILL",
  });
  if (run.status !== 0)
    throw new Error(
      `Aina's worker failed: ${String(run.stderr || run.error || "").slice(0, 300)}`,
    );
  const out = run.stdout
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as string);
  if (out.length !== texts.length)
    throw new Error(`Aina gave ${out.length} texts for ${texts.length}`);
  return out;
}
