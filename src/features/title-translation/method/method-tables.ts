// The legacy's builder/mt/method-tables.ts (JustJans/indudex@ec79858), copied (legacy resync T009): only its imports and data reads
// changed. Its own comments keep their marks.
import { translationData, vocab } from "../data.js";
// ➤ The tables and small helpers of the title method (builder/mt/method.ts): the names Firefox translates and those it
// ➤ never does, the languages, openings, stacks and job words.
import { tradesFor, SPOKEN, TRADES } from "./trades.js";
import { decodeEntities } from "../../../shared/kit/entities.js";
import { escape } from "./patterns.js";
import { isTown } from "./places.js";
import { ENGLISH_COUNTRIES } from "./countries.js";

// ➤ Product names Firefox translates (measured on 529 titles), and names it never does, to stand in: kept in all
// ➤ 41 positions tried, opening the title too, in every direction ("Oracle" came back "Oráculo").
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
  // ➤ Agile roles every language writes in English («Propietario del producto», «Maestro de Scrum»).
  "Product Owner",
  "Scrum Master",
  // ➤ Translated word by word in the caches (9 November 2026): «Servicio … ahora» (77 titles), «Factores de éxito» (41),
  // ➤ «Equipo Rojo» (58), «análisis de personas» (55), «Identificación de entrada» (19), «Guíawire».
  "ServiceNow",
  "Service Now",
  "SuccessFactors",
  "Success Factors",
  "Entra ID",
  "Guidewire",
  "Red Team",
  "People Analytics",
];
// ➤ Nokia, Xerox and Bosch added on 25 October (six trades ran out of five), kept in every pair; Lidl was not ("Lil").
// ➤ A German little word with a capital inside a title (before).
// ➤ Before a number too ("Befristet Auf 2 Jahre"), and the words of a fixed term ("Zunächst Befristet Für 2 Jahre").
export const TITLE_DE =
  /(?<=[\p{L}\d)] )(?:Für|Mit|Und|Als|Im|Am|In|An|Zur|Zum|Zu|Bei|Von|Vom|Der|Die|Das|Den|Dem|Des|Ein|Eine|Einen|Einer|Auf|Aus|Nach|Oder|Sowie|Bis|Ab|Über|Unter|Ohne|Befristet|Zunächst|Vorerst)(?= [\p{L}\d])/u;
