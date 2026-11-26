// The legacy's test/mt-trades.test.mjs (JustJans/indudex@ec79858), carried whole (legacy resync T009): its imports pointed at
// this repo.
// The trades table (builder/mt/trades.ts): which names a title in each language is read under, and what is written.
import { test } from "vitest";
import assert from "node:assert/strict";
import {
  tradesFor,
  blockersFor,
  TRADES,
} from "../../src/features/title-translation/method/trades.ts";
import {
  hasTrade,
  tradeWritten as written,
} from "../../src/features/title-translation/method/method.ts";

test("the German trades the mining by offers found wrong", () => {
  assert.equal(
    written("de-en", "Elektroniker für Betriebstechnik"),
    "industrial electronics technician",
  );
  assert.equal(written("de-en", "Elektrotechniker"), "electrical technician");
  assert.equal(written("de-en", "CNC-Dreher"), "CNC turner");
  assert.equal(written("de-en", "Spengler"), "construction sheet metal worker");
  assert.equal(
    written("de-en", "Betriebstechniker"),
    "industrial maintenance technician",
  );
  assert.equal(
    written("de-en", "Karosserie- und Fahrzeugbaumechaniker"),
    "vehicle body builder",
  );
});

test("the English of the first leg read into each language", () => {
  assert.equal(written("en-ca", "CNC turner"), "torner CNC");
  assert.equal(
    written("en-nl", "Building services technician"),
    "facilitair technicus",
  );
  assert.equal(written("en-nl", "Shift supervisor"), "ploegleider");
  assert.equal(
    written("en-de", "Maintenance worker"),
    "Instandhaltungsmitarbeiter",
  );
  assert.equal(written("en-ca", "Project leader"), "cap de projecte");
  assert.equal(written("en-fr", "Work planner"), "préparateur de travaux");
});

test("French and Dutch names read", () => {
  assert.equal(written("fr-en", "Agent de maintenance"), "maintenance worker");
  assert.equal(written("nl-en", "Service Monteur"), "service technician");
});

// ➤ The table's shape (TB1-04): no name with stray spaces, none empty, none of under three letters, and no name a title is
// ➤ read under that two entries give two trades for, but those of 15 November 2026, where the first entry wins.
const READ_TWICE = new Set([
  "fr:serrurier-métallier",
  "fr:serrurier métallier",
  "cs:soustružník",
  "de:cnc-abkanter",
  "fr:dépanneur",
  "fr:dépanneuse",
  "de:bauzeichner",
  "nl:halfautomaatlasser",
  "nl:keurmeester",
  "fr:préparateur automobile",
  "cs:frézař",
  "cs:frézař/ka",
  "nl:frezer",
  "es:fresador",
  "fr:fraiseur",
  "en:mobile plant fitter",
  "en:mobile plant fitters",
  "en:mobile plant mechanic",
  "en:mobile plant mechanics",
  "de:rollladen- und sonnenschutzmechatroniker",
]);
test("the table has no stray spaces, empty names or a name read as two trades", () => {
  const faults = [],
    readAs = new Map();
  for (const e of TRADES) {
    for (const [lang, name] of Object.entries(e))
      if (
        lang !== "also" &&
        lang !== "blocks" &&
        (typeof name !== "string" ||
          !name.trim() ||
          name !== name.trim() ||
          /\s\s/.test(name))
      )
        faults.push(`${e.en} ${lang}`);
    for (const [lang, names] of Object.entries(e.also || {}))
      for (const n of names) {
        const key = `${lang}:${n.toLowerCase()}`;
        if (n !== n.trim() || /\s\s/.test(n) || n.replace(/^\^/, "").length < 3)
          faults.push(key);
        if (readAs.has(key) && readAs.get(key) !== e.en && !READ_TWICE.has(key))
          faults.push(`${key}: ${readAs.get(key)} or ${e.en}`);
        if (!readAs.has(key)) readAs.set(key, e.en);
      }
  }
  assert.deepEqual(faults, []);
});

test("every entry has an English name and only known languages", () => {
  const known = new Set([
    "en",
    "es",
    "ca",
    "fr",
    "nl",
    "de",
    "pl",
    "it",
    "uk",
    "also",
    "blocks",
  ]);
  for (const e of TRADES) {
    assert.ok(e.en, JSON.stringify(e));
    for (const k of Object.keys(e)) assert.ok(known.has(k), `${e.en}: ${k}`);
  }
});

test("an entry with blocks: false leaves the trades it holds to the languages it does not name", () => {
  assert.ok(
    !blockersFor("en-ca").some((re) =>
      new RegExp(re, "i").test("embedded software engineer"),
    ),
  );
  assert.ok(
    tradesFor("en-pl").some(
      ([re, name]) =>
        name === "inżynier oprogramowania wbudowanego" &&
        new RegExp(re, "i").test("Embedded Software Engineer"),
    ),
  );
});

test("German feminine forms are read as their trade", () => {
  assert.equal(written("de-en", "Monteurin Freileitungen"), "fitter");
  assert.equal(written("de-en", "Bauleiterin Hochbau"), "site manager");
  assert.equal(written("de-en", "Berlin"), null);
  // ➤ On the word that names the person, as the masculine reads (TB1-11); none for a plural or an adjective.
  assert.deepEqual(
    [
      "Elektrikerin Betriebstechnik",
      "Anlagenmechanikerin SHK",
      "Inbetriebnehmerin",
    ].map((t) => written("de-en", t)),
    [
      "Elektriker Betriebstechnik",
      "Anlagenmechaniker SHK",
      "Inbetriebnehmer",
    ].map((t) => written("de-en", t)),
  );
  assert.ok(
    !tradesFor("de-en").some(([re]) =>
      /servicemonteurein|leitenderin|kältetechnikin/.test(re),
    ),
  );
  assert.equal(written("fr-en", "Chef de chantier gros œuvre"), "site foreman");
  assert.equal(written("en-nl", "Site foreman"), "voorman");
});

