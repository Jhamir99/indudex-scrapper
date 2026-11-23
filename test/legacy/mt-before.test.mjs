// The legacy's mt-before.test.mjs (JustJans/indudex@b0cd182), its imports pointed at this repo.
// The step before Firefox (builder/mt/method.mjs, before): the title tidied, without the trades written in ("bare").
import { test } from "vitest";
import assert from "node:assert/strict";
import {
  before,
  putBack,
  after,
  polish,
  copyAgain,
  lostNames,
  wordsAfter,
} from "../../src/features/title-translation/method/method.ts";
import { withoutGenders } from "../../src/features/title-translation/method/genders.ts";
import { jobDash } from "../../src/features/title-translation/method/jobdash.ts";

const bare = (pair, title, ...rest) => before(pair, title, ...rest).bare;

test("calls that open a title say nothing on a job site", () => {
  assert.equal(
    bare("de-en", "Wir suchen Dich als Anlagenmechaniker"),
    "Anlagenmechaniker",
  );
  assert.equal(bare("nl-en", "Wij zoeken een Automonteur"), "Automonteur");
  assert.equal(
    bare("de-en", "Mechatroniker - jetzt bewerben!"),
    "Mechatroniker",
  );
});

test("German shorthands and spellings", () => {
  assert.equal(bare("de-en", "Techniker o. Meister"), "Techniker oder Meister");
  assert.equal(bare("de-en", "Schweißer WIG"), "Schweißer TIG");
  assert.equal(
    bare("de-en", "Zerspannungsmechaniker"),
    "Zerspanungsmechaniker",
  );
  assert.equal(
    bare("de-en", "Elektroniker am Standort Hamburg"),
    "Elektroniker in Hamburg",
  );
  assert.equal(
    bare("de-en", "Servicetechniker im Außendienst Berlin-Brandenburg"),
    "Servicetechniker (Außendienst) Berlin-Brandenburg",
  );
});

test('Spanish accents, "de", grades, public posts', () => {
  assert.equal(
    bare("es-en", "Tecnico Mantenimiento"),
    "Técnico de Mantenimiento",
  );
  // An adjective in the plural takes no «de», a field that ends like one does (TB1-10).
  assert.deepEqual(
    [
      "Mecánicos industriales",
      "Operaris especialistes",
      "Técnico Materiales",
      "Tècnic Instruments",
    ].map((t) =>
      bare(t.startsWith("Mec") || t.startsWith("Téc") ? "es-en" : "ca-en", t),
    ),
    [
      "Mecánicos industriales",
      "Operaris especialistes",
      "Técnico de Materiales",
      "Tècnic d'Instruments",
    ],
  );
  assert.equal(
    before("ca-en", "Muntadors elèctrics").text,
    "Electrical fitter",
  );
  assert.equal(bare("es-en", "Fontanero Oficial 1ª-2ª"), "Fontanero");
  assert.equal(bare("es-en", "Una plaza de Topógrafo"), "Topógrafo");
  assert.equal(
    bare("es-en", "Instaladores de tuberías, en general"),
    "Instaladores de tuberías",
  );
});

test("French and Dutch openings and words read wrongly", () => {
  assert.equal(bare("fr-en", "Responsable Travaux"), "Head of Travaux");
  assert.equal(
    bare("fr-en", "Une Technicienne de maintenance"),
    "Technicienne de maintenance",
  );
  assert.equal(bare("fr-en", "CHARGE DE PROJETS"), "Chargé de Projets");
  assert.equal(
    bare("fr-en", "Usineur sur CN 5 axes"),
    "Usineur sur CNC 5-axis",
  );
  assert.equal(bare("fr-en", "Technicien IDF"), "Technicien Île-de-France");
  assert.equal(
    bare("nl-en", "Verantwoordelijke Productie"),
    "Head of Productie",
  );
  assert.equal(
    bare("nl-en", "Monteur cv en sanitair"),
    "Monteur centrale verwarming en sanitair",
  );
  assert.equal(
    bare("nl-en", "Koeltechnieker | Bedrijfswagen"),
    "Koeltechnieker | Company vehicle",
  );
  assert.equal(bare("nl-en", "Operator 3 ploegen"), "Operator 3 shifts");
});

test("levels are taken out and said in front of the English", () => {
  const d = before("es-en", "Un/una Electricista Junior");
  assert.equal(d.bare, "Electricista");
  assert.equal(d.info.level, "Junior");
});

test("the company and the towns are names Firefox must keep", () => {
  const d = before(
    "de-en",
    "Application Engineer WMC - Maintenance Software – SSI Schäfer Österreich",
    "",
    "",
    "",
    "SSI Schäfer Österreich",
    0,
  );
  assert.equal(d.info.firm, "SSI Schäfer Österreich");
  assert.ok(d.info.names.includes("SSI Schäfer Österreich"));
  assert.ok(before("de-en", "Elektriker in Köln").info.names.includes("Köln"));
});

test("gender endings out", () => {
  assert.equal(
    withoutGenders("Mechatroniker (jedes Geschlecht)", "de"),
    "Mechatroniker",
  );
  assert.equal(
    withoutGenders("Techniker/-in Elektrotechnik", "de"),
    "Techniker Elektrotechnik",
  );
  // French marks in capitals, as in small letters.
  assert.equal(
    withoutGenders("TECHNICIEN(NE) CONFIRME(E) VEHICULES LEGERS", "fr"),
    "TECHNICIEN CONFIRME VEHICULES LEGERS",
  );
  assert.equal(
    withoutGenders("CDI - MECANICIEN(NE) - PIQUEUR(SE) SUR CUIR", "fr"),
    "CDI - MECANICIEN - PIQUEUR SUR CUIR",
  );
  assert.equal(
    withoutGenders("TECHNICIEN.NE APRES VENTE", "fr"),
    "TECHNICIEN APRES VENTE",
  );
  assert.equal(
    withoutGenders("OPERATEUR·TRICE / PROGRAMMEUR·EUSE CNC", "fr"),
    "OPERATEUR / PROGRAMMEUR CNC",
  );
  assert.equal(
    withoutGenders("INGENIEUR.E CHEF.FE DE PROJET", "fr"),
    "INGENIEUR CHEF DE PROJET",
  );
  assert.equal(withoutGenders("SOUDEUR (SE) TIG", "fr"), "SOUDEUR TIG");
  // Not an acronym or a word after a slash.
  assert.equal(
    withoutGenders("EAUX DE VIENNE / S.I.V.E.E.R.", "fr"),
    "EAUX DE VIENNE / S.I.V.E.E.R.",
  );
  assert.equal(
    withoutGenders("MSR / Elektro-Projektleiter", "fr"),
    "MSR / Elektro-Projektleiter",
  );
});

test("stand-ins are put back, in small letters too; a lost one fails", () => {
  assert.equal(
    putBack("Fast mechanical zalando / Kafka truck", {
      put: [
        ["Kafka", "tyre fitter"],
        ["Zalando", "Fitter"],
      ],
    }),
    "Fast mechanical Fitter / tyre fitter truck",
  );
  assert.equal(putBack("lost stand-in", { put: [["Kafka", "x"]] }), null);
});

test('into Spanish, Catalan and French "industrial" goes after a trade written in, keeping its capital', () => {
  assert.equal(
    before("en-es", "Industrial mechanic").text,
    "Mecánico industrial",
  );
  assert.equal(
    before("en-fr", "Industrial draughtsman").text,
    "Dessinateur industriel",
  );
  assert.equal(
    before("en-es", "Industrial engineer").text,
    "Industrial engineer",
  );
});

test('not where the table holds the whole phrase with "industrial"', () => {
  assert.equal(
    before("en-es", "Industrial electronics technician").text,
    "Técnico electrónico industrial",
  );
});

test("a trade put back where Firefox wrote its stand-in in small letters goes in small letters", () => {
  assert.equal(
    putBack("Fast mechanical zalando / Kafka truck", {
      put: [
        ["Kafka", "tyre fitter", "trade"],
        ["Zalando", "Fitter", "trade"],
      ],
    }),
    "Fast mechanical fitter / tyre fitter truck",
  );
  assert.equal(
    putBack("Engineer at kafka", { put: [["Kafka", "Wien Energie"]] }),
    "Engineer at Wien Energie",
  );
});

test("into Spanish, Catalan and French the English words in front of a trade go after it", () => {
  assert.equal(before("en-es", "Crane fitter").text, "Montador de grúas");
  assert.equal(before("en-es", "Electric Fitter").text, "Montador electric");
  assert.equal(
    before("en-es", "IT Project Manager").text,
    "Jefe de proyecto IT",
  );
  assert.equal(before("en-es", "Fitter welder").text, "Montador soldador");
  assert.equal(
    before("en-es", "Team Leader Plumber – Heating").text,
    "Líder de equipo Fontanero – Heating",
  );
  assert.equal(before("en-de", "Crane fitter").text, "Kranmonteur");
});

test("a trade said twice: the words in front of the second go after it, and the step ends", () => {
  // It never ended on this title into Catalan (7 November 2026), and into Spanish took the first trade along.
  const t = "Lf 253155 - maintenance worker and mechanical maintenance worker";
  assert.equal(
    before("en-ca", t).text,
    "Lf 253155 - operari de manteniment and operari de manteniment mechanical",
  );
  assert.equal(
    before("en-es", t).text,
    "Lf 253155 - operario de mantenimiento and operario de mantenimiento mechanical",
  );
  assert.equal(
    before("en-ca", "Lf 253155 - welder and mechanical welder").text,
    "Lf 253155 - soldador and soldador mechanical",
  );
});

test("a Spanish mechanic of a vehicle, written with no «de», is that mechanic", () => {
  // Firefox read «MECÁNICO/A CAMIÓN» as «Mechanical Truck» and «DE CAMPO» as «– de Campo» (7 November 2026).
  assert.equal(
    before("es-en", "OFICIAL 1ª MECÁNICO/A CAMIÓN IGUALADA").text,
    "Truck mechanic Igualada",
  );
  assert.equal(
    before("es-en", "OFICIAL 1ª MECÁNICO/A MOTO - TARRAGONA").text,
    "Motorcycle mechanic - Tarragona",
  );
  assert.equal(
    before("es-en", "ELECTROMECÁNICO DE CAMPO - CARRETILLAS ELEVADORAS").text,
    "Field electromechanical technician - Carretillas Elevadoras",
  );
  assert.equal(before("en-de", "Truck mechanic").text, "Lkw-Mechaniker");
});

test("a Swiss welding word takes its «ß» back, and an Italian shift leader is read", () => {
  // Firefox read «Schweissfachmann» as «Sweat expert»; «CAPOTURNO» came back «CAPOTURNNO» (8 November 2026).
  assert.equal(
    before("de-en", "Schweissfachmann 100%").text,
    "Welding specialist 100%",
  );
  assert.equal(
    before("de-en", "Rohrschlosser mit Schweisszertifikat TIG").text,
    "Pipe fitter mit Schweißzertifikat TIG",
  );
  assert.equal(
    before("de-en", "Schichtleiter in Schweisserei").text,
    "Shift supervisor in Schweißerei",
  );
  assert.equal(
    before("it-en", "CAPOTURNO - Lavorazioni Meccaniche").text,
    "Shift supervisor - Lavorazioni Meccaniche",
  );
});

test("a leading Junior or Senior of the English is said after the job in those languages", () => {
  const d = before("en-es", "Junior fitter – field service");
  assert.equal(d.text.startsWith("Montador"), true);
  assert.equal(d.info.said, "Junior");
});

test("a trade given back in the plural where the English was singular goes back as written", () => {
  const d = before("en-es", "HVAC fitter");
  assert.equal(
    after("en-es", "HVAC fitter", "Montadores – HVAC", d.info),
    "Montador – climatización",
  );
  assert.equal(
    after(
      "en-es",
      "Hydraulic fitter",
      "Montadores hidráulicos",
      before("en-es", "Hydraulic fitter").info,
    ),
    "Montadores hidráulicos",
  );
});

