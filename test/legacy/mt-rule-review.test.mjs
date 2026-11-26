// The legacy's test/mt-rule-review.test.mjs (JustJans/indudex@ec79858), carried whole (legacy resync T009): its imports pointed at
// this repo.
// Faults a review of the finishing rules found (16 November 2026), each with the title that showed it.
import { test } from "vitest";
import assert from "node:assert/strict";
import {
  after,
  before,
  polish,
} from "../../src/features/title-translation/method/method.ts";
import {
  apostrophes,
  catalanSpelling,
} from "../../src/features/title-translation/method/catalan-spelling.ts";
import { correct } from "../../src/features/title-translation/method/corrections.ts";
import {
  jobDashEn,
  tidyEnglish,
} from "../../src/features/title-translation/method/english-tidy.ts";
import { withoutGenders } from "../../src/features/title-translation/method/genders.ts";
import {
  dutchOr,
  withDe,
} from "../../src/features/title-translation/method/method-tables.ts";
import { hasTrade } from "../../src/features/title-translation/method/checks.ts";
import { contractsNamed } from "../../src/features/title-translation/method/contracts.ts";
import {
  LEVEL_SAY,
  sayLevels,
} from "../../src/features/title-translation/method/levels.ts";

const finish = (pair, title, out, info = {}) =>
  after(pair, title, out, { mid: [], ...info });

test("a level put in front keeps the capital of a name", () => {
  assert.equal(
    finish("es-en", "Desarrollador Java Senior", "Java developer", {
      level: "Senior",
    }),
    "Senior Java developer",
  );
  assert.equal(
    finish("es-en", "Jefe de proyecto Senior", "Project manager", {
      level: "Senior",
    }),
    "Senior project manager",
  );
  assert.equal(
    sayLevels(
      "Java-ontwikkelaar",
      ["Senior"],
      LEVEL_SAY.nl,
      "Senior Java Developer",
    ),
    "Senior Java-ontwikkelaar",
  );
  assert.equal(
    sayLevels("Ontwikkelaar", ["Senior"], LEVEL_SAY.nl, "Senior Developer"),
    "Senior ontwikkelaar",
  );
});

test("a German multi-skilled worker is an Allround one, wherever it stands", () => {
  assert.equal(
    correct(
      "Multi-skilled electrician",
      "Elektriker Multi-Skilled (m/w/d)",
      "de",
    ),
    "Elektriker Allround (m/w/d)",
  );
  assert.equal(
    correct("Multi-skilled electrician", "Multi-Skilled Elektriker", "de"),
    "Allround-Elektriker",
  );
});

test("words that only look said twice, a gender ending or a railway part stay", () => {
  assert.equal(
    finish("en-de", "Pre-Sales / Sales Engineer", "Pre-Sales / Sales Engineer"),
    "Pre-Sales / Sales Engineer",
  );
  assert.equal(
    withoutGenders("Teamleiter Finance/R&D", "de"),
    "Teamleiter Finance/R&D",
  );
  assert.equal(
    withoutGenders("Staatlich Geprüfte/R Techniker", "de"),
    "Staatlich Geprüfter Techniker",
  );
  assert.equal(
    before("en-de", "Project Engineer - Light Rail").bare,
    "Project Engineer - Light Rail",
  );
  assert.equal(
    before("en-de", "Civil Engineer Rail").bare,
    "Civil Engineer – Railway sector",
  );
});

test("a correction keeps the number of what it corrects", () => {
  assert.equal(
    correct("Senior network engineer", "Ingénieur réseau aîné", "fr"),
    "Ingénieur réseau senior",
  );
});

test("Catalan takes the apostrophe before a silent «h» and on «la»", () => {
  const spelt = (t) => apostrophes(catalanSpelling(t));
  assert.equal(spelt("Tècnic de hidràulica"), "Tècnic d'hidràulica");
  assert.equal(spelt("Tècnic del hospital"), "Tècnic de l'hospital");
  assert.equal(spelt("Responsable de el hotel"), "Responsable de l'hotel");
  assert.equal(spelt("Tècnic de hardware"), "Tècnic de hardware");
  assert.equal(spelt("Tècnic de la empresa"), "Tècnic de l'empresa");
  assert.equal(spelt("Cap de la àrea"), "Cap de l'àrea");
  assert.equal(spelt("Tècnic de la universitat"), "Tècnic de la universitat");
  assert.equal(spelt("Tècnic de la història"), "Tècnic de la història");
  assert.equal(spelt("Tècnic de El Vendrell"), "Tècnic de El Vendrell");
});

