// The legacy's test/mt-corrections.test.mjs (JustJans/indudex@ec79858), carried whole (legacy resync T009): its imports pointed at
// this repo.
// Fixed corrections of Firefox's output (builder/mt/corrections.ts).
import { test } from "vitest";
import assert from "node:assert/strict";
import { correct } from "../../src/features/title-translation/method/corrections.ts";

test('"Remote" in Catalan and Spanish', () => {
  assert.equal(
    correct(
      "Identity Architect | Azure Enter ID | Remote",
      "Arquitecte d'identitat | Azure Enter ID | Remote",
      "ca",
    ),
    "Arquitecte d'identitat | Azure Enter ID | En remot",
  );
  assert.equal(
    correct(
      "Cloud Manager (100% Remote)",
      "Coordinadora de grup (100% Remote)",
      "ca",
    ),
    "Coordinadora de grup (100% en remot)",
  );
  assert.equal(
    correct(
      "Python developer, 100% Remote",
      "Desarrollador Python, 100% Remote",
      "es",
    ),
    "Desarrollador Python, 100% en remoto",
  );
});

test('Spanish "cualificado" and "polivalente"', () => {
  assert.equal(
    correct("Skilled worker, foreman", "Trabajador calificado, capataz", "es"),
    "Trabajador cualificado, capataz",
  );
  assert.equal(
    correct("Qualified Agent", "Agente Calificado de la Unidad", "es"),
    "Agente Cualificado de la Unidad",
  );
  assert.equal(
    correct(
      "Multi-skilled welder",
      "Soldador Multi-Calificado polivalente",
      "es",
    ),
    "Soldador polivalente",
  );
  assert.equal(
    correct(
      "Maintenance - Multiskilled plumber",
      "Mantenimiento - Fontanero multicalificado",
      "es",
    ),
    "Mantenimiento - Fontanero polivalente",
  );
});

test('"graduate"', () => {
  assert.equal(
    correct("Graduate Engineer", "Ingeniero de posgrado", "es"),
    "Ingeniero recién titulado",
  );
});

test("a French repairer is no reparations", () => {
  assert.equal(
    correct("PLOMBIER DEPANNEUR", "Plumber (reparations)", "en"),
    "Plumber (repairs)",
  );
});

test("the trade of the bathroom and its pipes is plumbing, and Spain's word for it fontanería (8 November 2026)", () => {
  assert.equal(
    correct(
      "Technicien chauffage sanitaire",
      "Heating sanitary technician",
      "en",
    ),
    "Heating plumbing technician",
  );
  assert.equal(
    correct("Responsable sécurité sanitaire", "Head of sanitary safety", "en"),
    "Head of sanitary safety",
  );
  assert.equal(correct("Sanitäter", "Sanitary", "en"), "Sanitary");
  assert.equal(
    correct("x", "Jefe de proyecto – Calefacción/Plomería/Ventilación", "es"),
    "Jefe de proyecto – Calefacción/Fontanería/Ventilación",
  );
});

test("French «CND» given back as «NDC» is NDT (8 November 2026)", () => {
  assert.equal(
    correct(
      "Contrôleur non destructif (CND) en ressuage",
      "NDT inspector (NDC) in penetration",
      "en",
    ),
    "NDT inspector (NDT) in penetration",
  );
});

test("Italian shifts (8 November 2026)", () => {
  assert.equal(
    correct(
      "Manutentore elettromeccanico - 2 turni",
      "Electromechanical maintainer - 2 rounds",
      "en",
    ),
    "Electromechanical maintainer - 2 shifts",
  );
});

test("a Swedish «luftledning» is an overhead line (8 November 2026)", () => {
  assert.equal(
    correct(
      "Luftledningsprojektör Regionnät",
      "Airline design engineer Region Network",
      "en",
    ),
    "Overhead line design engineer Region Network",
  );
});