test("product names are kept as the title writes them", () => {
  assert.deepEqual(before("de-en", "Elektrokonstrukteur Eplan").info.names, [
    "Eplan",
  ]);
});

test("a single-word adjective written in front of English words goes after them into Catalan, French and Spanish", () => {
  assert.equal(
    before("en-ca", "Embedded Software Engineer 100%").text,
    "Software Engineer encastat 100%",
  );
});

test("Dutch machinist left in the English is a machine operator", () => {
  const t = "Chauffeur C / machinist inspectievoertuigen";
  assert.equal(
    after(
      "nl-en",
      t,
      "Driver C / machinist inspection vehicles",
      before("nl-en", t).info,
    ),
    "Driver C / machine operator inspection vehicles",
  );
});

test("product names Firefox translated are kept", () => {
  assert.deepEqual(
    before("de-en", "Sr. Consultant - Workday Success Plans").info.names,
    ["Workday"],
  );
});

test("the morning shift and the mechanic as a person", () => {
  assert.equal(
    before("es-en", "Electricista - Jornada de mañana").bare.includes(
      "Turno de mañana",
    ),
    true,
  );
  assert.equal(
    before("es-en", "Electricista - Jornada de mañana").text,
    "Electrician - Early shift",
  );
  assert.equal(
    after(
      "en-es",
      "Industrial mechanic",
      "Mecánica industrial",
      before("en-es", "Industrial mechanic").info,
    ),
    "Mecánico industrial",
  );
  assert.equal(
    after(
      "en-ca",
      "Aeronautical mechanic",
      "Mecànica aeronàutica",
      before("en-ca", "Aeronautical mechanic").info,
    ),
    "Mecànic aeronàutic",
  );
});

test("the adjective goes after only where it opens the title and before no and", () => {
  assert.equal(
    before(
      "en-ca",
      "S+S | Embedded hardware and software developer",
    ).text.includes("Encastat hardware"),
    true,
  );
});

test("the language a job asks for, in one form and written in", () => {
  assert.equal(
    before("en-es", "Solutions Architect, German speaker").text,
    "Arquitecto de soluciones, de habla alemana",
  );
  assert.equal(
    before("en-es", "SAP SuccessFactors Consultant (Dutch speaker)").text,
    "SAP SuccessFactors Consultant (de habla neerlandesa)",
  );
  assert.equal(
    before("en-ca", "Data Engineer – Dutch-speaking").text,
    "Data Engineer – de parla neerlandesa",
  );
  assert.equal(
    before("en-es", "German-Speaking Cybersecurity Customer Experts").bare,
    "German-Speaking Cybersecurity Customer Experts",
  );
  assert.equal(
    before(
      "en-es",
      "Technical Support Specialist for Dutch Speakers",
    ).text.includes("Dutch Speakers"),
    true,
  );
  assert.equal(
    before("en-es", "Swiss German speaking Engineer").text,
    "Swiss German speaking Engineer",
  );
  assert.equal(
    after(
      "en-es",
      "X (Dutch speaker)",
      "Consultor (De habla neerlandesa)",
      before("en-es", "X (Dutch speaker)").info,
    ),
    "Consultor (de habla neerlandesa)",
  );
});

test("a fitter who leads the site, and an apprenticeship graduate after the job", () => {
  assert.equal(
    before("de-en", "Bauleitender Monteur Elektrotechnik").text,
    "Fitter und site manager – Electrical engineering",
  );
  assert.equal(
    before("de-en", "Bauleitende/r Elektroinstallateur/in").text.includes(
      "und site manager",
    ),
    true,
  );
  assert.equal(
    before("de-en", "Lehrabgänger/in Spengler/in").text.endsWith(
      "(apprenticeship graduate)",
    ),
    true,
  );
});

test("a team or tech lead and its field, apart", () => {
  assert.equal(
    before("en-es", "Team Lead Java Development").text.startsWith(
      "Líder de equipo – ",
    ),
    true,
  );
  assert.equal(
    before("en-ca", "Tech Lead Infrastructure").text.startsWith(
      "Líder tècnic – ",
    ),
    true,
  );
});

test("a region, a language a Dutch title asks for, and tech names after the job (s102, s103)", () => {
  assert.equal(
    bare("de-en", "Elektriker für den Raum Kassel"),
    "Elektriker für Kassel",
  );
  assert.equal(
    bare("nl-en", "Servicemonteur NL vereist"),
    "Servicemonteur – Dutch-speaking",
  );
  assert.equal(before("en-es", "Senior .NET Developer").text, "Developer .NET");
  assert.equal(before("en-ca", "C# Developer").text, "Developer C#");
});

test("trades the table could not read, and titles of the first leg already in English (s104, s105)", () => {
  assert.equal(
    before("de-en", "Betriebsmechaniker").text,
    "Maintenance fitter",
  );
  assert.equal(before("de-en", "Customer Support Engineer").info.english, true);
  assert.equal(before("de-en", "Kundendienst Techniker").info.english, false);
});

test('capital gender endings, every word with a capital, "deutschlandweit" and a board name (s106)', () => {
  assert.equal(
    withoutGenders(
      "Zeichner:In / ARCHITEKT:INNEN / Meister/In / Staatlich Geprüfte/R",
      "de",
    ),
    "Zeichner / ARCHITEKT / Meister / Staatlich Geprüfter",
  );
  assert.equal(
    bare("de-en", "Elektriker Als Servicetechniker Im Außendienst"),
    "Elektriker als Servicetechniker im Außendienst",
  );
  assert.equal(
    bare("de-en", "Anlagenmechaniker Shk Für It-Systeme"),
    "Anlagenmechaniker SHK für IT-Systeme",
  );
  assert.equal(
    bare("de-en", "Servicetechniker Deutschlandweit"),
    "Servicetechniker in ganz Deutschland",
  );
  assert.equal(
    bare("de-en", "Architekt/in & Bauleiter/in - Architektur Stellen"),
    "Architekt & Bauleiter",
  );
});

test('"Agentic" through "Robotic" into Spanish, Catalan and French only (s106)', () => {
  const a = before("en-es", "Agentic Product Engineer");
  assert.equal(a.text, "Robotic Product Engineer");
  assert.equal(
    after(
      "en-es",
      "Agentic Product Engineer",
      "Ingeniero de Producto Robótico",
      a.info,
    ),
    "Ingeniero de Producto Agéntico",
  );
  assert.equal(before("en-es", "Agentic AI Engineer").info.agentic, false);
  assert.equal(
    before("en-de", "Agentic Product Engineer").text,
    "Agentic Product Engineer",
  );
});

test("a star after a word out at the end only, and a level before a Swiss workload (s106)", () => {
  assert.equal(
    after(
      "de-en",
      "DevOps Engineer*",
      "DevOps Engineer*",
      before("de-en", "DevOps Engineer*").info,
    ),
    "DevOps Engineer*",
  );
  assert.equal(
    after(
      "en-es",
      "DevOps Engineer*",
      "Ingeniero DevOps* sénior",
      before("en-es", "DevOps Engineer*").info,
    ),
    "Ingeniero DevOps sénior",
  );
  assert.equal(polish("de-en", "DevOps Engineer*"), "DevOps Engineer");
  const p = before("en-es", "Senior System Engineer 80-100%");
  assert.equal(
    after(
      "en-es",
      "Senior System Engineer 80-100%",
      "Ingeniero de Sistemas 80-100%",
      p.info,
    ),
    "Ingeniero de Sistemas sénior 80-100%",
  );
});

test("a language standing on its own given back where Firefox wrote the target language instead (s107)", () => {
  assert.equal(
    after(
      "en-fr",
      "Cloud Native Engineer - English",
      "Cloud Native Engineer - Français",
      before("en-fr", "Cloud Native Engineer - English").info,
    ),
    "Cloud Native Engineer - Anglais",
  );
  assert.equal(
    after(
      "en-fr",
      "Translator - French",
      "Traducteur - Français",
      before("en-fr", "Translator - French").info,
    ),
    "Traducteur - Français",
  );
});

test('German hyphens before English job words, Swiss "Aussendienst", "Gebiet", "mind." (s107)', () => {
  assert.equal(
    bare("de-en", "Netzwerk-Administrator"),
    "Netzwerk Administrator",
  );
  assert.equal(
    after(
      "de-en",
      "DevOps-Engineer",
      "DevOps-Engineer",
      before("de-en", "DevOps-Engineer").info,
    ),
    "DevOps Engineer",
  );
  assert.equal(
    bare("de-en", "Servicetechniker 100% Aussendienst"),
    "Servicetechniker 100% Außendienst",
  );
  assert.equal(
    bare("de-en", "Servicetechniker Gebiet Hannover"),
    "Servicetechniker im Gebiet Hannover",
  );
  assert.equal(
    bare("de-en", "Bauleiter für das Gebiet Rhein-Ruhr"),
    "Bauleiter für das Gebiet Rhein-Ruhr",
  );
  assert.equal(
    bare("de-en", "Schweisser mind. CHF 35.00"),
    "Schweisser mindestens CHF 35.00",
  );
});

test("codes after the job after a slash, not inside a code (s107)", () => {
  assert.equal(
    before("en-es", "CNC Miller/CAM Programmer").text,
    "Fresador CNC / Programmer CAM",
  );
  assert.equal(before("en-es", "C/C++ Developer").text, "C/C++ Developer");
});

test("fibre optics, not fibreglass, and table entries (s107)", () => {
  assert.equal(
    after(
      "de-en",
      "Monteur - Glasfaserausbau",
      "Fitter - Fiberglass expansion",
      before("de-en", "Monteur - Glasfaserausbau").info,
    ),
    "Fitter - fibre optic expansion",
  );
  const g = "Verfahrensmechaniker glasfaserverstärkte Kunststoffe";
  assert.equal(
    after(
      "de-en",
      g,
      "Process mechanic fiberglass reinforced plastics",
      before("de-en", g).info,
    ),
    "Process mechanic fiberglass reinforced plastics",
  );
  assert.equal(
    before("de-en", "Roboterprogrammierer").text,
    "Robot programmer",
  );
  assert.equal(
    before("en-es", "Master motor mechanic").text,
    "Maestro mecánico de automóviles",
  );
  assert.equal(
    before("de-en", "Projektleiter Tiefbau").text,
    "Projektleiter civil works",
  );
});

test("an English country or language kept into English, and Medior, Middle, Founding opening an English title (s107)", () => {
  assert.deepEqual(
    before("de-en", "Speech AI Evaluation Specialist - German (Germany)").info
      .names,
    ["German", "Germany"],
  );
  const m = before("en-es", "Medior Java Developer");
  assert.equal(m.text, "Java Developer");
  assert.equal(
    after("en-es", "Medior Java Developer", "Desarrollador Java", m.info),
    "Desarrollador Java de nivel intermedio",
  );
  assert.equal(
    before("en-es", "Middle Office Analyst").text.startsWith("Middle Office"),
    true,
  );
  const f = before("en-fr", "Founding Engineer");
  assert.equal(
    after("en-fr", "Founding Engineer", "Ingénieur", f.info),
    "Ingénieur fondateur",
  );
});

test('"(Senior)" opening a title said after the job in its brackets, little words of title-case titles small (s108)', () => {
  const p = before("en-es", "(Senior) Civil engineer – Renewables & Storage");
  assert.equal(
    after(
      "en-es",
      "(Senior) Civil engineer – Renewables & Storage",
      "Ingeniero civil – Renovables y Almacenamiento",
      p.info,
    ),
    "Ingeniero civil (sénior) – Renovables y Almacenamiento",
  );
  assert.equal(
    before("en-de", "(Senior) Software Engineer").text,
    "(Senior) Software Engineer",
  );
  assert.equal(
    before("en-es", "Application Developer For Android").bare,
    "Application Developer for Android",
  );
  assert.equal(
    bare("fr-en", "Agent de Maintenance Des Bâtiments"),
    "Agent de Maintenance des Bâtiments",
  );
  assert.equal(
    bare("nl-en", "Bandenmonteur Met Ervaring"),
    "Bandenmonteur met Ervaring",
  );
});

