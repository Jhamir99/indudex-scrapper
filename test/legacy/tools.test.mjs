// The legacy's test/tools.test.mjs (JustJans/indudex@ec79858), carried whole (legacy resync T011): its imports pointed at
// this repo, the site's cases (app/lib/tools.ts) left out.
// ➤ The tools an advert names, from the checked list (docs/research/tools-tags.md).
import { harness } from "./harness.mjs";
import { TOOLS, toolsOf } from "../../src/features/advert-facts/tools.ts";

const { ok, eq, done } = harness("tools");

const ids = TOOLS.map(([id]) => id);
eq(new Set(ids).size, ids.length, "no tool twice");
// The site's names of the tools (its app/lib/tools.ts) are the web's: those cases are left out here.

const of = (title, description = "", company = "") =>
  toolsOf({ title, description, company });
eq(
  of(
    "Técnico de automatización",
    "Programación de PLC Siemens TIA Portal y SCADA.",
  ),
  ["plc", "tia-portal", "scada"],
  "in the order the advert names them",
);
eq(of("Soldador TIG/MIG"), ["tig", "mig-mag"], "a welder of two processes");
eq(
  of("Software Engineer", "Experience with C++ and C#; .NET Core a plus."),
  ["cpp", "csharp", "dotnet"],
  "C++, C# and .NET survive the folding",
);
eq(
  of("Robot programmer", "Program KUKA robots.", "KUKA Deutschland GmbH"),
  [],
  "the employer's own name is not a tool asked for",
);
eq(
  of(
    "Konstrukteur",
    "Ihre Aufgaben: Konstruktion mit SolidWorks.\nWir bieten: Schulungen in CATIA.",
  ),
  ["solidworks"],
  "a line that offers something is not read",
);
eq(
  of("Ingénieur", "Suivi du tableau de bord, reporting."),
  [],
  "an everyday word is no tool",
);
eq(
  of(
    "Data engineer",
    "Python, SQL, Spark, Kafka, Airflow, dbt, Snowflake, Databricks, Docker, Kubernetes",
  ),
  [
    "python",
    "sql",
    "kafka",
    "airflow",
    "snowflake",
    "databricks",
    "docker",
    "kubernetes",
  ],
  "every one named, in its order",
);
eq(
  of(
    "Data engineer",
    "Python, Java, Go, SQL, MySQL, Redis, Kafka, Docker, Kubernetes, Terraform, Ansible, Jenkins, GitLab, Grafana",
  ).length,
  12,
  "twelve at most",
);
// ➤ What the owner found missing (1 November 2026): testing, web, systems and instruments.
eq(
  of(
    "Software Development Engineer in Test",
    "Hands-on experience in end-to-end test automation using Nightwatch.js, Selenium, TestCafe, or Cypress. Test case manager such as TestRail or Zephyr. Integration tests using Postman. Unit tests using JUnit/TestNG, Mockito.",
  ),
  [
    "selenium",
    "testcafe",
    "cypress",
    "testrail",
    "zephyr",
    "postman",
    "junit",
    "testng",
    "mockito",
  ],
  "an SDET's testing tools",
);
eq(
  of(
    "Administrateur systèmes et réseaux",
    "Réseaux : Cisco (switching, VLAN, 802.1x, Wi-Fi). Systèmes : Windows Server, Active Directory, virtualisation. Cloud : Microsoft 365. Des connaissances Linux sont appréciées.",
  ),
  ["cisco", "vlan", "windows-server", "active-directory", "m365", "linux"],
  "a systems administrator's",
);
eq(
  of(
    "Développeur Full Stack",
    "Front-end : Angular, TypeScript, HTML5, CSS3, JavaScript. Back-end : C#, .NET Core, ASP.NET Web API, Entity Framework. Outils : Git. Méthodologie : Agile (Scrum). OWASP.",
  ),
  [
    "angular",
    "typescript",
    "html",
    "css",
    "javascript",
    "csharp",
    "dotnet",
    "entity-framework",
    "git",
    "owasp",
  ],
  "a full-stack developer's",
);
eq(
  of(
    "Instrument Lead Engineer",
    "Proficiency in using software for HART enabled Instrument equipment. Familiarity with SAP. Smartplant Instrumentation software.",
  ),
  ["hart", "sap", "smartplant"],
  "an instrument engineer's",
);
eq(
  [
    of("Chemist", "Analysis of selenium and arsenic in water."),
    of("Postman", "Postman for the morning round."),
    of("HVAC technician", "Measure the Airflow of the ventilation units."),
    of("Jefe de obra", "Coordinación con el CSS y la dirección facultativa."),
    of("Theatre manager", "Work with the playwright on the script."),
  ],
  [[], [], [], [], []],
  "an element, a postman, a building's airflow, a safety coordinator and a dramatist are no tools",
);
eq(
  [
    of("Account executive", "We are the Cisco of L4 and L7."),
    of("Network engineer", "Configure Cisco switches and routers."),
  ],
  [[], ["cisco"]],
  "Cisco among words of networks only",
);
eq(
  of("Mobile developer", "React Native and React, Next.js."),
  ["react-native", "react", "nextjs"].filter((id) => id !== "react"),
  "React Native says React",
);
ok(
  !of("Monteur", "Wir suchen einen Monteur (m/w/d) für die Montage").length,
  "nothing named, nothing tagged",
);
// ➤ What the first reading of the Spanish sample found (30 October 2026).
eq(
  of(
    "Mecánico/a industrial",
    "Alojamiento organizado (por máximo 600 € gastos inc.)",
  ),
  [],
  "«máximo» is no Maximo",
);
eq(
  of(
    "Service Manager",
    "Alianzas tecnológicas (Microsoft, Databricks, Snowflake, AWS). Buscamos experiencia en Python.",
  ),
  ["python"],
  "a company's partners are not the job's tools",
);
eq(
  [
    of("Técnico", "Experiencia con IBM Maximo y SAP PM."),
    of("Delineante", "AutoCAD Electrical y EPLAN"),
  ],
  [
    ["maximo", "sap-pm"],
    ["autocad-electrical", "eplan"],
  ],
  "the narrower name alone",
);
eq(
  [
    of(
      "Mecànic de vehicles",
      "Revisió dels frens, dels pneumàtics i dels nivells de líquids.",
    ),
    of("Mecànic industrial", "Coneixements de pneumàtica i hidràulica."),
    of(
      "Maintenance engineer",
      "Hydraulics and pneumatics troubleshooting.",
    ).sort(),
  ],
  [[], ["pneumatics", "hydraulics"], ["hydraulics", "pneumatics"]],
  "the Catalan tyres are not pneumatics; the trade is",
);
// ➤ What the French sample found (30 October 2026).
eq(
  of(
    "Caviste",
    "Javascript n'est pas activé sur votre navigateur. Vous conseillez nos clients.",
  ),
  [],
  "the page's JavaScript notice is no tool",
);
eq(
  [
    of(
      "Monteur Pneumatique (H/F)",
      "Un ou une monteur(se) de pneus poids lourds.",
    ),
    of(
      "Technicien de maintenance",
      "Connaissances en mécanique, pneumatique et hydraulique.",
    ),
  ],
  [[], ["pneumatics", "hydraulics"]],
  "the tyre fitter is no pneumatics, the maintenance technician is",
);
eq(
  [
    of(
      "Technicien automatisme",
      "TEAM PLASTIQUE, société certifiée ISO 9001 et 14001.",
    ),
    of("Qualiticien", "Vous animez le système ISO 9001."),
  ],
  [[], ["iso9001"]],
  "a company's certificate is not the job's standard",
);
eq(
  [
    of("Analyste", "La Direction Cyber Sécurité (DCS) recrute."),
    of("Process engineer", "Configure the DCS and the plant controls."),
  ],
  [[], ["dcs"]],
  "DCS among the words of a process plant only",
);
eq(
  of(
    "Consultant",
    "Partenaire reconnu par les éditeurs de logiciel (Microsoft, SAP). Vous maîtrisez Python.",
  ),
  ["python"],
  "a software publisher's partner is not the job's tool",
);
// ➤ What the Dutch and English samples found (30 October 2026).
eq(
  [
    of("Projectleider", "Het team bestaat uit engineers en BIM-modelleurs."),
    of("BIM Modelleur", "Je werkt met Revit."),
  ],
  [[], ["bim", "revit"]],
  "the colleagues' BIM is not the job's; a BIM modeller's is",
);
eq(
  [
    of("Verpleegkundige", "Je werkt in het FACT SAP team."),
    of("Electrician", "Become a Senior Authorised Person (SAP)."),
  ],
  [[], []],
  "FACT SAP and an Authorised Person are no SAP",
);
eq(
  [
    of("Welder", "Certificates: ASME, AWS D1.1 welding."),
    of("Data engineer", "Star and snowflake schemas."),
  ],
  [[], []],
  "the American Welding Society and a snowflake schema",
);
eq(
  [
    of("Product manager", "You will own the PLC (product life cycle)."),
    of("Automation technician", "Programming of PLCs and HMI."),
  ],
  [[], ["plc", "hmi"]],
  "PLC among words of automation only",
);
eq(
  [
    of("Quality inspector", "Operate CMMs and gauges."),
    of("Maintenance planner", "Use the CMMS daily."),
  ],
  [[], ["gmao"]],
  "coordinate measuring machines are no CMMS",
);
eq(
  of(
    "RF engineer",
    "Explore Sectors and Skills: C C++ Rust C# Java Python. You will design RF boards.",
  ),
  [],
  "a site's menu names no tool of the job",
);
// ➤ What the German sample found (30 October 2026).
eq(
  [
    of(
      "Montagefacharbeiter",
      "Diese E-Mail-Adresse ist vor Spambots geschützt! Zur Anzeige muss JavaScript eingeschaltet sein.",
    ),
    of(
      "Konstruktionsingenieur",
      "Herrenknecht, ein nach DIN ISO 9001 und API zertifiziertes Unternehmen.",
    ),
  ],
  [[], []],
  "the page's notice and the company's certificate",
);
eq(
  of(
    "Netzwerkadministrator",
    "Primegate ist eine Personalberatung in den Bereichen IT, Engineering, Bau, SAP und Finance. Sie betreuen Firewalls.",
  ),
  [],
  "an agency's description of itself",
);