test("Spanish gender marks and the agreement of the words the rules write", () => {
  assert.equal(
    withoutGenders("Delegado comercial Galicia / A Coruña", "es"),
    "Delegado comercial Galicia / A Coruña",
  );
  assert.equal(withoutGenders("Ingeniero/a Senior", "es"), "Ingeniero Senior");
  assert.equal(
    correct("Steel and iron worker", "Trabajador de acero e hierro", "es"),
    "Trabajador de acero y hierro",
  );
  assert.equal(
    correct("History", "Técnico de arte e historia", "es"),
    "Técnico de arte e historia",
  );
});

test("levels agree with their job, and a field ending in a job takes no dash", () => {
  assert.equal(
    sayLevels("Fachkraft für Lagerlogistik", ["Experienced"], LEVEL_SAY.de, ""),
    "Erfahrene Fachkraft für Lagerlogistik",
  );
  assert.equal(
    sayLevels("Elektriker", ["Experienced"], LEVEL_SAY.de, ""),
    "Erfahrener Elektriker",
  );
  assert.equal(
    sayLevels("Operarios de producción", ["Multi-skilled"], LEVEL_SAY.es, ""),
    "Operarios de producción polivalentes",
  );
  assert.equal(
    sayLevels("Operaris de producció", ["Multi-skilled"], LEVEL_SAY.ca, ""),
    "Operaris de producció polivalents",
  );
  assert.equal(
    sayLevels("Enginyers", ["Senior"], LEVEL_SAY.ca, ""),
    "Enginyers sènior",
  );
  assert.equal(
    sayLevels("Elektricien", ["Second-class"], LEVEL_SAY.nl, ""),
    "Elektricien (niveau 2)",
  );
  assert.equal(
    jobDashEn("Developer Relations Engineer"),
    "Developer Relations Engineer",
  );
  assert.equal(jobDashEn("Painter Decorator"), "Painter Decorator");
  assert.equal(
    jobDashEn("Maintenance technician automatic closures"),
    "Maintenance technician – automatic closures",
  );
  assert.equal(
    correct(
      "Remote Desktop support engineer",
      "Ingeniero de soporte de Remote Desktop",
      "es",
    ),
    "Ingeniero de soporte de Remote Desktop",
  );
});

test("a word changed for Spain keeps its adjective agreeing, and words are read in their own context", () => {
  assert.equal(
    finish(
      "en-es",
      "Quantum computer engineer",
      "Ingeniero de computadoras cuánticas",
    ),
    "Ingeniero de ordenadores cuánticos",
  );
  assert.equal(
    finish(
      "en-es",
      "Paid engineering internship",
      "Pasantía remunerada de ingeniería",
    ),
    "Prácticas remuneradas de ingeniería",
  );
  assert.equal(
    finish("en-es", "Internship for students", "Pasantía para estudiantes"),
    "Prácticas para estudiantes",
  );
  assert.equal(
    finish("nl-en", "Machinist goederenvervoer", "Machinist freight transport"),
    "Train driver freight transport",
  );
  assert.equal(
    finish(
      "nl-en",
      "Machinist inspectievoertuigen",
      "Machinist inspection vehicles",
    ),
    "Machine operator inspection vehicles",
  );
  assert.equal(
    correct(
      "Vigilante con rondas, turno de noche",
      "Security guard with rounds, night shift",
      "en",
    ),
    "Security guard with rounds, night shift",
  );
  assert.equal(
    before("es-en", "Contrato de media jornada").bare,
    "Contrato a tiempo parcial",
  );
});

