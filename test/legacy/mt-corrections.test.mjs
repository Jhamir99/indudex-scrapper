// The legacy's mt-corrections.test.mjs (JustJans/indudex@b0cd182), its imports pointed at this repo.
// Fixed corrections of Firefox's output (builder/mt/corrections.mjs).
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

test('the French contracts and "graduate"', () => {
  assert.equal(
    correct("Technicien – CDI", "Técnico – CDI", "es"),
    "Técnico – contrato indefinido",
  );
  assert.equal(
    correct("Graduate Engineer", "Ingeniero de posgrado", "es"),
    "Ingeniero recién titulado",
  );
});

test("the German terms of the post: «ab sofort», «befristet», «unbefristet»", () => {
  assert.equal(
    correct(
      "Softwareentwickler C#/Java ab sofort",
      "Software developer C#/Java from now on",
      "en",
    ),
    "Software developer C#/Java – immediate start",
  );
  assert.equal(
    correct(
      "Elektroingenieur - ab sofort",
      "Electrical Engineer - as of now",
      "en",
    ),
    "Electrical Engineer - Immediate start",
  );
  assert.equal(
    correct(
      "Klimatechniker m/w/d 22,50€ ab sofort!",
      "Air conditioning technician m/f/d 22,50€ from now on!",
      "en",
    ),
    "Air conditioning technician m/f/d 22,50€ – immediate start!",
  );
  assert.equal(
    correct(
      "IT-Engineer – Vollzeit, ab sofort",
      "IT Engineer – full-time, as of now",
      "en",
    ),
    "IT Engineer – full-time, immediate start",
  );
  // «Jetzt bewerben» and the middle of a sentence are left as they are.
  assert.equal(
    correct(
      "Laborant ab sofort in Heidelberg - Jetzt bewerben!",
      "Laboratory technician starting immediately in Heidelberg - Apply now!",
      "en",
    ),
    "Laboratory technician starting immediately in Heidelberg - Apply now!",
  );
  assert.equal(
    correct(
      "Wir suchen ab sofort einen Elektriker",
      "We are now looking for an electrician",
      "en",
    ),
    "We are now looking for an electrician",
  );
  assert.equal(
    correct(
      "Inbetriebnahmetechniker - Befristet 12 Monate",
      "Commissioning Technician - Limited 12 months",
      "en",
    ),
    "Commissioning Technician - Fixed-term 12 months",
  );
  assert.equal(
    correct(
      "Chemielaborant befristet auf 3 Jahre",
      "Chemical laboratory assistant limited to 3 years",
      "en",
    ),
    "Chemical laboratory assistant limited to 3 years",
  );
  assert.equal(
    correct(
      "CNC-Drehen - Befristet/Unbefristet",
      "CNC Turning - Limited/Unlimited",
      "en",
    ),
    "CNC Turning - Fixed-term/Permanent",
  );
  assert.equal(
    correct(
      "Architekt*in, Tübingen (unbefristet)",
      "Architect, Tübingen (indefinitely)",
      "en",
    ),
    "Architect, Tübingen (permanent)",
  );
});

test("a fitter is no mounter, and a French repairer no reparations", () => {
  assert.equal(
    correct(
      "MONTER SIECI WODNYCH I KANALIZACYJNYCH",
      "Water and Sewer Networks Mounter",
      "en",
    ),
    "Water and Sewer Networks Fitter",
  );
  assert.equal(
    correct("Monteur-Levageur", "Mounter-Levager", "en"),
    "Fitter-Levager",
  );
  assert.equal(
    correct("PLOMBIER DEPANNEUR", "Plumber (reparations)", "en"),
    "Plumber (repairs)",
  );
  assert.equal(
    correct("Mounting technician", "Mounting technician", "en"),
    "Mounting technician",
  );
});

