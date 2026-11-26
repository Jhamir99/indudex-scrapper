// The legacy's test/mt-languages-review.test.mjs (JustJans/indudex@ec79858), carried whole (legacy resync T009): its imports pointed at
// this repo.
// Translation faults found title by title in the smaller source languages and in English, Spanish and Catalan output
// (November 2026): each case the fix was made for.
import { test } from "vitest";
import assert from "node:assert/strict";
import {
  after,
  before,
} from "../../src/features/title-translation/method/method.ts";
import { catalan } from "../../src/features/title-translation/aina.ts";
import { withMarks } from "../../src/features/title-translation/method/marks.ts";
import { correct } from "../../src/features/title-translation/method/corrections.ts";
import {
  apostrophes,
  besideTowns,
  catalanSpelling,
} from "../../src/features/title-translation/method/catalan-spelling.ts";
import {
  otherNames,
  placesIn,
  townsBack,
} from "../../src/features/title-translation/method/places.ts";
import { companyCore } from "../../src/features/title-translation/method/companies.ts";
import { hasTrade } from "../../src/features/title-translation/method/checks.ts";
import { polish } from "../../src/features/title-translation/method/after.ts";
import { jobDashEn } from "../../src/features/title-translation/method/english-tidy.ts";
import { contractsNamed } from "../../src/features/title-translation/method/contracts.ts";

test("smaller source languages: marks, levels, «wanted» words", () => {
  for (const [pair, title, whole] of [
    ["pt-en", "Serralheiro/a", "Metalworker"],
    ["pt-en", "Precisa-se Serralheiro", "Metalworker"],
    ["sk-en", "Zvárač/ka", "Welder"],
    ["da-en", "Smed søges", "Metalworker"],
    ["hu-en", "Hegesztőt keresünk", "Welder"],
  ])
    assert.equal(before(pair, title).info.whole, whole, title);
  const r = before("hr-en", "Zavarivač (M/Ž)");
  assert.equal(
    after("hr-en", "Zavarivač (M/Ž)", r.info.whole, r.info),
    "Welder",
  );
  assert.equal(
    before("pl-en", "Starszy technik utrzymania ruchu").info.level,
    "Senior",
  );
  assert.equal(
    before("pt-en", "Técnico de Manutenção Sénior").info.level,
    "Senior",
  );
  assert.equal(before("pt-en", "Serralheiro de 1ª").info.level, "First-class");
  assert.equal(before("sv-en", "Erfaren svetsare").info.level, "Experienced");
});

test("smaller source languages: one reading per trade, grades, hiring words, VVS and UDT", () => {
  for (const [pair, title, whole] of [
    ["cs-en", "Frézař", "Miller"],
    ["cs-en", "Soustružník", "Turner"],
    ["cs-en", "Elektromechanik/čka", "Electromechanic"],
    ["pl-en", "OPERATOR WÓZKA WIDŁOWEGO UDT", "Forklift operator UDT"],
    ["pt-en", "Serralheiros Mecânicos", "Metalworker"],
    ["pt-en", "Procuramos Serralheiro", "Metalworker"],
    ["pt-en", "Serralheiro - Precisa-se", "Metalworker"],
    ["da-en", "VVS-montør", "Plumbing and heating installer"],
  ])
    assert.equal(before(pair, title).info.whole, whole, title);
  for (const [title, level] of [
    ["Serralheiro 1ª", "First-class"],
    ["Serralheiro de 1ª classe", "First-class"],
    ["Serralheiro de primeira", "First-class"],
    ["Serralheiro de 1ª ou 2ª", "Qualified"],
  ]) {
    const r = before("pt-en", title);
    assert.deepEqual(
      [r.info.whole, r.info.level],
      ["Metalworker", level],
      title,
    );
  }
  assert.equal(before("pt-en", "Técnico 2 turnos").info.level, "");
  assert.equal(before("da-en", "Vi søger elektriker").text, "Elektriker");
  assert.equal(before("pl-en", "Zatrudnię spawacza").text, "Spawacza");
  const fi = before("fi-en", "Sähköasentaja (m/n)");
  assert.equal(
    after("fi-en", "Sähköasentaja (m/n)", "Electrician (m/n)", fi.info),
    "Electrician",
  );
});