test("gender marks: German stems that change, French and Catalan plurals, Spanish /A before a capital", () => {
  for (const [lang, title, out] of [
    ["de", "Pflegefachfrau/-mann", "Pflegefachmann"],
    ["de", "Koch/Köchin", "Koch"],
    ["de", "Experte/Expertin", "Experte"],
    ["de", "Maler/Berlin", "Maler/Berlin"],
    ["fr", "Opérateur.rice.s", "Opérateurs"],
    ["fr", "Conseiller/ère", "Conseiller"],
    ["fr", "Chef de projet / e-commerce", "Chef de projet / e-commerce"],
    ["es", "Operario/A Producción", "Operario Producción"],
    ["es", "Hospital Lugo/A Coruña", "Hospital Lugo/A Coruña"],
    ["ca", "Operaris/àries", "Operaris"],
    ["ca", "Encarregats/ades", "Encarregats"],
  ])
    assert.equal(withoutGenders(title, lang), out, title);
});

test('no "de" before an adjective or a trade that ends like a field', () => {
  for (const [lang, title] of [
    ["es", "Ingeniero agrónomo"],
    ["es", "Técnico experto"],
    ["es", "Operario nocturno"],
    ["es", "Técnico Topógrafo"],
    ["es", "Mecánico Diésel"],
    ["ca", "Oficial fontaner"],
    ["ca", "Enginyer agrònom"],
  ])
    assert.equal(withDe(title, lang), title);
  assert.equal(withDe("Mecànic taller", "ca"), "Mecànic de taller");
});

test('"VP of" keeps its "of" in a Dutch title', () => {
  assert.equal(dutchOr("VP of R&D"), "VP of R&D");
  assert.equal(dutchOr("SAP of ABAP"), "SAP or ABAP");
});

test("second leg into German: levels joined to the job, compounds count as the trade", () => {
  assert.equal(
    sayLevels("Monteur", ["Multi-skilled"], LEVEL_SAY.de),
    "Allround-Monteur",
  );
  assert.equal(
    sayLevels("Elektriker in Berlin", ["Assistant"], LEVEL_SAY.de),
    "Elektriker-Helfer in Berlin",
  );
  assert.equal(
    sayLevels("Technischer Zeichner", ["Assistant"], LEVEL_SAY.de),
    "Helfer Technischer Zeichner",
  );
  assert.ok(hasTrade("Wartungsschweißer", "Schweißer"));
  assert.ok(hasTrade("Onderhoudslasser", "lasser"));
  assert.ok(!hasTrade("Polieren", "Polier"));
});

test('second leg: a level after an emoji, "fixed-term" and "industrial" into French and German', () => {
  assert.deepEqual(tidyEnglish(["🔧 Senior Mechanic"], ["Senior"]), [
    "🔧 Mechanic",
  ]);
  assert.equal(
    before("en-fr", "Quality Engineer – fixed-term contract").bare,
    "Quality Engineer – fixed-term contract",
  );
  assert.match(
    before("en-es", "Quality Engineer – fixed-term contract").text,
    /contrato temporal/,
  );
  assert.equal(before("en-de", "Welder – industrial").info.whole, "");
  assert.equal(
    before("en-fr", "Remote Sensing Engineer").text,
    "Remote Sensing Engineer",
  );
  assert.equal(before("en-fr", "Remote Engineer").text, "À distance Engineer");
});

test("first leg into English: French contracts, Spanish codes and «Sr», no «de» before a town or a language", () => {
  assert.equal(
    contractsNamed("Pipe fitter CDD", true),
    "Pipe fitter – Fixed-term contract",
  );
  assert.equal(
    contractsNamed("Technician on CDI", true),
    "Technician – Permanent contract",
  );
  assert.equal(
    contractsNamed("Welder (CDI)", true),
    "Welder (Permanent contract)",
  );
  assert.equal(
    before("es-en", "Electricista BT").info.whole,
    "Low-voltage electrician",
  );
  assert.equal(
    before("es-en", "Soldador ETT").info.whole,
    "Welder (Agency work)",
  );
  assert.equal(
    before("es-en", "Técnico PRL").info.whole,
    "Health and safety advisor",
  );
  assert.equal(before("es-en", "Desarrollador Java Sr").info.level, "Senior");
  for (const [title, lang] of [
    ["Técnico Barcelona", "es"],
    ["Técnico Inglés", "es"],
  ])
    assert.equal(withDe(title, lang), title);
  // ➤ The level out first, so the field after it still takes its «de».
  assert.equal(
    before("es-en", "Técnico Senior Mantenimiento").text,
    "Técnico de Mantenimiento",
  );
  assert.equal(before("es-en", "Técnico Jr.").text, "Técnico");
});