test("a country code kept, a fixed term written as a contract, new trades in the table (s108)", () => {
  assert.deepEqual(
    before(
      "de-en",
      "Business Analyst Crédit | Carouge, CH",
    ).info.names.includes("CH"),
    true,
  );
  assert.deepEqual(
    before("de-en", "Projektmanagement, IT").info.names.includes("IT"),
    false,
  );
  assert.equal(
    bare("de-en", "Projektingenieur Zunächst Befristet Für 2 Jahre"),
    "Projektingenieur zunächst befristeter Vertrag für 2 Jahre",
  );
  assert.equal(
    bare("de-en", "IT System Engineer (befristet bis 30.06.2029)"),
    "IT System Engineer (befristeter Vertrag bis 30.06.2029)",
  );
  assert.equal(
    before("en-fr", "Tender Engineer").text,
    "Ingénieur d'appels d'offres",
  );
  assert.equal(
    before("de-en", "Werkstattmitarbeiter").text,
    "Workshop employee",
  );
  assert.equal(before("en-es", "Talent Pool").text, "Bolsa de talento");
});

test("German words left in two before -bau written whole, Catalan apostrophe after the table (s108)", () => {
  assert.equal(
    bare("de-en", "Polier im Hoch- und Tiefbau"),
    "Polier im Hochbau und Tiefbau",
  );
  assert.equal(
    bare("de-en", "Polier - Hoch-/Tiefbau"),
    "Polier - Hochbau/Tiefbau",
  );
  assert.equal(
    before("de-en", "Metallbauer / Anlagen- und Apparatebauer").text,
    "Metal fabricator / Boilermaker",
  );
  assert.equal(
    before(
      "de-en",
      "Konstruktionsmechaniker, Fachrichtung Stahl- und Metallbau",
    ).text.includes("Stahl- und"),
    true,
  );
  assert.equal(
    after(
      "es-ca",
      "x",
      "Control de qualitat de obra civil i de iode",
      before("es-ca", "x").info,
    ),
    "Control de qualitat d'obra civil i de iode",
  );
});

test('a post written "-leitung" as the one who does it, TGA as building services (s108)', () => {
  assert.equal(
    bare("de-en", "Projektleitung Elektrotechnik Graz"),
    "Projektleiter Elektrotechnik Graz",
  );
  assert.equal(
    bare("de-en", "Ingenieur als Bauleitung"),
    "Ingenieur als Bauleiter",
  );
  assert.equal(
    bare("de-en", "Architekt/Bauingenieur für Projektleitung"),
    "Architekt/Bauingenieur für Projektleitung",
  );
  assert.equal(
    before("de-en", "Projektleiter Technische Gebäudeausrüstung").text,
    "Projektleiter building services",
  );
});

test("a product left in front of the job goes after its own words, the board name off before the company (s109)", () => {
  const a = (p, raw) => after(p, "x", raw, before(p, "x").info);
  assert.equal(
    a("en-es", "SAP Arquitecto de Sistemas"),
    "Arquitecto de Sistemas SAP",
  );
  assert.equal(
    a("en-es", "SAP Consultor en Madrid"),
    "Consultor SAP en Madrid",
  );
  assert.equal(
    a("en-es", "Experimentado Desarrollador"),
    "Experimentado Desarrollador",
  );
  assert.equal(
    before(
      "de-en",
      "Architekt/in FH - Architektur Stellen",
      "",
      "",
      "",
      "Architektur Stellen",
    ).bare,
    "Architekt FH",
  );
  assert.equal(before("fr-en", "Polymécanicien CNC").text, "Polymechanic CNC");
});

test('empty square brackets out, "-leitung" after a level, Dutch "of" in titles left in English, "freezer" (s110)', () => {
  const a = (p, t, raw) => after(p, t, raw, before(p, t).info);
  assert.equal(
    a("de-en", "Bauleiter [m/w/d]", "Site manager []"),
    "Site manager",
  );
  assert.equal(
    before("de-en", "Wirtschaftsinformatiker/-in SAP").text,
    "Business informatics specialist SAP",
  );
  assert.equal(
    bare("de-en", "Senior Projektleitung Architektur"),
    "Senior Projektleiter Architektur",
  );
  assert.equal(
    a("nl-en", "AWS of Azure Cloud Architect", "x"),
    "AWS or Azure Cloud Architect",
  );
  assert.equal(
    a("nl-en", "Mechanical Engineer (Senior of Junior)", "x"),
    "Mechanical Engineer (Senior or Junior)",
  );
  assert.equal(a("nl-en", "Head of Engineering", "x"), "Head of Engineering");
  assert.equal(
    jobDash("Werkvoorbereider en/of Calculator", "nl"),
    "Werkvoorbereider en/of Calculator",
  );
  assert.equal(
    jobDash("Elektroniker und/oder Mechatroniker", "de"),
    "Elektroniker und/oder Mechatroniker",
  );
  assert.equal(bare("nl-en", "CNC Draaier/freezer"), "CNC Draaier/frezer");
  assert.equal(
    bare("nl-en", "Technician (Cold Storage/Freezer), Dendermonde"),
    "Technician (Cold Storage/Freezer), Dendermonde",
  );
});

test("Solution Architect in the table; a product moved after the job only when no word of the language (s111)", () => {
  const a = (p, raw) => after(p, "x", raw, before(p, "x").info);
  assert.equal(
    before("en-ca", "Genesys Solution Architect").text,
    "Arquitecte de solucions – Genesys",
  );
  assert.equal(
    before("de-en", "Solution Architect für SAP").text,
    "Solution architect für SAP",
  );
  assert.equal(
    a("en-fr", "Analyste Programmeur, 100% à distance"),
    "Analyste Programmeur, 100% à distance",
  );
  assert.equal(
    a("en-fr", "Java/Microservices Programmeur"),
    "Programmeur Java/Microservices",
  );
  assert.equal(
    a("en-es", "Genesys Arquitecto de soluciones"),
    "Arquitecto de soluciones Genesys",
  );
  assert.equal(a("en-ca", "SAP GTS Consultor"), "Consultor SAP GTS");
  assert.equal(
    a("en-ca", "SAP IS-U Consultor sènior"),
    "Consultor sènior SAP IS-U",
  );
  assert.equal(bare("de-en", "Maschinenführer (Mensch*)"), "Maschinenführer");
});

test("an English title given back as it is asked again, SAP Basis kept, marks sharing brackets (s112)", () => {
  assert.deepEqual(
    copyAgain(
      "en-ca",
      "SAP Application Manager",
      "SAP Application Manager (anglès)",
    ),
    {
      text: "SAP Application manager",
      put: [],
      names: false,
      copy: true,
    },
  );
  assert.equal(
    copyAgain("en-ca", "SAP Application Manager", "Gestor d'aplicacions SAP"),
    null,
  );
  assert.equal(
    copyAgain("de-en", "SAP Application Manager", "SAP Application Manager"),
    null,
  );
  assert.equal(
    copyAgain(
      "en-fr",
      "Backend Python / Full stack",
      "Backend Python / Full stack",
    ),
    null,
  );
  assert.equal(
    before("en-es", "Senior SAP Basis Administrator").info.names.includes(
      "SAP Basis",
    ),
    true,
  );
  const t = "IT System Engineer (m/w/d, 80-100%, Einsiedeln)";
  assert.equal(
    after("de-en", t, t, before("de-en", t).info),
    "IT System Engineer (80-100%, Einsiedeln)",
  );
  assert.equal(
    bare("de-en", "(Senior) Software Engineer (all genders, full-/part-time)"),
    "(Senior) Software Engineer (full-/part-time)",
  );
});

test('"Experienced" opening an English title said after the job, two Dutch levels for one post (s113)', () => {
  const b = before("en-es", "Experienced CNC miller (2 shifts)");
  assert.equal(b.text, "Fresador CNC (2 turnos)");
  assert.equal(b.info.said, "Experienced");
  assert.equal(
    before("en-es", "Experienced and Dutch speaking Engineer").info.said,
    "",
  );
  const m = before("nl-en", "Medior/Senior .NET Software Engineer");
  assert.equal(m.info.level, "Mid-level/Senior");
  assert.equal(m.bare, ".NET Software Engineer");
  assert.equal(
    before("nl-en", "Frontend Developer (Medior / Senior)").bare,
    "Frontend Developer",
  );
});

test("Powerplatform and OutSystems kept, the Dutch support employee, a language alone in brackets (s114)", () => {
  assert.equal(
    before("en-ca", "Powerplatform Consultant").info.names.includes(
      "Powerplatform",
    ),
    true,
  );
  assert.equal(
    before("nl-en", "IT Support Medewerker").text,
    "IT Support technician",
  );
  assert.equal(
    before("en-es", "React (native) Developer (Dutch)").text,
    "React (native) Developer (de habla neerlandesa)",
  );
  assert.equal(
    before("en-es", "Welder Fabricator").info.expect.includes(
      before("en-es", "Welder-fabricator").info.expect[0],
    ),
    true,
  );
});

test('German "Inhouse" written "In-house", Salesforce kept, a job in -er after a product said once (s115)', () => {
  assert.equal(
    before("en-es", "SAP Inhouse Consultant").text,
    "SAP In-house Consultant",
  );
  assert.equal(
    before("en-es", "Salesforce Inhouse Consultant").info.names.includes(
      "Salesforce",
    ),
    true,
  );
  const a = (t, raw) => after("de-en", t, raw, before("de-en", t).info);
  assert.equal(
    a("SAP HCM Berater", "SAP HCM Consultants"),
    "SAP HCM Consultant",
  );
  assert.equal(
    a("Inhouse SAP BW Berater", "In-house SAP BW consultants"),
    "In-house SAP BW consultant",
  );
  assert.equal(bare("nl-en", "It support medewerker"), "IT support medewerker");
  assert.equal(
    after(
      "en-ca",
      "x",
      "SAP S/4HANA Consultor (de parla alemanya)",
      before("en-ca", "x").info,
    ),
    "Consultor SAP S/4HANA (de parla alemanya)",
  );
  assert.equal(
    after("en-ca", "x", "Enginyer/ Consultor GC", before("en-ca", "x").info),
    "Enginyer/ Consultor GC",
  );
  assert.equal(
    after(
      "en-es",
      "x",
      "Systemheld/Sénior Ingeniero de Sistemas",
      before("en-es", "x").info,
    ),
    "Systemheld/Sénior Ingeniero de Sistemas",
  );
});

test('gender marks with a star or hyphens out, "Stv." written whole (s116)', () => {
  const a = (p, t) => after(p, t, t, before(p, t).info);
  assert.equal(
    a("de-en", "Senior Cloud Engineer (w/m/*)"),
    "Senior Cloud Engineer",
  );
  assert.equal(
    a("fr-en", "Développeur fullstack (h-f-x)"),
    "Développeur fullstack",
  );
  assert.equal(
    bare("de-en", "Stv. Teamleiter Fabrikation"),
    "Stellvertretender Teamleiter Fabrikation",
  );
  assert.equal(
    bare("en-es", "Data Analytics Traineeship Den Haag"),
    "Traineeship in data analytics Den Haag",
  );
  assert.equal(
    bare("en-ca", "Operations & AI Traineeship"),
    "Traineeship in operations & AI",
  );
  assert.equal(
    before("nl-en", "Medior Senior Werkvoorbereider").info.level,
    "Mid-level/Senior",
  );
});