// ➤ A language's name standing on its own in an English title, as each language writes it (before).
export const LANGUAGES: Record<string, Record<string, string>> = {
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
// ➤ At the start or after a separator, and before the end, a separator or a bracket ("- German (Germany)"), not
// ➤ before "-speaking" (the table's).
export const ALONE = new RegExp(
  "(^|[-–|,/(]\\s*)(" +
    Object.keys(LANGUAGES).join("|") +
    ")(?=\\s*$|\\s*[–|,/()]|\\s+-)",
  "gu",
);
// ➤ Dutch "of" (or) in a Dutch title left in English as written, where it joins two of a kind: two levels ("Medior of
// ➤ Senior"), two codes or names in capitals ("AWS of Azure"), "en/of" (and/or). The English "of" stays ("Head of",
// ➤ "Ministry of Defence"). Dutch titles Firefox reads read it right themselves.
const LEVEL_WORD = "(?:junior|medior|senior|lead|ervaren|starter)";
export function dutchOr(t: string): string {
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
      /(?<![\p{L}\d])(?!(?:VP|SVP|EVP|CEO|CTO|CIO|CFO|COO|CISO|CPO)\s)([\p{Lu}\d][\p{Lu}\d.#+-]*|Azure|Java|Python|Angular|React)\s+of\s+(?=[\p{Lu}\d][\p{Lu}\d.#+-]*(?![\p{Ll}])|Azure|Java|Python|Angular|React|\.NET)/gu,
      "$1 or ",
    )
    .replace(
      /(?<![\p{L}])en\/of(?![\p{L}])/giu,
      (m) => (m[0] === "E" ? "And" : "and") + "/or",
    );
}
// ➤ A level opening an English title, as LEVEL_SAY names it (before).
// ➤ A level opening an English title (before): see the words in OPENING.
export const OPENING_RE =
  /^(\((?:junior|senior)\)|junior|senior(?!\s+(?:living|care|citizens?)(?![\p{L}]))|trainee(?!\s+(?:schemes?|programmes?|programs?)(?![\p{L}]))|medior|mid-level|middle(?!\s+(?:office|east|management|managers?|school|age)(?![\p{L}]))|founding|experienced(?!\s+(?:and|or|&)(?![\p{L}]))|graduate(?!\s+(?:\p{L}+\s+)?(?:schemes?|programmes?|programs?)(?![\p{L}]))|chartered|lead(?!\s+(?:generation|gen|times?|paint|acid|free|abatement|qualification|management|nurtur\p{L}*|smelt\p{L}*|fitters?|electrical\s+fitters?|technicians?)(?![\p{L}]))|principal|intermediate|assistant(?!\s+to(?![\p{L}]))(?=\s+(?:[\p{L}&-]+\s+){0,3}(?:managers?|directors?|engineers?|surveyors?|architects?|planners?|designers?|consultants?|estimators?|buyers?|controllers?|accountants?|coordinators?|superintendents?|inspectors?|advisors?|advisers?|officers?)(?![\p{L}]))|deputy|interim|apprentice|associate(?!\s+(?:degree|of|to)(?![\p{L}]))|regional|multi[\s-]?skilled|(?:junior|senior|lead|principal|associate|intermediate)\s*\/\s*(?:senior|lead|principal|associate)|skilled(?!\s+(?:nursing|trades(?:person|people|man|men|woman|women)?)(?![\p{L}]))|(?:commercial|domestic)(?=\s+(?:gas|heating|plumbing|plumber|refrigeration|ventilation|air\s+conditioning|boiler|catering|kitchen|estimators?)(?![\p{L}]))|(?:foot[\s-])?mobile(?=\s+(?:hgv|hose|repair\s+(?:engineer|mechanic|fitter)|hydraulic|maintenance|service|electrical|mechanical|multi-?skilled|hvac|air\s+conditioning|fabric|gas|plumbing|tyre|tire|vehicle|lift|fire|refrigeration|technician|electrician|mechanic|fitter|plumber|welder)(?![\p{L}])))\s+(?=\p{L}|\.NET\b)/iu;
export const OPENING: Record<string, string> = {
  "(junior)": "Junior-or-not",
  "(senior)": "Senior-or-not",
  junior: "Junior",
  senior: "Senior",
  trainee: "Apprentice",
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
  apprentice: "Apprentice",
  skilled: "Skilled",
  commercial: "Commercial",
  domestic: "Domestic",
  interim: "Interim",
  associate: "Associate",
  regional: "Regional",
  "multi-skilled": "Multi-skilled",
};
// ➤ «Staff» the level before a role, not the personnel («Staff Software Engineer», not «Member of Technical Staff»), and
// ➤ «Lead» the role, not the metal («Lead-Acid Battery Engineer»): kept as names where Firefox reads them as those (before).
export const STAFF_ROLE =
  /(?<!\bof\s+(?:the\s+)?(?:technical\s+)?)\bstaff\b(?=(?:[\s/&-]+\S+){0,6}?[\s/&-]+(?:engineers?|developers?|scientists?|architects?|designers?|researchers?|programmers?|analysts?|manager|technologist)\b)/i;
export const LEAD_ROLE =
  /^(?!.*\blead[- ](?:acid|free|paint|abatement|batter|smelt|pipe))(?=.*\blead\b)/i;
// ➤ Countries and languages as English writes them, kept into English (before).
export const ENGLISH_PLACE = new RegExp(
  "(?<![\\p{L}])(?:" +
    [...Object.keys(LANGUAGES), ...ENGLISH_COUNTRIES]
      .sort((a, b) => b.length - a.length)
      .join("|") +
    ")(?![\\p{L}])",
  "gu",
);
// ➤ The language each target is written in, as LANGUAGES names it (after).
export const OWN: Record<string, string> = {
  es: "Spanish",
  ca: "Catalan",
  fr: "French",
  nl: "Dutch",
  de: "German",
};
// ➤ An English job word after a German word and a hyphen ("Linux-Administrator", before).
export const HYPHEN_JOB =
  /(\p{Ll})-(?=(?:Administrator|Manager|Engineer|Consultant|Developer|Designer|Specialist|Analyst|Controller|Architect)(?![\p{Ll}]))/gu;
// ➤ "Agentic" on its own; "Agentic AI" is a name (NAMES).
export const AGENTIC = /(?<![\p{L}])agentic(?![\p{L}])(?!\s+AI(?![\p{L}]))/iu;
export const BACK: Record<string, string> = {
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
// ➤ Into Ukrainian Firefox writes most of those in Cyrillic ("Kafka" → "Кафка" in all 30 positions tried, "Zalando" in 24):
// ➤ these it copied as they are in all 30, measured on 6 November 2026.
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
// ➤ Tech names Firefox leaves in front of the job into Spanish ("C# Desarrollador", "React Desarrollador"), measured
// ➤ on 55 names on 25 October (the others it moves itself, "Desarrollador de Python"); several joined by a slash go
// ➤ together ("C#/.NET"); a slash with spaces round it parts two jobs.
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
// ➤ The part of the software a developer works on, which Spanish, Catalan and French titles write in English after the
// ➤ job and with no "de" ("Desarrollador backend", "Desenvolupador full stack"). In front of the job Firefox gave it a
// ➤ "de" or translated it ("Backend Developer" came back "Desarrollador de Backend", "Front-end Software Engineer"
// ➤ "Enginyer de programari frontal"; "Developer Backend" comes back "Desarrollador Backend"): moved after the job,
// ➤ with the words between them (before), its "de" taken out after Firefox (after). Several go together
// ➤ ("Backend/Frontend Developer").
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
// ➤ An English job word Firefox left in front of them, with up to two names before it (after).
export const STACK_JOB_EN =
  /(?<![\p{L}])((?:\p{Lu}[\p{L}\d.#+]*\s+){0,2}?)(Developer|Engineer)(s?)\s+((?:[Bb]ack|[Ff]ront)(?:-?[Ee]nd|\s+[Ee]nd)|[Ff]ull[- ]?[Ss]tack)(?![\p{L}])/gu;
export const JOB_EN_TO: Record<string, Record<string, string>> = {
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
// ➤ The glossary: one table of trades with their names in each language (trades.ts).
export const TERMS = new Proxy({} as Record<string, [string, string][]>, {
  get: (o, pair) => tradesFor(pair as string),
});
// ➤ "German speaker", "Dutch speaking", "French-speaking", "Hungarian or Czech speaking": one way, which the table
// ➤ writes in, for each language, its capital kept (Firefox read "German-speaking Cybersecurity Customer Experts" worse
// ➤ than "German-Speaking …"). "For Dutch speakers" names people, and stays.
export const LANGUAGE = new RegExp(
  `(?:${SPOKEN.map(([en]) => en).join("|")})`,
  "giu",
);
export const SPEAKING = new RegExp(
  `(?<![\\p{L}-])(?<!swiss[- ])(?<!\\bfor\\s)((?:${LANGUAGE.source}\\s*(?:\\/|&|,|\\band\\b|\\bor\\b)\\s*)*${LANGUAGE.source})[- ]?(s)(?:peaking|peakers?)(?![\\p{L}])`,
  "giu",
);
// ➤ "Site manager" means a building site only where nothing says factory, shop or warehouse.
export const NOT_A_BUILDING_SITE =
  /manufactur|fmcg|factory|plant|warehouse|retail|store|shop|hotel|data cent|marktleider|logistic/i;
export const EMOJI =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]+/gu;
// ➤ The site's own decoder (lib/entities.ts): numbers past Unicode, hexadecimal ones and named ones failed or stayed (TRA-16).
// ➤ Every long dash read as the en dash, the one the rules know («Técnico — Senior» kept its dash and lost no level).
export const decode = (s: string): string =>
  decodeEntities(s)
    .replace(/\u00ad/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[\u2012\u2014\u2015\u2212]/g, "–");
// ➤ Emojis and spaces as one class: an emoji run inside a repeated group took 22 s for 30 at a title's start (TRA-03).
export const EMOJI_LEAD =
  /^[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\s]+/u;
export const EMOJI_TRAIL =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\s]+$/u;
export const spellings = new Map(
  translationData("spellings.json") as [string, string][],
);
export const capital = (tr: string, like: string): string =>
  like[0] !== like[0].toLowerCase()
    ? tr.replace(/^./, (c) => c.toUpperCase())
    : tr;
// ➤ Spanish and Catalan job words often written without accents.
export const ACCENTS: Record<string, Record<string, string>> = {
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
// ➤ The job words that take "de" before their field, and the endings of adjectives that do not.
const DE_JOB: Record<string, RegExp> = {
  es: /^(?:técnico|técnica|técnicos|ingeniero|ingeniera|ingenieros|oficial|oficiales|operario|operaria|operarios|responsable|jefe|jefa|encargado|encargada|mecánico|mecánicos|montador|montadores|instalador|instaladores|gestor|coordinador|coordinadora|auxiliar|ayudante)$/i,
  ca: /^(?:tècnic|tècnica|tècnics|enginyer|enginyera|enginyers|oficial|oficials|operari|operària|operaris|responsable|cap|encarregat|encarregada|mecànic|mecànics|muntador|muntadors|instal·lador|instal·ladors|gestor|coordinador|coordinadora|auxiliar|ajudant)$/i,
};
// ➤ In the plural too («Mecánicos industriales», «Muntadors elèctrics», «Operaris especialistes»: TB1-10).
const NOT_FIELD_ES =
  /(?:al|ales|als|ar|ares|ars|il|iles|ils|ico|ica|icos|icas|ics|iques|ivo|iva|ivos|ivas|ives|ado|ada|ados|adas|ido|ida|idos|idas|oso|osa|osos|osas|ario|aria|arios|arias|ente|entes|ante|antes|ior|iores|ic|iu|ius|at|ats|ades|it|its|ides|ós|ari|aris|ària|àries|ent|ents|ant|ants|ista|istas|istes|ero|eros|era|or|ora|ores|ors)$/i;
// ➤ Adjectives and trades whose ending looks like a field's («Ingeniero agrónomo», «Técnico experto», «Operario
// ➤ nocturno», «Oficial fontaner», «Mecánico diésel»), and the language asked for («Técnico inglés»): they take no
// ➤ "de" either, nor does a town («Técnico Barcelona» is no technician of Barcelona).
const NOT_FIELD_WORD =
  /^(?:expert[oa]?s?|extern[oa]?s?|intern[oa]?s?|nocturn[oa]?s?|diurn[oa]?s?|fij[oa]s?|multi\p{L}+|freelance|di[eé]sel|\p{L}+(?:ícola|ícoles|ícolas|[óò]nom[oa]?s?|[óò]log[oa]?s?|[óò]graf[oa]?s?)|fontaners?|fusters?|ferrers?|cuiners?|jardiners?|paletes?|paleta|biling[üu]es?|incorporaci[oóò]n?|contra(?:to|cte)s?|turnos?|torns?|sustituci[oó]n|substituci[oó]|interinidad|jornada|ETT)$/iu;
// ➤ A language's name in Spanish or Catalan, with its feminine and plural («Técnico Italiano», «Tècnica Francesa»):
// ➤ the language spoken, not a field (LANGUAGES).
const plain = (w: string): string =>
  w.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const LANGUAGE_WORDS = new Set(
  Object.values(LANGUAGES)
    .flatMap((l) => [l.es, l.ca])
    .flatMap((n) => {
      const w = plain(n),
        stem = w.replace(/o$/, "");
      return [
        w,
        w + "a",
        w + "as",
        w + "es",
        w + "na",
        w + "nes",
        stem + "a",
        stem + "os",
        stem + "as",
      ];
    }),
);
// ➤ Fields ending like a person or an adjective ("Ascensores", "Motores", «Materiales», «Acabados») still take the "de".
const FIELD_OR =
  /^(?:ascensor|motor|compresor|generador|transformador|sensor|ordenador|elevador|contador|climatizador|quemador|refrigerador|material|metal|canal|señal|senyal|cristal|mineral|componente|component|cliente|client|circuit|instrument|acabado|acabat)(?:es|s)?$/i;
// ➤ Gender marks of any language ("(m/w/d)", "(H/F)", "H/F/X", "M/V/X", "(gn)"). Firefox copies them or
// ➤ garbles them ("m/f/b"); taken out of its output, with the separator they leave ("Technicien méthodes -
// ➤ H/F/X"), and not before, since the title without them can come back in another case. A star stands for a gender
// ➤ too ("(w/m/*)"), and hyphens part them in brackets ("(h-f-x)"); square brackets too, a separator left before
// ➤ the closing one ("(m/w/d/)"), a star after the brackets ("(m/w/d)*"), and Polish "k" for a woman ("[k/m/d]": 15 of 203 recent titles kept their mark).
const markOf = (l: string): RegExp => {
  const it = `(?:${l}|nb|div|divers|\\*)\\*?`,
    first = `(?:${l}|nb)\\*?`;
  return new RegExp(
    `\\s*(?:[(\\[]\\s*${it}(?:\\s*[\\/|,.-]\\s*${it}){1,3}(?:\\s*[\\/|,.-])?\\s*[)\\]]\\*?|\\(gn\\*?\\)|(?<![\\p{L}\\d\\/])(?!(?:d\\s*\\/\\s*f|f\\s*\\/\\s*d)(?![\\s\\/]*[\\p{L}*]))${first}(?:\\s*\\/\\s*${it}){1,3}(?![\\p{L}\\d\\/*]))`,
    "giu",
  );
};
export const MARK = markOf("[mwfdxhvknž]"),
  MARK_OUT = markOf("[mwfdxhvbnkž]");
// ➤ Swiss offers write the marks with spaces, or "(a)" for all, at the end or before the workload ("Technicien de
// ➤ service 100% h f d", "Montage-Elektriker (a)"); Firefox leaves them as they are.
export const SWISS =
  /\s*(?<![\p{L}\d])(?:(?<!(?:schein|permis|kat\.?|klasse|catégorie|categoria|carnet)\s*)\(\s*a\s*\)|h\s+f(?:\s+[dx])?|f\s+h|m\s+[wf](?:\s+[dx])?)(?=\s*(?:$|[,;–|-]|\d))/giu;
export function noMarks(t: string): string {
  // ➤ And square brackets left empty ("Architekt [m/w/d]" came back "Arquitecto []").
  // ➤ And a mark's separator where it shared its brackets ("(m/w/d, 80-100%)" came back "(, 80-100%)", "(Vollzeit,
  // ➤ m/w/d)" "(full-time,)").
  const out = t
    .replace(MARK_OUT, "")
    .replace(SWISS, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\[\s*\]/g, "")
    .replace(/\(\s*[,;|]\s*/g, "(")
    .replace(/\s*[,;|]\s*\)/g, ")");
  if (out === t) return t;
  return (
    out
      .replace(/\s+([–|-])\s+(?:[–|-]\s+)+/gu, " $1 ")
      .replace(/^\s*[–|:,-]\s*|\s*[–|:,-]\s*$/gu, "")
      .replace(/\s+/g, " ")
      .trim() || t
  );
}
export function withDe(t: string, s: string): string {
  const m = t.match(/^(\S+)\s+(\S+)/u);
  if (!m || !DE_JOB[s].test(m[1])) return t;
  const next = m[2];
  if (
    !/^\p{L}\p{Ll}/u.test(next) ||
    (NOT_FIELD_ES.test(next) && !FIELD_OR.test(next)) ||
    NOT_FIELD_WORD.test(next) ||
    LANGUAGE_WORDS.has(plain(next)) ||
    isTown(next) ||
    DE_JOB[s].test(next) ||
    /^(?:de|del|d'|en|para|per|y|i|o|con|amb|sin|sense|como|com)$/i.test(next)
  )
    return t;
  const de = s === "ca" && /^[aeiouàèéíòóúh]/i.test(next) ? "d'" : "de ";
  return m[1] + " " + de + t.slice(m[1].length).trimStart();
}
// ➤ Into Spanish, Catalan and French, English words in front of a trade written in go after it, where those
// ➤ languages put them ("Customer técnico de servicio" came back "Cliente técnico de servicio"): the words back to a
// ➤ separator, a link word or another trade, joined by "and" or "or" too ("Agricultural and construction machinery").
// ➤ An adjective, a code or a name right after the trade ("montador Electric" → "Montador eléctrico"); a noun after a
// ➤ dash, since Firefox put it back in front otherwise ("montador Crane" came back "Grúa montador").
export const LINK_EN =
  /^(?:of|for|as|with|in|at|to|the|a|an|on|by|from|senior|junior|lead|chief|head|deputy|vice|assistant|trainee|traineeship|internship|apprenticeship|intern|student|apprentice|experienced|qualified|skilled|first|second|third)$/i;
// ➤ English words naming a person's job, one list for every step that asks whether a word is the job («Specialist
// ➤ warehouse clerk» was split where one list lacked «clerk»).
const PERSON_JOBS = [
  "engineer",
  "technician",
  "clerk",
  "labou?rer",
  "cleaner",
  "porter",
  "warehouseman",
  "agent",
  "mechanic",
  "fitter",
  "electrician",
  "manager",
  "supervisor",
  "planner",
  "analyst",
  "developer",
  "architect",
  "operator",
  "worker",
  "employee",
  "specialist",
  "consultant",
  "designer",
  "draughtsman",
  "draftsman",
  "welder",
  "installer",
  "programmer",
  "coordinator",
  "inspector",
  "foreman",
  "assistant",
  "director",
  "officer",
  "administrator",
  "scientist",
  "estimator",
  "surveyor",
  "buyer",
  "controller",
  "advisor",
  "adviser",
  "expert",
  "tester",
  "trainee",
  "apprentice",
  "electromechanic",
  "machinist",
  "plumber",
  "carpenter",
  "joiner",
  "painter",
  "driver",
  "preparer",
  "setter",
  "draughtsperson",
  "tradesperson",
  "craftsman",
  "repairer",
  "assembler",
  "rigger",
  "scaffolder",
  "bricklayer",
  "roofer",
  "turner",
  "miller",
  "leader",
  "decorator",
  "advocate",
  "wireman",
  "wiremen",
  "varnisher",
  "fabricator",
  "toolmaker",
  "cadet",
  "locksmith",
  "pipefitter",
  "helper",
  "mate",
  "intern",
  "trainer",
  "integrator",
  "scheduler",
  "maintainer",
  "operative",
  "courier",
  "loader",
  "mason",
  "chemist",
  "representative",
  "boilermaker",
  "metalworker",
  "finisher",
  "modeller",
  "modeler",
  "glazier",
  "tiler",
  "plasterer",
  "builder",
  "maker",
].join("|");
export const PERSON_JOB_EN = new RegExp(`^(?:${PERSON_JOBS})s?$`, "i");
// ➤ And the words that head a post without naming a trade («Team Lead», «Head of», «Product Owner»).
export const JOB_EN = new RegExp(
  `^(?:${PERSON_JOBS}|lead|head|chief|owner|master)s?$`,
  "i",
);
// ➤ After a slash with no spaces too, where a word stands before it ("Miller/CAM Programmer"), not in "C/C++ Developer".
// ➤ Several names joined by a space too («C# .NET Developer»); not into a job of two words («.NET Programmer Analyst»).
export const TECH_FIRST = new RegExp(
  "(^|[–|(]\\s*|\\s\\/\\s+|(?<=\\p{L}{3})\\/\\s*)((?:" +
    TECH +
    ")(?:(?:\\s*(?:\\/|,|&|and)\\s*|\\s+)(?:" +
    TECH +
    "))*)\\s+(developers?|engineers?|architects?|consultants?|programmers?|specialists?|experts?|welders?(?![\\s-]+(?:fabricators?|fitters?|assemblers?|brazers?|platers?)))(?![\\p{L}])(?!\\s+(?:" +
    PERSON_JOBS +
    ")s?(?![\\p{L}]))",
  "giu",
);
// ➤ A trade of the table naming a person: a job word, or a word ending like one ("Metal fabricator").
export const PERSON = new RegExp(
  JOB_EN.source + "|(?:er|or|ist|ian|man|men|smith|wright)s?$",
  "i",
);
export const ADJ_EN = /(?:al|ic|ics|ive|ous|ary|ent|ant|ar|ior|ile)$/i,
  CODE_EN = /^[\p{Lu}\d&+.-]{2,}$/u;
export const ARTICLE =
  /^(?:the|la|le|les|die|der|das|de|het|el|los|las|een|a|an)$/i;
// ➤ Job words of the other languages, which end no company's name (FIRM_COUNTRY).
export const JOB_OTHER =
  /(?:techniker|technieker|technicus|monteur|mechaniker|mechatroniker|elektriker|elektricien|ingenieur|ingénieur|technicien|électricien|electricien|opérateur|soudeur|lasser|schweißer|leiter|leiterin|leider|vertrieb|außendienst|aussendienst|técnic[oa]|tècnic|mecánic[oa]|mecànic|ingenier[oa]|enginyer|electricista|comercial|commercial|commerciale|delegad[oa]|operari[oa]?|responsable|directeur|directrice|director|directora|jefe|encargad[oa]|montador|soldador|oficial|jobs?)$/i;
// ➤ Where a slash parts the text: one with a space beside it, or after a job («Electrician/HVAC technician»); not one
// ➤ between fields, which go after the trade together («HVAC/electrical maintenance technician» lost «HVAC»).
function slashWall(head: string): number {
  for (
    let i = head.lastIndexOf("/");
    i >= 0;
    i = head.lastIndexOf("/", i - 1)
  ) {
    const left = head.slice(0, i).match(/\S+$/u)?.[0] || "";
    if (
      /\s/u.test(head[i - 1] || " ") ||
      /\s/u.test(head[i + 1] || " ") ||
      JOB_EN.test(left)
    )
      return i + 1;
  }
  return 0;
}
export function wordsAfter(
  x: string,
  written: Iterable<string>,
  walls: Iterable<string> = written,
): string {
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
      // ➤ From the last separator, or the end of another trade written in, the same one said before too ("operari de
      // ➤ manteniment and mechanical operari de manteniment": "mechanical" only).
      let start = Math.max(
        0,
        slashWall(head),
        ...["–", "|", "(", ",", ":", ";", "+", " - "].map((c) => {
          const i = head.lastIndexOf(c);
          return i < 0 ? 0 : i + c.length;
        }),
      );
      for (const o of walls) {
        const e = head.lastIndexOf(o);
        if (e >= 0 && e + o.length > start) start = e + o.length;
      }
      const words = head.slice(start).trim().split(/\s+/).filter(Boolean);
      const isMod = (v: string): boolean =>
        /^\p{L}[\p{L}\p{N}'&/-]*$/u.test(v) &&
        !LINK_EN.test(v) &&
        !/^(?:and|or)$/i.test(v);
      let k = words.length;
      while (k > 0 && isMod(words[k - 1])) {
        k--;
        // ➤ "X and Y trade": the words before "and" belong to it too.
        if (
          k > 1 &&
          /^(?:and|or|&)$/i.test(words[k - 1]) &&
          isMod(words[k - 2])
        )
          k -= 2;
      }
      const mods = words.slice(k);
      // ➤ Not a job of its own in front ("Team Leader Plumber": the team leader of plumbers).
      if (!mods.length || JOB_EN.test(mods[mods.length - 1])) continue;
      // ➤ Where the first of them stands, even when a later one repeats it ("Tyre and Tyre Service fitter": TRA-15).
      const cut = start + [...head.slice(start).matchAll(/\S+/g)][k].index;
      const last = mods[mods.length - 1];
      const codes = mods.every((v) => CODE_EN.test(v)),
        adjective =
          !codes && !last.includes("/") && ADJ_EN.test(last) && last.length > 3;
      const sep = codes || adjective ? " " : " – ";
      // ➤ An adjective after the trade in small letters: with its capital Firefox kept it English ("Montador Electric",
      // ➤ "Tourneur Digital").
      const said = adjective
        ? mods.map((v) =>
            /^\p{Lu}\p{Ll}+$/u.test(v) && ADJ_EN.test(v) ? v.toLowerCase() : v,
          )
        : mods;
      // ➤ The trade now opening the title takes its capital ("mecànic – Process" came back "– Procés mecànic").
      const job = cut === 0 ? w[0].toUpperCase() + w.slice(1) : w;
      x = x.slice(0, cut) + job + sep + said.join(" ") + x.slice(at + w.length);
      // ➤ On from what follows the words moved: from inside them, a title that came out the same was read again
      // ➤ forever ("Lf 253155 - maintenance worker and mechanical maintenance worker" into Catalan, 7 November 2026:
      // ➤ the translator spent hours on it, the lock held).
      from = cut + job.length + sep.length + said.join(" ").length;
    }
  }
  return x;
}
// ➤ The adjective written in front of English words that are no trade put after them, up to a separator, a digit
// ➤ or a link word ("Encastat Software Engineer 100%" → "Software Engineer encastat 100%"), and right after the job
// ➤ where one is there: the names after it stay after it («Embedded Software Engineer C/C++» → «Software Engineer
// ➤ embebido C/C++»).
const AFTER_WORD =
  "[\\p{L}][\\p{L}\\p{N}.+#-]*(?:\\/[\\p{L}\\p{N}.+#-]+)*(?![\\p{L}\\p{N}.+#/-])";
export function adjectiveAfter(x: string, adjectives: string[]): string {
  for (const a of adjectives) {
    const m = x.match(
      new RegExp(
        "^(" +
          escape(a) +
          ")\\s+((?:(?!(?:of|for|as|with|in|at|to|and|or|y|e|o|i|et|ou)\\b)" +
          AFTER_WORD +
          "\\s*?)+)(?=$|\\s*[–|/(),:;]|\\s+\\d|\\s+(?:of|for|as|with|in|at|to)\\b)",
        "u",
      ),
    );
    if (!m) continue;
    const words = m[2].trim().split(/\s+/),
      job = words.findLastIndex((w) => PERSON_JOB_EN.test(w)),
      moved = job < 0 ? words : words.slice(0, job + 1),
      kept = job < 0 ? [] : words.slice(job + 1);
    const lead = moved.join(" "),
      low = m[1][0].toLowerCase() + m[1].slice(1);
    x =
      [lead[0].toUpperCase() + lead.slice(1), low, ...kept].join(" ") +
      x.slice(m[0].length);
  }
  return x;
}
// ➤ The Dutch installers' "W" (or "WTB") and "E" after a job: the mechanical (heating, cooling, plumbing) and
// ➤ electrical installations. Not "E & I" or "E/I", nor a word joined by a hyphen ("E-commerce").
export const INSTALL_LETTERS =
  /((?:voorbereider|[Cc]alculator|leider|[Mm]onteur|[Ee]ngineer|[Tt]ekenaar|[Uu]itvoerder|[Mm]odelleur|[Tt]echnicus|[Ii]ngenieur|[Cc]o[öo]rdinator|[Aa]dviseur|[Vv]oorman|[Cc]onstructeur|[Oo]ntwerper|[Ii]nstallateur|manager|[Ss]pecialist|[Ii]nkoper)\s+)(E\s*(?:&|\/|\+|-|en\/of|en|of)\s*(?:WTB|W)|(?:WTB|W)\s*(?:&|\/|\+|-|en\/of|en|of)\s*E|WTB|W|E(?!\s*[&/]\s*I(?![\p{L}])))(?=$|\s|[/|,()–]|-\s|-[Ii]nstallaties)(?:\s*-?\s*[Ii]nstallaties(?![\p{L}]))?/gu;
export const installsOf = (x: string): string =>
  /E/.test(x) && /W/.test(x)
    ? "elektrotechnische en werktuigbouwkundige"
    : /W/.test(x)
      ? "werktuigbouwkundige"
      : "elektrotechnische";
export const INFRA: Record<string, string> = {
  nl: "nfrastructuur",
  en: "nfrastructure",
  fr: "nfrastructure",
  es: "nfraestructura",
  ca: "nfraestructura",
  de: "nfrastruktur",
};
// ➤ A French job followed by its technologies, written the English way ("Développeur Python" came back "Developer –
// ➤ Python", "Développeur C#" "Developer C#"); French "IA" is AI.
export const FR_JOB_EN: Record<string, string> = {
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
// ➤ Before Firefox: the title tidied (entities, the emojis at its ends set aside, gender endings out,
// ➤ capitals calmed, levels' short forms), its glossary terms written translated, and the names it holds noted.
// ➤ The one-word jobs of Spanish and Catalan titles: the table's trades and the words a job opens with.
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
  const names: Record<string, Set<string>> = { es: new Set(), ca: new Set() };
  for (const e of TRADES)
    for (const l of ["es", "ca"] as const)
      for (const n of [e[l], ...((e.also || {})[l] || [])]) {
        if (n) names[l].add(n.toLowerCase().replace(/-/g, " "));
        if (n && /^[\p{L}·]+$/u.test(n)) {
          trades[l].add(n.toLowerCase());
          words[l].add(n.toLowerCase());
        }
      }
  return { words, trades, names };
})();
export function apartGlued(t: string, lang: string): string {
  return t.replace(/(?<![\p{L}·])[\p{L}·]+(?:-[\p{L}·]+)+/gu, (run) => {
    const parts = run.split("-"),
      low = parts.map((p) => p.toLowerCase());
    // ➤ Not a pair the table names as one trade («Tornero-fresador», «Electricista-lampista»).
    if (JOB_WORDS.names[lang].has(low.join(" "))) return run;
    return low.every((p) => JOB_WORDS.words[lang].has(p)) &&
      low.some((p) => JOB_WORDS.trades[lang].has(p))
      ? parts.join(" - ")
      : run;
  });
}
// ➤ How many words of an output no job title of its language uses (dict/vocab.mjs: a word of four letters or
// ➤ more seen fewer than three times in the published titles and their translations), not copied from the input.
type Vocab = Record<string, number>;
const VOCABS: Record<string, Vocab | null> = {};
// ➤ A language's vocabulary, read once; null where the language has none.
export function vocabOf(l: string): Vocab | null {
  if (!(l in VOCABS)) {
    try {
      VOCABS[l] = vocab(l) as Vocab;
    } catch {
      VOCABS[l] = null;
    }
  }
  return VOCABS[l];
}
// ➤ English fields ending in "-ics" Firefox leaves in small letters inside a Spanish or Catalan title (after).
// ➤ Adjectives with no adjective ending, which a trade behind a stand-in does not take as nouns after it (lostNames):
// ➤ "Fast mechanical fitter" came back "Muntador mecànic – Fast".
export const ADJ_PLAIN =
  /^(?:fast|quick|rapid|new|old|big|small|large|light|heavy|high|low|hot|cold|dry|wet|smart|green|clean|young|main|top|full|multi|mobile)$/i;
// ➤ French trades a "dépanneur" can stand beside (before).
export const TRADE_FR =
  /(?<![\p{L}])(?:technicien|plombier|chauffagiste|m[ée]canicien|monteur|[ée]lectricien|frigoriste|climaticien|serrurier|vitrier|ascensoriste)/iu;
// ➤ A title cut short by its source ends on a piece of a word: the commonest word of the language's titles it begins,
// ➤ four letters at least; a shorter piece and the little word or hyphen before it go.
export function completeCut(t: string, lang: string): string {
  const V = vocabOf(lang),
    m = t.match(/(\p{L}+)$/u);
  if (!V || !m) return t;
  // ➤ The cut pieces are in the titles too ("maintena" 25 times): a word they begin, ten times commoner, wins.
  const piece = m[1].toLowerCase(),
    own = V[piece] || 0;
  if (piece.length >= 4) {
    // ➤ Only a word that stands out, three times commoner than any other the piece begins (its feminine or plural
    // ➤ aside): "élect" may be électricité or électricien, so it goes ("… en élect" came back "en electricista").
    const variant = (a: string, b: string): boolean =>
      a.startsWith(b) && /^(?:e|s|es|le|les|ne|nes)$/.test(a.slice(b.length));
    const words = Object.entries(V)
      .filter(
        ([w, n]) =>
          n > Math.max(2, own * 10) &&
          w.length > piece.length &&
          w.startsWith(piece),
      )
      .sort((a, b) => b[1] - a[1]);
    const best = words[0],
      other =
        best &&
        words.find(
          ([w]) =>
            w !== best[0] && !variant(w, best[0]) && !variant(best[0], w),
        );
    if (best && (!other || best[1] >= 3 * other[1]))
      return (
        t.slice(0, -m[1].length) +
        (m[1][0] === m[1][0].toUpperCase()
          ? best[0][0].toUpperCase() + best[0].slice(1)
          : best[0])
      );
  }
  // ➤ A capitalised word the titles do not know is a town or a name, written whole by a source that cuts nothing (TRA-07).
  if (!own && /^\p{Lu}/u.test(m[1]) && piece.length >= 4) return t;
  if (
    own >= 3 &&
    !(piece.length < 4 && /-$/.test(t.slice(0, -m[1].length))) &&
    !(
      piece.length >= 4 &&
      Object.entries(V).some(
        ([w, n]) =>
          n > own * 10 && w.length > piece.length && w.startsWith(piece),
      )
    )
  )
    return t;
  return t
    .slice(0, -m[1].length)
    .replace(
      /(?:\s+(?:de|du|des|d['’]|en|à|au|et|sur|pour|la|le|les)|[\s'’-])*$/iu,
      "",
    )
    .trim();
}