test("a Spanish grade before a field names the trade; a grade alone is the tradesperson", () => {
  const r = before("es-en", "Oficial 1ª Electricidad");
  assert.deepEqual(
    [r.info.whole, r.info.level],
    ["Electrician", "First-class"],
  );
  assert.equal(
    before("ca-en", "Oficial 1a electricitat").info.whole,
    "Electrician",
  );
  assert.equal(
    before("es-en", "Oficial 1ª").info.whole,
    "First-class tradesperson",
  );
});

test("Catalan: towns by their Catalan name, acronyms with a vowel, «administratiu/iva», hyphens of the source", async () => {
  const { catalan } =
    await import("../../src/features/title-translation/aina.ts");
  const { withMarks } =
    await import("../../src/features/title-translation/method/marks.ts");
  assert.deepEqual(
    catalan(
      [
        {
          text: "Técnico de mantenimiento industrial en Lérida",
          keep: [],
          towns: ["Lérida"],
        },
      ],
      () => ["Tècnic de manteniment industrial a Lleida"],
    ),
    ["Tècnic de manteniment industrial a Lleida"],
  );
  assert.deepEqual(
    ["Enginyer de IA", "Expert de iOS", "Química de iode"].map((t) =>
      apostrophes(catalanSpelling(t)),
    ),
    ["Enginyer d'IA", "Expert d'iOS", "Química de iode"],
  );
  assert.equal(
    withMarks("Administratiu de compres", "ca"),
    "Administratiu/iva de compres",
  );
  const title = "Welder-Fitter - Permanent";
  assert.equal(
    after(
      "en-ca",
      title,
      "Soldador-muntador permanent",
      before("en-ca", title).info,
    ),
    "Soldador-muntador permanent",
  );
});

test("German and Dutch sources: SHK spellings, hyphenated compounds, openers, Allround, E after a job, a star", async () => {
  const { noMarks } =
    await import("../../src/features/title-translation/method/method-tables.ts");
  for (const [pair, title, whole] of [
    [
      "de-en",
      "Anlagenmechaniker für Sanitär-, Heizungs- und Klimatechnik",
      "Plumbing and heating installer",
    ],
    ["de-en", "SHK-Anlagenmechaniker", "Plumbing and heating installer"],
    ["de-en", "Betriebs-Elektriker", "Plant electrician"],
    ["nl-en", "Service-monteur", "Service technician"],
    ["nl-en", "Wij zoeken jou als Servicemonteur", "Service technician"],
    ["nl-en", "Wij werven: Monteur", "Fitter"],
    ["de-en", "Allroundmonteur", "Fitter"],
  ])
    assert.equal(before(pair, title).info.whole, whole, title);
  assert.equal(before("de-en", "Allround-Monteur").info.level, "Multi-skilled");
  assert.equal(before("de-en", "Allrounder Haustechnik").info.level, "");
  assert.equal(
    before("de-en", "Wir suchen Verstärkung: Elektriker").text,
    "Elektriker",
  );
  assert.match(
    before("nl-en", "Meewerkend voorman E").text,
    /electrical installations/,
  );
  assert.equal(noMarks("Electrician (m/w/d)*"), "Electrician");
});