// ➤ What the Spanish sample found (30 October 2026).
eq(
  [
    of(
      "Analista TI",
      "ESSS es Ansys Apex Channel Partner. Gestionarás la red.",
    ),
    of(
      "Arquitecto cloud",
      "Tenemos partnerships estratégicos con Microsoft, Google y AWS. Experiencia en Python.",
    ),
  ],
  [[], ["python"]],
  "more ways of naming partners",
);
eq(
  of(
    "QA Engineer",
    "✅Formación y Plan de Carrera 👉 Formaciones: Red Hat Academy, Docker, Ansible. Experiencia en Selenium.",
  ),
  [],
  "training offered under its heading",
);
eq(
  [
    of("Clinical data manager", "Adhere to GCP and FDA/EMA guidelines."),
    of("Data engineer", "Pipelines on GCP with BigQuery."),
  ],
  [[], ["gcp", "bigquery"]],
  "Good Clinical Practice is no Google Cloud; BigQuery is a tool of its own",
);
eq(
  [
    of(
      "Técnico de contadores",
      "Comunicaciones PLC en contadores inteligentes.",
    ),
    of("Desarrollador", "Experiencia en Java Script y CSS."),
  ],
  [[], ["javascript"]],
  "power-line communication, and JavaScript written in two words",
);
// ➤ What the other languages' samples found, and what the fixes must not take away (30 October 2026).
eq(
  [
    of("Monteur", "Este site requer o Javascript disponível e ativo."),
    of(
      "Développeur",
      "Langages parmi php, javascript, python • Suivi de l’activité des projets.",
    ),
  ],
  [[], ["php", "javascript", "python"]],
  "the notice near the word only, not a one-line text that says «activité» elsewhere",
);
eq(
  [
    of("Elektroniker", "Grundkenntnisse in SPS-Technik und Antriebstechnik."),
    of("Monteur", "Je werkt met PLC-gestuurde installaties."),
    of(
      "Électricien",
      "Raccordement des armoires de commande (PLC, variateurs).",
    ),
  ],
  [["plc"], ["plc"], ["plc"]],
  "a PLC among the words of its machines and trades",
);
eq(
  of("Metrólogo", "Se valorará experiencia en entornos certificados ISO 9001."),
  ["iso9001"],
  "experience of a certified setting is asked of the candidate",
);
eq(
  [
    of("Mechanik", "Práce při výměně pneumatik a pneuservis."),
    of("Obráběč", "Hledáme mazáka s praxí."),
    of("Pastry chef", "Mitsis Selection Azure hotel, buffet."),
    of("Project engineer", "33kV SAP Project Engineer for substations."),
  ],
  [[], [], [], []],
  "Czech tyres and old hands, a hotel called Azure, a grid Authorised Person",
);
eq(
  [
    of("Analyst", "CFD Trading and forex."),
    of("Simulation engineer", "CFD simulations of fluid flow in Ansys Fluent."),
  ],
  [[], ["cfd", "ansys"]],
  "CFD of fluids only",
);

