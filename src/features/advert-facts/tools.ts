// ➤ The tools an advert names: a checked list of concrete software, control systems and techniques, matched while the
// ➤ pile is built (docs/research/tools-tags.md). Each tool: the forms ads write, folded (no accents, lower case) and
// ➤ matched as whole words; `caps`, acronyms matched only as written, where the folded word is also an everyday one.
// ➤ The names shown are in app/lib/tools.ts.
// The legacy's builder/tools.ts (JustJans/indudex@ec79858), copied (legacy resync T011): only its import changed. Its own
// comments keep their marks.
import { fold as foldText } from "../../shared/kit/fold.js";

// Argus's fold, which the legacy's reader calls with anything.
const fold = (s: unknown): string => foldText(String(s ?? ""));

type Tool = [id: string, forms: string[], caps: string[]];
export const TOOLS: Tool[] = [
  // ➤ Programming, data and cloud.
  ["python", ["python"], []],
  ["java", ["java"], []],
  ["javascript", ["javascript", "java script"], []],
  ["typescript", ["typescript"], []],
  ["cpp", ["c++", "c++11", "c++14", "c++17", "c++20", "c++23"], []],
  ["csharp", ["c#"], []],
  ["dotnet", ["asp net", "net core", "dotnet"], [".NET"]],
  ["golang", ["golang"], []],
  ["kotlin", ["kotlin"], []],
  ["php", ["php"], []],
  ["rails", ["ruby on rails"], []],
  ["sql", ["t-sql", "pl/sql", "sql server"], ["SQL"]],
  ["mysql", ["mysql"], []],
  ["postgresql", ["postgresql", "postgres"], []],
  ["mongodb", ["mongodb"], []],
  ["redis", ["redis"], []],
  ["elasticsearch", ["elasticsearch"], []],
  ["kafka", ["kafka"], []],
  ["spark", ["apache spark", "pyspark"], []],
  ["snowflake", ["snowflake"], []],
  ["databricks", ["databricks"], []],
  ["powerbi", ["power bi", "powerbi"], []],
  ["react", ["react js", "reactjs"], ["React"]],
  ["angular", ["angularjs"], ["Angular"]],
  ["vue", ["vue js", "vuejs"], ["Vue"]],
  ["nodejs", ["node js", "nodejs"], ["Node.js"]],
  ["react-native", ["react native"], []],
  ["nextjs", ["next js", "nextjs"], []],
  ["nestjs", ["nestjs", "nest js"], []],
  ["graphql", ["graphql"], []],
  ["html", ["html5", "html"], []],
  ["css", ["css3", "css", "scss", "sass"], []],
  ["entity-framework", ["entity framework", "ef core"], []],
  ["spring", ["spring boot", "spring framework"], []],
  ["django", ["django"], []],
  ["fastapi", ["fastapi"], []],
  ["pytorch", ["pytorch"], []],
  ["tensorflow", ["tensorflow"], []],
  ["docker", ["docker"], []],
  ["kubernetes", ["kubernetes", "k8s"], []],
  ["terraform", ["terraform"], []],
  ["ansible", ["ansible"], []],
  ["jenkins", ["jenkins"], []],
  ["git", ["git"], []],
  ["github", ["github"], []],
  ["gitlab", ["gitlab"], []],
  ["azure", ["microsoft azure", "azure devops"], ["Azure"]],
  ["aws", ["amazon web services"], ["AWS"]],
  ["gcp", ["google cloud"], ["GCP"]],
  ["linux", ["linux"], []],
  ["jira", ["jira"], []],
  ["confluence", [], ["Confluence"]],
  ["servicenow", ["servicenow"], []],
  ["vmware", ["vmware"], []],
  ["ccna", ["ccna", "ccnp"], []],
  ["splunk", ["splunk"], []],
  ["salesforce", ["salesforce"], []],
  ["groovy", [], ["Groovy"]],
  ["keycloak", ["keycloak"], []],
  ["zabbix", ["zabbix"], []],
  ["grafana", ["grafana"], []],
  ["prometheus", [], ["Prometheus"]],
  ["openshift", ["openshift"], []],
  ["rabbitmq", ["rabbitmq"], []],
  ["airflow", ["apache airflow"], ["Airflow"]],
  ["hadoop", ["hadoop"], []],
  ["langchain", ["langchain"], []],
  ["flutter", ["flutter"], []],
  ["figma", ["figma"], []],
  ["owasp", ["owasp"], []],
  // ➤ Added on 1 November 2026: data, monitoring, mobile, design and security software.
  ["bigquery", ["bigquery", "big query"], []],
  ["redshift", ["amazon redshift", "aws redshift"], ["Redshift"]],
  ["looker", [], ["Looker"]],
  ["datadog", ["datadog"], []],
  ["dynatrace", ["dynatrace"], []],
  ["new-relic", ["new relic", "newrelic"], []],
  ["kibana", ["kibana"], []],
  ["bitbucket", ["bitbucket"], []],
  ["argocd", ["argocd", "argo cd"], []],
  ["nginx", ["nginx"], []],
  ["pandas", [], ["Pandas", "pandas"]],
  ["numpy", ["numpy"], []],
  ["scikit-learn", ["scikit learn", "sklearn"], []],
  ["keras", ["keras"], []],
  ["opencv", ["opencv"], []],
  ["power-apps", ["power apps", "powerapps"], []],
  ["power-automate", ["power automate"], []],
  ["ios", [], ["iOS"]],
  ["android", [], ["Android"]],
  ["blender", [], ["Blender"]],
  ["unreal", ["unreal engine"], []],
  ["photoshop", ["photoshop"], []],
  ["indesign", ["indesign"], []],
  ["after-effects", ["after effects"], []],
  ["premiere", ["premiere pro"], []],
  ["visio", ["ms visio", "microsoft visio"], ["Visio"]],
  ["wireshark", ["wireshark"], []],
  ["crowdstrike", ["crowdstrike"], []],
  ["qradar", ["qradar"], []],
  // ➤ Testing software.
  ["selenium", ["selenium", "selenium webdriver"], []],
  ["cypress", ["cypress io"], ["Cypress"]],
  ["playwright", ["playwright"], []],
  ["testcafe", ["testcafe"], []],
  ["postman", [], ["Postman"]],
  ["junit", ["junit"], []],
  ["testng", ["testng"], []],
  ["mockito", ["mockito"], []],
  ["testrail", ["testrail"], []],
  ["zephyr", [], ["Zephyr"]],
  ["cucumber", [], ["Cucumber"]],
  // ➤ Systems and networks.
  ["cisco", ["cisco"], []],
  ["windows-server", ["windows server"], []],
  [
    "active-directory",
    ["active directory", "azure ad", "entra id", "microsoft entra"],
    [],
  ],
  ["m365", ["microsoft 365", "office 365", "m365", "o365"], []],
  ["powershell", ["powershell"], []],
  ["intune", ["intune"], []],
  ["sccm", ["sccm", "mecm"], []],
  ["redhat", ["red hat", "redhat", "rhel"], []],
  ["vlan", ["vlan", "vlans"], []],
  ["hyperv", ["hyper v"], []],
  ["veeam", ["veeam"], []],
  ["fortinet", ["fortinet", "fortigate"], []],
  ["citrix", ["citrix"], []],
  ["sharepoint", ["sharepoint"], []],
  ["glpi", ["glpi"], []],
  ["voip", ["voip"], []],
  ["pbx", [], ["PBX", "IPBX"]],
  // ➤ Business systems and maintenance.
  ["sap", [], ["SAP"]],
  ["s4hana", ["s 4hana", "s4hana", "s 4 hana"], []],
  ["sap-pm", ["sap pm"], []],
  ["sap-mm", ["sap mm"], []],
  ["dynamics", ["dynamics 365", "dynamics nav", "navision"], []],
  ["gmao", ["gmao", "gmac"], ["CMMS"]],
  ["maximo", ["ibm maximo"], ["Maximo"]],
  // ➤ Design, calculation and building.
  ["autocad", ["autocad", "auto cad"], []],
  ["autocad-electrical", ["autocad electrical"], []],
  ["revit", ["revit"], []],
  ["navisworks", ["navisworks"], []],
  ["civil3d", ["civil 3d", "civil3d"], []],
  ["archicad", ["archicad"], []],
  ["allplan", ["allplan"], []],
  ["tekla", ["tekla"], []],
  ["microstation", ["microstation"], []],
  ["sketchup", ["sketchup"], []],
  ["rhino", ["rhinoceros", "rhino 3d", "grasshopper"], []],
  [
    "bim",
    ["building information modeling", "building information modelling"],
    ["BIM"],
  ],
  ["cype", ["cype", "cypecad", "cypelec"], []],
  ["dialux", ["dialux"], []],
  ["solidworks", ["solidworks", "solid works"], []],
  ["catia", ["catia"], []],
  ["creo", ["ptc creo", "creo parametric"], []],
  ["inventor", ["autodesk inventor"], ["Inventor"]],
  ["siemens-nx", ["siemens nx", "nx cad", "nx cam", "unigraphics"], []],
  ["solid-edge", ["solid edge"], []],
  ["fusion360", ["fusion 360", "fusion360"], []],
  ["ansys", ["ansys"], []],
  ["abaqus", ["abaqus"], []],
  ["comsol", ["comsol"], []],
  ["hypermesh", ["hypermesh"], []],
  ["zemax", ["zemax", "opticstudio"], []],
  ["matlab", ["matlab"], []],
  ["simulink", ["simulink"], []],
  ["labview", ["labview"], []],
  ["altium", ["altium"], []],
  ["kicad", ["kicad"], []],
  ["orcad", ["orcad"], []],
  ["eplan", ["eplan"], []],
  ["see-electrical", ["see electrical"], []],
  ["zuken", ["zuken", "e3 series"], []],
  // ➤ Added on 1 November 2026: building sites' project tools, water and road design, geotechnics.
  ["ms-project", ["ms project", "microsoft project"], []],
  ["procore", ["procore"], []],
  ["aconex", ["aconex"], []],
  ["bluebeam", ["bluebeam"], []],
  ["hec-ras", ["hec ras", "hecras"], []],
  ["epanet", ["epanet"], []],
  ["infoworks", ["infoworks"], []],
  ["infraworks", ["infraworks"], []],
  ["openroads", ["openroads", "open roads designer"], []],
  ["istram", ["istram"], []],
  ["midas", ["midas civil", "midas gen"], []],
  ["sofistik", ["sofistik"], []],
  ["geostudio", ["geostudio"], []],
  ["primavera", ["primavera p6", "oracle primavera"], []],
  ["arcgis", ["arcgis"], []],
  ["qgis", ["qgis"], []],
  ["dlubal", ["dlubal", "rfem", "rstab"], []],
  ["scia", ["scia engineer"], []],
  ["plaxis", ["plaxis"], []],
  ["sap2000", ["sap2000", "etabs"], []],
  ["robot-structural", ["robot structural"], []],
  // ➤ Machining.
  ["cnc", ["control numerico", "commande numerique"], ["CNC"]],
  ["fanuc", ["fanuc"], []],
  ["heidenhain", ["heidenhain"], []],
  ["sinumerik", ["sinumerik"], []],
  ["mazatrol", ["mazatrol"], ["Mazak", "MAZAK"]],
  ["okuma", ["okuma"], []],
  ["mastercam", ["mastercam"], []],
  ["hypermill", ["hypermill"], []],
  ["topsolid", ["topsolid"], []],
  ["solidcam", ["solidcam"], []],
  ["edgecam", ["edgecam"], []],
  ["powermill", ["powermill"], []],
  // ➤ Automation and electronics.
  [
    "plc",
    [
      "automata programable",
      "automatas programables",
      "automate programmable",
      "automates programmables",
      "speicherprogrammierbare steuerung",
      "controllore logico programmabile",
    ],
    ["PLC", "PLCs", "SPS"],
  ],
  ["scada", ["scada"], []],
  ["hmi", [], ["HMI"]],
  ["dcs", [], ["DCS"]],
  ["tia-portal", ["tia portal", "step 7", "step7", "simatic", "wincc"], []],
  [
    "rockwell",
    [
      "allen bradley",
      "rslogix",
      "studio 5000",
      "controllogix",
      "compactlogix",
      "factorytalk",
    ],
    [],
  ],
  ["twincat", ["twincat", "beckhoff"], []],
  ["codesys", ["codesys"], []],
  ["profinet", ["profinet", "profibus"], []],
  ["modbus", ["modbus"], []],
  ["opc-ua", ["opc ua"], []],
  ["can-bus", ["can bus", "canopen"], []],
  ["knx", ["knx"], []],
  ["kuka", ["kuka"], []],
  ["yaskawa", ["yaskawa", "motoman"], []],
  ["universal-robots", ["universal robots"], []],
  ["ros", ["robot operating system"], ["ROS", "ROS2"]],
  ["autosar", ["autosar"], []],
  ["fpga", ["fpga"], []],
  ["vhdl", ["vhdl"], []],
  ["verilog", ["verilog"], []],
  ["embedded-c", ["embedded c"], []],
  ["rtos", ["rtos", "freertos"], []],
  ["stm32", ["stm32"], []],
  ["hart", [], ["HART"]],
  ["smartplant", ["smartplant", "smart plant", "intools"], []],
  // ➤ Added on 1 November 2026 (docs/research/tools-tags.md): plant control, field networks and power-system design.
  ["deltav", ["deltav", "delta v dcs"], []],
  ["aveva", ["aveva", "wonderware"], []],
  ["pcs7", ["pcs 7", "pcs7", "simatic pcs"], []],
  ["abb-800xa", ["800xa"], []],
  ["ethercat", ["ethercat"], []],
  ["io-link", ["io link"], []],
  ["mqtt", ["mqtt"], []],
  ["node-red", ["node red", "nodered"], []],
  ["etap", [], ["ETAP"]],
  ["powerfactory", ["powerfactory", "digsilent"], []],
  ["psse", ["pss e", "psse", "pss/e"], []],
  ["easypower", ["easypower"], []],
  ["caneco", ["caneco"], []],
  ["ecodial", ["ecodial"], []],
  ["elecdes", ["elecdes"], []],
  // ➤ Techniques.
  [
    "tig",
    [
      "soldadura tig",
      "soldador tig",
      "soudage tig",
      "soudeur tig",
      "tig lassen",
      "tig lasser",
      "wig schweissen",
      "wig schweisser",
      "tig welding",
      "tig welder",
      "saldatura tig",
      "spawanie tig",
    ],
    ["TIG", "WIG", "GTAW"],
  ],
  [
    "mig-mag",
    [
      "mig mag",
      "soldadura mig",
      "soldador mig",
      "soudage mig",
      "mig schweissen",
      "mag schweissen",
      "mig lassen",
      "mag lassen",
      "mig welding",
      "mag welding",
      "saldatura mig",
      "spawanie mig",
      "spawanie mag",
      "gmaw",
    ],
    ["MIG"],
  ],
  [
    "electrode",
    [
      "soldadura por electrodo",
      "soldadura con electrodo",
      "electrodo revestido",
      "soudage a l electrode",
      "elektrodenschweissen",
      "e hand schweissen",
      "elektrode lassen",
      "stick welding",
      "mma welding",
      "smaw",
    ],
    [],
  ],
  [
    "hydraulics",
    [
      "hidraulica",
      "hydraulik",
      "hydraulique",
      "hydrauliek",
      "hydraulics",
      "idraulica",
      "hydraulika",
    ],
    [],
  ],
  // ➤ Not "pneumatics" alone: the Catalan «pneumàtics» are a car's tyres.
  [
    "pneumatics",
    [
      "neumatica",
      "pneumatica",
      "pneumatik",
      "pneumatique",
      "pneumatiek",
      "pneumatyka",
      "hydraulics and pneumatics",
      "pneumatic systems",
      "pneumatic controls",
      "electro pneumatic",
    ],
    [],
  ],
  [
    "fem",
    [
      "finite element",
      "finite elements",
      "elementos finitos",
      "elements finits",
      "elements finis",
      "finite elemente",
      "eindige elementen",
    ],
    ["FEM", "FEA"],
  ],
  ["cfd", ["computational fluid dynamics"], ["CFD"]],
  [
    "gdt",
    [
      "form und lagetoleranzen",
      "tolerancias geometricas",
      "tolerancement geometrique",
    ],
    ["GD&T"],
  ],
  ["fmea", ["amfe", "fmea", "amdec", "pfmea", "dfmea"], []],
  ["spc", ["statistical process control"], ["SPC"]],
  ["ppap", ["ppap"], []],
  ["apqp", ["apqp"], []],
  ["six-sigma", ["six sigma", "green belt", "black belt"], []],
  ["lean", ["lean manufacturing", "lean management", "lean production"], []],
  ["iso9001", ["iso 9001"], []],
  ["iatf", ["iatf 16949"], ["IATF"]],
  ["iso14001", ["iso 14001"], []],
  ["iso45001", ["iso 45001"], []],
  ["8d", ["8d report", "8d methode", "metodologia 8d"], []],
  // ➤ Added on 6 November 2026 from the readers of every kind of offer (docs/research/tools-tags.md): office software,
  // ➤ business and web platforms, Java servers and tools, data, engineering and test software the adverts ask for.
  [
    "ms-office",
    [
      "ms office",
      "microsoft office",
      "office suite",
      "suite office",
      "pack office",
      "paquete office",
      "pacchetto office",
      "office pakket",
      "office paket",
    ],
    [],
  ],
  ["excel", ["ms excel", "microsoft excel"], ["Excel", "EXCEL"]],
  ["word", ["ms word", "microsoft word"], ["Word"]],
  ["powerpoint", ["powerpoint", "power point"], []],
  ["outlook", ["ms outlook", "microsoft outlook"], ["Outlook"]],
  ["google-workspace", ["google workspace", "g suite", "gsuite"], []],
  ["odoo", ["odoo"], []],
  ["trello", ["trello"], []],
  ["n8n", ["n8n"], []],
  ["itil", ["itil"], []],
  ["planon", ["planon"], []],
  ["wordpress", ["wordpress"], []],
  ["magento", ["magento"], []],
  ["elementor", ["elementor"], []],
  ["stripe", [], ["Stripe"]],
  ["firebase", ["firebase"], []],
  ["blazor", ["blazor"], []],
  ["rxjs", ["rxjs"], []],
  ["vite", ["vitejs"], ["Vite"]],
  ["tomcat", ["tomcat"], []],
  ["jboss", ["jboss", "wildfly"], []],
  ["camunda", ["camunda"], []],
  ["maven", [], ["Maven"]],
  ["intellij", ["intellij"], []],
  ["eclipse", ["eclipse ide"], ["Eclipse"]],
  ["visual-studio", ["visual studio"], []],
  ["db2", ["db2"], []],
  ["sqlite", ["sqlite"], []],
  ["oracle-db", ["oracle database", "oracle db", "oracle rac"], []],
  ["bash", [], ["Bash", "bash"]],
  ["kubevirt", ["kubevirt"], []],
  ["netbox", ["netbox"], []],
  ["pulumi", ["pulumi"], []],
  ["langgraph", ["langgraph"], []],
  ["macos", ["macos", "mac os"], []],
  ["fortran", ["fortran"], []],
  ["vivado", ["vivado"], []],
  ["modelsim", ["modelsim", "questasim", "questa sim"], []],
  ["cognex", ["cognex"], []],
  ["keyence", ["keyence"], []],
  ["ethernet-ip", [], ["EtherNet/IP"]],
  ["sap-sd", ["sap sd"], []],
  ["sap-wm", ["sap wm", "sap ewm"], []],
  ["fiori", ["sap fiori"], ["Fiori"]],
  ["coreldraw", ["coreldraw", "corel draw"], []],
  ["covadis", ["covadis"], []],
  ["elcad", ["elcad"], []],
  ["screaming-frog", ["screaming frog"], []],
  ["uml", [], ["UML"]],
  ["hazop", ["hazop"], []],
  ["dmaic", ["dmaic"], []],
  ["iso27001", ["iso 27001", "iso iec 27001", "iso27001"], []],
  ["pega", ["pegasystems"], ["Pega", "PEGA"]],
  // ➤ Added on 7 November 2026, from the readers' faults: Exchange only by its product's name («exchange» is an everyday
  // ➤ word), Helm only by its charts («Helm» is a helmet in German).
  ["abap", ["abap"], []],
  [
    "exchange",
    ["exchange server", "exchange online", "microsoft exchange", "ms exchange"],
    [],
  ],
  ["teamcenter", ["teamcenter"], []],
  ["helm", ["helm chart", "helm charts", "helmfile"], ["Helm"]],
  ["sap-btp", ["sap btp", "sap business technology platform"], []],
];

