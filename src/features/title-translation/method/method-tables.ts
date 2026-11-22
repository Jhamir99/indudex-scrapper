// Legacy builder/mt/method-tables.mjs (JustJans/indudex@b0cd182), word for word but for types, lint and paths.
// The tables and small helpers of the title method (builder/mt/method.mjs): the names Firefox translates and those it
// never does, the languages, openings, stacks and job words.
import { translationData } from "../data.js";
import { tradesFor, SPOKEN, TRADES } from "./trades.js";
import { decodeEntities } from "../../../shared/kit/entities.js";
import { escape } from "./patterns.js";

// Product names Firefox translates (measured on 529 titles), and names it never does, to stand in: kept in all
// 41 positions tried, opening the title too, in every direction ("Oracle" came back "Oráculo").
export const NAMES = [
  "Kubernetes",
  "MEP",
  "Appian",
  "VodafoneThree",
  "OpenShift",
  "Terraform",
  "Ansible",
  "Jenkins",
  "Docker",
  ".NET",
  "Snowflake",
  "Rust",
  "Spring Boot",
  "Spring",
  "Flutter",
  "Unity",
  "Angular",
  "React Native",
  "React",
  "Swift",
  "Databricks",
  "Microsoft Teams",
  "MS Teams",
  "Dynamics 365",
  "Dynamics CRM",
  "Dynamics NAV",
  "Dynamics AX",
  "MS Dynamics",
  "Microsoft Dynamics",
  "Red Hat",
  "Scania",
  "B. Eng.",
  "B.Eng.",
  "M. Eng.",
  "M.Eng.",
  "Full Stack",
  "Full-Stack",
  "Fullstack",
  "Back-end",
  "Backend",
  "Front-end",
  "Frontend",
  "Python",
  "See Electrical",
  "Business Central",
  "MLOps",
  "MLops",
  "Power Apps",
  "Power BI",
  "Power Automate",
  "EPLAN",
  "E-Plan",
  "Power Platform",
  "Powerplatform",
  "PowerPlatform",
  "OutSystems",
  "Power Pages",
  "Copilot Studio",
  "Active Directory",
  "Workday",
  "SolidWorks",
  "Salesforce",
  "Shopware",
  "Node.js",
  "NodeJS",
  "SAP Basis",
  "S/4HANA Basis",
  "S/4 HANA Basis",
  "Azure",
  "Forward Deployed",
  "Agentic AI",
  "Agentic",
  "Vakgarage",
  "Modern Workplace",
  "Service Desk",
  "ServiceDesk",
  "Servicedesk",
];
// Nokia, Xerox and Bosch added on 25 October (six trades ran out of five), kept in every pair; Lidl was not ("Lil").
// A German little word with a capital inside a title (before).
// Before a number too ("Befristet Auf 2 Jahre"), and the words of a fixed term ("Zunächst Befristet Für 2 Jahre").
export const TITLE_DE =
  /(?<=[\p{L}\d)] )(?:Für|Mit|Und|Als|Im|Am|In|An|Zur|Zum|Zu|Bei|Von|Vom|Der|Die|Das|Den|Dem|Des|Ein|Eine|Einen|Einer|Auf|Aus|Nach|Oder|Sowie|Bis|Ab|Über|Unter|Ohne|Befristet|Zunächst|Vorerst)(?= [\p{L}\d])/u;