// ➤ What the Swedish and Polish samples found (30 October 2026).
eq(
  [
    of(
      "Programista C++",
      "Ta oferta jest już nieaktualna. Zobacz podobne oferty Różne lokalizacje Java Developer Programowanie Fullstack Developer (.NET + Angular)",
    ),
    of(
      "CNC-Dreher (m/w/d)",
      `${"Drehen nach Zeichnung und Kontrolle der Teile. ".repeat(4)}Weitere Jobs Diese Jobs könnten dir auch gefallen WIG-Schweißer (m/w/d) in Rüthen. SPS-Programmierer (m/w/d) in Soest.`,
    ),
  ],
  [["cpp"], ["cnc"]],
  "a site's listing of other jobs is not read, to the end",
);
eq(
  [
    of(
      "Elektriker",
      "Erfarenhet av liknande jobb. Kunskap om PLC och styrsystem.",
    ),
    of(
      "Technician",
      "Experience in similar jobs is a plus. Programming of PLCs and HMI.",
    ),
  ],
  [["plc"], ["plc", "hmi"]],
  "experience of similar jobs is no listing",
);
eq(
  [
    of(
      "Svetsare",
      "Krav: TIG-svetsning och ritningsläsning Vi erbjuder friskvård och utbildning i SolidWorks",
    ),
    of(
      "Spawacz",
      "Doświadczenie w spawaniu TIG aluminium będzie atutem Co oferujemy? Dobra pensja.",
    ),
  ],
  [["tig"], ["tig"]],
  "what is offered is cut off, what comes before it kept",
);
eq(
  of("Údržbář", "Nabízíme školení v oblasti PLC a moderní automatizace."),
  [],
  "an offer written with its accents",
);
eq(
  [
    of("Patentingenjör", "Webbplatsen fungerar inte bra utan javascript."),
    of(
      "Ingeniør",
      "JavaScript deaktivert! Du må aktivere JavaScript for at denne nettsiden skal fungere riktig.",
    ),
    of(
      "Sprzedawca",
      "Wygląda na to, że JavaScript jest wyłączony w twojej przeglądarce.",
    ),
    of("IT technik", "Jazyk JavaScript je ve vašem prohlížeči vypnutý."),
  ],
  [[], [], [], []],
  "the page's JavaScript notice in Swedish, Norwegian, Polish and Czech",
);
eq(
  [
    of("Montör", "Vi är kvalitetscertifierade enligt ISO 9001."),
    of("Montør", "Vi er sertifisert etter ISO 9001."),
    of("Kvalitetsingenjör", "Erfarenhet av ISO 9001 är meriterande."),
  ],
  [[], [], ["iso9001"]],
  "a certificate inside a compound word, and in Norwegian",
);
eq(
  [
    of(
      "Logistikledare",
      "Tillämpa och främja Scania Production System (SPS) samt Lean.",
    ),
    of("Elektriker", "Kunskap om PLC och styrsystem."),
    of(
      "Tehničar",
      "Dijagnosticirati kvarove putem signala te ostale PLC opreme.",
    ),
  ],
  [[], ["plc"], ["plc"]],
  "Scania's production system is no SPS; a PLC among Swedish and Croatian words of its trade",
);
eq(
  [
    of(
      "Nätverkstekniker",
      "Våra leverantörer inkluderar bland annat Cisco, VMware och Microsoft.",
    ),
    of(
      "Inżynier",
      "Na co dzień współpracujemy z globalnymi liderami IT – VMware, Fortinet, IBM, AWS.",
    ),
  ],
  [[], []],
  "a company's suppliers and partners in Swedish and Polish",
);
eq(
  [
    of(
      "Mechanik",
      "Náplň práce: montáž, demontáž a opravy pneumatik nákladních vozů.",
    ),
    of(
      "Elektryk",
      "Mile widziane: uprawnienia SEP do 1 kV. doświadczenie w pracy w systemie SAP.",
    ),
    of("Kontrolor", "Naměřené hodnoty zapisuje do SPC karet."),
    of("Agile coach", "Certified SAFe SPC with a quality focus."),
  ],
  [[], ["sap"], ["spc"], []],
  "Czech tyre repairs; SAP beside a 1 kV licence; SPC charts, not a SAFe consultant",
);