test("English target: levels in order and small, TIG welder, hyphenated trades, written names not rewritten", () => {
  const en = (pair, title, raw) => {
    const r = before(pair, title);
    return after(pair, title, r.info.whole || raw || r.text, r.info);
  };
  assert.equal(en("fr-en", "Électricien tertiaire"), "Commercial electrician");
  assert.equal(en("es-en", "Tornero-fresador"), "Turner-miller");
  assert.equal(en("ca-en", "Electricista-lampista"), "Electrician-plumber");
  assert.equal(
    before("fr-en", "Technicien dépanneur H/F").text,
    "Technicien (réparations)",
  );
  assert.equal(
    before("fr-en", "Technicien dépanneur (H/F) - Lyon").text,
    "Technicien (réparations) - Lyon",
  );
  assert.equal(
    en("es-en", "Oficial de primera fontanero"),
    "First-class plumber",
  );
  assert.equal(
    en("fr-en", "Frigoriste confirmé"),
    "Experienced refrigeration technician",
  );
  assert.equal(
    en("es-en", "Electricista oficial 1ª itinerante"),
    "First-class itinerant electrician",
  );
  assert.equal(
    en("fr-en", "Ingénieur Senior Confirmé", "Engineer"),
    "Senior engineer",
  );
  assert.equal(
    en("es-en", "Programador Java Senior", "Java Programmer"),
    "Senior Java Programmer",
  );
  assert.equal(en("es-en", "Soldador mig/mag"), "MIG/MAG welder");
  assert.equal(
    en("es-en", "Soldador TIG oficial 1ª"),
    "First-class TIG welder",
  );
});

test("English target: levels after the job in English, German and abbreviated Spanish grades", () => {
  const en = (pair, title, raw) => {
    const r = before(pair, title);
    return after(pair, title, r.info.whole || raw || r.text, r.info);
  };
  assert.equal(
    en("es-en", "Process Engineer Senior"),
    "Senior Process Engineer",
  );
  assert.equal(
    en("de-en", "Data Engineer (m/w/d) Senior"),
    "Senior Data Engineer",
  );
  assert.equal(
    en("de-en", "Elektriker Senior (m/w/d)", "Electrician"),
    "Senior electrician",
  );
  assert.equal(
    en("de-en", "Elektriker Lehre", "Electrician"),
    "Apprentice electrician",
  );
  assert.equal(en("es-en", "Electricista OF. 1ª"), "First-class electrician");
  assert.equal(en("es-en", "Ofic. 1ª Electricista"), "First-class electrician");
  assert.equal(
    en("es-en", "Electricista oficial de primera categoría", "Electrician"),
    "First-class electrician",
  );
  assert.equal(
    en(
      "es-en",
      "Ingeniero de procesos | Automoción | Senior",
      "Process engineer | Automotive",
    ),
    "Senior process engineer | Automotive",
  );
});

test("English into Spanish and Catalan: levels, shifts, contract words, sentence case", () => {
  const tr = (pair, title, raw) => {
    const r = before(pair, title);
    return after(pair, title, r.info.whole || raw || r.text, r.info);
  };
  assert.equal(
    tr("en-es", "Senior Commissioning Engineer"),
    "Ingeniero de puesta en marcha sénior",
  );
  assert.equal(
    tr("en-es", "Multi-Skilled Maintenance Engineer x3"),
    "Técnico de mantenimiento polivalente x3",
  );
  assert.equal(
    tr(
      "en-es",
      "Mechanical Engineer - HVAC",
      "Ingeniero Mecánico - Climatización",
    ),
    "Ingeniero mecánico - Climatización",
  );
  assert.equal(
    tr("en-ca", "Engineering Manager", "Gerent d'Enginyeria"),
    "Responsable d'enginyeria",
  );
  assert.equal(
    tr("en-es", "Maintenance Engineer - Earlies/Lates"),
    "Técnico de mantenimiento (turno de mañana/turno de tarde)",
  );
  assert.equal(
    tr("en-es", "Maintenance Electrician - Back shift"),
    "Electricista de mantenimiento (turno de tarde)",
  );
  assert.equal(
    before("en-es", "Electrician - Temp to Perm").text,
    "Electrician - temporary to permanent",
  );
  assert.equal(
    before("en-es", "Electrician - Mobile").text,
    "Electrician (itinerant)",
  );
  assert.equal(tr("en-es", "Trainee Site Manager"), "Aprendiz de jefe de obra");
  assert.equal(before("en-es", "Snr Electrical Engineer").info.said, "Senior");
  assert.equal(
    tr("en-es", "Electrical Panel Builder"),
    "Montador de cuadros eléctricos",
  );
  assert.equal(tr("en-ca", "Assembly Operative"), "Operari de muntatge");
});