// A language's name standing on its own in an English title, as each language writes it (before).
export const LANGUAGES = {
  English: {
    es: "inglés",
    ca: "anglès",
    fr: "anglais",
    nl: "Engels",
    de: "Englisch",
  },
  German: {
    es: "alemán",
    ca: "alemany",
    fr: "allemand",
    nl: "Duits",
    de: "Deutsch",
  },
  French: {
    es: "francés",
    ca: "francès",
    fr: "français",
    nl: "Frans",
    de: "Französisch",
  },
  Spanish: {
    es: "español",
    ca: "espanyol",
    fr: "espagnol",
    nl: "Spaans",
    de: "Spanisch",
  },
  Italian: {
    es: "italiano",
    ca: "italià",
    fr: "italien",
    nl: "Italiaans",
    de: "Italienisch",
  },
  Dutch: {
    es: "holandés",
    ca: "holandès",
    fr: "néerlandais",
    nl: "Nederlands",
    de: "Niederländisch",
  },
  Portuguese: {
    es: "portugués",
    ca: "portuguès",
    fr: "portugais",
    nl: "Portugees",
    de: "Portugiesisch",
  },
  Polish: {
    es: "polaco",
    ca: "polonès",
    fr: "polonais",
    nl: "Pools",
    de: "Polnisch",
  },
  Swedish: {
    es: "sueco",
    ca: "suec",
    fr: "suédois",
    nl: "Zweeds",
    de: "Schwedisch",
  },
  Danish: {
    es: "danés",
    ca: "danès",
    fr: "danois",
    nl: "Deens",
    de: "Dänisch",
  },
  Norwegian: {
    es: "noruego",
    ca: "noruec",
    fr: "norvégien",
    nl: "Noors",
    de: "Norwegisch",
  },
  Finnish: {
    es: "finés",
    ca: "finès",
    fr: "finnois",
    nl: "Fins",
    de: "Finnisch",
  },
  Czech: {
    es: "checo",
    ca: "txec",
    fr: "tchèque",
    nl: "Tsjechisch",
    de: "Tschechisch",
  },
  Slovak: {
    es: "eslovaco",
    ca: "eslovac",
    fr: "slovaque",
    nl: "Slowaaks",
    de: "Slowakisch",
  },
  Greek: {
    es: "griego",
    ca: "grec",
    fr: "grec",
    nl: "Grieks",
    de: "Griechisch",
  },
  Hungarian: {
    es: "húngaro",
    ca: "hongarès",
    fr: "hongrois",
    nl: "Hongaars",
    de: "Ungarisch",
  },
  Romanian: {
    es: "rumano",
    ca: "romanès",
    fr: "roumain",
    nl: "Roemeens",
    de: "Rumänisch",
  },
  Croatian: {
    es: "croata",
    ca: "croat",
    fr: "croate",
    nl: "Kroatisch",
    de: "Kroatisch",
  },
  Bulgarian: {
    es: "búlgaro",
    ca: "búlgar",
    fr: "bulgare",
    nl: "Bulgaars",
    de: "Bulgarisch",
  },
  Turkish: { es: "turco", ca: "turc", fr: "turc", nl: "Turks", de: "Türkisch" },
  Russian: {
    es: "ruso",
    ca: "rus",
    fr: "russe",
    nl: "Russisch",
    de: "Russisch",
  },
  Ukrainian: {
    es: "ucraniano",
    ca: "ucraïnès",
    fr: "ukrainien",
    nl: "Oekraïens",
    de: "Ukrainisch",
  },
  Arabic: {
    es: "árabe",
    ca: "àrab",
    fr: "arabe",
    nl: "Arabisch",
    de: "Arabisch",
  },
  Hebrew: {
    es: "hebreo",
    ca: "hebreu",
    fr: "hébreu",
    nl: "Hebreeuws",
    de: "Hebräisch",
  },
  Chinese: {
    es: "chino",
    ca: "xinès",
    fr: "chinois",
    nl: "Chinees",
    de: "Chinesisch",
  },
  Japanese: {
    es: "japonés",
    ca: "japonès",
    fr: "japonais",
    nl: "Japans",
    de: "Japanisch",
  },
  Korean: {
    es: "coreano",
    ca: "coreà",
    fr: "coréen",
    nl: "Koreaans",
    de: "Koreanisch",
  },
  Vietnamese: {
    es: "vietnamita",
    ca: "vietnamita",
    fr: "vietnamien",
    nl: "Vietnamees",
    de: "Vietnamesisch",
  },
  Catalan: {
    es: "catalán",
    ca: "català",
    fr: "catalan",
    nl: "Catalaans",
    de: "Katalanisch",
  },
};
// At the start or after a separator, and before the end, a separator or a bracket ("- German (Germany)"), not
// before "-speaking" (the table's).
export const ALONE = new RegExp(
  "(^|[-–|,/(]\\s*)(" +
    Object.keys(LANGUAGES).join("|") +
    ")(?=\\s*$|\\s*[–|,/()]|\\s+-)",
  "gu",
);
// A country's code after a comma, bracket, bar or dash and before the end or another of them (before). Not "IT",
// which is the field more often than Italy.
export const COUNTRY_CODE =
  /(?<=(?:^|[,(|/–-])\s*)(?:CH|DE|AT|FR|NL|BE|LU|ES|PT|PL|UK|US|IE|DK|SE|NO|FI|CZ)(?=\s*(?:$|[),|/–-]))/gu;