test("«(en anglès).» that Firefox's Catalan adds after «Dipl.» goes, unless the title speaks of English (8 November 2026)", () => {
  assert.equal(
    correct(
      "Dipl. Civil engineer ETH/FH",
      "Dipl. (en anglès). Enginyer civil ETH/FH",
      "ca",
    ),
    "Dipl. Enginyer civil ETH/FH",
  );
  assert.equal(
    correct(
      "Data analyst (English speaking)",
      "Analista de dades (en anglès)",
      "ca",
    ),
    "Analista de dades (en anglès)",
  );
});

test("an engineer opening the title, a full stack, a technologist and the Spanish «e» (the judged sample of 9 November 2026)", () => {
  assert.equal(
    correct(
      "Senior Frontend Engineer - React Native",
      "Ingeniería frontend sénior - React Native",
      "es",
    ),
    "Ingeniero frontend sénior - React Native",
  );
  assert.equal(
    correct(
      "IT Operation & Cloud Engineer",
      "Ingeniería de Operaciones de TI y Nube",
      "es",
    ),
    "Ingeniero de Operaciones de TI y Nube",
  );
  assert.equal(
    correct(
      "Electrical Engineer Industry - DE/EN",
      "Ingeniería Eléctrica Industria - DE/EN",
      "es",
    ),
    "Ingeniería Eléctrica Industria - DE/EN",
  );
  assert.equal(
    correct(
      "Project Engineer Civiele Techniek",
      "Ingeniero de Proyectos Ingeniería Civil",
      "es",
    ),
    "Ingeniero de Proyectos Ingeniería Civil",
  );
  assert.equal(
    correct(
      "Senior Engineer, Platform Engineering",
      "Ingeniería sénior, ingeniería de plataformas",
      "es",
    ),
    "Ingeniería sénior, ingeniería de plataformas",
  );
  assert.equal(
    correct("Software Engineer", "Enginyeria de programari", "ca"),
    "Enginyer de programari",
  );
  assert.equal(
    correct(
      "Associate Senior Packaging Technologist",
      "Technologist de envasado sénior asociado",
      "es",
    ),
    "Tecnólogo de envasado sénior asociado",
  );
  assert.equal(
    correct(
      "AI Research Scientist – Robotics, Vision and Intelligent Technologies",
      "Científico investigador en IA – robótica, visión e tecnologías inteligentes",
      "es",
    ),
    "Científico investigador en IA – robótica, visión y tecnologías inteligentes",
  );
  assert.equal(
    correct(
      "Research and Innovation Engineer",
      "Ingeniero de Investigación e Innovación",
      "es",
    ),
    "Ingeniero de Investigación e Innovación",
  );
});

test("a Spanish «Ingeniero» that Aina gave as the discipline (the judged sample of 9 November 2026)", () => {
  assert.equal(
    correct(
      "INGENIERO DE PROCESOS QUÍMICOS..",
      "Enginyeria de processos químics.",
      "ca",
    ),
    "Enginyer de processos químics.",
  );
  assert.equal(
    correct("Ingeniería de procesos", "Enginyeria de processos", "ca"),
    "Enginyeria de processos",
  );
  assert.equal(
    correct("Ingeniero/a Eléctrico/a", "Enginyeria Elèctrica", "ca"),
    "Enginyeria Elèctrica",
  );
});

test("a staff of a firm, a remote in a hashtag or an English title, a «Superior» that names a firm (the whole caches, 9 November 2026)", () => {
  assert.equal(
    correct(
      "Member of Technical Staff (Machine Learning Research Engineer)",
      "Membre del personal tècnic (enginyer d'investigació en aprenentatge automàtic)",
      "ca",
    ),
    "Membre del personal tècnic (enginyer d'investigació en aprenentatge automàtic)",
  );
  assert.equal(
    correct(
      "Head of infra/devops #blockchain #early #remote",
      "Cap d'infraestructura/devops #blockchain #early #remote",
      "ca",
    ),
    "Cap d'infraestructura/devops #blockchain #early #remote",
  );
  assert.equal(
    correct(
      "Senior InRiver PIM Engineer - Remote-First Integrations Expert",
      "Enginyer sènior de PIM InRiver - expert en integracions remote-first",
      "ca",
    ),
    "Enginyer sènior de PIM InRiver - expert en integracions remote-first",
  );
  assert.equal(
    correct(
      "AI Engineer - fully remote within Germany Remote",
      "AI Engineer - fully remote within Germany Remote",
      "ca",
    ),
    "AI Engineer - fully remote within Germany Remote",
  );
  assert.equal(
    correct(
      "Identity Architect | Remote",
      "Arquitecte d'identitat | Remote",
      "ca",
    ),
    "Arquitecte d'identitat | En remot",
  );
  assert.equal(
    correct(
      "Senior Data Engineer - Superior Retail Execution",
      "Enginyer de dades sènior - Superior Retail Execution",
      "ca",
    ),
    "Enginyer de dades sènior - Superior Retail Execution",
  );
  assert.equal(
    correct(
      "Senior Bouwkundig Deskundige",
      "Expert Superior en Arquitectura",
      "ca",
    ),
    "Expert Sènior en Arquitectura",
  );
});