test("Spanish and Catalan: grades before a field, Aina keeps a town under its Catalan name", () => {
  for (const [pair, title, whole] of [
    ["ca-en", "Oficial 1a Lampisteria", "Plumber"],
    ["ca-en", "Oficial 1a de manteniment", "Maintenance worker"],
    ["es-en", "Oficial de 1ª en mantenimiento", "Maintenance worker"],
    ["es-en", "Mecánico ajustador", "Mechanical fitter"],
  ])
    assert.equal(before(pair, title).info.whole, whole, title);
  assert.equal(
    before("es-en", "Oficial 1ª Carpintería metálica").text,
    "Carpintero metálico",
  );
  const [out] = catalan(
    [{ text: "Electricista en Lérida", towns: ["Lérida"], words: ["Lérida"] }],
    () => ["Electricista a Lleida"],
  );
  assert.equal(out, "Electricista a Lleida");
});

test("British pay the target way, a person mark on a second trade after «and»", () => {
  const tr = (pair, title, raw) => {
    const r = before(pair, title);
    return after(pair, title, r.info.whole || raw || r.text, r.info);
  };
  assert.equal(
    tr("en-es", "Maintenance Engineer (Nights) - £45,000"),
    "Técnico de mantenimiento (turno de noche) - 45.000 £",
  );
  assert.equal(
    tr("en-fr", "Electrician - £18.50/hr", "Électricien - £18.50/hr"),
    "Électricien - 18,50 £/hr",
  );
  assert.equal(
    withMarks("Tècnic de laboratori i operari de planta", "ca"),
    "Tècnic/a de laboratori i operari/ària de planta",
  );
  assert.equal(
    withMarks("Técnico de calidad y medio ambiente", "es"),
    "Técnico/a de calidad y medio ambiente",
  );
});

test("the same trade from every source: one name in Spanish and Catalan", () => {
  for (const [pair, title, whole] of [
    ["en-es", "Site Supervisor", "Encargado de obra"],
    ["en-ca", "Car Mechanic", "Mecànic d'automoció"],
    ["ca-en", "Mecànic/a d'automoció", "Car mechanic"],
    ["en-es", "Electrical Installer", "Instalador electricista"],
    ["ca-en", "Tècnic/a SAT", "After-sales technician"],
    ["en-es", "After-sales technician", "Técnico de asistencia técnica"],
    ["es-en", "Andamista", "Scaffolder"],
    ["en-ca", "Bricklayer's Labourer", "Manobre de paleta"],
  ])
    assert.equal(before(pair, title).info.whole, whole, title);
  assert.equal(before("de-en", "Polier (m/w/d)").text, "Site foreman (m/w/d)");
});

test("corrections fire only where they were meant to", () => {
  for (const [target, title, out, want] of [
    [
      "ca",
      "Senior Lecturer in Higher Education",
      "Professor sènior en Educació Superior",
      "Professor sènior en Educació Superior",
    ],
    [
      "es",
      "Lead-Acid Battery Engineer",
      "Ingeniero de baterías de plomo-ácido",
      "Ingeniero de baterías de plomo-ácido",
    ],
    ["es", "Lead Engineer", "Ingeniero de plomo", "Ingeniero principal"],
    ["es", "KYC CDD Analyst", "Analista KYC CDD", "Analista KYC CDD"],
    [
      "es",
      "Post-Graduate Research Engineer",
      "Ingeniero de investigación de posgrado",
      "Ingeniero de investigación de posgrado",
    ],
    [
      "de",
      "Elektriker Multi-Skilled und Schweißer",
      "Elektriker Multi-Skilled und Schweißer",
      "Elektriker Allround und Schweißer",
    ],
  ])
    assert.equal(correct(title, out, target), want, title);
  assert.equal(contractsNamed("CDD analyst", false), "CDD analyst");
  assert.equal(
    contractsNamed("Pipe fitter CDD", true),
    "Pipe fitter – Fixed-term contract",
  );
  assert.equal(jobDashEn("Painter varnisher"), "Painter varnisher");
});