// ➤ What the right tags the fixes lost taught (30 October 2026).
eq(
  of(
    "Programista",
    `Ta oferta jest już nieaktualna. Zobacz podobne oferty Różne lokalizacje Java Developer Programowanie. ${"Szukamy osoby do zespołu. ".repeat(6)}Znajomość systemów Linux i języka Python.`,
  ),
  [],
  "nothing after a listing is read, not even a closed advert's old text",
);
eq(
  [
    of("Technik", "Montáž a programování řídících systémů (např. PLC)."),
    of("Elektroniker", "Programmierung von Steuerungen, z.B. SPS von Siemens."),
  ],
  [["plc"], ["plc"]],
  "no sentence ends at an abbreviation",
);
eq(
  of(
    "Elektroniker",
    "Wir bieten: Weiterbildungsmöglichkeiten und Jobrad Dein Profil: Kenntnisse in der SPS-Programmierung",
  ),
  ["plc"],
  "what is offered ends at the profile's heading",
);
eq(
  [
    of("Backend developer", "We rely on Spring Boot for quick delivery."),
    of(
      "DevOps",
      "Our technology, partnerships and networks combine. Customers, including Anthropic, NVIDIA and Salesforce, rely on Grafana Labs. Automating tasks using Python and Ansible.",
    ),
    of(
      "Softwareentwickler",
      "Wir suchen im Rahmen der Personalvermittlung einen Entwickler mit PHP und MySQL.",
    ),
  ],
  [["spring"], ["python", "ansible"], ["php", "mysql"]],
  "relying on a framework, the word partnerships, a recruiter at work",
);
eq(
  [
    of("HSE", "Mantenimento della certificazione ISO 14001 e audit interni."),
    of("Eletricista", "Conhecimentos de automação industrial e PLC."),
    of(
      "Industrielektriker",
      "Vi söker dig med erfarenhet av elunderhåll, PLC och felsökning.",
    ),
    of("Head of PLC Engineering", "Lead the team."),
    of("SPS BE Project Engineer Serialization", ""),
  ],
  [["iso14001"], ["plc"], ["plc"], ["plc"], []],
  "keeping a certification up; a PLC among Portuguese, Swedish and English words of its trade",
);

