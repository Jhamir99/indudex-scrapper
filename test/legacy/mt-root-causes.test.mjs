// The legacy's test/mt-root-causes.test.mjs (JustJans/indudex@ec79858), carried whole (legacy resync T009): its imports pointed at
// this repo.
// ➤ Faults fixed at their root cause: one definition of each concept the translator reads (owner rule, 17 November 2026).
import { test } from "vitest";
import assert from "node:assert/strict";
import {
  after,
  before,
} from "../../src/features/title-translation/method/method.ts";
import { withMarks } from "../../src/features/title-translation/method/marks.ts";
import { translateTitles } from "../../src/features/title-translation/legs.ts";
import { correct } from "../../src/features/title-translation/method/corrections.ts";
import {
  LEVEL_SAY,
  sayLevels,
} from "../../src/features/title-translation/method/levels.ts";

test("a French contract is named once, in the English, and every language writes it from the glossary", async () => {
  const JOB = {
    en: "Welder",
    es: "Soldador",
    ca: "Soldador",
    de: "Schweißer",
    fr: "Soudeur",
  };
  const engine = {
    translate: async (pair, texts) =>
      texts.map((t) => t.replace(/Soudeur|Welder/, JOB[pair.slice(3)])),
    aina: null,
  };
  const fr = await translateTitles(
    "fr",
    ["Soudeur CDI"],
    { into: ["en", "es", "ca", "de"] },
    engine,
  );
  assert.deepEqual(
    [fr.en[0], fr.es[0], fr.ca[0], fr.de[0]],
    [
      "Welder – Permanent contract",
      "Soldador – Contrato indefinido",
      "Soldador – Contracte indefinit",
      "Schweißer – Unbefristet",
    ],
  );
  const en = await translateTitles(
    "en",
    ["Welder - Fixed Term"],
    { into: ["es", "fr"] },
    engine,
  );
  assert.deepEqual(
    [en.es[0], en.fr[0]],
    ["Soldador - Contrato temporal", "Soudeur - CDD"],
  );
});

test("IT titles: a bare gender mark, the levels short forms, tech names read one way", () => {
  assert.equal(
    before("fr-en", "Développeur C# H/F").text,
    "C# Developer (H/F)",
  );
  assert.equal(
    before("fr-en", "Développeur Full Stack H/F").text,
    "Full Stack Developer (H/F)",
  );
  assert.equal(
    before("en-es", "Embedded Software Engineer C/C++").text,
    "Software Engineer embebido C/C++",
  );
  assert.equal(before("en-es", "C# .NET Developer").text, "Developer C# .NET");
  assert.equal(
    before("en-es", ".NET Programmer Analyst").text,
    ".NET Programmer Analyst",
  );
  const net = before("en-es", "C# .NET Developer");
  assert.equal(
    after("en-es", "C# .NET Developer", "C# .NET Desarrollador", net.info),
    "Desarrollador C# .NET",
  );
  for (const [pair, title] of [
    ["es-en", "Programador PHP Jr"],
    ["ca-en", "Desenvolupador Java Sr."],
    ["en-es", "Snr Electrician"],
  ])
    assert.doesNotMatch(before(pair, title).text, /\b(?:Jr|Sr|Snr)\b/, title);
  assert.equal(
    before("en-es", "Scrum Master / Product Owner").info.names.length,
    2,
  );
});

test("every long dash is read as the en dash", () => {
  assert.equal(
    before("en-es", "CNC Machinist — Days").info.whole,
    before("en-es", "CNC Machinist – Days").info.whole,
  );
  assert.equal(before("es-en", "Electricista — Urgente").text, "Electrician");
});

test("a language after the job is the language spoken, not a field: no «de»", () => {
  for (const [pair, title] of [
    ["es-en", "Técnico Italiano"],
    ["es-en", "Técnica Portuguesa"],
    ["ca-en", "Tècnic Francès"],
    ["ca-en", "Tècnic Italià"],
  ])
    assert.equal(before(pair, title).text, title);
});