test("preparation rules leave other senses alone", () => {
  for (const [pair, title, text] of [
    ["es-en", "Auxiliar de archivos", "Auxiliar de archivos"],
    ["es-en", "Traductor Jurado Oficial", "Traductor Jurado Oficial"],
    [
      "ca-en",
      "Tècnic de manteniment Pavelló Polivalent",
      "Maintenance technician Pavelló Polivalent",
    ],
    ["es-en", "Jefe de Obra Coruña/A Laracha", "Site manager Coruña/A Laracha"],
    [
      "pt-en",
      "Técnico de manutenção - segunda a sexta",
      "Técnico de manutenção - segunda a sexta",
    ],
    ["en-es", "Software Engineer - Mobile", "Software Engineer - Mobile"],
    ["en-es", "Hi-Temp Furnace Technician", "Hi-Temp Furnace Technician"],
    [
      "en-es",
      "Static Timing Analysis Engineer",
      "Static Timing Analysis Engineer",
    ],
    [
      "en-es",
      "Nokia SR Linux Network Engineer",
      "Nokia SR Linux Network Engineer",
    ],
    [
      "en-es",
      "Urgent Care Facilities Technician",
      "Urgent Care Facilities Technician",
    ],
    ["en-es", "Engineer - Product Placement", "Engineer - Product Placement"],
    ["nl-en", "ML/CV Engineer", "ML/CV Engineer"],
    ["de-en", "Monteur – Freileitung", "Fitter – Freileitung"],
    [
      "es-en",
      "Ofertas y Licitaciones - Ingeniero",
      "Ofertas y Licitaciones - Ingeniero",
    ],
    ["es-en", "Programador RPG/AS 400", "Programador RPG/AS 400"],
  ])
    assert.equal(before(pair, title).text, text, title);
  assert.equal(before("es-en", "Albañil Oficial").info.level, "Qualified");
  assert.equal(
    before("es-en", "Responsable de mantenimiento Senior Living").info.level,
    "",
  );
  assert.equal(
    before("en-es", "Field Service Engineer - Mobile").text,
    "Técnico de servicio de campo (itinerant)",
  );
});

test("finishing rules leave names, phrases and other senses alone", () => {
  const tr = (pair, title, raw) => {
    const r = before(pair, title);
    const out = after(pair, title, r.info.whole || raw || r.text, r.info);
    return pair.endsWith("-en")
      ? polish(pair, out)
      : pair.endsWith("-ca")
        ? apostrophes(catalanSpelling(out))
        : out;
  };
  for (const [pair, title, raw, want] of [
    [
      "en-ca",
      "Field Service Engineer Catalonia",
      "Enginyer de Servei de Camp Catalunya",
      "Enginyer de servei de camp Catalunya",
    ],
    [
      "en-ca",
      "Research Engineer Hospital Clinic Barcelona",
      "Enginyer d'Investigació Hospital Clínic Barcelona",
      "Enginyer d'investigació Hospital Clínic Barcelona",
    ],
    [
      "en-es",
      "Quality and Supplier Quality Engineer",
      "Ingeniero de calidad y calidad de proveedores",
      "Ingeniero de calidad y calidad de proveedores",
    ],
    [
      "en-ca",
      "Hospitality Systems Engineer",
      "Enginyer de Sistemes de Hospitality",
      "Enginyer de sistemes de Hospitality",
    ],
    [
      "es-en",
      "Analista de Riesgos KYC (CDD)",
      "KYC Risk Analyst (CDD)",
      "KYC Risk Analyst (CDD)",
    ],
    [
      "es-en",
      "Ayudante de Electricista",
      "Electrician Mate",
      "Electrician Mate",
    ],
    [
      "de-en",
      "Glasfaser-Laminierer im Bootsbau",
      "Fiberglass laminator in boat building",
      "Fiberglass laminator in boat building",
    ],
    [
      "en-es",
      "Electronics Engineer – Bora Bora",
      "Ingeniero electrónico – Bora Bora",
      "Ingeniero electrónico – Bora Bora",
    ],
  ])
    assert.equal(tr(pair, title, raw), want, title);
});