// Dutch "of" (or) in a Dutch title left in English as written, where it joins two of a kind: two levels ("Medior of
// Senior"), two codes or names in capitals ("AWS of Azure"), "en/of" (and/or). The English "of" stays ("Head of",
// "Ministry of Defence"). Dutch titles Firefox reads read it right themselves.
const LEVEL_WORD = "(?:junior|medior|senior|lead|ervaren|starter)";
export function dutchOr(t: string) {
  return t
    .replace(
      new RegExp(
        "(?<![\\p{L}])(" +
          LEVEL_WORD +
          ")\\s+of\\s+(" +
          LEVEL_WORD +
          ")(?![\\p{L}])",
        "giu",
      ),
      "$1 or $2",
    )
    .replace(
      /(?<![\p{L}\d])([\p{Lu}\d][\p{Lu}\d.#+-]*|Azure|Java|Python|Angular|React)\s+of\s+(?=[\p{Lu}\d][\p{Lu}\d.#+-]*(?![\p{Ll}])|Azure|Java|Python|Angular|React|\.NET)/gu,
      "$1 or ",
    )
    .replace(
      /(?<![\p{L}])en\/of(?![\p{L}])/giu,
      (m: string) => (m[0] === "E" ? "And" : "and") + "/or",
    );
}
// A level opening an English title, as LEVEL_SAY names it (before).
// A level opening an English title (before): see the words in OPENING.
export const OPENING_RE =
  /^(\((?:junior|senior)\)|junior|senior|medior|mid-level|middle(?!\s+(?:office|east|management|school|age)(?![\p{L}]))|founding|experienced(?!\s+(?:and|or|&)(?![\p{L}]))|graduate(?!\s+(?:\p{L}+\s+)?(?:schemes?|programmes?|programs?)(?![\p{L}]))|chartered|lead(?!\s+(?:generation|gen|times?|paint|acid|free|fitters?|electrical\s+fitters?|technicians?)(?![\p{L}]))|principal|intermediate|assistant(?=\s+(?:[\p{L}&-]+\s+){0,3}(?:managers?|directors?|engineers?|surveyors?|architects?|planners?|designers?|consultants?|estimators?|buyers?|controllers?|accountants?|coordinators?|superintendents?|inspectors?|advisors?|advisers?|officers?)(?![\p{L}]))|deputy|interim|associate(?!\s+(?:degree|of|to)(?![\p{L}]))|regional|multi[\s-]?skilled|(?:junior|senior|lead|principal|associate|intermediate)\s*\/\s*(?:senior|lead|principal|associate)|skilled(?!\s+trades(?:person|people|man|men|woman|women)?(?![\p{L}]))|(?:commercial|domestic)(?=\s+(?:gas|heating|plumbing|plumber|refrigeration|ventilation|air\s+conditioning|boiler|catering|kitchen|estimators?)(?![\p{L}]))|(?:foot[\s-])?mobile(?=\s+(?:hgv|hose|repair|hydraulic|maintenance|service|electrical|mechanical|multi-?skilled|hvac|air\s+conditioning|fabric|gas|plumbing|tyre|tire|vehicle|lift|fire|security|refrigeration|technician|electrician|mechanic|fitter|plumber|welder)(?![\p{L}])))\s+(?=\p{L}|\.NET\b)/iu;
export const OPENING = {
  "(junior)": "Junior-or-not",
  "(senior)": "Senior-or-not",
  junior: "Junior",
  senior: "Senior",
  medior: "Mid-level",
  "mid-level": "Mid-level",
  middle: "Mid-level",
  founding: "Founding",
  experienced: "Experienced",
  graduate: "Graduate",
  chartered: "Chartered",
  lead: "Leading",
  principal: "Principal",
  intermediate: "Mid-level",
  mobile: "Itinerant",
  assistant: "Deputy",
  deputy: "Deputy",
  skilled: "Skilled",
  commercial: "Commercial",
  domestic: "Domestic",
  interim: "Interim",
  associate: "Associate",
  regional: "Regional",
  "multi-skilled": "Multi-skilled",
};
// Countries and languages as English writes them, kept into English (before).
export const ENGLISH_PLACE = new RegExp(
  "(?<![\\p{L}])(?:" +
    [
      ...Object.keys(LANGUAGES),
      "Germany",
      "France",
      "Spain",
      "Italy",
      "Netherlands",
      "Austria",
      "Switzerland",
      "Belgium",
      "Portugal",
      "Poland",
      "Sweden",
      "Denmark",
      "Norway",
      "Finland",
      "Ireland",
      "Luxembourg",
      "Czechia",
      "Czech Republic",
      "Hungary",
      "Romania",
      "Greece",
      "Croatia",
      "Slovakia",
      "Slovenia",
      "Bulgaria",
      "United Kingdom",
      "UK",
      "USA",
      "Canada",
    ]
      .sort((a, b) => b.length - a.length)
      .join("|") +
    ")(?![\\p{L}])",
  "gu",
);
// The language each target is written in, as LANGUAGES names it (after).
export const OWN = {
  es: "Spanish",
  ca: "Catalan",
  fr: "French",
  nl: "Dutch",
  de: "German",
};
// An English job word after a German word and a hyphen ("Linux-Administrator", before).
export const HYPHEN_JOB =
  /(\p{Ll})-(?=(?:Administrator|Manager|Engineer|Consultant|Developer|Designer|Specialist|Analyst|Controller|Architect)(?![\p{Ll}]))/gu;
// "Agentic" on its own; "Agentic AI" is a name (NAMES).
export const AGENTIC = /(?<![\p{L}])agentic(?![\p{L}])(?!\s+AI(?![\p{L}]))/iu;
export const BACK = {
  robótic: "agéntic",
  robòtic: "agèntic",
  robòtiq: "agèntiq",
  robotiq: "agentiq",
  robotic: "agentic",
  robotisé: "agentique",
  robotisée: "agentique",
  robotisés: "agentiques",
  robotisées: "agentiques",
  robotitzat: "agèntic",
  robotitzada: "agèntica",
  robotitzats: "agèntics",
  robotitzades: "agèntiques",
  robotizado: "agéntico",
  robotizada: "agéntica",
  robotizados: "agénticos",
  robotizadas: "agénticas",
};
export const BACK_RE = new RegExp(
  "(?<![\\p{L}])(?:" +
    Object.keys(BACK)
      .sort((a, b) => b.length - a.length)
      .join("|") +
    ")",
  "giu",
);
export const STANDS = [
  "Kafka",
  "Zalando",
  "Shopify",
  "Siemens",
  "Volkswagen",
  "Nokia",
  "Xerox",
  "Bosch",
];
// Into Ukrainian Firefox writes most of those in Cyrillic ("Kafka" → "Кафка" in all 30 positions tried, "Zalando" in 24):
// these it copied as they are in all 30, measured on 6 November 2026.
export const STANDS_UK = [
  "Nokia",
  "Lenovo",
  "Huawei",
  "Xiaomi",
  "PayPal",
  "TikTok",
  "SpaceX",
  "HubSpot",
];
// Tech names Firefox leaves in front of the job into Spanish ("C# Desarrollador", "React Desarrollador"), measured
// on 55 names on 25 October (the others it moves itself, "Desarrollador de Python"); several joined by a slash go
// together ("C#/.NET"); a slash with spaces round it parts two jobs.
const TECH = [
  "React Native",
  "Dynamics 365",
  ".NET",
  "C#",
  "C++",
  "Node.js",
  "Vue.js",
  "React",
  "Databricks",
  "Django",
  "Magento",
  "Pega",
  "Symfony",
  "Terraform",
  "CNC",
  "CAM",
  "CAD",
  "PLC",
  "NC",
  "TIG",
  "MIG",
  "MAG",
  "WIG",
  "MMA",
]
  .map(escape)
  .join("|");
// The part of the software a developer works on, which Spanish, Catalan and French titles write in English after the
// job and with no "de" ("Desarrollador backend", "Desenvolupador full stack"). In front of the job Firefox gave it a
// "de" or translated it ("Backend Developer" came back "Desarrollador de Backend", "Front-end Software Engineer"
// "Enginyer de programari frontal"; "Developer Backend" comes back "Desarrollador Backend"): moved after the job,
// with the words between them (before), its "de" taken out after Firefox (after). Several go together
// ("Backend/Frontend Developer").
export const STACK_EN = "(?:back|front)(?:-?end|\\s+end)|full[- ]?stack";
export const STACK_FIRST = new RegExp(
  "(?<![\\p{L}\\d/-])((?:" +
    STACK_EN +
    ")(?:\\s*(?:\\/|&|,|\\+|and|or)\\s*(?:" +
    STACK_EN +
    "))*)\\s+((?:[\\p{L}\\d.#+/]+\\s+){0,2}?)(developers?|engineers?|architects?|programmers?|consultants?|specialists?|experts?|designers?|testers?|leads?)(?![\\p{L}])",
  "giu",
);
export const STACK_OUT = new RegExp(
  "(?<![\\p{L}])(?:" + STACK_EN + ")(?![\\p{L}])",
  "iu",
);
export const STACK_DE = new RegExp(
  "(?<![\\p{L}])(?:de|del|di)\\s+(?=(?:" + STACK_EN + ")(?![\\p{L}]))",
  "giu",
);
export const STACK_AFTER_WORD = new RegExp(
  "(?<=[\\p{L}\\d.#+)]\\s)(?:" + STACK_EN + ")(?![\\p{L}])",
  "giu",
);
// An English job word Firefox left in front of them, with up to two names before it (after).
export const STACK_JOB_EN =
  /(?<![\p{L}])((?:\p{Lu}[\p{L}\d.#+]*\s+){0,2}?)(Developer|Engineer)(s?)\s+((?:[Bb]ack|[Ff]ront)(?:-?[Ee]nd|\s+[Ee]nd)|[Ff]ull[- ]?[Ss]tack)(?![\p{L}])/gu;
export const JOB_EN_TO = {
  es: {
    developer: "desarrollador",
    developers: "desarrolladores",
    engineer: "ingeniero",
    engineers: "ingenieros",
  },
  ca: {
    developer: "desenvolupador",
    developers: "desenvolupadors",
    engineer: "enginyer",
    engineers: "enginyers",
  },
  fr: {
    developer: "développeur",
    developers: "développeurs",
    engineer: "ingénieur",
    engineers: "ingénieurs",
  },
  pl: {
    developer: "programista",
    developers: "programiści",
    engineer: "inżynier",
    engineers: "inżynierowie",
  },
  it: {
    developer: "sviluppatore",
    developers: "sviluppatori",
    engineer: "ingegnere",
    engineers: "ingegneri",
  },
};
// After a slash with no spaces too, where a word stands before it ("Miller/CAM Programmer"), not in "C/C++ Developer".
export const TECH_FIRST = new RegExp(
  "(^|[–|(]\\s*|\\s\\/\\s+|(?<=\\p{L}{3})\\/\\s*)((?:" +
    TECH +
    ")(?:\\s*(?:\\/|,|&|and)\\s*(?:" +
    TECH +
    ")|\\s+(?:TIG|MIG|MAG|WIG|MMA))*)\\s+(developers?|engineers?|architects?|consultants?|programmers?|specialists?|experts?|welders?(?![\\s-]+(?:fabricators?|fitters?|assemblers?|brazers?|platers?)))(?![\\p{L}])",
  "giu",
);
// The glossary: one table of trades with their names in each language (trades.mjs).
export const TERMS = new Proxy({} as Record<string, [string, string][]>, {
  get: (_o, pair) => tradesFor(String(pair)),
});
// "German speaker", "Dutch speaking", "French-speaking", "Hungarian or Czech speaking": one way, which the table
// writes in, for each language, its capital kept (Firefox read "German-speaking Cybersecurity Customer Experts" worse
// than "German-Speaking …"). "For Dutch speakers" names people, and stays.
export const LANGUAGE = new RegExp(
  `(?:${SPOKEN.map(([en]) => en).join("|")})`,
  "giu",
);
export const SPEAKING = new RegExp(
  `(?<![\\p{L}-])(?<!swiss[- ])(?<!\\bfor\\s)((?:${LANGUAGE.source}\\s*(?:\\/|&|,|\\band\\b|\\bor\\b)\\s*)*${LANGUAGE.source})[- ]?(s)(?:peaking|peakers?)(?![\\p{L}])`,
  "giu",
);
// "Site manager" means a building site only where nothing says factory, shop or warehouse.
export const NOT_A_BUILDING_SITE =
  /manufactur|fmcg|factory|plant|warehouse|retail|store|shop|hotel|data cent|marktleider|logistic/i;
export const EMOJI =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]+/gu;
// The site's own decoder (lib/entities.ts): numbers past Unicode, hexadecimal ones and named ones failed or stayed (TRA-16).
export const decode = (s: string) =>
  decodeEntities(s)
    .replace(/\u00ad/g, "")
    .replace(/\u00a0/g, " ");
// Emojis and spaces as one class: an emoji run inside a repeated group took 22 s for 30 at a title's start (TRA-03).
export const EMOJI_LEAD =
  /^[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\s]+/u;
export const EMOJI_TRAIL =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\s]+$/u;
export const spellings = new Map(
  translationData<[string, string][]>("spellings.json"),
);
export const capital = (tr: string, like: string) =>
  like[0] !== like[0].toLowerCase()
    ? tr.replace(/^./, (c: string) => c.toUpperCase())
    : tr;
// Spanish and Catalan job words often written without accents.
export const ACCENTS = {
  es: Object.fromEntries(
    "tecnico:técnico tecnicos:técnicos tecnica:técnica tecnicas:técnicas mecanico:mecánico mecanicos:mecánicos mecanica:mecánica electromecanico:electromecánico electromecanicos:electromecánicos electronico:electrónico electronica:electrónica electrico:eléctrico electrica:eléctrica electricos:eléctricos informatico:informático informatica:informática quimico:químico ingenieria:ingeniería fontaneria:fontanería calefaccion:calefacción climatizacion:climatización produccion:producción instalacion:instalación automatizacion:automatización reparacion:reparación construccion:construcción maquinas:máquinas almacen:almacén camion:camión carpinteria:carpintería tecnologia:tecnología energia:energía gestion:gestión administracion:administración logistica:logística telecomunicacion:telecomunicación"
      .split(" ")
      .map((x) => x.split(":")),
  ),
  fr: Object.fromEntries(
    "mecanicien:mécanicien mecaniciens:mécaniciens mecanicienne:mécanicienne electricien:électricien electriciens:électriciens electrotechnicien:électrotechnicien electromecanicien:électromécanicien electronicien:électronicien ingenieur:ingénieur ingenieurs:ingénieurs experimente:expérimenté experimentee:expérimentée confirme:confirmé confirmee:confirmée ingenieure:ingénieure developpeur:développeur developpeurs:développeurs itinerant:itinérant reseau:réseau reseaux:réseaux securite:sécurité qualite:qualité electricite:électricité controleur:contrôleur regleur:régleur metreur:métreur geometre:géomètre etudes:études etude:étude methodes:méthodes methode:méthode telecom:télécom telecoms:télécoms energie:énergie batiment:bâtiment chaudiere:chaudière genie:génie systemes:systèmes systeme:système mecanique:mécanique mecaniques:mécaniques electrotechnique:électrotechnique electrotechniques:électrotechniques electronique:électronique electroniques:électroniques electrique:électrique electriques:électriques electromecanique:électromécanique electromecaniciens:électromécaniciens regleurs:régleurs operateur:opérateur operateurs:opérateurs operatrice:opératrice equipe:équipe equipes:équipes tolier:tôlier toliers:tôliers tolerie:tôlerie maconnerie:maçonnerie preparateur:préparateur preparateurs:préparateurs reparateur:réparateur conformite:conformité maitrise:maîtrise realisation:réalisation energetique:énergétique legers:légers leger:léger vehicules:véhicules vehicule:véhicule"
      .split(" ")
      .map((x) => x.split(":")),
  ),
  ca: Object.fromEntries(
    "tecnic:tècnic tecnics:tècnics tecnica:tècnica tecniques:tècniques mecanic:mecànic mecanics:mecànics electric:elèctric electrics:elèctrics electronic:electrònic electronica:electrònica electromecanic:electromecànic electromecanics:electromecànics informatic:informàtic informatica:informàtica instal-lador:instal·lador instal-ladors:instal·ladors instal-lacions:instal·lacions instal-lacio:instal·lació"
      .split(" ")
      .map((x) => x.split(":")),
  ),
};
// The job words that take "de" before their field, and the endings of adjectives that do not.
const DE_JOB: Readonly<Record<string, RegExp>> = {
  es: /^(?:técnico|técnica|técnicos|ingeniero|ingeniera|ingenieros|oficial|oficiales|operario|operaria|operarios|responsable|jefe|jefa|encargado|encargada|mecánico|mecánicos|montador|montadores|instalador|instaladores|gestor|coordinador|coordinadora|auxiliar|ayudante)$/i,
  ca: /^(?:tècnic|tècnica|tècnics|enginyer|enginyera|enginyers|oficial|oficials|operari|operària|operaris|responsable|cap|encarregat|encarregada|mecànic|mecànics|muntador|muntadors|instal·lador|instal·ladors|gestor|coordinador|coordinadora|auxiliar|ajudant)$/i,
};
// In the plural too («Mecánicos industriales», «Muntadors elèctrics», «Operaris especialistes»: TB1-10).
const NOT_FIELD_ES =
  /(?:al|ales|als|ar|ares|ars|il|iles|ils|ico|ica|icos|icas|ics|iques|ivo|iva|ivos|ivas|ives|ado|ada|ados|adas|ido|ida|idos|idas|oso|osa|osos|osas|ario|aria|arios|arias|ente|entes|ante|antes|ior|iores|ic|iu|ius|at|ats|ades|it|its|ides|ós|ari|aris|ària|àries|ent|ents|ant|ants|ista|istas|istes|ero|eros|era|or|ora|ores|ors)$/i;
// Fields ending like a person or an adjective ("Ascensores", "Motores", «Materiales», «Acabados») still take the "de".
const FIELD_OR =
  /^(?:ascensor|motor|compresor|generador|transformador|sensor|ordenador|elevador|contador|climatizador|quemador|refrigerador|material|metal|canal|señal|senyal|cristal|mineral|componente|component|cliente|client|circuit|instrument|acabado|acabat)(?:es|s)?$/i;
// Gender marks of any language ("(m/w/d)", "(H/F)", "H/F/X", "M/V/X", "(gn)"). Firefox copies them or
// garbles them ("m/f/b"); taken out of its output, with the separator they leave ("Technicien méthodes -
// H/F/X"), and not before, since the title without them can come back in another case. A star stands for a gender
// too ("(w/m/*)"), and hyphens part them in brackets ("(h-f-x)"); square brackets too, a separator left before
// the closing one ("(m/w/d/)"), and Polish "k" for a woman ("[k/m/d]": 15 of 203 recent titles kept their mark).
const markOf = (l: string) => {
  const it = `(?:${l}|nb|div|divers|\\*)\\*?`,
    first = `(?:${l}|nb)\\*?`;
  return new RegExp(
    `\\s*(?:[(\\[]\\s*${it}(?:\\s*[\\/|,.-]\\s*${it}){1,3}(?:\\s*[\\/|,.-])?\\s*[)\\]]|\\(gn\\*?\\)|(?<![\\p{L}\\d\\/])(?!(?:d\\s*\\/\\s*f|f\\s*\\/\\s*d)(?![\\s\\/]*[\\p{L}*]))${first}(?:\\s*\\/\\s*${it}){1,3}(?![\\p{L}\\d\\/*]))`,
    "giu",
  );
};
export const MARK = markOf("[mwfdxhvk]"),
  MARK_OUT = markOf("[mwfdxhvbnk]");
// Swiss offers write the marks with spaces, or "(a)" for all, at the end or before the workload ("Technicien de
// service 100% h f d", "Montage-Elektriker (a)"); Firefox leaves them as they are.
export const SWISS =
  /\s*(?<![\p{L}\d])(?:(?<!(?:schein|permis|kat\.?|klasse|catégorie|categoria|carnet)\s*)\(\s*a\s*\)|h\s+f(?:\s+[dx])?|f\s+h|m\s+[wf](?:\s+[dx])?)(?=\s*(?:$|[,;–|-]|\d))/giu;
export function noMarks(t: string) {
  // And square brackets left empty ("Architekt [m/w/d]" came back "Arquitecto []").
  // And a mark's separator where it shared its brackets ("(m/w/d, 80-100%)" came back "(, 80-100%)").
  const out = t
    .replace(MARK_OUT, "")
    .replace(SWISS, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\[\s*\]/g, "")
    .replace(/\(\s*[,;|]\s*/g, "(");
  if (out === t) return t;
  return (
    out
      .replace(/\s+([–|-])\s+(?:[–|-]\s+)+/gu, " $1 ")
      .replace(/^\s*[–|:,-]\s*|\s*[–|:,-]\s*$/gu, "")
      .replace(/\s+/g, " ")
      .trim() || t
  );
}
export function withDe(t: string, s: string) {
  const m = t.match(/^(\S+)\s+(\S+)/u);
  if (!m || !DE_JOB[s].test(m[1])) return t;
  const next = m[2];
  if (
    !/^\p{L}\p{Ll}/u.test(next) ||
    (NOT_FIELD_ES.test(next) && !FIELD_OR.test(next)) ||
    DE_JOB[s].test(next) ||
    /^(?:senior|sénior|junior|júnior|jr|sr|de|del|d'|en|para|per|y|i|o)$/i.test(
      next,
    )
  )
    return t;
  const de = s === "ca" && /^[aeiouàèéíòóúh]/i.test(next) ? "d'" : "de ";
  return m[1] + " " + de + t.slice(m[1].length).trimStart();
}
// Into Spanish, Catalan and French, English words in front of a trade written in go after it, where those
// languages put them ("Customer técnico de servicio" came back "Cliente técnico de servicio"): the words back to a
// separator, a link word or another trade, joined by "and" or "or" too ("Agricultural and construction machinery").
// An adjective, a code or a name right after the trade ("montador Electric" → "Montador eléctrico"); a noun after a
// dash, since Firefox put it back in front otherwise ("montador Crane" came back "Grúa montador").
export const LINK_EN =
  /^(?:of|for|as|with|in|at|to|the|a|an|on|by|from|senior|junior|lead|chief|head|deputy|vice|assistant|trainee|traineeship|internship|apprenticeship|intern|student|apprentice|experienced|qualified|skilled|first|second|third)$/i;
export const JOB_EN =
  /^(?:leader|manager|engineer|technician|worker|fitter|mechanic|operator|supervisor|foreman|director|specialist|consultant|coordinator|planner|designer|developer|architect|analyst|administrator|assistant|helper|electrician|plumber|welder|installer|inspector|controller|officer|agent|employee|apprentice|trainee|driver|carpenter|painter|mason|bricklayer|roofer|turner|miller|machinist|programmer|tester|estimator|surveyor|draughtsman|draftsman|expert|advisor|adviser|scientist|chemist|buyer|representative|lead|head|chief|owner|master|locksmith|boilermaker|metalworker|fabricator|repairer|setter|finisher|modeller|modeler|glazier|joiner|scaffolder|rigger|tiler|plasterer|assembler|builder|maker)s?$/i;
// A trade of the table naming a person: a job word, or a word ending like one ("Metal fabricator").
export const PERSON = new RegExp(
  JOB_EN.source + "|(?:er|or|ist|ian|man|men|smith|wright)s?$",
  "i",
);
export const ADJ_EN = /(?:al|ic|ics|ive|ous|ary|ent|ant|ar|ior|ile)$/i,
  CODE_EN = /^[\p{Lu}\d&+.-]{2,}$/u;
// A company named with its country at the start of a title: the name, then the country, before a separator (before).
export const FIRM_COUNTRY =
  /^((\p{Lu}[\p{L}\d&.'’-]*(?:\s+\p{Lu}[\p{L}\d&.'’-]*){0,2})\s+(?:Belgium|Belgique|België|Deutschland|Germany|France|Frankreich|Nederland|Netherlands|Schweiz|Suisse|Switzerland|Österreich|Austria|España|Spain|Italia|Italy|Polska|Poland|Portugal|Luxembourg|Ireland|Iberia|Benelux|Danmark|Denmark|Sverige|Sweden|Norge|Norway|Suomi|Finland))(?=\s+[-–|:])/u;
export const ARTICLE =
  /^(?:the|la|le|les|die|der|das|de|het|el|los|las|een|a|an)$/i;
// Job words of the other languages, which end no company's name (FIRM_COUNTRY).
export const JOB_OTHER =
  /(?:techniker|technieker|technicus|monteur|mechaniker|mechatroniker|elektriker|elektricien|ingenieur|ingénieur|technicien|électricien|electricien|opérateur|soudeur|lasser|schweißer|jobs?)$/i;
export function wordsAfter(
  x: string,
  written: Iterable<string>,
  walls: Iterable<string> = written,
) {
  for (const w of [...written].sort((a, b) => b.length - a.length)) {
    let from = 0;
    for (;;) {
      const at = x.indexOf(w, from);
      if (at < 0) break;
      from = at + w.length;
      if (
        /[\p{L}\p{N}]/u.test(x[at + w.length] || "") ||
        /[\p{L}\p{N}-]/u.test(x[at - 1] || "")
      )
        continue;
      const head = x.slice(0, at);
      // From the last separator, or the end of another trade written in, the same one said before too ("operari de
      // manteniment and mechanical operari de manteniment": "mechanical" only).
      let start = Math.max(
        0,
        ...["–", "|", "/", "(", ",", ":", ";", "+", " - "].map((c) => {
          const i = head.lastIndexOf(c);
          return i < 0 ? 0 : i + c.length;
        }),
      );
      for (const o of walls) {
        const e = head.lastIndexOf(o);
        if (e >= 0 && e + o.length > start) start = e + o.length;
      }
      const words = head.slice(start).trim().split(/\s+/).filter(Boolean);
      const isMod = (v: string) =>
        /^\p{L}[\p{L}\p{N}'&-]*$/u.test(v) &&
        !LINK_EN.test(v) &&
        !/^(?:and|or)$/i.test(v);
      let k = words.length;
      while (k > 0 && isMod(words[k - 1])) {
        k--;
        // "X and Y trade": the words before "and" belong to it too.
        if (
          k > 1 &&
          /^(?:and|or|&)$/i.test(words[k - 1]) &&
          isMod(words[k - 2])
        )
          k -= 2;
      }
      const mods = words.slice(k);
      // Not a job of its own in front ("Team Leader Plumber": the team leader of plumbers).
      if (!mods.length || JOB_EN.test(mods[mods.length - 1])) continue;
      // Where the first of them stands, even when a later one repeats it ("Tyre and Tyre Service fitter": TRA-15).
      const cut = start + [...head.slice(start).matchAll(/\S+/g)][k].index;
      const last = mods[mods.length - 1];
      const codes = mods.every((v: string) => CODE_EN.test(v)),
        adjective = !codes && ADJ_EN.test(last) && last.length > 3;
      const sep = codes || adjective ? " " : " – ";
      // An adjective after the trade in small letters: with its capital Firefox kept it English ("Montador Electric",
      // "Tourneur Digital").
      const said = adjective
        ? mods.map((v: string) =>
            /^\p{Lu}\p{Ll}+$/u.test(v) && ADJ_EN.test(v) ? v.toLowerCase() : v,
          )
        : mods;
      // The trade now opening the title takes its capital ("mecànic – Process" came back "– Procés mecànic").
      const job = cut === 0 ? w[0].toUpperCase() + w.slice(1) : w;
      x = x.slice(0, cut) + job + sep + said.join(" ") + x.slice(at + w.length);
      // On from what follows the words moved: from inside them, a title that came out the same was read again
      // forever ("Lf 253155 - maintenance worker and mechanical maintenance worker" into Catalan, 7 November 2026:
      // the translator spent hours on it, the lock held).
      from = cut + job.length + sep.length + said.join(" ").length;
    }
  }
  return x;
}
// The adjective written in front of English words that are no trade put after them, up to a separator, a digit
// or a link word ("Encastat Software Engineer 100%" → "Software Engineer encastat 100%").
export function adjectiveAfter(x: string, adjectives: Iterable<string>) {
  for (const a of adjectives) {
    const m = x.match(
      new RegExp(
        "(^)(" +
          a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
          ")\\s+((?:(?!(?:of|for|as|with|in|at|to|and|or|y|e|o|i|et|ou)\\b)[\\p{L}][\\p{L}\\p{N}.+#-]*(?![\\p{L}\\p{N}.+#-])\\s*?)+)(?=$|\\s*[–|/(),:;]|\\s+\\d|\\s+(?:of|for|as|with|in|at|to)\\b)",
        "u",
      ),
    );
    if (!m) continue;
    const words = m[3].trim();
    if (!words) continue;
    const start = (m.index ?? 0) + m[1].length,
      low = m[2][0].toLowerCase() + m[2].slice(1);
    const lead = words[0].toUpperCase() + words.slice(1);
    x =
      x.slice(0, start) +
      (start === 0 ? lead : words) +
      " " +
      low +
      x.slice(start + m[0].length - m[1].length);
  }
  return x;
}
// The Dutch installers' "W" (or "WTB") and "E" after a job: the mechanical (heating, cooling, plumbing) and
// electrical installations. Not "E & I" or "E/I", nor a word joined by a hyphen ("E-commerce").
export const INSTALL_LETTERS =
  /((?:voorbereider|[Cc]alculator|leider|[Mm]onteur|[Ee]ngineer|[Tt]ekenaar|[Uu]itvoerder|[Mm]odelleur|[Tt]echnicus|[Ii]ngenieur|[Cc]o[öo]rdinator|[Aa]dviseur)\s+)(E\s*(?:&|\/|\+|-|en\/of|en|of)\s*(?:WTB|W)|(?:WTB|W)\s*(?:&|\/|\+|-|en\/of|en|of)\s*E|WTB|W|E(?!\s*[&/]\s*I(?![\p{L}])))(?=$|\s|[/|,()–]|-\s|-[Ii]nstallaties)(?:\s*-?\s*[Ii]nstallaties(?![\p{L}]))?/gu;
export const installsOf = (x: string) =>
  /E/.test(x) && /W/.test(x)
    ? "elektrotechnische en werktuigbouwkundige"
    : /W/.test(x)
      ? "werktuigbouwkundige"
      : "elektrotechnische";
export const INFRA = {
  nl: "nfrastructuur",
  en: "nfrastructure",
  fr: "nfrastructure",
  es: "nfraestructura",
  ca: "nfraestructura",
  de: "nfrastruktur",
};
// A French job followed by its technologies, written the English way ("Développeur Python" came back "Developer –
// Python", "Développeur C#" "Developer C#"); French "IA" is AI.
export const FR_JOB_EN = {
  développeur: "Developer",
  developpeur: "Developer",
  ingénieur: "Engineer",
  ingenieur: "Engineer",
  architecte: "Architect",
  consultant: "Consultant",
  administrateur: "Administrator",
  expert: "Expert",
};
const STACK =
  "(?:Python|JavaScript|Java|JS|TypeScript|PHP|Symfony|Laravel|React(?:\\.js|\\s?JS)?|Angular(?:JS)?|Vue(?:\\.js|\\s?JS)?|Node(?:\\.js|\\s?JS)?|\\.NET|C#(?:\\s?\\.NET)?|C\\+\\+|Golang|Go|Ruby|Rails|Kotlin|Swift|Flutter|iOS|Android|Mobile|Web|Front[- ]?[Ee]nd|Back[- ]?[Ee]nd|Full[- ]?[Ss]tack|Fullstack|Cloud|DevOps|Data|BI|Big Data|IA|AI|Salesforce|SAP|ABAP|Odoo|Drupal|WordPress|Magento|Unity|Scala|Rust|COBOL|Spring(?:\\s+Boot)?|Django|Delphi|WinDev|Dart)";
export const FR_STACK_JOB = new RegExp(
  "^(Développeur|Developpeur|Ingénieur|Ingenieur|Architecte|Consultant|Administrateur|Expert)\\s+(" +
    STACK +
    "(?:(?:\\s*[/&+,]\\s*|\\s+(?:et\\s+)?|\\s+[-–]\\s+)" +
    STACK +
    "){0,4})(?=\\s*$|\\s+[-–|(]|\\s*,)",
  "u",
);
// Before Firefox: the title tidied (entities, the emojis at its ends set aside, gender endings out,
// capitals calmed, Spanish "Sr"), its glossary terms written translated, and the names it holds noted.
export const INVISIBLE = /[\u00ad\u200b\u200c\u200d\u2060\ufeff]/g;
// The one-word jobs of Spanish and Catalan titles: the table's trades and the words a job opens with.
const JOB_WORDS = (() => {
  const words: Record<string, Set<string>> = {
    es: new Set([
      "técnico",
      "técnica",
      "tecnico",
      "tecnica",
      "oficial",
      "ayudante",
      "peón",
      "operario",
      "operaria",
      "auxiliar",
      "encargado",
      "encargada",
      "conductor",
      "conductora",
      "mozo",
      "instalador",
      "instaladora",
      "montador",
      "montadora",
      "mecánico",
      "mecánica",
      "electromecánico",
      "electromecánica",
    ]),
    ca: new Set([
      "tècnic",
      "tècnica",
      "oficial",
      "ajudant",
      "peó",
      "operari",
      "operària",
      "auxiliar",
      "encarregat",
      "encarregada",
      "conductor",
      "conductora",
      "mosso",
      "instal·lador",
      "instal·ladora",
      "muntador",
      "muntadora",
      "mecànic",
      "mecànica",
      "electromecànic",
      "electromecànica",
    ]),
  };
  const trades: Record<string, Set<string>> = { es: new Set(), ca: new Set() };
  for (const e of TRADES)
    for (const l of ["es", "ca"])
      for (const n of [
        e[l] as string | undefined,
        ...((e.also || {})[l] || []),
      ])
        if (n && /^[\p{L}·]+$/u.test(n)) {
          trades[l].add(n.toLowerCase());
          words[l].add(n.toLowerCase());
        }
  return { words, trades };
})();
export function apartGlued(t: string, lang: string) {
  return t.replace(/(?<![\p{L}·])[\p{L}·]+(?:-[\p{L}·]+)+/gu, (run: string) => {
    const parts = run.split("-"),
      low = parts.map((p: string) => p.toLowerCase());
    return low.every((p: string) => JOB_WORDS.words[lang].has(p)) &&
      low.some((p: string) => JOB_WORDS.trades[lang].has(p))
      ? parts.join(" - ")
      : run;
  });
}
// How many words of an output no job title of its language uses (dict/vocab.mjs: a word of four letters or
// more seen fewer than three times in the published titles and their translations), not copied from the input.
export const VOCABS = {};
// English fields ending in "-ics" Firefox leaves in small letters inside a Spanish or Catalan title (after).
// Adjectives with no adjective ending, which a trade behind a stand-in does not take as nouns after it (lostNames):
// "Fast mechanical fitter" came back "Muntador mecànic – Fast".
export const ADJ_PLAIN =
  /^(?:fast|quick|rapid|new|old|big|small|large|light|heavy|high|low|hot|cold|dry|wet|smart|green|clean|young|main|top|full|multi|mobile)$/i;