test("Spanish and Catalan mark the same trades: both tables hold the glossary trades", () => {
  for (const [text, lang, want] of [
    ["Conductor de camió", "ca", "Conductor/a de camió"],
    ["Carpintero", "es", "Carpintero/a"],
    ["Operari de planta", "ca", "Operari/ària de planta"],
    ["Mozo de almacén", "es", "Mozo/a de almacén"],
    ["Electricista", "es", "Electricista"],
    ["Sector químic", "ca", "Sector químic"],
  ])
    assert.equal(withMarks(text, lang), want, text);
});

test("a country as the offer's town is translated, whichever language names it (one country table)", () => {
  for (const [pair, title, city] of [
    ["en-es", "Welder – United Kingdom", "United Kingdom"],
    ["en-es", "Welder – Ireland", "Ireland"],
    ["pl-en", "Spawacz – Polska", "Polska"],
  ])
    assert.deepEqual(before(pair, title, city).info.names, [], title);
});

test("product names kept as names and the proposal engineer from the glossary, not corrected after Firefox", () => {
  for (const [title, name] of [
    ["ServiceNow Solution Architect", "ServiceNow"],
    ["SAP SuccessFactors Consultant", "SuccessFactors"],
    ["Identity Architect | Azure AD/Entra ID", "Entra ID"],
    ["Engineering Manager (Red Team)", "Red Team"],
    ["Senior Data Analyst, People Analytics", "People Analytics"],
    ["Guidewire Developer", "Guidewire"],
    ["Full - stack developer", "Full-stack"],
  ])
    assert.ok(before("en-es", title).info.names.includes(name), title);
  assert.equal(
    before("en-es", "Proposals Engineer").info.whole,
    "Ingeniero de ofertas",
  );
  assert.equal(
    before("en-ca", "Proposal Engineer").info.whole,
    "Enginyer d'ofertes",
  );
});

test("«Staff» before a role, and «Lead» into French, Dutch and German, kept as names", () => {
  for (const [pair, title, want] of [
    [
      "en-es",
      "Staff Security Operations & Vulnerability Management Engineer",
      ["Staff"],
    ],
    ["en-de", "Senior Staff Data Scientist", ["Staff"]],
    ["en-es", "Member of Technical Staff, Infrastructure Engineer", []],
    ["en-es", "Medical Staff Coordinator", []],
    ["en-nl", "Software Engineering Lead", ["Lead"]],
    ["en-de", "Lead-Acid Battery Engineer", []],
  ])
    assert.deepEqual(before(pair, title).info.names, want, title);
});

test("«Operator» kept as a name into German and Dutch, which write it in English", () => {
  for (const [pair, title] of [
    ["en-de", "CNC operator"],
    ["en-nl", "Production Operator"],
  ])
    assert.ok(
      before(pair, title).info.names.some((n) => /^operator$/i.test(n)),
      title,
    );
  assert.ok(
    !before("en-es", "Production Operator").info.names.includes("Operator"),
  );
});

test("the welding process goes before the trade in English, as the machine code does", () => {
  for (const [title, want] of [
    ["Soldador TIG", "TIG welder"],
    ["Soldador MIG-MAG – Turno de noche", "MIG/MAG welder – Night shift"],
    ["Delineante CAD", "CAD draughtsman"],
  ])
    assert.equal(before("es-en", title).info.whole, want, title);
});

test("French non-destructive testing and automation are written in before Firefox, not patched after it", () => {
  for (const [title, want] of [
    ["Technicien contrôle non destructif", "non-destructive testing"],
    ["Contrôleurs non destructifs", "NDT inspector"],
    ["Chef de Projets Automatisme", "Automation"],
    ["Électricien automatismes industriels", "industrial automation"],
    ["TECHNICIEN AUTOMATISME", "Automation technician"],
  ])
    assert.ok(before("fr-en", title).text.includes(want), title);
  assert.equal(
    before("en-es", "Non-destructive testing technician").text,
    "Non-destructive testing technician",
  );
});

test("German «Sanitär» and Dutch «sanitair» are read as plumbing before Firefox", () => {
  assert.equal(before("de-en", "Sanitärinstallateurin").info.whole, "Plumber");
  assert.equal(before("fr-en", "INSTALLATEUR SANITAIRE").info.whole, "Plumber");
  assert.ok(
    before("de-en", "Anlagenmechaniker (m,w,d) Heizung, Sanitär").text.includes(
      "Plumbing",
    ),
  );
  assert.ok(before("nl-en", "Monteur sanitair").text.includes("plumbing"));
  assert.equal(before("de-en", "Sanitäter").text, "Sanitäter");
  assert.ok(
    before("fr-en", "Responsable sécurité sanitaire").text.includes(
      "sanitaire",
    ),
  );
});