test("towns, comarques and companies inside titles", () => {
  const back = (out, towns) =>
    townsBack(out, Object.fromEntries(towns.map((t) => [t, otherNames(t)])));
  // ➤ Two forms of one town, each in its own slot; a town's own article not said twice.
  assert.equal(
    back("Cap d'obra Lleida/Lleida", ["Lleida", "Lérida"]),
    "Cap d'obra Lleida/Lérida",
  );
  assert.equal(
    back("Técnico Lieja/Lieja", ["Liège", "Luik"]),
    "Técnico Liège/Luik",
  );
  assert.equal(
    back("Mecànic a la Corunya", ["La Coruña"]),
    "Mecànic a La Coruña",
  );
  assert.equal(
    back("Treballador al Vendrell", ["El Vendrell"]),
    "Treballador al Vendrell",
  );
  assert.equal(back("Mecánico en Malaga", ["Málaga"]), "Mecánico en Málaga");
  // ➤ «d'» before Elche, not before the article of El Vendrell or Els Pallaresos.
  assert.equal(
    besideTowns("Tècnic de Elche", ["Elche"], apostrophes),
    "Tècnic d'Elche",
  );
  assert.equal(
    besideTowns("Tècnic de El Vendrell", ["El Vendrell"], apostrophes),
    "Tècnic de El Vendrell",
  );
  assert.equal(
    besideTowns("Tècnic de Els Pallaresos", ["Els Pallaresos"], apostrophes),
    "Tècnic de Els Pallaresos",
  );
  // ➤ A district, a quarter or the surroundings after the town; a comarca as a town.
  assert.deepEqual(placesIn("Électricien Paris 15e"), ["Paris"]);
  assert.deepEqual(placesIn("Operario Rubí y alrededores"), ["Rubí"]);
  assert.deepEqual(placesIn("Electricista Vallès Occidental"), [
    "Vallès Occidental",
  ]);
  assert.deepEqual(placesIn("Engineer in The Hague"), ["The Hague"]);
  assert.equal(companyCore("Roca Sanitario S.A."), "Roca");
  // ➤ A company before the trade goes after it in Romance languages; «The» of a town stays a capital.
  const firm = (pair, title, company) =>
    before(pair, title, "", "", "", company).info.whole;
  assert.equal(
    firm("en-es", "Grifols Welder", "Grifols S.A."),
    "Soldador Grifols",
  );
  assert.equal(
    firm("en-fr", "Grifols Welder", "Grifols S.A."),
    "Soudeur Grifols",
  );
  assert.match(before("en-es", "Engineer in The Hague").text, /The Hague/);
});

test("pay, counts and posts inside titles", () => {
  const tr = (pair, title, raw) =>
    after(pair, title, raw, before(pair, title).info);
  for (const [pair, title, raw, want] of [
    [
      "en-es",
      "Electrician £1.5m",
      "Electricista £1.5m",
      "Electricista 1.500.000 £",
    ],
    [
      "en-es",
      "Electrician £35.5k",
      "Electricista £35.5k",
      "Electricista 35.500 £",
    ],
    [
      "en-es",
      "Electrician £35-40k",
      "Electricista £35-40k",
      "Electricista 35.000-40.000 £",
    ],
    [
      "en-nl",
      "Electrician up to £55,000",
      "Elektricien tot £55.000",
      "Elektricien tot 55.000 £",
    ],
    [
      "en-de",
      "Electrician £18.50 per hour",
      "Elektriker £18,50 pro Stunde",
      "Elektriker 18,50 £ pro Stunde",
    ],
    [
      "en-es",
      "Electrician £16.50ph",
      "Electricista £16.50ph",
      "Electricista £16.50ph",
    ],
    ["en-fr", "Electrician £35k", "Électricien £35k", "Électricien 35 000 £"],
  ])
    assert.equal(tr(pair, title, raw), want, title);
  // ➤ Pay or a count before a trade goes to Firefox, which writes the number and the plural its way.
  for (const [pair, title] of [
    ["es-en", "Electricista 2.000 €"],
    ["en-es", "3 Welders"],
  ])
    assert.equal(before(pair, title).info.whole, "", title);
  assert.equal(before("es-en", "Oferta 3 Soldadores").bare, "3 Soldadores");
  assert.equal(before("fr-en", "Offre 2 Soudeurs").bare, "2 Soudeurs");
  assert.equal(
    before("es-en", "5 plazas de Bombero").bare,
    "5 puestos de Bombero",
  );
  assert.equal(before("es-en", "Una plaza de Topógrafo").bare, "Topógrafo");
});