test("the trade of the bathroom and its pipes is plumbing, and Spain's word for it fontanería (8 November 2026)", () => {
  assert.equal(
    correct(
      "Anlagenmechaniker (m,w,d) Heizung, Sanitär",
      "Plant mechanic – heating, sanitary",
      "en",
    ),
    "Plant mechanic – heating, plumbing",
  );
  assert.equal(
    correct(
      "Sanitärinstallateur/in EFZ 100%",
      "Sanitary installer EFZ 100%",
      "en",
    ),
    "Plumber EFZ 100%",
  );
  assert.equal(
    correct("INSTALLATEUR SANITAIRE", "SANITARY INSTALLER", "en"),
    "PLUMBER",
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

test("Dutch civil engineering's structures, structural and junior workers (8 November 2026)", () => {
  assert.equal(
    correct("Ontwerper kunstwerken", "Designer – artworks", "en"),
    "Designer – civil structures",
  );
  assert.equal(
    correct(
      "Senior adviseur civiele kunstwerken",
      "Senior advisor – civil artworks",
      "en",
    ),
    "Senior advisor – civil structures",
  );
  assert.equal(
    correct("Expert Beweegbare Kunstwerken", "Expert – Movable Artworks", "en"),
    "Expert – Movable Structures",
  );
  assert.equal(
    correct("Constructief Projectleider", "Constructive Project Leader", "en"),
    "Structural Project Leader",
  );
  assert.equal(
    correct(
      "Startende Werkvoorbereider Utiliteit",
      "Starting Work planner – Non-residential construction",
      "en",
    ),
    "Junior Work planner – Non-residential construction",
  );
  assert.equal(
    correct("Kunstenaar", "Artist – artworks", "en"),
    "Artist – artworks",
  );
});

test("German mechanics, wood technicians and juniors (8 November 2026)", () => {
  assert.equal(
    correct(
      "Schrauber mit Erfahrung gesucht",
      "Screwdriver with experience wanted",
      "en",
    ),
    "Mechanic with experience wanted",
  );
  assert.equal(
    correct(
      "HOLZTECHNIKER ALS TECHNISCHER KONSTRUKTEUR",
      "Wooden technician as technical design engineer",
      "en",
    ),
    "Wood technician as technical design engineer",
  );
  assert.equal(
    correct(
      "Jungbauleiter Tief- und Straßenbau",
      "Young construction manager – Civil works",
      "en",
    ),
    "Junior construction manager – Civil works",
  );
  assert.equal(
    correct("Junge Talente gesucht", "Young talents wanted", "en"),
    "Young talents wanted",
  );
});

test("French non-destructive testing and automation (8 November 2026)", () => {
  assert.equal(
    correct(
      "TECHNICIEN EN CONTRÔLE NON DESTRUCTIF",
      "Non-Destructive Control Technician",
      "en",
    ),
    "Non-Destructive Testing Technician",
  );
  assert.equal(
    correct(
      "Contrôleur non destructif (CND) en ressuage",
      "Non-destructive controller (NDC) in penetration",
      "en",
    ),
    "Non-destructive testing inspector (NDT) in penetration",
  );
  assert.equal(
    correct(
      "Chef de Projets Automatisme",
      "Project Manager – Automatism",
      "en",
    ),
    "Project Manager – Automation",
  );
  assert.equal(
    correct(
      "TECHNICIEN DEPANNAGE AUTOMATISMES ITINERANT",
      "Itinerant Technician – Depannage Automatismes",
      "en",
    ),
    "Itinerant Technician – Depannage Automation",
  );
  assert.equal(
    correct(
      "Ingénieur Automatisme et Électricité Industrielle",
      "Automotive and Industrial Electricity Engineer",
      "en",
    ),
    "Automation and Industrial Electricity Engineer",
  );
  assert.equal(
    correct(
      "Technicien automatisme automobile",
      "Automotive automation technician",
      "en",
    ),
    "Automotive automation technician",
  );
});

test("German design planning and site managers, Catalan internships (8 November 2026)", () => {
  assert.equal(
    correct("Architekt Objektplanung", "Architect – Object planning", "en"),
    "Architect – Design planning",
  );
  assert.equal(
    correct(
      "Projektingenieur Objekt- und Tragwerksplanung",
      "Project Engineer – Object and Structural Design",
      "en",
    ),
    "Project Engineer – Design and Structural Design",
  );
  assert.equal(
    correct(
      "Projektleiter*in Objekt- und Gebäudefunk",
      "Project Manager – Object and Building Radio",
      "en",
    ),
    "Project Manager – Object and Building Radio",
  );
  assert.equal(
    correct(
      "Objektleiter HKLS m/w/d",
      "Object ladder – HVAC and plumbing",
      "en",
    ),
    "Site manager – HVAC and plumbing",
  );
  assert.equal(
    correct(
      "Objektleiter Gebäudereinigung",
      "Object manager – Building cleaning",
      "en",
    ),
    "Property manager – Building cleaning",
  );
  assert.equal(
    correct("Pràctiques en Ciberseguretat", "Cybersecurity Practices", "en"),
    "Cybersecurity Internship",
  );
  assert.equal(
    correct("Bones pràctiques de seguretat", "Good security practices", "en"),
    "Good security practices",
  );
});

test("Italian shifts, permanent contracts and building sites (8 November 2026)", () => {
  assert.equal(
    correct(
      "Manutentore elettromeccanico - 2 turni",
      "Electromechanical maintainer - 2 rounds",
      "en",
    ),
    "Electromechanical maintainer - 2 shifts",
  );
  assert.equal(
    correct(
      "Progettista meccanico - Tempo indeterminato",
      "Mechanical designer - Indefinite time",
      "en",
    ),
    "Mechanical designer - Permanent contract",
  );
  assert.equal(
    correct("GEOMETRA DI CANTIERE", "Shipyard surveyor", "en"),
    "Site surveyor",
  );
  assert.equal(
    correct(
      "Elettricista industriale di cantiere",
      "Industrial shipyard electrician",
      "en",
    ),
    "Industrial site electrician",
  );
  assert.equal(
    correct("Carpentiere per cantiere navale", "Carpenter for shipyard", "en"),
    "Carpenter for shipyard",
  );
});

test("a Swedish «projektör» is a design engineer (8 November 2026)", () => {
  assert.equal(
    correct("Fiberprojektör", "Fiber projector", "en"),
    "Fiber design engineer",
  );
  assert.equal(
    correct("CAD-Projektör", "CAD Projector", "en"),
    "CAD Design Engineer",
  );
  assert.equal(
    correct(
      "Elprojektör till växande installationsbolag i Malmö",
      "Electrician – projector for growing installation companies in Malmö",
      "en",
    ),
    "Electrical design engineer for growing installation companies in Malmö",
  );
  assert.equal(
    correct(
      "Luftledningsprojektör Regionnät",
      "Airline Projector Region Network",
      "en",
    ),
    "Overhead line Design Engineer Region Network",
  );
});

test("an Italian «itinerante» Firefox left is written in English (8 November 2026)", () => {
  assert.equal(
    correct(
      "MANUTENTORE TRASFERTISTA – AREA MOTORE GAS",
      "Maintenance worker – Itinerante – Gas Engine Area",
      "en",
    ),
    "Maintenance worker – Itinerant – Gas Engine Area",
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

test("the Spanish «Administrador» stays an administrator, unless someone in charge is named too (8 November 2026)", () => {
  assert.equal(
    correct(
      "Administrador de Bases de Datos DB2",
      "Database Manager DB2",
      "en",
    ),
    "Database Administrator DB2",
  );
  assert.equal(
    correct("Administradora de Sistemas IT", "IT Systems Manager", "en"),
    "IT Systems Administrator",
  );
  assert.equal(
    correct(
      "Administrador y Gerente de sistemas",
      "Systems Administrator and Manager",
      "en",
    ),
    "Systems Administrator and Manager",
  );
  assert.equal(
    correct("Project Manager", "Project Manager", "en"),
    "Project Manager",
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
    correct("Fullstack .Net", "Pila completa.Net", "es"),
    "Full Stack .Net",
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
      "Staff Engineer - Core Markets",
      "Ingeniero de Personal - Mercados Principales",
      "es",
    ),
    "Ingeniero Staff - Mercados Principales",
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

test("agentic, proposal engineers, red teams, people analytics and insights (the whole caches, 9 November 2026)", () => {
  assert.equal(
    correct("Agentic AI Engineer", "Ingeniero de IA agente", "es"),
    "Ingeniero de IA agéntica",
  );
  assert.equal(
    correct(
      "Staff Software Engineer - Agentic Workflows",
      "Staff Software Engineer - Flujos de trabajo agentes",
      "es",
    ),
    "Staff Software Engineer - Flujos de trabajo agénticos",
  );
  assert.equal(
    correct(
      "Senior Software Engineer - Agentic Workflows",
      "Ingeniero de Software Senior - Flujos de Trabajo Agenticos",
      "es",
    ),
    "Ingeniero de Software Senior - Flujos de Trabajo Agénticos",
  );
  assert.equal(
    correct("AI agents – Agentic AI", "Agentes de IA – IA agente", "es"),
    "Agentes de IA – IA agente",
  );
  assert.equal(
    correct("Proposal Engineer (m/f)", "Ingeniero/a de propuestas", "es"),
    "Ingeniero/a de ofertas",
  );
  assert.equal(
    correct(
      "Proposal engineer Infra",
      "Enginyer de proposta d'infraestructura",
      "ca",
    ),
    "Enginyer d'ofertes d'infraestructura",
  );
  assert.equal(
    correct(
      "Engineering Manager (Red Team)",
      "Gerente de Ingeniería (Equipo Rojo)",
      "es",
    ),
    "Gerente de Ingeniería (Red Team)",
  );
  assert.equal(
    correct(
      "Senior Penetration Tester/Red Team Operator",
      "Pentester sènior / Operador de l'equip vermell",
      "ca",
    ),
    "Pentester sènior / Operador Red Team",
  );
  assert.equal(
    correct(
      "Senior Data Analyst, People Analytics",
      "Analista de datos sénior, análisis de personas",
      "es",
    ),
    "Analista de datos sénior, People Analytics",
  );
  assert.equal(
    correct(
      "Senior Data Scientist - Insights",
      "Científico de datos sénior - Perspectivas",
      "es",
    ),
    "Científico de datos sénior - Insights",
  );
});

test("product names said as products (the whole caches, 9 November 2026)", () => {
  assert.equal(
    correct(
      "Power Platform Solution Architect",
      "Arquitecto de soluciones de plataforma eléctrica",
      "es",
    ),
    "Arquitecto de soluciones de Power Platform",
  );
  assert.equal(
    correct(
      "Senior Modern Workplace Engineer",
      "Ingeniero superior del lugar de trabajo moderno",
      "es",
    ),
    "Ingeniero superior Modern Workplace",
  );
  assert.equal(
    correct(
      "ServiceNow Solution Architect",
      "Servicio de arquitecto de soluciones ahora",
      "es",
    ),
    "Arquitecto de soluciones ServiceNow",
  );
  assert.equal(
    correct(
      "IT Support Director | AI + ServiceNow",
      "Director/a de Soporte TI | IA + Servicio Ahora",
      "es",
    ),
    "Director/a de Soporte TI | IA + ServiceNow",
  );
  assert.equal(
    correct(
      "HRIS Project Manager (SAP Successfactors)",
      "Jefe de proyecto HRIS (FActores de éxito de SAP)",
      "es",
    ),
    "Jefe de proyecto HRIS (SAP SuccessFactors)",
  );
  assert.equal(
    correct(
      "Identity Architect | Azure AD/Entra ID",
      "Arquitecto de identidad | Azure AD/Introducir ID",
      "es",
    ),
    "Arquitecto de identidad | Azure AD/Entra ID",
  );
  assert.equal(
    correct(
      "Senior Workday Integration Engineer",
      "Ingeniero sénior de integración laboral",
      "es",
    ),
    "Ingeniero sénior de integración de Workday",
  );
  assert.equal(
    correct(
      "Senior Salesforce Developer",
      "Desarrollador senior de fuerza de ventas",
      "es",
    ),
    "Desarrollador senior de Salesforce",
  );
  assert.equal(
    correct("Dynamics 365 Developer", "Desarrollador Dinámica 365", "es"),
    "Desarrollador Dynamics 365",
  );
  assert.equal(
    correct(
      "ServiceNow Lead Developer",
      "Servei Ara Desenvolupador líder",
      "ca",
    ),
    "ServiceNow Desenvolupador líder",
  );
  assert.equal(
    correct(
      "Modern Workplace Project Engineer",
      "Enginyer de projectes de lloc de treball modern",
      "ca",
    ),
    "Enginyer de projectes Modern Workplace",
  );
  assert.equal(
    correct(
      "HRIS Project Manager (SAP SuccessFactors)",
      "Cap de projecte HRIS (Factors d'Èxit SAP)",
      "ca",
    ),
    "Cap de projecte HRIS (SAP SuccessFactors)",
  );
  assert.equal(
    correct("Sales Manager", "Responsable de fuerza de ventas", "es"),
    "Responsable de fuerza de ventas",
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
      "Staff Security Operations & Vulnerability Management Engineer",
      "Ingeniero de Gestión de Seguridad y Vulnerabilidades del Personal",
      "es",
    ),
    "Ingeniero de Gestión de Seguridad y Vulnerabilidades Staff",
  );
  assert.equal(
    correct(
      "Member of Technical Staff, Infrastructure Engineer",
      "Miembro del personal técnico, ingeniero de infraestructuras",
      "es",
    ),
    "Miembro del personal técnico, ingeniero de infraestructuras",
  );
  assert.equal(
    correct("Full - stack developer", "Desarrollador de pila completa", "es"),
    "Desarrollador de full stack",
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