test("French titles read whole as the trade they name", () => {
  for (const [title, whole] of [
    ["Chef de chantier", "Site foreman"],
    ["Chef de chantier TP", "Civil works site foreman"],
    ["Conducteur d'engins de chantier", "Construction machine operator"],
    ["Mécanicien d'atelier", "Workshop mechanic"],
    ["Usineur CN", "CNC machinist"],
    ["Tourneur-fraiseur CNC", "CNC turner-miller"],
    ["Mécanicien PL/VL", "Light and heavy vehicle mechanic"],
    ["Câbleur", "Wireman"],
    ["Soudeur tuyauteur", "Pipe fitter-welder"],
    ["Chaudronnier-tuyauteur", "Boilermaker-pipe fitter"],
  ])
    assert.equal(before("fr-en", title).info.whole, whole, title);
  assert.equal(before("fr-en", "Agent d'atelier").text, "Agent d'atelier");
  assert.equal(
    before("fr-en", "Électricien - débutant accepté").text,
    "Électricien",
  );
  assert.equal(
    before("fr-en", "Électricien - débutant accepté").info.level,
    "Junior",
  );
  assert.equal(before("fr-en", "Ingénieur sénior").info.level, "Senior");
  assert.match(
    before("fr-en", "Conducteur de travaux TCE").text,
    /all trades/i,
  );
});

test("Spanish and Catalan titles: noise, «Oficial» and levels", () => {
  for (const [pair, title, whole] of [
    ["es-en", "URGENTE Soldador", "Welder"],
    ["es-en", "Electricista - Urgente", "Electrician"],
    ["es-en", "Soldador (Urgente)", "Welder"],
    ["es-en", "Necesitamos electricista", "Electrician"],
    ["ca-en", "Es necessita electricista", "Electrician"],
    ["es-en", "Electricista industrial", "Industrial electrician"],
    ["ca-en", "Delineant projectista", "Draughtsman designer"],
    ["ca-en", "Fresador/a", "Milling machine operator"],
  ])
    assert.equal(before(pair, title).info.whole, whole, title);
  assert.equal(
    before("es-en", "Técnico/a con experiencia").text,
    "Técnico con experiencia",
  );
  assert.equal(
    before("es-en", "Operario/a multifunción").text,
    "Operario multifunción",
  );
  assert.equal(before("es-en", "Oficial albañil").text, "Albañil");
  assert.equal(before("es-en", "Oficial albañil").info.level, "Qualified");
  assert.doesNotMatch(before("es-en", "Oficial 1ª de producción").text, /^De /);
  assert.equal(
    before("es-en", "Oficial 1ª de producción").info.level,
    "First-class",
  );
  assert.equal(
    before("ca-en", "Tècnic/a júnior de qualitat").info.level,
    "Junior",
  );
  assert.equal(
    before("ca-en", "Enginyer/a sènior de processos").info.level,
    "Senior",
  );
});

test("English titles: UK engineers as technicians, «Days» and «Nights», «Apprentice»", () => {
  for (const [pair, title, whole] of [
    ["en-de", "Maintenance Engineer", "Instandhaltungstechniker"],
    ["en-fr", "Field Service Engineer", "Technicien d'intervention"],
    ["en-de", "Gas Engineer", "Gasinstallateur"],
    ["en-es", "CNC Machinist – Days", "Mecanizador CNC (turno de día)"],
    ["en-es", "Welder (Nights)", "Soldador (turno de noche)"],
    ["en-es", "Spray Painter", "Pintor a pistola"],
  ])
    assert.equal(before(pair, title).info.whole, whole, title);
  const published = (pair, title) => {
    const r = before(pair, title);
    return polish(pair, after(pair, title, r.info.whole, r.info));
  };
  assert.equal(
    published("en-es", "Apprentice Plumber"),
    "Aprendiz de fontanero",
  );
  assert.equal(published("en-fr", "Apprentice Welder"), "Apprenti soudeur");
  assert.equal(
    published("en-es", "Commercial Gas Engineer"),
    "Técnico de gas del sector terciario",
  );
});

test("a level that opens a trade name stays in the name", () => {
  assert.equal(
    before("en-es", "Multi-Skilled Engineer").info.whole,
    "Técnico polivalente",
  );
  assert.equal(
    before("en-fr", "Skilled Worker").info.whole,
    "Ouvrier qualifié",
  );
  assert.equal(before("en-es", "Senior Welder").info.said, "Senior");
});

