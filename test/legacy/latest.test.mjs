// The legacy's latestPicks block of test/builder.test.mjs (JustJans/indudex@b0cd182), its imports
// pointed at this repo.
import { harness } from "./harness.mjs";
import { latestPicks } from "../../src/features/title-translation/latest.ts";
import { readsAs } from "../../src/features/title-translation/language-of.ts";

const { ok, eq } = harness("latest");
void ok;

// The first page's own offers (builder/latest.mjs): each page's ten, written in its language in a country that
// speaks it, fit to show, the most tags first, as real cards under all the rest.
{
  const offer = (id, cc, more = {}) => ({
    id,
    t: "Ingeniero de procesos",
    te: "Process engineer",
    lang: "es",
    c: `Firma ${id.toUpperCase()}`,
    ci: "Toledo",
    cc,
    n: `${cc.toUpperCase()}42`,
    u: `https://x.test/${id}`,
    s: "lever",
    d: "2026-11-04",
    ...more,
  });
  // The title's language, as builder/translate.mjs's languageOf tells it.
  const languageOf = (r) => r.lang;
  const pile = [
    offer("a", "es", { w: "o" }),
    offer("b", "es", { p: [30000, 35000, "EUR", "y"], w: "r", ct: "i" }),
    offer("b2", "es", { c: "Firma B" }),
    offer("c", "es", {
      t: "Tècnic de manteniment",
      lang: "ca",
      d: "2026-11-03",
    }),
    offer("d", "es", {
      t: "Técnico de mantenimiento",
      tc: "Tècnic de manteniment",
      n: "ES511",
      d: "2026-11-02",
    }),
    offer("e", "de", {
      t: "Prozessingenieur",
      lang: "de",
      p: [50000, 60000, "EUR", "y"],
      w: "h",
      ct: "i",
      wt: "c",
      y: 3,
    }),
    // Each of these stays out: an intermediary's, one whose source keeps its titles as written, one with no web
    // address, a town that is several, one located in another country, an employer named by its board's address or by
    // its town, and a title in lower case, ending in a stop, with its pay, naming its town, or in English (its
    // employer's name aside, and on the Catalan page translated from English).
    offer("x1", "es", { s: "jooble" }),
    offer("x2", "es", { nt: "es" }),
    offer("x3", "es", { u: "javascript:alert(1)" }),
    offer("x4", "es", { ci: "Madrid / Sevilla" }),
    offer("x5", "es", { n: "AD001" }),
    offer("x6", "es", { c: "Solrecogmbh" }),
    offer("x7", "es", { c: "Empleo en Toledo" }),
    offer("x8", "es", { t: "ingeniero de procesos" }),
    offer("x9", "es", { t: "Ingeniero de procesos. Urgente." }),
    offer("x10", "es", { t: "Ingeniero de procesos (40.000 €)" }),
    offer("x11", "es", { t: "Ingeniero de procesos en Toledo" }),
    offer("x12", "es", { t: "Process Engineer" }),
    offer("x13", "es", {
      t: "Confidential Computing & Virtualization Senior Engineer",
    }),
    offer("x14", "es", {
      t: "Emulation-Prototyping Senior Engineer",
      tc: "Enginyer de protecció d'emulació sènior",
      n: "ES511",
    }),
    offer("x15", "de", {
      t: "IT Workplace Specialist – Firma X15",
      lang: "de",
    }),
    offer("x16", "de", {
      t: "Digital Content Creator (AI & Social Media) - all genders welcome",
      lang: "de",
      te: "Digital Content Creator (AI & Social Media) – welcome",
    }),
    offer("x17", "de", {
      t: "Elektroniker (m/w/d)",
      lang: "de",
      te: undefined,
    }),
  ];
  const picks = latestPicks(pile, { isVia: (s) => s === "jooble", languageOf });
  eq(
    picks.es.map((o) => o.id),
    ["b", "a", "d"],
    "the Spanish page: Spain's offers written in Spanish, the most tags first and then the newest, one per employer, none unfit to show",
  );
  eq(
    picks.ca.map((o) => [o.id, o.tc]),
    [
      ["d", "Tècnic de manteniment"],
      ["c", "Tècnic de manteniment"],
    ],
    "the Catalan page: Catalonia's first, Spain's Spanish titles in their Catalan translation and one written in Catalan as written",
  );
  eq(
    [picks.de.map((o) => o.id), picks.en.length],
    [["e"], 0],
    "each page only from the countries that speak its language",
  );
  const many = latestPicks(
    Array.from({ length: 12 }, (_, i) =>
      offer(`n${String.fromCharCode(97 + i)}`, "es"),
    ),
    { languageOf },
  );
  eq(many.es.length, 10, "ten cards at most");
  // A title shown as written reads as its page's language, borrowed English words and all (builder/mt/language-of.ts).
  eq(
    [
      ["Administrador SAP Basis", "es"],
      ["Werktuigbouwkundig Engineer", "nl"],
      ["Projektleiter TGA", "de"],
      ["Symfony Developer", "fr"],
      ["Symfony Developer", "de"],
      ["SAP Integration Consultant", "de"],
      ["Liferay Developer", "de"],
      ["Concern Information Security Officer", "nl"],
    ].map(([t, lang]) => readsAs(t, lang)),
    [true, true, true, false, false, false, false, false],
    "a Spanish, Dutch or German title with an English word or an acronym in it reads as written; one in English, a framework or a product aside, does not",
  );
}