test("gender marks, brackets, separators and capitals", () => {
  const tr = (pair, title, raw) =>
    after(
      pair,
      title,
      before(pair, title).info.whole || raw,
      before(pair, title).info,
    );
  for (const [pair, title, raw, want] of [
    ["es-en", "Soldador (NOCHES)", "Welder (NIGHTS)", "Welder (NIGHTS)"],
    [
      "de-en",
      "Elektriker (Vollzeit, m/w/d)",
      "Electrician (full-time, m/f/d)",
      "Electrician (full-time)",
    ],
    [
      "es-en",
      "Electricista // Barcelona",
      "Electrician // Barcelona",
      "Electrician // Barcelona",
    ],
    [
      "es-en",
      "Electricista 👷‍♂️ Barcelona",
      "Electrician 👷‍♂️ Barcelona",
      "Electrician 👷‍♂️ Barcelona",
    ],
  ])
    assert.equal(tr(pair, title, raw), want, title);
  assert.equal(
    before("es-en", "[URGENTE] Electricista industrial").bare,
    "Electricista industrial",
  );
  assert.equal(
    before("es-en", "INGENIERO(A) DE PROCESOS").bare,
    "Ingeniero de Procesos",
  );
  assert.equal(
    withMarks("Tècnic de manteniment • Encarregat", "ca"),
    "Tècnic/a de manteniment • Encarregat/ada",
  );
});

test("mixed-language titles and joined trades", () => {
  assert.equal(
    before("en-fr", "Welder (Soldador) - Zaragoza").text,
    "Soudeur - Zaragoza",
  );
  assert.equal(
    before("en-fr", "Welder (TIG) - Zaragoza").text,
    "Soudeur (TIG) - Zaragoza",
  );
  // ➤ «mechanics» is the field, not the trade.
  assert.match(
    before("en-es", "Maintenance technician – electricity and mechanics").text,
    /mechanics/,
  );
  assert.ok(hasTrade("Electricistes i lampistes", "lampista"));
  const joined =
    "Técnico de mantenimiento electricista y mecánico en Martorell";
  assert.deepEqual(
    catalan([{ text: joined, keep: [] }], () => [
      "Tècnic de manteniment electricista a Martorell",
    ]),
    [null],
  );
});

test("British and Irish site and kitchen words", () => {
  const whole = (pair, title) => before(pair, title).info.whole;
  for (const [pair, title, want] of [
    ["en-es", "Ganger", "Capataz"],
    ["en-de", "Groundworker", "Tiefbauarbeiter"],
    ["en-es", "Slinger/Signaller", "Estrobador-señalista"],
    ["en-ca", "Kitchen Porter", "Rentaplats"],
    ["en-es", "Panel Beater", "Chapista"],
    ["en-es", "Gas Safe Engineer", "Técnico de gas"],
    ["en-es", "Shuttering Carpenter", "Encofrador"],
    ["en-de", "Banksman", "Einweiser"],
    ["en-ca", "Pipe Fitter Welder", "Canonador-soldador"],
  ])
    assert.equal(whole(pair, title), want, `${pair} ${title}`);
  assert.equal(before("en-es", "Cat C+E Driver").text.includes("Cat"), false);
  const r = before("en-de", "Domestic Gas Engineer");
  assert.equal(
    after("en-de", "Domestic Gas Engineer", r.info.whole, r.info),
    "Gasinstallateur (Wohngebäude)",
  );
});