test("German and Dutch join a machine code to the trade", () => {
  const published = (pair, title) => {
    const r = before(pair, title);
    return polish(pair, after(pair, title, r.info.whole, r.info));
  };
  assert.equal(published("en-de", "MIG Welder"), "MIG-Schweißer");
  assert.equal(published("en-nl", "CNC Turner Miller"), "CNC-draaier-frezer");
  assert.equal(published("en-de", "HGV Mechanic"), "Lkw-Mechaniker");
  assert.equal(published("en-de", "Plant Fitter"), "Baumaschinenmechaniker");
});

test("Italian titles: trades read whole, levels, province codes", () => {
  for (const [title, whole] of [
    ["Montatore meccanico", "Mechanical fitter"],
    ["Addetto/a al montaggio", "Assembly worker"],
    ["Disegnatore/trice CAD", "CAD draughtsman"],
    ["Saldatore a elettrodo", "Stick welder"],
    ["Elettricista industriale (uomo/donna)", "Industrial electrician"],
    ["Carrellista (VR)", "Forklift operator"],
    ["Tornitore CNC (MI)", "CNC turner"],
  ])
    assert.equal(before("it-en", title).info.whole, whole, title);
  assert.equal(
    before("it-en", "Sviluppatore Codesys").text,
    "Sviluppatore Codesys",
  );
  assert.equal(before("it-en", "Operaio Rif. 1234").text, "Operaio");
  assert.equal(
    before("it-en", "Saldatore TIG esperto").info.level,
    "Experienced",
  );
  assert.equal(
    before("it-en", "Apprendista saldatore").info.level,
    "Apprentice",
  );
  assert.equal(
    before("it-en", "Ingegnere meccanico senior").info.level,
    "Senior",
  );
});

test("Catalan: «cap d’equip», «principal», levels that agree and stop at the job’s end", () => {
  const published = (title) => {
    const r = before("en-ca", title);
    return apostrophes(
      catalanSpelling(after("en-ca", title, r.info.whole || r.text, r.info)),
    );
  };
  assert.equal(before("en-ca", "Team Leader").info.whole, "Cap d'equip");
  assert.equal(
    sayLevels("Enginyer", ["Leading"], LEVEL_SAY.ca),
    "Enginyer principal",
  );
  assert.equal(
    sayLevels("Enginyers", ["Graduate"], LEVEL_SAY.ca),
    "Enginyers recent titulats",
  );
  assert.equal(
    sayLevels("Enginyers", ["Chartered"], LEVEL_SAY.ca),
    "Enginyers col·legiats",
  );
  assert.equal(
    sayLevels("Enginyers", ["Interim"], LEVEL_SAY.ca),
    "Enginyers interins",
  );
  assert.equal(
    sayLevels("Caps de departament", ["Deputy"], LEVEL_SAY.ca),
    "Caps de departament adjunts",
  );
  assert.equal(
    sayLevels("Enginyer: Automatització", ["Senior"], LEVEL_SAY.ca),
    "Enginyer sènior: Automatització",
  );
  assert.equal(
    sayLevels(
      "Enginyer de dades de parla neerlandesa",
      ["Senior"],
      LEVEL_SAY.ca,
    ),
    "Enginyer de dades sènior de parla neerlandesa",
  );
  assert.equal(
    catalanSpelling("Mecànic de helicòpters"),
    "Mecànic d'helicòpters",
  );
  assert.equal(typeof published("Lead Engineer"), "string");
});

test("Spanish as Spain writes it: jefe de equipo, encargado, mediciones y presupuestos", () => {
  for (const [title, whole] of [
    ["Team Leader", "Jefe de equipo"],
    ["Foreman", "Encargado"],
    ["Quantity Surveyor", "Técnico de mediciones y presupuestos"],
    ["Warehouse Operative", "Operario de almacén"],
    ["Shift maintenance technician", "Técnico de mantenimiento a turnos"],
  ])
    assert.equal(before("en-es", title).info.whole, whole, title);
  assert.equal(
    sayLevels("Soldador", ["Leading"], LEVEL_SAY.es),
    "Soldador principal",
  );
  assert.equal(
    sayLevels("Fontanero", ["Domestic"], LEVEL_SAY.es),
    "Fontanero del sector residencial",
  );
});