test("insights (the whole caches, 9 November 2026)", () => {
  assert.equal(
    correct(
      "Senior Data Scientist - Insights",
      "Científico de datos sénior - Perspectivas",
      "es",
    ),
    "Científico de datos sénior - Insights",
  );
});

test("a product name kept beside a Catalan workplace stays once (9 November 2026)", () => {
  assert.equal(
    correct(
      "Ingénieur systèmes poste de travail Modern Workplace - Expérimenté",
      "Enginyer de sistemes de lloc de treball Modern Workplace - Experimentat",
      "ca",
    ),
    "Enginyer de sistemes de lloc de treball Modern Workplace - Experimentat",
  );
});

test("a staff role named far from its word, a full stack written apart, a proposal engineer's proposals (9 November 2026)", () => {
  assert.equal(
    correct(
      "Member of Technical Staff, Infrastructure Engineer",
      "Miembro del personal técnico, ingeniero de infraestructuras",
      "es",
    ),
    "Miembro del personal técnico, ingeniero de infraestructuras",
  );
  assert.equal(
    correct(
      "Mechanical Design & Proposal Engineer Defence",
      "Ingeniero de diseño mecánico y propuestas para defensa",
      "es",
    ),
    "Ingeniero de diseño mecánico y ofertas para defensa",
  );
  assert.equal(
    correct("Staff Nurse", "Enfermero de personal", "es"),
    "Enfermero de personal",
  );
});

test("a word written twice in a row is written once, unless the title repeats it (9 November 2026)", () => {
  assert.equal(
    correct(
      "Technisch onderhoudsmonteur",
      "Técnico técnico de mantenimiento",
      "es",
    ),
    "Técnico de mantenimiento",
  );
  assert.equal(
    correct("Fraiseur sur Commande Numérique CN", "Fresador en CNC CNC", "es"),
    "Fresador en CNC",
  );
  assert.equal(
    correct(
      "Mécanicien(ne) Entretien Maintenance Engins",
      "Mecánico/a Mantenimiento Mantenimiento Mantenimiento Maquinaria",
      "es",
    ),
    "Mecánico/a Mantenimiento Maquinaria",
  );
  assert.equal(
    correct("Dessinateur Projeteur", "Dissenyador Dissenyador", "ca"),
    "Dissenyador",
  );
  assert.equal(
    correct(
      "Walla Walla Plant Technician",
      "Técnico de planta Walla Walla",
      "es",
    ),
    "Técnico de planta Walla Walla",
  );
  assert.equal(
    correct(
      "Engineering Manager, Product Engineering",
      "Gerente de Ingeniería, Ingeniería de Producto",
      "es",
    ),
    "Gerente de Ingeniería, Ingeniería de Producto",
  );
});

test("a word repeated as part of a name with a figure stays (9 November 2026)", () => {
  assert.equal(
    correct(
      "Medior/Senior C# .NET Developer Bouw Infra Civil3D",
      "Desarrollador C# .NET medio/senior construcción infraestructura civil Civil3D",
      "es",
    ),
    "Desarrollador C# .NET medio/senior construcción infraestructura civil Civil3D",
  );
});