test("the carpenters of the third exam", () => {
  assert.equal(written("de-en", "Zimmerermeister"), "master carpenter");
  assert.equal(written("de-en", "Zimmerergeselle"), "journeyman carpenter");
  assert.equal(written("es-en", "Troquelista"), "die setter");
});

test('a name opening with "de" counts only with it', () => {
  assert.equal(
    hasTrade("Agente de ciberseguridad (habla alemana)", "de habla alemana"),
    false,
  );
  assert.equal(hasTrade("Agente (de habla alemana)", "de habla alemana"), true);
  assert.equal(hasTrade("Jefe de obra", "jefe de obra"), true);
});

test("a trade's word said twice is looked for beside the others (s135)", () => {
  assert.equal(
    hasTrade(
      "Electricista / Técnico electrónico / Técnico de mecatrónica",
      "técnico de mecatrónica",
    ),
    true,
  );
  assert.equal(
    hasTrade("Jefe de obra / Jefe de proyecto", "jefe de proyecto"),
    true,
  );
  assert.equal(
    hasTrade(
      "Mécanicien poids lourds, transport routier de marchandises et maintenance",
      "mécanicien de maintenance",
    ),
    false,
  );
});

test("the trades of the odd-words list of 8 November 2026", () => {
  assert.equal(written("it-en", "Addetto alla saldatura a filo"), "operator");
  assert.notEqual(
    written("it-en", "Impiegato addetto ai lavori di segreteria"),
    "operator",
  );
  assert.equal(written("it-en", "Sistemista IT"), "system administrator");
  assert.equal(written("it-en", "Meccanico mezzi pesanti"), "truck mechanic");
  assert.equal(
    written("it-en", "Cablatore di quadri elettrici"),
    "panel wirer",
  );
  assert.equal(
    written("da-en", "Smed til konstruktion og montage"),
    "metalworker",
  );
  assert.equal(written("da-en", "Dygtige smede søges"), "metalworkers");
  assert.equal(
    written("de-en", "Carrosseriespengler EFZ"),
    "car body repairer",
  );
  assert.equal(written("en-es", "Car body repairer"), "chapista");
  assert.equal(
    written("fr-en", "Métreur-deviseur en électricité"),
    "quantity surveyor and estimator",
  );
  assert.equal(written("fr-en", "Électricien tous corps d’état"), "all trades");
  assert.equal(written("fr-en", "Mécanicien-outilleur"), "toolmaker");
  assert.equal(
    written("es-en", "Ingeniero calculista"),
    "calculation engineer",
  );
  assert.equal(written("cs-en", "Kreslič"), "draughtsman");
});

test("Spanish and Catalan shifts, refrigeration technicians, public posts and job pools read (8 November 2026)", () => {
  assert.equal(written("es-en", "Oficial Turno Mañana"), "early shift");
  assert.equal(written("es-en", "Técnico (turno tarde)"), "late shift");
  assert.equal(written("ca-en", "Operari torn de nit"), "night shift");
  assert.equal(
    written("es-en", "Frigoristas (Orihuela)"),
    "refrigeration technician",
  );
  assert.equal(
    written("ca-en", "Tècnic frigorista"),
    "refrigeration technician",
  );
  assert.equal(
    written("es-en", "Técnico - CONCURSO – OPOSICIÓN"),
    "competitive examination",
  );
  assert.equal(written("es-en", "Arquitecto, Turno libre"), "open competition");
  assert.equal(written("es-en", "Ingeniero (Bolsa de Trabajo)"), "job pool");
  assert.equal(written("en-ca", "Job pool"), "borsa de treball");
  assert.equal(
    written("en-ca", "Architect - competitive examination"),
    "concurs oposició",
  );
});

test("the glossary review of 16 November 2026", () => {
  // ➤ Words that also name something else are not read as the trade.
  assert.equal(
    written("es-en", "Administrativo encargado de facturación"),
    null,
  );
  assert.equal(written("es-en", "Encargado de almacén"), "supervisor");
  assert.equal(written("en-es", "Sponsorship Manager"), null);
  assert.equal(
    written("en-es", "Engineer (visa sponsorship)"),
    "patrocinio de visado",
  );
  assert.equal(written("fr-en", "Préparateur de véhicules"), null);
  assert.equal(written("fr-en", "Ingénieur logiciel calculateur"), null);
  assert.equal(written("de-en", "Maschinen- und Anlagenführer"), null);
  assert.equal(written("de-en", "Projektleiter HKL"), "HVAC");
  // ➤ Names a job seeker would not recognise, or of another trade.
  assert.equal(written("de-en", "Maurermeister"), "master mason");
  assert.equal(written("en-fr", "Solderer"), "soudeur à l'étain");
  assert.equal(written("en-es", "Software tester"), "tester de software");
  assert.equal(written("en-nl", "Cylindrical grinder"), "rondslijper");
  assert.equal(written("de-es", "Rundschleifer"), "rectificador cilíndrico");
});