// ➤ What the tags the fixes added taught (30 October 2026).
eq(
  [
    of(
      "Konstrukteur Tiefbau",
      "Bewerben Sie sich: https://application.example.com/applicationForm.php?sid=11990&page_lang=de",
    ),
    of(
      "Constructeur métallique",
      "Warning : Undefined array key « options » in /home/clients/x/wp-content/plugins/job-board/templates/job-application.php on line 148",
    ),
    of(
      "Salesforce Developer",
      'Warning : Undefined array key "code" in D:\\Sites\\site25093\\wwwroot\\lang_dropdown.php on line 17',
    ),
    of(
      "Webentwickler",
      "PHP Warning: Undefined variable $x in index on line 3",
    ),
  ],
  [[], [], ["salesforce"], []],
  "addresses, file names and a site's PHP warnings name no PHP",
);
eq(
  [
    of("Dev full stack php", "Connaissances en PHP et JavaScript."),
    of("Frontend", "Experience with Node.js and Vue.js."),
  ],
  [
    ["php", "javascript"],
    ["nodejs", "vue"],
  ],
  "PHP named as a skill, and tools written with a dot",
);
eq(
  [
    of(
      "Senior Optical Research Scientist",
      "Well versed in the use of Zemax (or similar software) for ray tracing.",
    ),
    of("Optical Engineer", "Experience with Ansys Zemax OpticStudio."),
  ],
  [["zemax"], ["ansys", "zemax"]],
  "Zemax, the optical design software (PerkinElmer, 1 November 2026)",
);

// ➤ Tecnoempleo's page after the advert: its similar offers and its «Tecnologías más demandadas» (1,053 of its 1,255 adverts, 2 November 2026).
eq(
  of(
    "Consultor/a ERP + Alemán",
    "Experiencia con soluciones ERP (SAP, Microsoft Dynamics). Ofertas de empleo similares Consultor/a Funcional - Dynamics 365. ¿No tienes cuenta en Tecnoempleo.com? Tecnologías más demandadas java python sql aws linux azure angular kubernetes terraform autocad",
  ),
  ["sap"],
  "a portal's similar offers and most asked technologies are not read",
);