test('English "Sr." and "Jr." written whole, Shopware kept (s117)', () => {
  const b = before("en-es", "Sr. Software Engineer");
  assert.equal(b.bare, "Software Engineer");
  assert.equal(b.info.said, "Senior");
  assert.equal(before("en-ca", "Jr. Data Engineer").info.said, "Junior");
  assert.equal(
    before("en-ca", "Shopware Developer").info.names.includes("Shopware"),
    true,
  );
  assert.equal(
    before("de-en", "Softwareentwickler Java (Home Office)").text.includes(
      "(Remote work)",
    ),
    true,
  );
  assert.equal(
    before("en-es", "Project Manager 100% Home Office").text,
    "Jefe de proyecto 100% teletrabajo",
  );
  assert.equal(
    before("en-es", "Home Office Caseworker").text,
    "Home Office Caseworker",
  );
});

test("Flemish electromechanic with a c, liftmonteur and onderofficier read (s118)", () => {
  assert.equal(
    before("nl-en", "Electromechanieker").text,
    "Electromechanical technician",
  );
  assert.equal(
    before("nl-en", "(Junior) liftmonteur").text.includes("lift technician"),
    true,
  );
  assert.equal(
    before("nl-en", "ICT Assistant - Reserve onderofficier").text.includes(
      "non-commissioned officer",
    ),
    true,
  );
});

test("a welding process after the welder, French surveying technician, body painter and TP mechanic (s119)", () => {
  assert.equal(before("en-es", "TIG welder").text, "Soldador TIG");
  assert.equal(before("en-ca", "MIG/MAG Welder").text, "Soldador MIG/MAG");
  assert.equal(before("en-es", "MAG welder").info.whole, "Soldador MAG");
  assert.equal(
    after(
      "en-ca",
      "x",
      "TIG de soldador amb experiència",
      before("en-ca", "x").info,
    ),
    "Soldador TIG amb experiència",
  );
  assert.equal(
    before("en-es", "TIG and MIG welder").text,
    "Soldador TIG and MIG",
  );
  assert.equal(before("en-es", "TIG and MIG welder").info.whole, "");
  assert.equal(
    before("en-es", "MIG Welder Fabricator").info.whole,
    "Soldador-montador MIG",
  );
  assert.equal(
    after("en-es", "x", "MIG Soldador-montador", before("en-es", "x").info),
    "Soldador-montador MIG",
  );
  assert.equal(
    before("fr-en", "Technicien Géomètre Topographe").text,
    "Surveying technician",
  );
  assert.equal(
    before("fr-en", "Carrossier peintre automobile").text,
    "Car body repairer and painter",
  );
  assert.equal(
    before("fr-en", "Mécanicien TP").text,
    "Construction machinery mechanic",
  );
  assert.equal(before("fr-en", "Plombier sanitaire").text, "Plumber");
  assert.equal(
    before("fr-en", "Métallier soudeur").text,
    "Metal fabricator-welder",
  );
  assert.equal(before("fr-en", "Assembleur Soudeur").text, "Welder-assembler");
  assert.equal(before("fr-en", "Mécanicien VL").text, "Light vehicle mechanic");
});

test("the British engineer who installs as a technician, Graduate after the job, placement as internship, SEPE (s120)", () => {
  assert.equal(before("en-es", "Gas Engineer").text, "Técnico de gas");
  assert.equal(
    before("en-ca", "Air Conditioning Engineer").text,
    "Tècnic de climatització",
  );
  const g = before("en-es", "Graduate Structural Engineer");
  assert.equal(g.info.said, "Graduate");
  assert.equal(before("en-es", "Graduate Engineering Scheme").info.said, "");
  assert.equal(
    before("en-es", "Cyber Security Placement Programme").bare,
    "Cyber Security Internship Programme",
  );
  assert.equal(
    before("en-es", "Direct placement consultant").bare,
    "Direct placement consultant",
  );
  assert.equal(
    bare("es-en", "Instaladores electricistas, en general"),
    "Instaladores electricistas",
  );
  assert.equal(
    before("en-es", "Building Services Engineer").text,
    "Ingeniero de instalaciones",
  );
  assert.equal(before("en-ca", "MOT Tester").text, "Inspector d'ITV");
  assert.equal(
    copyAgain("en-ca", "Supervisor de torn", "Supervisor de torn", {
      whole: "Supervisor de torn",
    }),
    null,
  );
});

test("German after-sales technician, qualified electrician, KFZ mechanic, metalworker and work planner (s121)", () => {
  assert.equal(
    before("de-en", "Kundendienstmonteur SHK").text.startsWith(
      "After-sales service technician",
    ),
    true,
  );
  assert.equal(
    before("de-en", "Elektrofachkraft").text,
    "Qualified electrician",
  );
  assert.equal(before("de-en", "KFZ-Mechaniker").text, "Car mechanic");
  assert.equal(before("de-en", "Metallfacharbeiter").text, "Metalworker");
  assert.equal(
    before("de-en", "Mitarbeiter Arbeitsvorbereitung").text,
    "Work planner",
  );
  assert.equal(
    before("de-en", "Projektleiter TGA").text.includes("building services"),
    true,
  );
  assert.equal(
    before("de-en", "Servicetechniker SHK").text.includes(
      "plumbing, heating and air conditioning",
    ),
    true,
  );
  assert.equal(
    before("de-en", "Projektleiter HKLS").text.includes("HVAC and plumbing"),
    true,
  );
  assert.equal(
    before("de-en", "Anlagenmechaniker SHK").text.includes(
      "plumbing, heating and air conditioning",
    ),
    false,
  );
  assert.equal(
    before("de-en", "Elektromechaniker").text,
    "Electromechanical technician",
  );
});

test("Dutch W and E installations, Eerste as the lead, Infra, GWW, E&I and names kept (s122)", () => {
  assert.equal(
    before("nl-en", "Werkvoorbereider W").text.includes(
      "mechanical installations",
    ),
    true,
  );
  assert.equal(
    before("nl-en", "Monteur E").text.includes("electrical installations"),
    true,
  );
  assert.equal(
    before("nl-en", "Calculator / Werkvoorbereider E & W").text.includes(
      "electrical and mechanical installations",
    ),
    true,
  );
  assert.equal(
    before(
      "nl-en",
      "Calculator / werkvoorbereider / tekenaar W installaties",
    ).text.includes("installations installaties"),
    false,
  );
  assert.equal(
    before("nl-en", "Maintenance Engineer E & I").text.includes(
      "installations",
    ),
    false,
  );
  assert.equal(
    before("nl-en", "Projectleider E-commerce").text.includes("installations"),
    false,
  );
  assert.equal(before("nl-en", "Eerste Autotechnicus").info.level, "Lead");
  assert.equal(
    before("nl-en", "Vacature Eerste Autotechnicus").info.level,
    "Lead",
  );
  assert.equal(before("nl-en", "1e lijns support medewerker").info.level, "");
  assert.equal(
    bare("nl-en", "Werkvoorbereider Ondergrondse Infra"),
    "Werkvoorbereider Ondergrondse Infrastructuur",
  );
  assert.equal(
    before("nl-en", "Uitvoerder GWW")
      .text.toLowerCase()
      .includes("civil works"),
    true,
  );
  assert.equal(
    before("nl-en", "Vakgarage Alblas - 1e Autotechnicus").info.level,
    "",
  );
  assert.equal(before("nl-en", "1e of 2e Autotechnicus").info.level, "");
  assert.equal(
    after(
      "en-es",
      "x",
      "Mecánico de automóviles/ Inspector de vehículos",
      before("en-es", "x", "", "Lead").info,
    ),
    "Mecánico de automóviles jefe/ Inspector de vehículos",
  );
  assert.equal(
    after(
      "en-es",
      "x",
      "Intune & M365 Consultor",
      before("en-es", "x", "", "Mid-level").info,
    ),
    "Intune & M365 Consultor de nivel intermedio",
  );
  assert.equal(
    after(
      "en-es",
      "x",
      "Soldador TIG/MIG",
      before("en-es", "x", "", "Senior").info,
    ),
    "Soldador TIG/MIG sénior",
  );
  assert.equal(
    before("nl-en", "Vakgarage Newo - Automonteur").info.names.includes(
      "Vakgarage",
    ),
    true,
  );
  assert.equal(before("en-ca", "Workshop manager").text, "Cap de taller");
  assert.equal(
    copyAgain("en-de", "Software Engineer", "Software Engineer", {}),
    null,
  );
});

test("British surveyors, fire engineers, plant fitters, fabricators, safety advisors, Chartered, Spanish Responsable (s123)", () => {
  assert.equal(before("en-es", "Estates Surveyor").text, "Aparejador");
  assert.equal(
    before("en-es", "Engineering Surveyor").text,
    "Topógrafo de obra",
  );
  assert.equal(
    before("en-es", "Senior Fire Engineer").text.includes(
      "protección contra incendios",
    ),
    true,
  );
  assert.equal(
    before("en-es", "Plant Fitter").text,
    "Mecánico de maquinaria de obra",
  );
  assert.equal(before("en-es", "Welder/Fabricator").text, "Soldador-montador");
  assert.equal(before("en-es", "Fabricator Welder").text, "Soldador-montador");
  assert.equal(before("en-ca", "Plater").text, "Calderer");
  assert.equal(
    before("en-es", "Health & Safety Advisor").text,
    "Técnico de prevención de riesgos laborales",
  );
  assert.equal(before("en-es", "Clerk of Works").text, "Inspector de obra");
  assert.equal(before("en-fr", "Town Planner").text, "Urbaniste");
  assert.equal(
    before("en-es", "Chartered Building Surveyor").info.said,
    "Chartered",
  );
  assert.equal(
    bare("es-en", "Responsable Mantenimiento"),
    "Head of Mantenimiento",
  );
  assert.equal(
    bare("es-en", "Responsable Técnico de Obra"),
    "Responsable Técnico de Obra",
  );
  assert.equal(bare("es-en", "Soldadores por tig"), "Soldadores TIG");
  assert.equal(
    after(
      "es-en",
      "Soldadores por tig",
      "Welder TIG",
      before("es-en", "Soldadores por tig").info,
    ),
    "TIG Welder",
  );
  assert.equal(
    bare("es-en", "Responsable de Proyecto SAP HR"),
    "Responsable de Proyecto SAP HR",
  );
  assert.equal(
    bare("es-en", "Responsable Eléctrico de Equipos"),
    "Responsable Eléctrico de Equipos",
  );
  assert.equal(
    before("en-es", "Environment, Health and Safety Manager").text,
    "Responsable de medio ambiente, seguridad y salud",
  );
  assert.equal(
    before("en-fr", "Precast Concrete Fabricator").text.includes("étallier"),
    false,
  );
});

test("French developers and their technologies, CVC and HVAC, Mécanicien Auto, SAV, BE, VRD, German Werkstoffprüfer (s124)", () => {
  assert.equal(before("fr-en", "Développeur Python").text, "Python Developer");
  assert.equal(
    before("fr-en", "Développeur Java - Angular").text,
    "Java/Angular Developer",
  );
  assert.equal(before("fr-en", "Ingénieur IA").text, "AI Engineer");
  const j = before("fr-en", "Développeur Java Confirmé");
  assert.equal(j.text, "Java Developer");
  assert.equal(j.info.level, "Experienced");
  assert.equal(
    before(
      "fr-en",
      "Développeur(se) Fullstack Expérimenté(e) - Développement Régional - Lille",
    ).bare.startsWith("Fullstack Developer"),
    true,
  );
  assert.equal(
    before("fr-en", "Développeur en alternance").text,
    "Développeur en alternance",
  );
  assert.equal(before("fr-en", "Mécanicien Auto").text, "Car mechanic");
  assert.equal(
    before("fr-en", "Technicien SAV").text,
    "After-sales service technician",
  );
  assert.equal(
    before("fr-en", "Technicien BE")
      .text.toLowerCase()
      .includes("design office"),
    true,
  );
  assert.equal(
    before("fr-en", "Projeteur VRD")
      .text.toLowerCase()
      .includes("roads and utilities"),
    true,
  );
  assert.equal(
    before("en-es", "Fitter – HVAC")
      .text.toLowerCase()
      .includes("climatización"),
    true,
  );
  assert.equal(before("de-en", "Werkstoffprüfer").text, "Materials tester");
  assert.equal(
    bare("de-en", "Elektroniker Fr. Energie- und Gebäudetechnik").includes(
      "für Energie",
    ),
    true,
  );
  assert.equal(
    before("nl-en", "Uitvoerder GWW")
      .text.toLowerCase()
      .includes("civil works"),
    true,
  );
  assert.equal(
    after(
      "en-es",
      "Technician HVAC",
      "Técnico climatización",
      before("en-es", "Technician HVAC").info,
    ),
    "Técnico de climatización",
  );
  assert.equal(
    after(
      "en-es",
      "x",
      "Jefe de obra climatización",
      before("en-es", "x").info,
    ),
    "Jefe de obra de climatización",
  );
  assert.equal(
    after("en-es", "x", "Montador – Climatización", before("en-es", "x").info),
    "Montador – Climatización",
  );
  assert.equal(
    before("en-es", "HVAC Technician").text,
    "Técnico de climatización",
  );
});