test("German «Objektplanung» and «Objektleiter» are named before Firefox", () => {
  assert.ok(
    before("de-en", "Architekt Objektplanung").text.includes("design planning"),
  );
  assert.ok(
    before("de-en", "Ingenieur Objekt- und Tragwerksplanung").text.includes(
      "design and structural planning",
    ),
  );
  assert.ok(
    before("de-en", "Objektleiter HKLS m/w/d").text.startsWith("Site manager"),
  );
  assert.ok(
    before("de-en", "Objektleiterin Gebäudereinigung").text.startsWith(
      "Property manager",
    ),
  );
  assert.ok(
    before("de-en", "Objektleiter Schiffbau").text.startsWith("Objektleiter"),
  );
  assert.ok(
    before("de-en", "Projektleiter Objekt- und Gebäudefunk").text.includes(
      "Objekt- und Gebäudefunk",
    ),
  );
});

test("German and Italian terms of the post are named in English before Firefox", () => {
  for (const [pair, title, want] of [
    ["de-en", "Elektroingenieur - ab sofort", "immediate start"],
    [
      "de-en",
      "CNC-Drehen - Befristet/Unbefristet",
      "Fixed-term contract/Permanent contract",
    ],
    ["de-en", "Architekt*in, Tübingen (unbefristet)", "(permanent contract)"],
    [
      "de-en",
      "Elektriker (unbefristete Festanstellung)",
      "(permanent contract)",
    ],
    [
      "it-en",
      "Progettista meccanico - Tempo indeterminato",
      "Permanent contract",
    ],
    ["it-en", "Elettricista a tempo determinato", "fixed-term contract"],
  ])
    assert.ok(before(pair, title).text.includes(want), title);
});

test("a Swedish compound ending in a trade is read apart before Firefox", () => {
  for (const [title, want] of [
    ["Fiberprojektör", "Fiber design engineer"],
    ["KABELPROJEKTÖRER", "Kabel design engineer"],
    ["CAD-Projektör", "CAD Design engineer"],
    [
      "Elprojektör till växande installationsbolag i Malmö",
      "Electrical design engineer till",
    ],
    ["Bilplåtslagare", "Body repairer"],
  ])
    assert.ok(before("sv-en", title).text.startsWith(want), title);
});

test("an Italian «cantiere» is a site, and a shipyard only where it builds boats", () => {
  assert.equal(before("it-en", "GEOMETRA DI CANTIERE").text, "Site surveyor");
  assert.ok(
    before("it-en", "Elettricista industriale di cantiere").text.endsWith(
      "site",
    ),
  );
  assert.ok(
    before("it-en", "Carpentiere per cantiere navale").text.endsWith(
      "shipyard",
    ),
  );
  assert.equal(
    before("en-es", "Construction site worker").text,
    "Construction site worker",
  );
});

test("a Spanish or Catalan «administrador» is named an administrator before Firefox", () => {
  assert.ok(
    before("es-en", "Administrador de Bases de Datos DB2").text.startsWith(
      "Administrator de",
    ),
  );
  assert.ok(
    before("ca-en", "Administradors de xarxes").text.startsWith(
      "Administrator de",
    ),
  );
  assert.ok(
    before("es-en", "Gerente y administrador de sistemas").text.startsWith(
      "Gerente y administrator",
    ),
  );
  assert.equal(
    before("es-en", "Administrador de fincas").info.whole,
    "Property manager",
  );
});

test("a fitter is read in every language that names one, so Firefox never writes a mounter", () => {
  for (const [pair, title] of [
    ["de-en", "Monteure gesucht"],
    ["de-en", "MONTEURS"],
    ["nl-en", "Monteurs gezocht"],
    ["pl-en", "Montażysta"],
    ["pl-en", "MONTER SIECI WODNYCH I KANALIZACYJNYCH"],
    ["cs-en", "Montér elektro"],
  ])
    assert.ok(before(pair, title).text.startsWith("Fitter"), title);
});