// ➤ The batch of 6 November 2026: office programs named over Microsoft Office, and names that are also words read only
// ➤ among words of their trade.
eq(
  [
    of("Administrativo", "Dominio de MS Office (Excel, Word y PowerPoint)."),
    of(
      "Développeur Vue",
      "Vous maîtrisez Vue 3 et TypeScript. Venez vite nous rejoindre !",
    ),
    of(
      "Engineer",
      "You will excel in a team. Linux and bash scripting. Stripe API integration.",
    ),
    of(
      "Consultor SAP",
      "Experiencia en SAP SD y SAP Fiori. Pega certificado (CSSA).",
    ),
  ],
  [
    ["excel", "word", "powerpoint"],
    ["vue", "typescript"],
    ["linux", "bash", "stripe"],
    ["sap-sd", "fiori", "pega"],
  ],
  "the programs over the suite, and a word read as a tool only among its trade",
);
eq(
  [
    of(
      "Giardiniere",
      "Cura di fiori e piante. Word of mouth matters. A positive Outlook.",
    ),
    of("Projektant", "Zašlete svůj životopis ve formátu MS WORD."),
    of("IT", "WordPress Cookie Plugin von Real Cookie Banner."),
    of("Directeur de projet", "Le CDP est certifié ISO 27001."),
    of("Monteur", '<div class="elementor-element elementor-element-83fec1e">'),
  ],
  [[], [], [], [], []],
  "flowers, a word of mouth, a CV's format, a cookie banner, an employer's certificate and a page's code name no tool",
);
// ➤ «Helm» alone beside containers is the tool; the German helmet is not (the rebuilt report, 8 November 2026).
eq(
  [
    "Experience with Kubernetes, Terraform, Azure and Helm.",
    "Persönliche Schutzausrüstung wie Helm und Sicherheitsschuhe wird gestellt.",
  ].map((t) => toolsOf({ title: "Engineer", description: t }).includes("helm")),
  [true, false],
  "Helm beside Kubernetes, not a helmet",
);

// ➤ Words and names the same as a tool's (DAB-10): an everyday word in capitals, a verb, a district, a call, a helmet.
const none = [
  ["Tècnic", "QUÈ FEM?"],
  ["Tekniker", "FEM SKÄL ATT JOBBA HOS OSS"],
  ["OPERARI/ÀRIA DE PRODUCCIÓ (GRAU MIG)", ""],
  ["Operari", "DE DILLUNS A DIVENDRES FINS A MIG DIA."],
  [
    "Operari",
    "CFGM O GRAU MIG EN MECANITZACIÓ. PERSONA QUE SAP TREBALLAR EN EQUIP.",
  ],
  ["MOSSO DE MAGATZEM A MIG TEMPS", "QUI SAP CONDUIR"],
  ["Operator", "React quickly to machine breakdowns and alarms."],
  ["Engineer", "Step 1: CV review. Step 7: Offer."],
  ["Planner", "Experience of Green Belt applications and appeals."],
  ["Electrician", "Install each power point and light fitting to spec."],
  ["Electrician", "Please see electrical schematics attached."],
  ["Engineer", "Join our new smart plant in Tarragona."],
  ["Ingénieur", "Poste basé à Lyon Confluence."],
  ["Ingénieur", "Entretiens en Visio via Microsoft Teams."],
  ["Technician", "Measure the Airflow and record the data."],
  ["Receptionist", "Work from our serviced office suite in Leeds."],
  ["Technician", "For details contact Sarah Jenkins."],
  [
    "Technician",
    "Tesco PLC is hiring a controls technician for its systems team.",
  ],
];
eq(
  none.map(([title, description]) => toolsOf({ title, description })),
  none.map(() => []),
  "words and names the same as a tool name no tool",
);
eq(
  [
    of("SOLDADOR TIG Y MIG"),
    of("INGENIERO DE CÁLCULO", "CÁLCULO FEM Y SIMULACIÓN CON ANSYS."),
    of("CONSULTOR SAP FICO"),
    of("Engineer", "Modern C++17 and C++20 on Linux."),
    of("Automation", "Programming in STEP 7 and TIA Portal."),
  ],
  [
    ["tig", "mig-mag"],
    ["fem", "ansys"],
    ["sap"],
    ["cpp", "linux"],
    ["tia-portal"],
  ],
  "an advert in capitals names its tools among their trade; C++ with its year",
);

done();