test("the English X Manager as Responsable, not Gerente or Gestionnaire (s125)", () => {
  const at = (pair, en, out) => after(pair, en, out, before(pair, en).info);
  assert.equal(
    at("en-es", "Maintenance Manager", "Gerente de mantenimiento"),
    "Responsable de mantenimiento",
  );
  assert.equal(
    at("en-es", "Technical Manager", "Gerente Técnico"),
    "Responsable Técnico",
  );
  assert.equal(
    at("en-ca", "Warehouse Manager", "Gerent de magatzem"),
    "Responsable de magatzem",
  );
  assert.equal(
    at("en-fr", "Engineering Manager", "Gestionnaire d'ingénierie"),
    "Responsable d'ingénierie",
  );
  assert.equal(
    at("en-fr", "IT Project Manager", "Gestionnaire de projet informatique"),
    "Chef de projet informatique",
  );
  assert.equal(
    at("en-fr", "Property Manager", "Gestionnaire immobilier"),
    "Gestionnaire immobilier",
  );
  assert.equal(
    at("en-es", "General Manager", "Gerente general"),
    "Gerente general",
  );
  assert.equal(
    at("en-es", "Data Administrator", "Gerente de datos"),
    "Gerente de datos",
  );
  const lead = before("en-es", "Lead Supplier Quality Engineer");
  assert.equal(lead.info.said, "Leading");
  assert.equal(
    after(
      "en-es",
      "Lead Supplier Quality Engineer",
      "Ingeniero de calidad de proveedores",
      lead.info,
    ),
    "Ingeniero de calidad de proveedores líder",
  );
  assert.equal(before("en-es", "Lead Generation Specialist").info.said, "");
  assert.equal(
    before("en-ca", "Kitchen & Bathroom Fitter").text,
    "Instal·lador de cuines i banys",
  );
});

test("the British shift posts with their shift work (s126)", () => {
  assert.equal(
    before("en-es", "Electrical Shift Engineer").text,
    "Técnico de mantenimiento eléctrico a turnos",
  );
  assert.equal(
    before("en-fr", "Shift Maintenance Engineer").text,
    "Technicien de maintenance posté",
  );
  assert.equal(
    before("en-ca", "Multi-Skilled Shift Engineer").text,
    "Tècnic de manteniment a torns",
  );
  assert.equal(before("en-es", "Shift Technician").text, "Técnico a turnos");
  assert.equal(before("en-fr", "Shift Electrician").text, "Électricien posté");
  assert.equal(before("en-es", "Shift Leader").text, "Jefe de turno");
});

test("HVAC opening an English title after the job (s127)", () => {
  assert.equal(
    before("en-es", "HVAC Experienced Service Technician - all regions").info
      .said,
    "Experienced",
  );
  assert.equal(
    before(
      "en-es",
      "HVAC Experienced Service Technician - all regions",
    ).bare.startsWith("Service Technician HVAC"),
    true,
  );
  assert.equal(
    before("en-es", "HVAC Multi-technical Maintenance Technician").bare,
    "Multi-technical Maintenance Technician HVAC",
  );
  assert.equal(
    before("en-es", "HVAC Technician").text,
    "Técnico de climatización",
  );
  assert.equal(
    before("en-de", "HVAC Service Technician").bare,
    "HVAC Service Technician",
  );
  assert.equal(
    before("en-es", "HVAC Engineer in Aston").text.startsWith(
      "Técnico de climatización",
    ),
    true,
  );
  assert.equal(
    before("en-es", "HVAC fitter - Full-time").bare.startsWith("HVAC fitter"),
    true,
  );
  assert.equal(
    before("en-es", "Lead fitter – Electrical engineering").text.startsWith(
      "Montador jefe",
    ),
    true,
  );
  assert.equal(before("en-es", "Lead Software Engineer").info.said, "Leading");
});

test("Principal, Intermediate and a travelling Mobile are levels; Year Out, RIBA parts, night shifts (s128)", () => {
  assert.equal(
    before("en-es", "Principal Software Architect").info.said,
    "Principal",
  );
  assert.equal(
    before("en-es", "Principal Software Architect").bare,
    "Software Architect",
  );
  assert.equal(
    before("en-ca", "Intermediate Structural Engineer").info.said,
    "Mid-level",
  );
  assert.equal(
    before("en-es", "Mobile Maintenance Engineer").info.said,
    "Itinerant",
  );
  assert.equal(before("en-es", "Mobile Developer").info.said, "");
  assert.equal(before("en-es", "Mobile Crane Operator").info.said, "");
  assert.equal(before("en-es", "Mobile Plant Fitter").info.said, "");
  assert.equal(before("en-de", "Principal Engineer").info.said, "");
  assert.equal(
    before("en-es", "Year Out Surveyor").bare,
    "Surveyor – Internship",
  );
  assert.equal(
    before("en-es", "Part 2 Architectural Assistant").bare,
    "Architectural Assistant (RIBA Part 2)",
  );
  assert.equal(
    before("en-ca", "HGV Technician (Nightshift) - Newark").bare.includes(
      "(Night shift)",
    ),
    true,
  );
  assert.equal(
    before("en-ca", "White Goods Engineer").text,
    "Tècnic d'electrodomèstics",
  );
  assert.equal(before("en-es", "Safety Officer").text, "Técnico de prevención");
  assert.equal(before("en-es", "Bridge Engineer").info.expect.length, 0);
});

test("a lost trade with English words in front goes behind a stand-in, the words after it (s128)", () => {
  const info = {
    names: [],
    spans: [["Shift Manager", "Cap de torn", "cap de torn"]],
    firm: "",
  };
  assert.equal(
    lostNames(
      "Production Shift Manager",
      "Gerent de canvi de producció",
      info,
      false,
      "en-ca",
    ).text,
    "Kafka – Production",
  );
  assert.equal(
    lostNames(
      "Production Shift Manager",
      "Gerent de canvi de producció",
      info,
      false,
      "en-de",
    ),
    null,
  );
  assert.equal(
    lostNames(
      "Production Shift Manager",
      "Cap de torn de producció",
      info,
      false,
      "en-ca",
    ),
    null,
  );
  const hs = {
    names: [],
    spans: [
      [
        "Health and Safety Manager",
        "Responsable de prevenció de riscos laborals",
        "responsable de prevenció de riscos laborals",
      ],
    ],
    firm: "",
  };
  assert.equal(
    lostNames(
      "Regional Health and Safety Manager",
      "Responsable Regional de Seguretat i Salut",
      hs,
      false,
      "en-ca",
    ),
    null,
  );
});

test("a slash after a job word gets spaces; trades from French and German (s129)", () => {
  assert.equal(
    before("en-es", "Electrician/Mechatronics technician").bare,
    "Electrician / Mechatronics technician",
  );
  assert.equal(
    before("en-ca", "Turner/Milling machine operator").bare,
    "Turner / Milling machine operator",
  );
  assert.equal(before("en-es", "AI/ML Engineer").bare, "AI/ML Engineer");
  assert.equal(
    before("en-es", "Civil/Structural Engineer").bare,
    "Civil/Structural Engineer",
  );
  assert.equal(
    before("en-de", "Electrician/Mechatronics technician").bare,
    "Electrician/Mechatronics technician",
  );
  assert.deepEqual(before("fr-en", "Technicien usinage").info.expect, [
    "machining technician",
  ]);
  assert.deepEqual(before("fr-en", "Ingénieur Mécatronique").info.expect, [
    "mechatronics engineer",
  ]);
  assert.deepEqual(before("fr-en", "Technicien chauffagiste").info.expect, [
    "heating technician",
  ]);
  assert.deepEqual(before("de-en", "Nutzfahrzeugmechatroniker").info.expect, [
    "commercial vehicle mechatronics technician",
  ]);
  assert.deepEqual(before("de-en", "Baustoffprüfer").info.expect, [
    "building materials tester",
  ]);
  assert.equal(before("en-ca", "Masseur").text, "Massatgista");
});

test("Assistant before a professional job is a level; Jobs after the job; trades of the fifth mining (s130)", () => {
  assert.equal(before("en-es", "Assistant Site Manager").info.said, "Deputy");
  assert.equal(before("en-ca", "Deputy Project Manager").info.said, "Deputy");
  assert.equal(
    before("en-es", "Assistant Quantity Surveyor").info.said,
    "Deputy",
  );
  assert.equal(before("en-es", "Assistant Electrician").info.said, "");
  assert.equal(before("en-de", "Assistant Site Manager").info.said, "");
  assert.equal(
    before("en-ca", "MOT Tester Jobs | Flexible MOT Contracts").bare,
    "MOT Tester | Flexible MOT Contracts",
  );
  assert.equal(before("en-es", "Penetration Tester").text, "Pentester");
  assert.equal(
    before("en-ca", "Stress Engineer").text,
    "Enginyer de càlcul estructural",
  );
  assert.equal(
    before("nl-en", "Chefmonteur Elektrotechniek").info.expect.includes(
      "lead fitter",
    ),
    true,
  );
  assert.equal(
    before("nl-en", "Planvoorbereider Nieuwbouw").info.expect.includes(
      "work planner",
    ),
    true,
  );
});

test("no spaces around a slash between a word and itself (s131)", () => {
  assert.equal(before("en-es", "Turner/turner").bare, "Turner/turner");
  assert.equal(
    before("en-fr", "Turner/Turner CNC").bare.startsWith("Turner/Turner"),
    true,
  );
  assert.equal(
    before("en-es", "Electrician/Mechatronics technician").bare,
    "Electrician / Mechatronics technician",
  );
});

test('"Jobs" dropped only after a word naming a person (s132)', () => {
  assert.equal(
    before("en-ca", "MOT Tester Jobs | Flexible MOT Contracts").bare,
    "MOT Tester | Flexible MOT Contracts",
  );
  assert.equal(
    before("en-es", "Find IT special software Jobs").bare,
    "Find IT special software Jobs",
  );
});

test("Spanish and Catalan titles with both genders in full keep the first (s133)", () => {
  assert.equal(withoutGenders("Torner/tornera", "ca"), "Torner");
  assert.equal(
    withoutGenders(
      "Operaris/operàries de Manteniment Elèctric Industrial",
      "ca",
    ),
    "Operaris de Manteniment Elèctric Industrial",
  );
  assert.equal(
    withoutGenders("Enginyer/ Enginyera o Tècnic/ Tècnica RAM Elèctric", "ca"),
    "Enginyer o Tècnic RAM Elèctric",
  );
  assert.equal(
    withoutGenders("Torner/tornera Oficial/a CNC de 1a / 2a", "ca"),
    "Torner Oficial CNC de 1a / 2a",
  );
  assert.equal(
    withoutGenders("Técnico/Técnica de mantenimiento", "es"),
    "Técnico de mantenimiento",
  );
  assert.equal(withoutGenders("Jefe/Jefa de obra", "es"), "Jefe de obra");
  assert.equal(withoutGenders("Soldador/montador", "es"), "Soldador/montador");
  assert.equal(
    withoutGenders("Electricista/Fontanero", "es"),
    "Electricista/Fontanero",
  );
  assert.equal(
    withoutGenders("E/E System Architect – Vehicle Architecture", "es"),
    "E/E System Architect – Vehicle Architecture",
  );
  assert.equal(
    withoutGenders("Ingeniero de Software 5G / 5G NTN", "es"),
    "Ingeniero de Software 5G / 5G NTN",
  );
});