// ➤ Words split the way the forms are: letters and digits, with "+" and "#" kept for C++ and C#. Folded text that is
// ➤ all ASCII takes the plain class, the same split three times faster.
const ASCII = /^[\x00-\x7f]*$/;
const split = (folded: string): string[] =>
  folded
    .split(ASCII.test(folded) ? /[^a-z0-9+#]+/ : /[^\p{L}\p{N}+#]+/u)
    .filter(Boolean);
const words = (s: string): string[] => split(fold(s));
const BY_FIRST = new Map<string, { id: string; w: string[] }[]>();
for (const [id, forms] of TOOLS)
  for (const form of forms) {
    const w = words(form);
    if (!w.length) continue;
    const list = BY_FIRST.get(w[0]) ?? [];
    BY_FIRST.set(w[0], list);
    list.push({ id, w });
  }
for (const list of BY_FIRST.values())
  list.sort((a, b) => b.w.length - a.w.length);
// ➤ An acronym that is an everyday word too, in a sentence written all in capitals, where its capitals tell nothing:
// ➤ only among words of its trade, or not after a verb's words (Catalan «QUÈ FEM?», «GRAU MIG», «QUI SAP CONDUIR»,
// ➤ Swedish «FEM SKÄL ATT JOBBA HOS OSS»: DAB-10).
type Rule = {
  need?: RegExp;
  skip?: { test(s: string): boolean };
  text?: RegExp;
};
const LOUD: Record<string, Rule> = {
  sap: { skip: /\b(que|qui|no|ho|ja|tambe|tothom|encara|mai) sap\b/ },
  "mig-mag": {
    need: /\b(sold\w*|weld\w*|schweis\w*|soud\w*|lass\w*|salda\w*|spaw\w*|tig|mag|wig|gmaw|electrod\w*|filferro|hilo)\b/,
  },
  fem: {
    need: /\b(element\w*|ansys|abaqus|nastran|hypermesh|comsol|simul\w*|calcul\w*|berechn\w*|analy\w*|analis\w*|fea|cfd|cae|estructur\w*|struct\w*|mechani\w*|mecani\w*|festigkeit\w*|catia|solidworks|creo)\b/,
  },
};
const shouted = (sentence: string): boolean =>
  !/\p{Ll}/u.test(sentence) &&
  (sentence.match(/\p{Lu}{2,}/gu) || []).length > 1;
const loudOk = (id: string, sentence: string, folded: string): boolean => {
  const r = LOUD[id];
  return (
    !r ||
    !shouted(sentence) ||
    ((!r.need || r.need.test(folded)) && (!r.skip || !r.skip.test(folded)))
  );
};
const CAPS = TOOLS.flatMap(([id, , caps]) =>
  caps.map((c) => ({
    id,
    re: new RegExp(
      `(?<![\\p{L}\\p{N}.])${c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`,
      "u",
    ),
  })),
);
// ➤ What names no tool of the job, read on the folded text (no accents, lower case, so «Nabízíme» is «nabizime»):
// ➤ - what is offered to the candidate ("Wir bieten…", "Vi erbjuder…"): cut off, and what comes before it in the same
// ➤   sentence kept, for lists without full stops end their requirements with it;
// ➤ - a site's listing of other jobs after the advert ("Zobacz podobne oferty…", "Diese Jobs könnten dir auch gefallen…",
// ➤   a search page's "Wyniki dla „…" (240 ofert)"): nothing from its heading on is read;
// ➤ - a company's list of the makers it works with ("alianzas tecnológicas (Microsoft, Databricks…)", "Våra
// ➤   leverantörer…"), a site's menus, and the page's own notice to switch JavaScript on: the sentence is left out.
const OFFERS =
  /\b(ofrecemos|oferim|we offer|what we offer|wir bieten|was wir bieten|nous offrons|nous proposons|wij bieden|wat bieden wij|vi erbjuder|vi tilbyr|vi tilbyder|offriamo|oferecemos|oferujemy|nabizime|ponukame|nudimo|ponujamo|tarjoamme|opleidingen|cursussen|trainingen|opleidingsmogelijkheden|scholen wij|leiden wij je op|weiterbildungsmoglichkeiten|training opportunities|we will train you|formations proposees|formacion a cargo|formaciones|bootcamps?|certificaciones top|plan de carrera)\b/i;
// ➤ Not "experience in similar jobs" («erfarenhet av liknande jobb», «erfaring fra lignende stillinger»): a heading
// ➤ names offers or listings, or stands after no such word.
const LISTING =
  /\b(lavori correlati|(?<!\b(en|de|con) )trabajos relacionados|podobne oferty|wyniki dla .{1,80}?\(\d+ ofert\w*|okresl kategorie|diese jobs konnten dir auch gefallen|weitere passende anzeigen|weitere jobs|ahnliche (jobs|stellenangebote)|dalsi zakazky souvisejici|podobne (nabidky|ponuky)|(?<!\b(in|from|with|of|at|as|on|to) )(similar|related) jobs|jobs like this|you may also like|similar vacancies|ofertas similares|ofertas de (empleo|trabajo) similares|tecnologias mas demandadas|amplia tu formacion|ofertes similars|offres similaires|vergelijkbare vacatures|soortgelijke vacatures|liknande annonser|(?<!\b(av|fran|i|med|inom|pa) )liknande jobb|lignende (annonser|jobannoncer)|(?<!\b(fra|i|med|som|af|pa) )lignende stillinger|offerte simili|annunci simili|vagas (semelhantes|similares)|slicni oglasi)\b/i;
const PARTNERS =
  /\b(alianzas tecnol\w*|socios tecnol\w*|technology partners?|partenaires? (technolog\w*|reconnus?|officiels?|certifi\w*)|technologiepartner\w*|editeurs (reconnus|de logiciels?)|(gold|silver|premier|certified|official|strategic|consulting|channel) partners?|partners? estrat\w*|(strategic|technology) partnerships?|partnerships? (estrat\w*|with|include\w*|con|avec|mit|met)|partner of|partnered with|partners? including|(customers|clients),? (includ\w*|such as|like)|rely on (us|our)|(microsoft|vmware|aws|google|sap|cisco|oracle|salesforce|siemens) partners?|partners? (microsoft|vmware|aws|google|sap|cisco|oracle|salesforce|siemens)|partner con|(vara|vare|vores) leveran\w*|wspo[lł]pracujemy z (globalnymi |wiodacymi |najwiekszymi )?(liderami|partnerami|dostawcami|producentami))\b/i;
// ➤ Menus: "Explore Sectors and Skills: C C++ Rust C# Java…", Freelancer's "Here's some projects that our expert… made
// ➤ real", a job board's "Dodaj do aplikowania" after each offer it lists, a career page's files "(705,4 KiB)".
const MENUS =
  /\b(explore sectors|here'?s some projects|projects that our experts?|(other|more) jobs|browse jobs|personalberatung (in|fur) den bereichen|(ist|sind) (eine?|der|die)( \w+){0,2} (personalberatung|personaldienstleist\w*|personalvermittlung)|recruitment agency|cabinet de recrutement|dodaj do aplikowania|oferta pojawi.a sie w wynikach|szczego.y dodano|czytaj wiecej)\b|\(\d+(,\d+)? ?(kib|mib|kb|mb)\)/i;
// ➤ The notice only: the words of switching on within a few words of "JavaScript", or the page's own script tag; a
// ➤ long one-line text naming JavaScript among languages and «activité» elsewhere is no notice.
const NOTICE =
  "(navigat\\w*|browser\\w*|activ\\w*|ativ\\w*|attiv\\w*|aktiver\\w*|aktivier\\w*|deaktiv\\w*|requer\\w*|enable\\w*|habilit\\w*|eingeschaltet|einschalten|spambots|inschakel\\w*|ingeschakeld|uitgeschakeld|aanzetten|staat uit|abilit\\w*|webblasare|nettleser\\w*|przegladar\\w*|wy[lł]aczon\\w*|w[lł]acz\\w*|prohlizec\\w*|vypnut\\w*|zapnut\\w*|povol\\w*|omoguc\\w*|omogoc\\w*)";
const BROWSER_NEAR = new RegExp(
  `javascript[^•·;|,]{0,30}\\b${NOTICE}|\\b${NOTICE}[^•·;|,]{0,30}javascript|\\b(utan|uten|uden|bez|without|sans|ohne|zonder|senza|sin|sem) javascript|text/javascript|javascript protected`,
  "i",
);
const BROWSER = (folded: string): boolean => BROWSER_NEAR.test(folded);
// ➤ Sentences, not lines: many sources send their text as one line. Not after an abbreviation ("z.B. SPS", «např.
// ➤ PLC»); and before a section's heading, so what is offered ends where the profile starts.
const HEADINGS = [
  "Dein Profil",
  "Ihr Profil",
  "Das bringst du mit",
  "Das bringst Du mit",
  "Das bringen Sie mit",
  "Was du mitbringst",
  "Was Du mitbringst",
  "Was Sie mitbringen",
  "Deine Aufgaben",
  "Ihre Aufgaben",
  "Wir bieten",
  "Was wir bieten",
  "Das bieten wir",
  "Unser Angebot",
  "Requirements",
  "Qualifications",
  "Your profile",
  "About you",
  "Responsibilities",
  "What we offer",
  "We offer",
  "Benefits",
  "Votre profil",
  "Profil recherché",
  "Vos missions",
  "Nous offrons",
  "Ce que nous offrons",
  "Requisitos",
  "Tu perfil",
  "Funciones",
  "Ofrecemos",
  "Qué ofrecemos",
  "Requisits",
  "Funcions",
  "Oferim",
  "Je profiel",
  "Jouw profiel",
  "Wat vragen wij",
  "Wat ga je doen",
  "Functie-eisen",
  "Wat bieden wij",
  "Wij bieden",
  "Arbeidsvoorwaarden",
  "Wymagania",
  "Twoje zadania",
  "Oczekujemy",
  "Zakres obowiązków",
  "Oferujemy",
  "Co oferujemy",
  "Požadujeme",
  "Náplň práce",
  "Nabízíme",
  "Ponúkame",
  "Požiadavky",
  "Kvalifikationer",
  "Arbetsuppgifter",
  "Vi erbjuder",
  "Kvalifikasjoner",
  "Arbeidsoppgaver",
  "Vi tilbyr",
  "Vi tilbyder",
  "Requisiti",
  "Mansioni",
  "Offriamo",
  "Oferecemos",
];
const ABBREVIATIONS =
  "z\\.\\s?B|e\\.g|i\\.e|bzw|ca|inkl|ggf|evtl|usw|vgl|incl|np|např|tj|tzn|tzw|p\\.\\s?ej|p\\.\\s?ex|Dipl|Ing|Dr|Nr";
const SENTENCES = new RegExp(
  `\\n+|(?<!(?:^|[\\s(])(?:${ABBREVIATIONS})\\.)(?<=[.!?])\\s+(?=\\p{Lu})| · |\\s+(?=(?:${HEADINGS.join("|")})(?![\\p{L}\\p{N}]))`,
  "u",
);
// ➤ What some tools need to be read as tools, measured on the samples (docs/research/tools-tags.md):
// ➤ - text: the advert is not about something else (French «monteur pneumatique», «pneus»: tyres);
// ➤ - skip: the sentence is not the company's own certificate ("société certifiée ISO 9001");
// ➤ - need: an acronym that is also an everyday one stands among words of its trade ("DCS" of a process plant, not a
// ➤   «Direction Cyber Sécurité"; "SPC" of quality control).
// ➤ A certificate is the company's unless the sentence asks for experience of it ("experiencia en entornos certificados");
// ➤ also inside a compound («kvalitetscertifierad») and in Norwegian («sertifisert») or Polish («certyfikat»).
// ➤ Keeping a certification up is a task of the job («mantenimento della certificazione ISO 14001»).
const CERTIFIED = {
  test: (s: string) =>
    /certifi|zertifizi|gecertificeerd|sertifi|certyfik|certifik/i.test(s) &&
    !/\b(experien\w*|esperien\w*|erfahrung\w*|ervaring\w*|erfaren\w*|erfaring\w*|kenntnis\w*|kennis|knowledge|conocimiento\w*|connaissance\w*|conoscenz\w*|conhecimento\w*|kunskap\w*|kunnskap\w*|kendskab\w*|doswiadcz\w*|znajomos\w*|zkusenost\w*|znalost\w*|skusenost\w*|iskustv\w*|izkusnj\w*)\b|\b(mantenimento|maintain\w*|maintenance|mantener|mantenimiento|maintien|aufrechterhalt\w*|erhalt\w*|behoud\w*|utrzymani\w*) (del\w* |of (the )?|de (la |las |los )?|der |van de )?(certifica\w*|zertifizierung\w*|certificering\w*|certyfikac\w*)/i.test(
      s,
    ),
};
// ➤ The words a PLC stands among: of automation and of the machines, systems and trades it runs.
const PLC_WORDS =
  /\b(program\w*|siemens|allen[- ]bradley|rockwell|omron|mitsubishi|beckhoff|schneider|codesys|hmi|scada|s7|tia|step ?7|steuerung\w*|gesteuert\w*|automa\w*|plc[- ]?(engineer\w*|programm\w*|specialist\w*)|techniker\w*|technieker\w*|technicien\w*|technician\w*|tecnico\w*|tecnici|znalost\w*|znajomos\w*|conoscenz\w*|conhecimento\w*|omgeving|environment|umgebung|entorno|ambiente|impiant\w*|saato\w*|ohjelm\w*|kunnossapi\w*|sahko\w*|felsok\w*|fejlfind\w*|feilsok\w*|\w*underhall\w*|regelung\w*|regeltechn\w*|regelkreis\w*|regelaar\w*|besturing\w*|sturing\w*|gestuurd\w*|control\w*|commande\w*|electr\w*|elektr\w*|instrument\w*|variador\w*|variateur\w*|frequenz\w*|drives?|antrieb\w*|aandrijving\w*|robot\w*|sensor\w*|mainten\w*|manten\w*|wartung|onderhoud|instandhaltung|ladder|cuadros?|armarios?|armoires?|kast\w*|schalt\w*|schakel\w*|system\w*|systeem\w*|sistem\w*|technik|techniek|kenntnis\w*|kennis|maschin\w*|machin\w*|maquin\w*|anlag\w*|installat\w*|storing\w*|stoerung\w*|diagnos\w*|pneumat\w*|hydraul\w*|embedded|modbus|profinet|profibus|bacnet|knx|motor\w*|ot|styr\w*|vedlikehold\w*|vedligehold\w*|kunskap\w*|kunnskap\w*|kendskab\w*|sterown\w*|sterowa\w*|utrzyman\w*|maszyn\w*|urzadze\w*|instala\w*|rizen\w*|udrzb\w*|stroj\w*|dijagnos\w*|oprem\w*|odrzava\w*)\b/i;
// ➤ Work on a phone's platform, not owning a phone.
const MOBILE_WORK =
  /\b(develop\w*|apps?|mobile|kotlin|java|swift\w*|xcode|sdk|studio|react native|flutter|engineer\w*|programm\w*|entwickl\w*|desarroll\w*|developpe\w*|mdm|intune|jamf|device management)\b/i;
const PHONE_ONLY =
  /\b(smartphone|cellphone|handy|telefono|telephone|movil)\b(?![^.]*\b(develop\w*|apps?|engineer\w*)\b)/i;
const RULES: Record<string, Rule> = {
  pneumatics: {
    text: /\bpneus?\b|pneumaticien|\b(monteur|monteuse|mecanicien|mecanicienne|technicien|montage)( de| en)? pneumatiques?\b|\bpneumatiques? (poids lourds?|vl|agricoles?|camions?|vehicules?)\b|\bpneuservis\w*|\b(vymen\w*|oprav\w*|servis\w*|montaz\w*|prodej\w*|uskladn\w*) pneumatik|\bprezouvani\b/i,
  },
  iso9001: { skip: CERTIFIED },
  iso14001: { skip: CERTIFIED },
  iso45001: { skip: CERTIFIED },
  iatf: { skip: CERTIFIED },
  dcs: {
    need: /\b(plc|plcs|sps|scada|automa\w*|control\w*|process\w*|honeywell|emerson|yokogawa|deltav|800xa|pcs ?7|instrument\w*|foxboro|abb|siemens|regelung\w*|regeltechn\w*)\b/i,
  },
  // ➤ Not a SAFe Program Consultant nor a Vanderbilt alarm panel.
  spc: {
    need: /\b(statisti\w*|estatisti\w*|statysty\w*|process\w*|proces\w*|prozess\w*|qualit\w*|qualid\w*|calid\w*|kvalit\w*|jakos\w*|cpk|msa|capabilit\w*|six sigma|apqp|ppap|fmea|amdec|method\w*|methode\w*|lean|kaizen|production|produktion|productie|uptime|karet|karty|mereni|pomiar\w*|measur\w*|messung\w*|mesure\w*)\b/i,
    skip: /\bsafe\b[^.]{0,20}\bspc\b|program consultant|scaled agile|vanderbilt|intrusion|inbrottslarm/i,
  },
  // ➤ The other languages: "CFD Trading" of a finance site; «mazák» (Czech: an old hand) folded into Mazak; a hotel
  // ➤ called "Azure"; a "33kV SAP" (Senior Authorised Person) of the power grid. Polish "CFD/MES": MES is its FEM.
  cfd: {
    need: /\b(simula\w*|symulac\w*|fluid\w*|hydrodynam\w*|ansys|fluent|openfoam|star[- ]?ccm\w*|comsol|therm\w*|aero\w*|flow\w*|stromung\w*|numeri\w*|mesh\w*|cae|fea|fem|mes|wytrzyma\w*|heat|warme\w*)\b/i,
  },
  azure: {
    skip: /\b(hotels?|resorts?|buffet|pastry|patisserie|kitchen|chef|cook)\b/i,
  },
  // ➤ The Dutch sample (30 October 2026): the colleagues who model in BIM are not the job's BIM; «FACT SAP» is a
  // ➤ mental-health team; the AWS of a welder's certificates is the American Welding Society; a "star and snowflake"
  // ➤ model is no Snowflake; a page's code at "github.io" is no GitHub.
  bim: {
    skip: /\bbim[- ]?(modelleurs|medewerkers|modellers|modelers|tekenaars|specialisten)\b/i,
  },
  aws: {
    skip: /\b(welding|welder\w*|lassen|lascertificat\w*|soldadura|soudage|schweiss\w*|asme)\b/i,
  },
  snowflake: {
    skip: /\bstar\w* (en|and|y|et|und) snowflake\b|\bsnowflake[- ]?(schema|model)/i,
  },
  github: { skip: /github\.io/i },
  // ➤ The English sample: "PLC" is also a product life cycle and a public limited company, so the acronym needs words of
  // ➤ automation beside it; "ROS dates" on a building site are no robot software; a "Senior Authorised Person (SAP)"
  // ➤ is a British electrical post.
  ros: {
    need: /\b(robot\w*|ros ?2|ros2_control|middleware|dds|navigation|gazebo|moveit|autonom\w*|c\+\+|python|linux|perception|lidar|slam|embedded)\b/i,
  },
  sap: {
    skip: /\bfact[- ]sap\b|\bauthori[sz]ed persons?\b|\b\d+ ?kv sap\b|\bsap \d+ ?kv\b|\b(hv|lv|ehv) sap\b/i,
  },
  // ➤ The Spanish sample: "GCP" is also Good Clinical Practice; "comunicaciones PLC" of smart meters run over the power
  // ➤ line; "Java Script" is JavaScript.
  gcp: {
    need: /\b(cloud|google|bigquery|kubernetes|gke|terraform|aws|azure|devops|data\w*|vertex|pub ?sub|dataflow|looker|platform\w*|python|sql|infra\w*|sistemas|systems)\b/i,
  },
  // ➤ The Swedish sample: Scania's "Scania Production System (SPS)" is no German SPS.
  plc: {
    need: PLC_WORDS,
    skip: /\bproduct life ?cycle\b|\bcomunicaci\w* plc\b|\bpower ?line\b|\bplc (prime|g3)\b|\bproduction system\b|\bplc (is|are|has|have|was|were|group|holdings)\b/i,
  },
  java: { skip: /\bjava[ -]script\b/i },
  // ➤ The added tags read on 30 October: a site's own "PHP Warning" is no PHP asked for.
  php: { skip: /\bphp (warning|notice|fatal error|deprecated|parse error)\b/i },
  // ➤ The tools added on 1 November whose name is also another thing: an element, a tree, a dramatist, a postman, a
  // ➤ vegetable, a wind, the German "hart" (hard), a building's airflow, Spain's construction safety coordinator (CSS):
  // ➤ each among words of its own trade.
  selenium: {
    need: /\b(test\w*|automat\w*|qa|webdriver|cucumber|cypress|playwright|appium|e2e|end to end|browser\w*|java|python|javascript)\b/i,
  },
  cypress: {
    need: /\b(test\w*|automat\w*|qa|e2e|end to end|selenium|playwright|javascript|typescript|front ?end|jest)\b/i,
  },
  playwright: {
    need: /\b(test\w*|automat\w*|qa|e2e|end to end|selenium|cypress|javascript|typescript|python)\b/i,
  },
  postman: {
    need: /\b(api\w*|rest\w*|test\w*|swagger|soapui|insomnia|endpoint\w*|integration\w*|json)\b/i,
  },
  zephyr: {
    need: /\b(jira|test\w*|qa|xray|testrail|rtos|embedded|firmware)\b/i,
  },
  cucumber: { need: /\b(test\w*|bdd|gherkin|selenium|automat\w*|qa|java)\b/i },
  groovy: {
    need: /\b(jenkins|java|gradle|grails|pipeline\w*|spock|kotlin|scala|ci ?cd)\b/i,
  },
  prometheus: {
    need: /\b(grafana|monitor\w*|kubernetes|k8s|alert\w*|observab\w*|metrics?|elk|zabbix|devops|sre)\b/i,
  },
  airflow: {
    need: /\b(data ?(engineer\w*|pipeline\w*|platform\w*|warehous\w*|lake\w*)|big ?data|datos|daten\w*|donnees|dades|gegevens|etl|elt|pipeline\w*|python|spark|dbt|dags?|orchestrat\w*|bigquery|snowflake|databricks|kafka|sql)\b/i,
  },
  hart: {
    need: /\b(instrument\w*|transmit\w*|field ?bus|fieldbus|foundation|4 ?- ?20 ?ma|protocol\w*|calibr\w*|valve\w*|sensor\w*|loops?|profibus|smartplant)\b/i,
  },
  html: {
    need: /\b(css\w*|scss|javascript|typescript|front ?end\w*|web\w*|react|angular|vue\w*|ui|ux|php|wordpress|develop\w*|desarroll\w*|entwickl\w*|ontwikkel\w*|program\w*|developpe\w*)\b/i,
  },
  // ➤ Read on 115,413 adverts of the store: Cisco also named as a customer or a comparison ("We are the Cisco of L4",
  // ➤ "organisations like Cisco"): only among words of networks.
  cisco: {
    need: /\b(switch\w*|rout\w*|network\w*|netzwerk\w*|reseau\w*|redes|ios|nx ?os|ccna|ccnp|vlans?|firewall\w*|lan|wan|meraki|asa|catalyst|wi ?fi|wifi|vpn|voip|telephon\w*|webex|sd ?wan)\b/i,
  },
  // ➤ The second tools added on 1 November whose name is also another thing: a French «étape», an astronomer's redshift,
  // ➤ a zoo's pandas, a kitchen blender, a French «visio» (a video call), a film's after-effects.
  // ➤ Read on 109,892 adverts: Spain's ETAP is also a drinking-water plant («EDAR, ETAP, desalación»); "a smartphone with
  // ➤ the last iOS/Android update" asks for a phone, not the platform.
  etap: {
    need: /\b(power|electri\w*|load ?flow|short ?circuit|arc ?flash|protection|relay\w*|grid|substation\w*|ieee|cable\w*|harmonic\w*|reseau\w*|elektr\w*)\b/i,
    skip: /\b(edar|tratamiento de aguas?|agua potable|potabiliz\w*|depurador\w*|desalac\w*)\b/i,
  },
  ios: { need: MOBILE_WORK, skip: PHONE_ONLY },
  looker: {
    need: /\b(data\w*|bi|dashboard\w*|sql|analytic\w*|bigquery|lookml|report\w*)\b/i,
  },
  redshift: {
    need: /\b(aws|amazon|data\w*|sql|warehouse|etl|elt|snowflake|bigquery)\b/i,
  },
  pandas: {
    need: /\b(python|data\w*|numpy|sql|analy\w*|jupyter|scikit|spark)\b/i,
  },
  android: { need: MOBILE_WORK, skip: PHONE_ONLY },
  blender: {
    need: /\b(3d|render\w*|model\w*|animat\w*|cad|unity|unreal|maya|houdini|texture\w*)\b/i,
  },
  visio: {
    need: /\b(microsoft|diagram\w*|flowchart\w*|office|excel|powerpoint|word|uml|bpmn|schema\w*|drawio|draw io)\b/i,
    skip: /\b(en|par|via) visio\b|\bvisio ?(conf\w*|call\w*)\b/i,
  },
  "after-effects": {
    need: /\b(adobe|video\w*|motion|animat\w*|premiere|edit\w*|graphic\w*|design\w*)\b/i,
  },
  css: {
    need: /\b(html\w*|javascript|typescript|front ?end\w*|web\w*|react|angular|vue\w*|ui|ux|tailwind|bootstrap|php|wordpress|sass|scss)\b/i,
  },
  // ➤ The tools added on 6 November whose name is also a word: to excel, a word, an outlook, a stripe, the French «vite»
  // ➤ (quickly), a maven, an eclipse, a party (bash), the Spanish «pega» (sticks), the Italian «fiori» (flowers), and the
  // ➤ French «vue» (a view) that a bare "Vue" may be.
  vue: {
    need: /\b(vue\W?js|vue\W?[23]|javascript|typescript|react|angular|nuxt\w*|vite|pinia|vuex|composition api|front ?end\w*|developpeu\w*|developer\w*|entwickler\w*|desarrollador\w*|ontwikkelaar\w*|programista)\b/i,
  },
  excel: { skip: /\bexcel (in|at|as|beyond)\b/i },
  outlook: {
    need: /\b(excel|word|powerpoint|office|microsoft|ms|teams|e ?mail\w*|mail\w*|correo\w*|calendar\w*|agenda\w*)\b/i,
  },
  stripe: {
    need: /\b(payment\w*|pagos?|paiement\w*|zahlung\w*|api\w*|paypal|checkout|webhook\w*|billing|subscription\w*|integrat\w*|saas|fintech|n8n)\b/i,
  },
  helm: {
    need: /\b(kubernetes|k8s|docker|containers?|openshift|argo ?cd|terraform|devops|gitops|eks|aks|gke|rancher|istio|charts?)\b/i,
    skip: /\b(sicherheitsschuh\w*|schutzhelm\w*|schutzausrust\w*|psa|warnwest\w*|handschuh\w*)\b/i,
  },
  vite: {
    need: /\b(javascript|typescript|react|vue\w*|svelte|webpack|front ?end\w*|npm|node\w*|esbuild|rollup|tailwind)\b/i,
  },
  maven: {
    need: /\b(java|gradle|spring|jenkins|junit|ci ?cd|kotlin|git|build\w*)\b/i,
  },
  eclipse: {
    need: /\b(java|ide|intellij|maven|plugin\w*|rcp|develop\w*|programm\w*|entwickl\w*|embedded)\b/i,
  },
  bash: {
    need: /\b(shell\w*|linux|unix|script\w*|python|zsh|powershell|devops|terminal|command line|cli|perl|ansible)\b/i,
  },
  pega: {
    need: /\b(bpm|pegasystems|business architect\w*|cssa|csa|lsa|case management|workflow\w*|low ?code|decisioning|certif\w*|developer\w*|architect\w*)\b/i,
  },
  fiori: { need: /\b(sap|ui5|sapui5|abap|s ?4\w*|hana|odata)\b/i },
  // ➤ Read on the 694,251 published offers of 6 November: WordPress in a site's cookie banner («WordPress Cookie Plugin»),
  // ➤ its footer («WordPress thema door MH Themes») or a spam line («Download Nulled WordPress Themes»)
  // ➤ and Magento in a host's menu or a salary guide («platforms like Shopify or Magento are the clearest drivers of higher
  // ➤ pay»); Elementor in a page's own code («elementor-element»); Word as the format a CV is sent in («ve formátu MS WORD»);
  // ➤ ISO 27001 as the employer's own certificate («le CDP est certifié ISO 27001»), counted only among words of security.
  wordpress: {
    skip: /\b(cookie\w*|hosting|thema door|theme by|powered by|nulled|download)\b/i,
  },
  magento: { skip: /\b(hosting|higher pay|gross salary)\b/i },
  elementor: {
    need: /\b(wordpress|web ?design\w*|page ?builder|websites?|webseite\w*|site web|sitio web|divi|woocommerce)\b/i,
  },
  word: {
    need: /\b(excel|powerpoint|outlook|office|microsoft|ms)\b/i,
    skip: /\b(format\w*|cv|curriculum\w*|resume|lebenslauf|zivotopis)\b/i,
  },
  iso27001: {
    need: /\b(secur\w*|sicherheit\w*|seguridad|beveiliging|bezpieczenst\w*|audit\w*|complian\w*|isms|nis ?2|risk\w*|risque\w*|riesgo\w*|grc|soc ?2|nist|governance)\b/i,
  },
  // ➤ Words or names the same as a tool's, around which it is none (DAB-10): a sentence that begins «React quickly», a
  // ➤ hiring process's «Step 7:», Britain's green belt, a serviced office suite, a socket's «power point», «please see
  // ➤ electrical schematics», a firm's «new smart plant», Lyon's Confluence district, a recruiter's surname.
  react: {
    skip: /^\W*react (quickly|promptly|swiftly|fast|immediately|appropriately|calmly|effectively|to|on)\b/i,
  },
  "tia-portal": { skip: /\bstep ?7\s*:/i },
  "six-sigma": {
    skip: /\bgreen belt (land|sites?|applications?|appeals?|polic\w*|release|reviews?|boundar\w*)\b|\b(in|on|within) the green belt\b/i,
  },
  "ms-office": {
    skip: /\b(serviced|private|luxury|modern|executive) office suites?\b/i,
  },
  powerpoint: {
    skip: /\bpower points?\b.{0,30}\b(light\w*|sockets?|switch\w*|fittings?|wiring)\b|\b(install\w*|wir\w*|sockets?|fittings?)\b.{0,30}\bpower points?\b/i,
  },
  "see-electrical": {
    skip: /\b(please|you|to|will|can|must|may|also|and) see electrical\b/i,
  },
  smartplant: { skip: /\b(new|our|first|digital|future) smart plants?\b/i },
  confluence: { skip: /\b(lyon|quartier|la|une) confluence\b/i },
  jenkins: {
    skip: /\b(contact\w*|kontakt\w*|ask for|speak to|call|e-?mail)\b.{0,40}\bjenkins\b|\b(mr|mrs|ms|miss|dr)\.? jenkins\b/i,
  },
};
// ➤ Twelve at most: the owner found five too few for a full-stack or systems advert that names a dozen (1 November 2026).
const MAX = 12;
// ➤ A tool named more narrowly ("SAP S/4HANA" for "SAP", "PostgreSQL" for "SQL") names the wider one too.
export const NARROWER: Record<string, string[]> = {
  sap: ["s4hana", "sap-pm", "sap-mm", "sap-sd", "sap-wm", "fiori", "sap-btp"],
  "ms-office": ["excel", "word", "powerpoint", "outlook"],
  autocad: ["autocad-electrical", "civil3d"],
  sql: ["mysql", "postgresql"],
  react: ["react-native"],
  cisco: ["ccna"],
};

// ➤ Where a place in the folded sentence falls in the sentence as written: the same, unless folding changed its length.
function writtenAt(sentence: string, folded: string, at: number): number {
  if (folded.length === sentence.length) return at;
  let low = 0,
    high = sentence.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (fold(sentence.slice(0, mid)).length < at) low = mid + 1;
    else high = mid;
  }
  return low;
}

// ➤ Addresses and file names name no tool: "applicationForm.php?sid=…", a WordPress warning "…/job-application.php on
// ➤ line 148", a link to "/jobs/sap-consultant".
const LINKS =
  /https?:\/\/\S+|\bwww\.\S+|<\?php\b|(?<!\S)[^\s.]*(?:\.[^\s.]+)*?\.(?:php\d?|aspx?|jsp|cfm|cgi|html?|pdf|docx?)(?![\p{L}\p{N}])\S*/giu;
const LINK_HINT =
  /https?:|www\.|<\?php|\.(?:php|aspx?|jsp|cfm|cgi|html?|pdf|docx?)/i;

// ➤ The sentences that may name the job's tools, as written and folded (the title first, never read as a listing). A
// ➤ listing runs to the end of the text; where one stood before an advert's text, the advert had closed (Comarch's
// ➤ «Ta oferta jest już nieaktualna», «Deze vacature is niet meer actief»).
type Raw = { title?: string; description?: unknown; company?: unknown };
type Sentence = { sentence: string; folded: string };
export function readable(raw: Raw): Sentence[] {
  const kept: Sentence[] = [];
  const description = String(raw.description || "");
  const parts = [
    raw.title,
    ...(LINK_HINT.test(description)
      ? description.replace(LINKS, " ")
      : description
    ).split(SENTENCES),
  ];
  for (let k = 0; k < parts.length; k++) {
    let sentence = parts[k];
    if (!sentence) continue;
    let folded = fold(sentence);
    const listing = k > 0 ? LISTING.exec(folded) : null;
    const offer = OFFERS.exec(folded);
    const cut = Math.min(
      listing ? listing.index : Infinity,
      offer ? offer.index : Infinity,
    );
    if (cut < Infinity) {
      sentence = sentence.slice(0, writtenAt(sentence, folded, cut));
      folded = folded.slice(0, cut);
    }
    if (
      sentence.trim() &&
      !PARTNERS.test(folded) &&
      !MENUS.test(folded) &&
      !BROWSER(folded)
    )
      kept.push({ sentence, folded });
    if (listing) break;
  }
  return kept;
}

// ➤ Every name of each tool as words, worked out once, to tell a tool from the employer's own name.
const NAMES = TOOLS.map(([id, forms, caps]): [string, string[]] => [
  id,
  [...forms, ...caps].map((f) => ` ${words(f).join(" ")} `),
]);

// ➤ The tools an advert names, in the order it first names them, twelve at most; a tool that is the employer's own
// ➤ name ("KUKA", "SAP", "Beckhoff") is the employer, not a tool asked for.
export function toolsOf(raw: Raw): string[] {
  const sentences = readable(raw);
  if (!sentences.length) return [];
  const whole = sentences.map((s) => s.folded).join("\n");
  const employer = ` ${words(String(raw.company || "")).join(" ")} `;
  const found = new Map<string, number>();
  const ok = (id: string, folded: string): boolean => {
    const r = RULES[id];
    return (
      !r ||
      ((!r.text || !r.text.test(whole)) &&
        (!r.skip || !r.skip.test(folded)) &&
        (!r.need || r.need.test(folded)))
    );
  };
  const starts: number[] = [];
  let at = 0;
  for (const { folded } of sentences) {
    starts.push(at);
    const w = split(folded);
    for (let i = 0; i < w.length; i++) {
      // ➤ Every form that starts here: "hydraulics and pneumatics" names both.
      for (const f of BY_FIRST.get(w[i]) || [])
        if (
          !found.has(f.id) &&
          f.w.every((x, j) => w[i + j] === x) &&
          ok(f.id, folded)
        )
          found.set(f.id, at + i);
    }
    at += w.length;
  }
  // ➤ The acronyms as written: looked for once in the whole text, then placed in the first sentence that keeps them.
  const text = sentences.map((s) => s.sentence).join("\n");
  for (const { id, re } of CAPS) {
    if (found.has(id) || !re.test(text)) continue;
    for (let k = 0; k < sentences.length; k++) {
      const m = re.exec(sentences[k].sentence);
      if (
        m &&
        ok(id, sentences[k].folded) &&
        loudOk(id, sentences[k].sentence, sentences[k].folded)
      ) {
        found.set(
          id,
          starts[k] + words(sentences[k].sentence.slice(0, m.index)).length,
        );
        break;
      }
    }
  }
  if (!found.size) return [];
  const named = new Set(
    employer.trim()
      ? NAMES.filter(([, names]) =>
          names.some((n) => employer.includes(n)),
        ).map(([id]) => id)
      : [],
  );
  // ➤ The narrower name says the wider one: "SAP PM" is not also "SAP", "AutoCAD Electrical" not also "AutoCAD".
  for (const [wide, narrow] of Object.entries(NARROWER))
    if (narrow.some((id) => found.has(id))) named.add(wide);
  return [...found]
    .filter(([id]) => !named.has(id))
    .sort((a, b) => a[1] - b[1])
    .slice(0, MAX)
    .map(([id]) => id);
}