test("Spanish and Catalan in sentence case after a Title Case source; names, towns and parts keep capitals", () => {
  const out = (pair, title, firefox) =>
    after(pair, title, firefox, before(pair, title).info);
  assert.equal(
    out("en-es", "Head of Maintenance", "Jefe de Mantenimiento"),
    "Jefe de mantenimiento",
  );
  assert.equal(
    out(
      "en-es",
      "Production Supervisor London",
      "Supervisor de Producción Londres",
    ),
    "Supervisor de producción Londres",
  );
  assert.equal(
    out(
      "en-es",
      "Electrical Engineer – Siemens Energy",
      "Ingeniero Eléctrico – Siemens Energy",
    ),
    "Ingeniero eléctrico – Siemens Energy",
  );
  assert.equal(
    out(
      "en-ca",
      "Quality Manager Barcelona",
      "Responsable de Qualitat Barcelona",
    ),
    "Responsable de qualitat Barcelona",
  );
});

test("French: conducteur de travaux, grades, plural levels, no «Chef chef»", () => {
  assert.equal(
    before("en-fr", "Site Manager").info.whole,
    "Conducteur de travaux",
  );
  assert.equal(
    before("en-fr", "Skilled Labourer").info.whole,
    "Ouvrier qualifié",
  );
  assert.equal(before("en-fr", "Assistant to the Site Manager").info.said, "");
  assert.equal(
    sayLevels("Soudeur", ["First-class"], LEVEL_SAY.fr),
    "Soudeur hautement qualifié",
  );
  assert.equal(
    sayLevels("Électriciens", ["Experienced"], LEVEL_SAY.fr),
    "Électriciens expérimentés",
  );
  assert.equal(
    sayLevels("Ingénieurs", ["Graduate"], LEVEL_SAY.fr),
    "Ingénieurs jeunes diplômés",
  );
  assert.equal(
    sayLevels("Ingénieurs", ["Leading"], LEVEL_SAY.fr),
    "Ingénieurs principaux",
  );
  assert.equal(
    sayLevels("Ingénieurs", ["Interim"], LEVEL_SAY.fr),
    "Ingénieurs par intérim",
  );
  assert.equal(
    sayLevels("Chef de chantier", ["Lead"], LEVEL_SAY.fr),
    "Chef de chantier",
  );
});

test("German and Dutch: marks Firefox adds, small Dutch nouns after a separator, job names, levels", () => {
  const published = (pair, title) => {
    const r = before(pair, title);
    return after(pair, title, r.info.whole, r.info);
  };
  assert.equal(
    after(
      "en-de",
      "Electrician",
      "Elektriker (m/w/d)",
      before("en-de", "Electrician").info,
    ),
    "Elektriker",
  );
  assert.equal(
    published("en-nl", "Welder – Night Shift"),
    "Lasser – nachtdienst",
  );
  assert.equal(
    published("en-de", "Industrial mechanic"),
    "Industriemechaniker",
  );
  assert.equal(published("en-de", "Forklift operator"), "Staplerfahrer");
  assert.equal(
    sayLevels("Bauleiter", ["Assistant"], LEVEL_SAY.de),
    "Assistent Bauleiter",
  );
  assert.equal(
    sayLevels("Maurer", ["Assistant"], LEVEL_SAY.de),
    "Maurer-Helfer",
  );
  assert.equal(
    sayLevels("Elektriker", ["Apprentice"], LEVEL_SAY.de),
    "Auszubildender Elektriker",
  );
  assert.equal(
    sayLevels("Ingenieur", ["Graduate"], LEVEL_SAY.nl),
    "Ingenieur (starter)",
  );
});

test("two levels in front: the one closest to the job said first", () => {
  assert.equal(
    sayLevels("Schweißer", ["Experienced", "Multi-skilled"], LEVEL_SAY.de),
    "Erfahrener Allround-Schweißer",
  );
  assert.equal(
    sayLevels("lasser", ["Multi-skilled", "Experienced"], LEVEL_SAY.nl),
    "Ervaren allround lasser",
  );
});