test('the Catalan "torner" is the table\'s turner (s134)', () => {
  assert.deepEqual(before("ca-en", "Torner").info.expect, ["turner"]);
  assert.deepEqual(before("ca-en", "Torner/tornera").info.expect, ["turner"]);
});

test("the whole set todo1: German heads and fields, French repairs and cut titles (s135)", () => {
  assert.equal(
    before("de-en", "Leiter Konstruktion").bare.startsWith(
      "Head of Konstruktion",
    ),
    true,
  );
  assert.equal(
    before(
      "de-en",
      "Bauleiter:in im Roh- und Schlüsselfertigbau",
    ).bare.includes("Rohbau und Schlüsselfertigbau"),
    true,
  );
  assert.equal(
    before("de-en", "SHK Anlagenmechaniker").bare.startsWith(
      "Anlagenmechaniker SHK",
    ),
    true,
  );
  assert.equal(before("de-en", "EMSR Ingenieur").bare, "E&I Ingenieur");
  assert.equal(
    before(
      "fr-en",
      "Dessinateur-projeteur / Dessinatrice-projeteuse en électricité-él",
    ).bare.endsWith("en électricité"),
    true,
  );
  assert.equal(
    before("fr-en", "Dépanneur Plombier Chauffagiste").bare,
    "Plombier Chauffagiste (réparations)",
  );
  assert.equal(
    before(
      "fr-en",
      "Technicien·ne dépanneur·se chauffagiste - permis B obligatoire",
    ).bare.startsWith("Technicien chauffagiste (réparations) -"),
    true,
  );
  assert.equal(before("fr-en", "Dépanneur").bare, "Dépanneur");
  assert.equal(
    before(
      "fr-en",
      "Technicien automaticien / Technicienne automaticienne de maintena",
    ).bare.endsWith("de maintenance"),
    true,
  );
  // A piece that could be two words is dropped rather than guessed ("en élect": électricité or électricien).
  assert.equal(
    before(
      "fr-en",
      "Dessinateur-projeteur / Dessinatrice-projeteuse d'études en élect",
    ).bare.endsWith("d'études"),
    true,
  );
  assert.deepEqual(before("de-en", "Kranmonteur").info.expect, [
    "crane fitter",
  ]);
});

test("the whole set todo1: English levels and words, titles of trades alone (s135)", () => {
  assert.equal(
    before("en-es", "CNC Press brake operator").info.whole,
    "Operario de plegadora CNC",
  );
  assert.equal(
    before("en-es", "EM Fault repair technician 2 shifts").info.whole,
    "Técnico de averías EM 2 turnos",
  );
  assert.equal(before("en-es", "Design Engineer Façade II").info.whole, "");
  assert.equal(before("de-en", "Bauleitender Monteur").info.whole, "");
  assert.equal(
    before("nl-en", "Storingstechnieker 2 ploegen of vaste nacht").info.whole,
    "",
  );
  const two = before("en-es", "Senior / Principal Civil Engineer");
  assert.equal(two.info.said, "Senior/Principal");
  assert.equal(
    after(
      "en-es",
      "Senior / Principal Civil Engineer",
      "Ingeniero civil",
      two.info,
    ),
    "Ingeniero civil sénior/principal",
  );
  assert.equal(
    before("en-ca", "Multi Skilled Plumber").info.said,
    "Multi-skilled",
  );
  assert.equal(before("en-es", "On-Site Plumber").bare, "Plumber");
  assert.equal(before("en-es", "Commercial Electrician").info.said, "");
  assert.equal(
    before("en-es", "Civil Engineering (Rail) – all levels").bare,
    "Civil Engineering (Railway sector) – all levels",
  );
  assert.equal(
    before("en-ca", "Civil Engineering (Rail) – all levels").text,
    "Civil Engineering (Ferrocarril) – all levels",
  );
  assert.equal(before("en-ca", "Railway Engineer").text, "Railway Engineer");
  assert.equal(
    before("en-es", "Rail Systems Engineer").bare,
    "Rail Systems Engineer",
  );
  assert.equal(
    before("en-es", "Install Engineer").bare,
    "Installation Engineer",
  );
  assert.equal(
    before("en-es", "Principal Flood Risk Consulant").bare,
    "Flood Risk Consultant",
  );
  assert.equal(
    before("en-es", "DfMA Designer - All grades").bare,
    "DfMA Designer - All levels",
  );
  assert.equal(
    before("en-es", "Senior Chartered Building Surveyor").info.said,
    "Senior Chartered",
  );
  assert.equal(
    before("en-ca", "Commercial Gas Engineer").info.said,
    "Commercial",
  );
  assert.equal(before("en-es", "Commercial Surveyor").info.said, "");
  assert.equal(
    before("en-ca", "Associate Engineering Manager").info.said,
    "Associate",
  );
  const d = before("en-ca", "Interim Building Surveyor");
  assert.equal(
    after("en-ca", "Interim Building Surveyor", "Aparellador", d.info),
    "Aparellador interí",
  );
  assert.deepEqual(before("nl-en", "Werfleider Afbraak").info.expect, [
    "site manager",
    "demolition",
  ]);
  assert.deepEqual(
    before("es-en", "Encargado/a de Obra Ferralla").info.expect,
    ["site foreman", "rebar"],
  );
});

test("the judged samples after s135: Oficial, kozijn, poorten, onsite, &(s136)", () => {
  assert.equal(
    before("en-ca", "Skilled tradesperson locksmith (EXPLUS 2022)").info.said,
    "",
  );
  assert.equal(before("en-ca", "Skilled Aircraft Fitter").info.said, "Skilled");
  assert.deepEqual(
    before("nl-en", "ZZP Timmerman / Kozijn monteur").info.expect.includes(
      "window frames",
    ),
    false,
  );
  assert.equal(
    before("nl-en", "Monteur kozijnen").info.expect.includes("window frames"),
    true,
  );
  assert.equal(
    before("nl-en", "Monteur hekwerken/poorten").info.expect.includes(
      "industrial doors",
    ),
    false,
  );
  assert.deepEqual(
    before("en-fr", "Blockchain Architect (2 days a month onsite)").info.expect,
    [],
  );
  assert.equal(
    before("en-es", "Site manager & construction technician").info.whole,
    "Jefe de obra y técnico de construcción",
  );
});

test("the long tail todo2: shifts, rotas, contracts, German, French and Dutch words, trades alone (s137)", () => {
  assert.equal(
    before("en-es", "M&E Shift Engineer").info.whole,
    "Técnico de mantenimiento a turnos M&E",
  );
  assert.equal(
    before("en-es", "Electrical Shift Engineer").info.whole,
    "Técnico de mantenimiento eléctrico a turnos",
  );
  assert.equal(
    before("en-es", "Grinder Setter Operator NIGHT Shift").bare,
    "Grinder Setter Operator (night shifts)",
  );
  assert.equal(
    before("en-es", "Maintenance Engineer (4 on 4 off)").bare,
    "Maintenance Engineer (4 working days, 4 days off)",
  );
  assert.equal(
    before("en-es", "Research Laboratory Technician (Fixed Term)").bare,
    "Research Laboratory Technician (temporary contract)",
  );
  assert.equal(
    before("en-es", "Static Building Services Engineer").bare.startsWith(
      "Building Services Engineer",
    ),
    true,
  );
  assert.equal(
    before("en-es", "Principal Civil Engineer Rail").bare,
    "Civil Engineer – Railway sector",
  );
  assert.equal(
    before("en-es", "Civil Engineering Undergraduate Placement").bare.includes(
      "Undergraduate",
    ),
    false,
  );
  assert.equal(
    before("de-en", "Geprüfter Polier - Hochbau").bare.startsWith(
      "Zertifizierter Polier",
    ),
    true,
  );
  assert.equal(
    before("fr-en", "Ingénieur - Technicien BE Electrotechnique").bare.includes(
      "bureau d'études",
    ),
    true,
  );
  assert.equal(
    before("fr-en", "Ingénieur commercial (BE)").bare.includes(
      "bureau d'études",
    ),
    false,
  );
  assert.equal(
    before("nl-en", "Werfleider Elektriciteit- meewerkend").bare.includes(
      "meewerkend",
    ),
    false,
  );
  assert.equal(
    before("en-es", "Fault repair technician 2 shifts Alken", "Alken").info
      .whole,
    "Técnico de averías 2 turnos Alken",
  );
  assert.equal(
    before("en-es", "Metalworker / industrial mechanic").info.whole,
    "Operario del metal / mecánico industrial",
  );
  assert.equal(
    before("de-en", String.fromCharCode(0x200b) + "Anlagenmechaniker").bare,
    "Anlagenmechaniker",
  );
});

test("the faults of s137 in the held samples: company and town of a title written whole, shifts, a word twice (s138)", () => {
  assert.equal(
    before("en-es", "Mechatronics technician - Kammann", "", "", "", "Kammann")
      .info.whole,
    "Técnico de mecatrónica - Kammann",
  );
  assert.equal(
    before("de-en", "Schlosser Iserlohn", "Iserlohn").info.whole,
    "Metalworker – Iserlohn",
  );
  assert.equal(
    bare("en-es", "Gear cutter - Day shift - Region Waregem"),
    "Gear cutter - Day shift - Region Waregem",
  );
  assert.equal(
    bare("en-es", "Maintenance technician permanent night shift").includes(
      "(night shifts)",
    ),
    false,
  );
  assert.equal(
    bare("en-es", "Mechanic in day shift - junior or experienced"),
    "Mechanic (day shifts) - junior or experienced",
  );
  assert.equal(
    bare("en-es", "Operator Biogas installation Day shift"),
    "Operator Biogas installation (day shifts)",
  );
  assert.equal(
    after(
      "en-fr",
      "MCN | (junior) fitter – Cold and refrigeration",
      "MCN | (junior) monteur – Froid et froid",
      before("en-fr", "MCN | (junior) fitter – Cold and refrigeration").info,
    ),
    "MCN | (junior) monteur – Froid",
  );
});

test("todo1 through s138: electrical engineering left to Firefox, the agricultural and construction machinery mechanic (s139)", () => {
  assert.equal(
    before("en-es", "Technician Electrical Engineering Cable Path Systems").info
      .expect.length,
    0,
  );
  assert.deepEqual(before("fr-en", "Technicien Electrotechnique").info.expect, [
    "electrical engineering",
  ]);
  assert.equal(
    before("de-en", "Land- und Baumaschinenmechaniker").info.whole,
    "Agricultural and construction machinery mechanic",
  );
  assert.equal(
    before("en-es", "Agricultural and construction machinery mechanics").info
      .whole,
    "Mecánico de maquinaria agrícola y de obra",
  );
});