test("German trade names: state-certified, master and journeyman after the trade, helpers", () => {
  for (const [title, want] of [
    ["Staatlich geprüfter Techniker (m/w/d)", /^State-certified technician/],
    ["Elektroniker Meister (m/w/d)", /^Master electronics technician/],
    [
      "Anlagenmechaniker SHK Geselle",
      /^Journeyman plumbing and heating installer/,
    ],
    [
      "Land- und Baumaschinenmechatroniker",
      /^Agricultural and construction machinery mechatronics technician/,
    ],
    ["Elektrohelfer (m/w/d)", /^Electrical improver/],
    ["Techniker o. Meister", /^Technician oder/],
  ])
    assert.match(before("de-en", title).text, want, title);
  assert.equal(
    jobDashEn("Specialist warehouse clerk"),
    "Specialist warehouse clerk",
  );
});

test("French and Belgian site trades and contracts", () => {
  for (const [title, want] of [
    ["Compagnon maçon", "Journeyman bricklayer"],
    ["Plaquiste", "Dryliner"],
    ["Terrassier", "Groundworker"],
    ["Coffreur bancheur", "Formwork carpenter"],
    ["Étancheur", "Waterproofer"],
    ["Couvreur zingueur", "Roofer and sheet metal worker"],
    ["Chauffeur PL/SPL", "HGV driver"],
  ])
    assert.equal(
      before("fr-en", title).info.whole || before("fr-en", title).text,
      want,
      title,
    );
  assert.equal(
    contractsNamed("N2P2 Electrician - CDI/CDD/Interim", true),
    "N2P2 Electrician - Permanent contract/Fixed-term contract/Agency work",
  );
  assert.equal(
    contractsNamed("Heating fitter - CDI - Liège", true),
    "Heating fitter - Permanent contract - Liège",
  );
  assert.equal(contractsNamed("Interim Manager", true), "Interim Manager");
});

test("Dutch and Flemish site words", () => {
  const tr = (title, raw = "x") => {
    const r = before("nl-en", title);
    return after("nl-en", title, r.info.whole || raw, r.info);
  };
  assert.equal(tr("Leerling monteur"), "Apprentice fitter");
  assert.equal(
    tr("Leerling-elektricien", "Electrician"),
    "Apprentice electrician",
  );
  for (const [title, want] of [
    ["CNC-verspaner", "CNC machinist"],
    ["Frigotechnieker", "Refrigeration technician"],
    ["Elektrieker", "Electrician"],
    ["Werkleider", "Site supervisor"],
    ["Stratenmaker", "Paver"],
  ])
    assert.equal(before("nl-en", title).info.whole, want, title);
  assert.match(
    before("nl-en", "Projectleider installatietechniek").text,
    /building services engineering/,
  );
  assert.equal(
    before("nl-en", "Elektricien ZZP").bare,
    "Elektricien freelance",
  );
});

test("Spanish and Catalan contract and schedule words", () => {
  assert.equal(
    before("es-en", "Operario a través de ETT").bare,
    "Operario (ETT)",
  );
  assert.equal(
    before("es-en", "Operario contrato indefinido").bare.includes(" de "),
    false,
  );
  assert.equal(
    before("ca-en", "Operari torns rotatius").bare.includes(" de "),
    false,
  );
  assert.equal(before("en-es", "Middle Manager").info.said, "");
  assert.equal(before("ca-en", "Carretoner").info.whole, "Forklift operator");
  assert.equal(jobDashEn("Specialist laborer"), "Specialist laborer");
  assert.equal(
    before("es-en", "Ingeniero en prácticas").text,
    "Ingeniero internship",
  );
});

test("fields joined by a slash go after the trade together", () => {
  assert.equal(
    before("en-es", "HVAC/electrical maintenance technician").text,
    "Técnico de mantenimiento – Climatización/electrical",
  );
  assert.equal(
    before("en-es", "Electrician/HVAC technician").text,
    "Electrician / Técnico de climatización",
  );
});