test("words one language says its own way are glossary readings, not steps of their own", () => {
  assert.equal(
    before("en-es", "Technical Estimator").text,
    before("en-es", "Estimator").text,
  );
  assert.ok(
    before("nl-en", "Ontwerper bruggen en sluizen").text.includes(
      "bridges and canal locks",
    ),
  );
  assert.equal(
    before("hu-en", "Szerkezetszerelők").text,
    "Structure installer",
  );
  assert.equal(
    before("es-en", "Instalador de tuberías,en general").bare,
    "Instalador de tuberías",
  );
  assert.equal(before("en-es", "SR. Software Engineer").info.said, "Senior");
  assert.ok(
    before("en-es", "Nokia SR Linux Engineer").bare.includes("SR Linux"),
  );
});

test("an Italian «trasfertista» is a level, taken out before Firefox and said after it", () => {
  const title = "Elettricista trasfertista";
  const prepared = before("it-en", title);
  assert.equal(prepared.text, "Elettricista");
  assert.equal(
    after("it-en", title, "Electrician", prepared.info),
    "Itinerant electrician",
  );
});

test("Dutch and German words Firefox misread are glossary readings or levels", () => {
  for (const [pair, title, want] of [
    ["nl-en", "Ontwerper kunstwerken", "civil structures"],
    ["nl-en", "Constructief Projectleider", "Structural"],
    ["nl-en", "Startende Werkvoorbereider Utiliteit", "Junior Work planner"],
    ["de-en", "Schrauber mit Erfahrung gesucht", "Mechanic"],
    ["de-en", "HOLZTECHNIKER ALS TECHNISCHER KONSTRUKTEUR", "Wood technician"],
  ])
    assert.ok(before(pair, title).text.includes(want), title);
  assert.equal(
    before("de-en", "Jungbauleiter Tief- und Straßenbau").info.level,
    "Junior",
  );
  assert.equal(before("de-en", "Junge Talente gesucht").info.level, "");
});

test("a graded tradesperson is written «vakman» before Firefox, and a word said twice is said once", () => {
  assert.equal(
    before("en-nl", "Second-class tradesperson electrician").text,
    "Vakman electrician",
  );
  assert.equal(
    correct("Soldador polivalente", "Soldador polivalente polivalente", "es"),
    "Soldador polivalente",
  );
});

test("«prácticas» in a job title is an internship, and «buenas prácticas» good practice", () => {
  assert.equal(
    before("ca-en", "Pràctiques en Ciberseguretat").text,
    "Internship en Ciberseguretat",
  );
  assert.equal(
    before("ca-en", "Bones pràctiques de seguretat").text,
    "Good practice de seguretat",
  );
});

test("the Swiss «Dipl.» is a level, said the target way, and agrees with a woman’s job", () => {
  const title = "Dipl. Techniker/in HF Tiefbau";
  const prepared = before("de-en", title);
  assert.equal(prepared.info.level, "Dipl.");
  assert.equal(
    after("de-en", title, "Technician HF civil works", prepared.info),
    "Dipl. Technician HF civil works",
  );
  assert.equal(
    before("de-en", "Eidg. dipl. Elektroinstallateur").info.level,
    "",
  );
  assert.equal(
    before("de-en", "Bauingenieur (Dipl. Ing. / M.Sc.)").info.level,
    "",
  );
  assert.equal(
    sayLevels("Técnico – HF", ["Dipl."], LEVEL_SAY.es),
    "Técnico titulado – HF",
  );
  assert.equal(
    sayLevels("Enfermera – HF", ["Dipl."], LEVEL_SAY.es),
    "Enfermera titulada – HF",
  );
  assert.equal(
    sayLevels("Infermeres", ["Dipl."], LEVEL_SAY.ca),
    "Infermeres titulades",
  );
  assert.equal(
    sayLevels("Especialista", ["Dipl."], LEVEL_SAY.es),
    "Especialista titulado",
  );
  assert.equal(
    sayLevels("Technicien – ES", ["Dipl."], LEVEL_SAY.fr),
    "Technicien dipl. – ES",
  );
});