test('backend, frontend and full stack after the job, in small letters and with no "de" (s140)', () => {
  // Into Spanish and Catalan moved after the job before Firefox, with the words between them; not into French.
  assert.equal(before("en-es", "Backend Developer").text, "Developer Backend");
  assert.equal(
    before("en-ca", "Front-end Software Engineer").text,
    "Software Engineer Front-end",
  );
  assert.equal(
    before("en-es", "Backend .NET Developer").text,
    "Developer .NET Backend",
  );
  assert.equal(
    before("en-es", "Backend/Frontend Developer").text,
    "Developer Backend/Frontend",
  );
  assert.equal(
    before("en-fr", "Full Stack AI Engineer").text,
    "Full Stack AI Engineer",
  );
  assert.equal(
    before("en-es", "Front End Loader Driver").text,
    "Front End Loader Driver",
  );
  assert.deepEqual(before("en-es", "Front-end loader operator").info.names, []);
  // After Firefox: the "de" out, the word small after another, the part left in front put after the job.
  const fix = (pair, src, raw) => after(pair, src, raw, before(pair, src).info);
  assert.equal(
    fix("en-es", "Backend Developer", "Desarrollador de Backend"),
    "Desarrollador backend",
  );
  assert.equal(
    fix(
      "en-ca",
      "Python Backend Developer",
      "Desenvolupador de backend de Python",
    ),
    "Desenvolupador backend de Python",
  );
  assert.equal(
    fix("en-fr", "Fullstack .NET Developer", "Fullstack .NET Développeur"),
    "Développeur fullstack .NET",
  );
  assert.equal(
    fix("en-fr", "Full stack developer .Net", "Full stack développeur .Net"),
    "Développeur full stack .Net",
  );
  assert.equal(
    fix("en-fr", "Software Engineer – Backend", "Ingénieur logiciel – Backend"),
    "Ingénieur logiciel – Backend",
  );
  assert.equal(
    fix("en-es", "BACKEND DEVELOPER", "DESARROLLADOR BACKEND"),
    "DESARROLLADOR BACKEND",
  );
  // A second pass puts them behind stand-ins too, as it does the company.
  const info = before("en-fr", "Full-stack .NET Developer").info;
  assert.deepEqual(
    lostNames(
      "Full-stack .NET Developer",
      "Full-stack . Développeur NET",
      info,
      false,
      "en-fr",
    ).put.map((p) => p[1]),
    [".NET", "Full-stack"],
  );
});

test("a code joined to a job word by a hyphen apart from it, and a manager in small letters (s140)", () => {
  assert.equal(before("en-es", "BIM-specialist").bare, "BIM specialist");
  assert.equal(
    before("en-es", "Controller / ERP-manager").bare,
    "Controller / ERP manager",
  );
  assert.equal(
    before("en-es", "AI-first developer").bare,
    "AI-first developer",
  );
  assert.equal(before("en-es", "HBO-starter").bare, "HBO-starter");
  assert.equal(
    after(
      "en-es",
      "BIM manager",
      "Gerente de BIM",
      before("en-es", "BIM manager").info,
    ),
    "Responsable de BIM",
  );
});

test("the day shift, a region, an expert technician, fully remote, presales and the smaller slips of the site (s140)", () => {
  const text = (pair, title, city = "") => before(pair, title, city).text;
  assert.equal(
    text("fr-en", "Électromécanicien | Journée | Région Diksmuide"),
    "Electromechanical technician | Day shift | région de Diksmuide",
  );
  assert.equal(
    text("fr-en", "Technicien - Région Est Rhône Alpes"),
    "Technicien - Région Est Rhône Alpes",
  );
  assert.equal(
    text("fr-en", "Ingénieur Matériel Région Bfc"),
    "Ingénieur Matériel Région Bfc",
  );
  assert.equal(
    text("fr-en", "Technicien Expert Après-Vente Automobile"),
    "Technicien expert – After-sales Automobile",
  );
  assert.equal(
    text("fr-en", "Technicien Expert en Diagnostic Automobile"),
    "Technicien expert en Diagnostic Automobile",
  );
  assert.equal(
    before("fr-en", "Technicien Expert Électricité Itinérant").info.level,
    "Itinerant",
  );
  assert.equal(
    before("en-es", "Business Analyst in Full Remote").bare,
    "Business Analyst Fully remote",
  );
  assert.equal(
    before("en-de", "Business Analyst – Full Remote").bare,
    "Business Analyst – Full Remote",
  );
  assert.equal(
    text("es-en", "Ingeniero/a Preventas"),
    "Ingeniero de Pre-sales",
  );
  assert.equal(
    before("fr-en", "Technord Belgium - Ingénieur Projet Data Center").info
      .firm,
    "Technord Belgium",
  );
  assert.equal(
    before("nl-en", "Service Technieker België - Vending").info.firm,
    "",
  );
  assert.equal(
    before("en-es", "The Netherlands - Meta must obtain a license").info.firm,
    "",
  );
  assert.ok(
    before("pt-en", "Maintenance Team Leader - Afternoon Shift").info.english,
  );
  assert.ok(
    !before("pt-en", "Técnico de Manutenção de Elevadores").info.english,
  );
  assert.equal(text("hu-en", "Szerkezet-szerelő"), "Structure installer");
  assert.equal(
    text("nl-en", "Servicemonteur bruggen en sluizen"),
    "Service technician bridges and canal locks",
  );
  assert.equal(
    text("nl-en", "Storingselektrieker"),
    "Fault repair electrician",
  );
  assert.equal(
    text("fr-en", "Electronicien-automaticien"),
    "Electronics and automation technician",
  );
  assert.equal(text("fr-en", "Dessinateur-projeteur"), "Draughtsman designer");
  // A title written with no accent at all takes them, but not in a town.
  assert.equal(
    text("fr-en", "Ingenieur Systemes Embarques"),
    "Ingénieur Systèmes Embarqués",
  );
  assert.equal(
    text(
      "fr-en",
      "Technicien de Laboratoire - Saint-Cyr-l'Ecole",
      "Saint-Cyr-l'Ecole",
    ),
    "Technicien de Laboratoire - Saint-Cyr-l'Ecole",
  );
  assert.equal(
    text("es-en", "Ingeniero de Procesos en Fabrica"),
    "Ingeniero de Procesos en Fábrica",
  );
  assert.equal(text("fr-en", "Ingénieur nucleaire"), "Ingénieur nucleaire");
  // The CAD and BIM managers keep their English names into Spanish and Catalan.
  assert.equal(before("en-es", "CAD Manager").info.whole, "CAD Manager");
  assert.deepEqual(before("en-ca", "BIM manager").info.expect, ["BIM Manager"]);
});

test("an English job word Firefox left before backend, frontend or full stack takes the language's own (s140)", () => {
  const fix = (pair, src, raw) => after(pair, src, raw, before(pair, src).info);
  assert.equal(
    fix(
      "en-ca",
      "Java Backend Developer - EY GDS Spain",
      "Java Developer backend - EY GDS Espanya",
    ),
    "Desenvolupador Java backend - EY GDS Espanya",
  );
  assert.equal(
    fix("en-ca", "Go Backend Engineer", "Go Engineer backend"),
    "Enginyer Go backend",
  );
  assert.equal(
    fix(
      "en-es",
      "Mobile - Full Stack Developer",
      "Móvil - Developer full stack",
    ),
    "Móvil - Desarrollador full stack",
  );
  assert.equal(
    fix("en-ca", "Staff Backend Engineer", "Staff Engineer backend"),
    "Staff Engineer backend",
  );
});

test("a trade's grade in Spain, «oficial de 1ª», is a level said in each language, not an officer", () => {
  assert.equal(
    before("es-en", "Electricista oficial de 1ª").info.level,
    "First-class",
  );
  assert.equal(
    before("es-en", "FONTANERO OFICIAL 1ª-2ª").info.level,
    "Qualified",
  );
  assert.equal(
    after(
      "es-en",
      "Oficial 2ª soldador",
      "Welder",
      before("es-en", "Oficial 2ª soldador").info,
    ),
    "Second-class Welder",
  );
  const say = (pair, en, out, lv) =>
    after(pair, en, out, before(pair, en, "", lv).info);
  assert.equal(
    say("en-de", "First-class Electrician", "Elektriker", "First-class"),
    "Elektriker (1. Klasse)",
  );
  assert.equal(
    say("en-fr", "First-class Electrician", "Électricien", "First-class"),
    "Électricien de première classe",
  );
  assert.equal(
    say("en-nl", "First-class Electrician", "Elektricien", "First-class"),
    "Eersteklas elektricien",
  );
  assert.equal(
    say("en-ca", "First-class Boilermaker", "Calderer", "First-class"),
    "Calderer oficial de primera",
  );
});

test("an Italian title reads its trade from the table, as the other languages do", () => {
  assert.equal(
    before("it-en", "Carrellista esperto/a").text,
    "Forklift operator esperto",
  );
  assert.equal(
    before("it-en", "FRESATORE CNC JUNIOR").text,
    "CNC miller Junior",
  );
  assert.equal(
    before("it-en", "Disegnatore tecnico").text,
    "Technical draughtsman",
  );
  assert.equal(
    before("it-en", "IDRAULICO INDUSTRIALE").text,
    "Plumber Industriale",
  );
});

test("a Polish title reads its trade from the table: no locksmith for a ślusarz, no lathe for a tokarz", () => {
  assert.equal(before("pl-en", "Ślusarz Narzędziowy").text, "Toolmaker");
  assert.equal(
    before("pl-en", "Tokarz/ Frezer CNC").text,
    "Turner/ Miller CNC",
  );
  assert.equal(before("pl-en", "Kierownik budowy").text, "Site manager");
  assert.equal(before("pl-en", "Automatyk").text, "Automation technician");
});

test("a Czech, Romanian or Portuguese metalworker is no locksmith, and a miller no milling machine", () => {
  assert.equal(before("cs-en", "Zámečník/ice").text, "Metalworker");
  assert.equal(before("ro-en", "Frezor").text, "Miller");
  assert.equal(
    before("pt-en", "Serralheiro Mecânico - Estremoz").text,
    "Metalworker - Estremoz",
  );
});

test("a Slovak, Hungarian, Croatian or Slovenian metalworker is no locksmith, and a turner no lathe", () => {
  assert.equal(
    before("hr-en", "Bravar / bravarica").text,
    "Metalworker / metalworker",
  );
  assert.equal(before("hu-en", "Esztergályos").text, "Turner");
  assert.equal(
    before("sk-en", "Zámočník oceľových konštrukcií").text,
    "Metalworker oceľových konštrukcií",
  );
});

test("an apprenticeship opening a German title is a level: «Aprendiz de …», not «… de aprendizaje»", () => {
  assert.equal(
    before("de-en", "Lehre Gleisbautechniker").info.level,
    "Apprentice",
  );
  assert.equal(before("de-en", "Lehrer Mathematik").info.level, "");
  const say = (pair, en, out, lv) =>
    after(pair, en, out, before(pair, en, "", lv).info);
  assert.equal(
    say(
      "en-es",
      "Track construction technician",
      "Técnico de construcción de vías",
      "Apprentice",
    ),
    "Aprendiz de técnico de construcción de vías",
  );
  assert.equal(
    say("en-ca", "Electrician", "Electricista", "Apprentice"),
    "Aprenent d'electricista",
  );
  assert.equal(
    say("en-fr", "Plumber", "Plombier", "Apprentice"),
    "Apprenti plombier",
  );
});

test("a German trade behind a code and a hyphen is read apart where that writes a trade in", () => {
  assert.equal(
    before("de-en", "RZ-Techniker/-in TGA Mechanik").text,
    "RZ technician building services Mechanik",
  );
  assert.equal(
    before("de-en", "DC-Monteur / PV-Monteur").text,
    "DC fitter / Photovoltaic panel installer",
  );
  assert.equal(
    before("de-en", "KFZ-Mechatroniker").text,
    "Automotive mechatronics technician",
  );
  assert.equal(before("de-en", "SAP-Berater FI/CO").text, "SAP-Berater FI/CO");
});

test("a gender mark with a separator before its bracket, in square brackets, or Polish «k», leaves the title", () => {
  const fix = (pair, src, raw) => after(pair, src, raw, before(pair, src).info);
  assert.equal(fix("de-en", "Monteur (m/w/d/)", "Fitter (m/f/d/)"), "Fitter");
  assert.equal(
    fix("pl-en", "Elektromechanik [k/m/d]", "Electromechanic [k/m/d]"),
    "Electromechanic",
  );
});

test("a leading «Oferta» or «Offre» with its number goes; «Oferta pública» and «Ofertas de empleo» stay", () => {
  assert.equal(
    before("es-en", "OFERTA 2020/2021-012: Se necesita TÉCNICO ELECTROMECÁNICO")
      .text,
    "Técnico Electromecánico",
  );
  assert.equal(
    before("es-en", "OFERTA DE EMPLEO PARA INGENIERO TÉCNICO FORESTAL").text,
    "Ingeniero Técnico Forestal",
  );
  assert.equal(
    before("es-en", "OFERTA CALDERERO SOLDADOR archivos").text,
    "Boilermaker-welder",
  );
  assert.equal(before("es-en", "Ofertas de empleo").text, "Ofertas de empleo");
  assert.equal(
    before("fr-en", "Offre de poste : Technicien télécom").text.startsWith(
      "De ",
    ),
    false,
  );
  assert.equal(
    before("fr-en", "Offre n°7 : 1 géomaticien").text.startsWith("N°"),
    false,
  );
});

test("Italian genders in full keep the first, and a feminine first in Spanish or Italian the masculine (8 November 2026)", () => {
  assert.equal(
    withoutGenders("Manutentore/manutentrice meccanico", "it"),
    "Manutentore meccanico",
  );
  assert.equal(
    withoutGenders("Lf 253155 - manutentore e manutentrice elettrica", "it"),
    "Lf 253155 - manutentore elettrica",
  );
  assert.equal(
    withoutGenders("ASCENSORISTI/E MANUTENTORI/TRICI", "it"),
    "ASCENSORISTI MANUTENTORI",
  );
  assert.equal(
    withoutGenders("ADDETTA/O ALLE PULIZIE", "it"),
    "ADDETTO ALLE PULIZIE",
  );
  assert.equal(
    withoutGenders("Autista e manutentore", "it"),
    "Autista e manutentore",
  );
  assert.equal(
    withoutGenders("TÉCNICA /O EN ELECTROMECANICA", "es"),
    "TÉCNICO EN ELECTROMECANICA",
  );
  assert.equal(
    withoutGenders("TECNICA/O MEDIA/O DE INFORMATICA", "es"),
    "TECNICO MEDIO DE INFORMATICA",
  );
});

test("a Spanish grade glued to the trade, with a point, a word's ending or «Ó DE» (8 November 2026)", () => {
  assert.equal(
    before("es-en", "OFICIAL 1ªMECÁNICO/A - MANRESA").info.level,
    "First-class",
  );
  assert.equal(
    before("es-en", "Oficial de 1.ª especialista eléctrico").text,
    "Especialista eléctrico",
  );
  assert.equal(
    before("es-en", "Mecánico PSR - Oficial de 1ra").info.level,
    "First-class",
  );
  assert.equal(
    before("es-en", "ELECTRICISTA OFICIAL DE 1ª Ó DE 2ª").info.level,
    "Qualified",
  );
});

test("a French «pôle» is a department, not Pôle emploi nor a name's (8 November 2026)", () => {
  assert.equal(
    bare("fr-en", "Responsable Pôle Data"),
    "Head of Département Data",
  );
  assert.equal(
    bare("fr-en", "Technicien pôle CNC"),
    "Technicien département CNC",
  );
  assert.equal(
    bare("fr-en", "Conseiller Pôle emploi"),
    "Conseiller Pôle emploi",
  );
  assert.equal(
    bare("fr-en", "Ingénieur pôle de compétitivité"),
    "Ingénieur pôle de compétitivité",
  );
  assert.equal(bare("fr-en", "S.M.POLE EQUILIBRE"), "S.m.pole Équilibre");
});

test("a Spanish «Oficial» before its trade in the English shown (8 November 2026)", () => {
  assert.equal(
    polish("es-en", "Skilled tradesperson Electrician"),
    "Skilled electrician",
  );
  assert.equal(
    polish("es-en", "Skilled tradesperson – Vehicle fitter (EXPLUS 2023)"),
    "Skilled vehicle fitter (EXPLUS 2023)",
  );
  assert.equal(
    polish("es-en", "Skilled tradesperson of Locksmith"),
    "Skilled locksmith",
  );
  assert.equal(
    polish("es-en", "Skilled tradesperson of Electricity (6 C.o.l.)"),
    "Skilled electrician (6 C.o.l.)",
  );
  assert.equal(
    polish("es-en", "Skilled tradesperson of Plumbing"),
    "Skilled plumber",
  );
  assert.equal(
    polish("es-en", "Skilled tradesperson – Electric"),
    "Skilled tradesperson – Electric",
  );
  assert.equal(
    polish("es-en", "Body repairer First-class tradesperson"),
    "First-class body repairer",
  );
});

test("an Italian «trasfertista» is itinerant, and more Italian trades are read (8 November 2026)", () => {
  assert.equal(
    bare("it-en", "MANUTENTORE TRASFERTISTA"),
    "Manutentore Itinerante",
  );
  assert.equal(bare("it-en", "Tecnici trasfertisti"), "Tecnici itineranti");
  assert.equal(
    before("it-en", "TECNICO FRIGORISTA SENIOR").text,
    "Refrigeration technician Senior",
  );
  assert.equal(
    before("it-en", "TUBISTA INDUSTRIALE").text,
    "Pipe fitter Industriale",
  );
  assert.equal(
    before("it-en", "CABLATORI QUADRI ELETTRICI").text,
    "Panel wirer",
  );
  assert.equal(before("it-en", "GEOMETRA DI CANTIERE").text, "Site surveyor");
});

test("Swedish trades read, «Ledig tjänst» and «sökes» out (8 November 2026)", () => {
  assert.equal(
    before("sv-en", "Ledig tjänst - Montör till vår kund i Älmhult").text,
    "Fitter till vår kund i Älmhult",
  );
  assert.equal(
    before("sv-en", "Erfaren plåtslagare sökes till RC Solutions AB i Karlstad")
      .text,
    "Erfaren sheet metal worker till RC Solutions AB i Karlstad",
  );
  assert.equal(before("sv-en", "Byggkalkylator").text, "Estimator");
  assert.equal(
    before("sv-en", "CNC-svarvare | Axido AB | Helsingborg").text,
    "CNC turner | Axido AB | Helsingborg",
  );
  assert.equal(
    after(
      "sv-en",
      "Bilplåtslagare / Skadetekniker",
      "Body repairer / Body repairer",
      before("sv-en", "Bilplåtslagare / Skadetekniker").info,
    ),
    "Body repairer",
  );
});

test("Danish sewer pipe layers and Finnish turners and platers read (8 November 2026)", () => {
  assert.equal(
    before("da-en", "Kloakrørlægger til no-dig og kloakservice").text,
    "Pipe layer til no-dig og kloakservice",
  );
  assert.equal(
    before("fi-en", "CNC-koneistaja / sorvaaja, Lahti").text,
    "CNC-koneistaja / turner, Lahti",
  );
  assert.equal(
    before("fi-en", "Peltiseppä Kajaaniin").text,
    "Sheet metal worker Kajaaniin",
  );
});

test("Czech car mechanics and pipe fitters read; a job said twice across a bar once (8 November 2026)", () => {
  assert.equal(
    before("cs-en", "AUTOMECHANIK (m/ž)").text,
    "Car mechanic (m/ž)",
  );
  // The marks written small, as «(m/ž)» is (NOA-10).
  assert.equal(before("cs-en", "POTRUBÁŘI (M+Ž)").text, "Pipe fitter (m+ž)");
  assert.equal(
    after(
      "cs-en",
      "MONTÉR | MONTÉRKA",
      "Fitter | Fitter - Start immediately",
      before("cs-en", "MONTÉR | MONTÉRKA").info,
    ),
    "Fitter - Start immediately",
  );
});

test("Spanish and Catalan half-time, and two jobs glued by a hyphen apart (8 November 2026)", () => {
  assert.equal(
    bare("es-en", "Desarrollador/a sénior media jornada"),
    "Desarrollador sénior a tiempo parcial",
  );
  assert.equal(
    bare("es-en", "Mecánico/a de Automóviles (Media Jornada)"),
    "Mecánico de Automóviles (A tiempo parcial)",
  );
  assert.equal(
    bare("ca-en", "Tècnic/a a mitja jornada"),
    "Tècnic a temps parcial",
  );
  assert.equal(
    bare("es-en", "Frigorista-Técnica/o de frío industrial Vigo"),
    "Frigorista - Técnico de frío industrial Vigo",
  );
  assert.equal(
    bare("es-en", "Tecnico/a Electricista-fontanero-frigorista"),
    "Técnico Electricista - fontanero - frigorista",
  );
  assert.equal(bare("es-en", "Técnico-comercial"), "Técnico-comercial");
  assert.equal(bare("es-en", "Electro-mecánico"), "Electro-mecánico");
});

test("an adjective before a dash between spaces does not hang the translator (TRA-01)", () => {
  const t0 = performance.now();
  const out = before(
    "en-es",
    "Embedded Systemsarchitecturevalidation Verification - Munich",
  ).text;
  assert.ok(performance.now() - t0 < 2000);
  assert.equal(
    out,
    "Embebido Systemsarchitecturevalidation Verification - Munich",
  );
  assert.equal(
    before("en-es", "Embedded Software Engineer").text,
    "Software Engineer embebido",
  );
});

// What is no gender mark stays, and each rule does what its comment says (the audit's TRA-14 and TRA-15).
test("a pair of capitals, a licence class, a second town and «Innendienst» are no gender marks", () => {
  assert.deepEqual(
    [
      withoutGenders("Ingeniero/a de Q/A", "es"),
      withoutGenders("Tècnic/a de manteniment - Girona/La Bisbal", "ca"),
      withoutGenders("OFICIAL/LA", "ca"),
      withoutGenders("Mitarbeiter Vertrieb/Innen- und Außendienst", "de"),
      withoutGenders("Elektriker / in Vollzeit", "de"),
      withoutGenders("Rundschleifer/ in", "de"),
    ],
    [
      "Ingeniero de Q/A",
      "Tècnic de manteniment - Girona/La Bisbal",
      "OFICIAL",
      "Mitarbeiter Vertrieb/Innen- und Außendienst",
      "Elektriker / in Vollzeit",
      "Rundschleifer",
    ],
  );
  const out = (pair, t, raw) => after(pair, t, raw, before(pair, t).info);
  assert.deepEqual(
    [
      out(
        "de-en",
        "Sachbearbeiter Kundendienst D/F 80%",
        "Customer service clerk D/F 80%",
      ),
      out(
        "de-en",
        "Staplerfahrer mit Führerschein (A)",
        "Forklift driver with licence (A)",
      ),
      out("de-en", "Techniker H/F", "Technician H/F"),
      out("de-en", "Elektriker in Baden Baden", "Electrician in Baden Baden"),
    ],
    [
      "Customer service clerk D/F 80%",
      "Forklift driver with licence (A)",
      "Technician",
      "Electrician in Baden Baden",
    ],
  );
});
test("«Oferta de Empleo Público», «Job Coach» and «meewerkend voorman» are kept; «Civil» and «Albañil» take no «de»", () => {
  assert.deepEqual(
    [
      bare(
        "es-en",
        "Oferta de Empleo Público 2025: Ingeniero Técnico Industrial",
      ),
      bare("de-en", "Job Coach für Jugendliche"),
      bare("de-en", "Job: Elektriker"),
      bare("nl-en", "Meewerkend voorman"),
      bare("nl-en", "Elektricien meewerkend"),
      bare("es-en", "Ingeniero Civil"),
      bare("es-en", "Oficial Albañil"),
      bare("es-en", "Técnico Mantenimiento"),
    ],
    [
      "Oferta de Empleo Público 2025: Ingeniero Técnico Industrial",
      "Job Coach für Jugendliche",
      "Elektriker",
      "Meewerkend voorman",
      "Elektricien",
      "Ingeniero Civil",
      "Oficial Albañil",
      "Técnico de Mantenimiento",
    ],
  );
});
test("the words moved after a trade start where they stand, when a later one repeats the first", () => {
  assert.equal(
    wordsAfter("Tyre and Tyre Service fitter", ["fitter"]),
    "Fitter – Tyre and Tyre Service",
  );
});
