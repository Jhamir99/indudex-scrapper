// The gate's word lists (legacy builder/gate.mjs, word for word).
import { TITLES as T } from "./title-rules.js";

// The bare word "engineer" in the sources' languages: the fallback when no ESCO title
// matches. Plain dictionary words.
export const ENGINEER_WORDS: readonly string[] = [
  "inginer",
  "inginera",
  "mérnök",
  "inženjer",
  "inženjerka",
  "inžinier",
  "inžinierka",
  "inženir",
  "inženirka",
  "insener",
  "inġinier",
  "engineer",
  "ingeniero",
  "ingeniera",
  "ingenieros",
  "ingenieras",
  "enginyer",
  "enginyera",
  "ingénieur",
  "ingénieure",
  "ingenieur",
  "ingenieurin",
  "ingenjör",
  "civilingenjör",
  "ingeniør",
  "sivilingeniør",
  "insinööri",
  "ingegnere",
  "engenheiro",
  "engenheira",
  "inżynier",
  "inženýr",
  "inženýrka",
  "inžinierius",
  "inžinierė",
  "inženieris",
  "inženiere",
];
export const GENERIC_FAMILY = "2149";
// The index's name for the titles outside the vertical (no family is called that).
export const BLOCKERS = "#outside";
// Where a computing title lands when ESCO names nothing more precise: software and
// applications developers and analysts not elsewhere classified.
export const ICT_FAMILY = "2519";
// Languages that compound their engineers (būvinženieris, Bauingenieur, byggingenjör): a word
// ending in the engineer word is the bare word too. Folded forms, as the title is read.
// Danish and Norwegian keep their «ø» in the title as read («driftsingeniør», NOB-05).
export const COMPOUND_ENGINEER =
  /(?:^|[^a-zøæå])[a-zøæå]{3,}(?:mernok|insener|ingenieur|ingenieurin|ingenjor|ingenior|ingeniør|insinoori|inzenieris|inzeniere|inzynier|inzenyr|ingeniero|ingeniera)(?![a-zøæå])/;
// Bare role nouns ESCO lists among some occupations' alternative titles. On their own they
// name no occupation ("coordinador" is as often a day-care coordinator as a production one),
// so the gate does not match on them; there is no fallback for "technician" either, which in
// Spanish names sales and office jobs as often as technical ones.
const ROLE_WORDS: readonly string[] = [
  "referent",
  "referentica",
  "referentka",
  "pomoćni radnik",
  "pomoćna radnica",
  "vývojár",
  "vývojář",
  "tehnician",
  "tehniciana",
  "technikus",
  "tehničar",
  "tehničarka",
  "technik",
  "technička",
  "tehnik",
  "tehnikas",
  "koordonator",
  "koordinátor",
  "vezető",
  "manažér",
  "manažer",
  "menadžer",
  "menedzser",
  "analitik",
  "analytik",
  "analitičar",
  "elemző",
  "operater",
  "operátor",
  "operatőr",
  "savjetnik",
  "svetovalec",
  "poradca",
  "tanácsadó",
  "consilier",
  "službenik",
  "sluzbenik",
  "vedúci",
  "vodja",
  "voditelj",
  "konzultant",
  "konzulent",
  "pracovník",
  "radnik",
  "delavec",
  "munkatárs",
  "administrator",
  "admin",
  "riaditeľ",
  "direktor",
  "igazgató",
  "instruktor",
  "műszakvezető",
  "specialist",
  "špecialista",
  "stručnjak",
  "strokovnjak",
  "szakértő",
  "technician",
  "técnico",
  "técnica",
  "tècnic",
  "tècnica",
  "technicien",
  "technicienne",
  "techniker",
  "technikerin",
  "technicus",
  "technieker",
  "tekniker",
  "teknikko",
  "tecnico",
  "tecnica",
  "technik",
  "technička",
  "technikas",
  "technikė",
  "tehniķis",
  "tehniķe",
  "coordinator",
  "coordinador",
  "coordinadora",
  "coordinateur",
  "coordinatrice",
  "koordinator",
  "koordinatör",
  "coördinator",
  "coordinatore",
  "supervisor",
  "supervisora",
  "superviseur",
  "superviseuse",
  "arbetsledare",
  "foreman",
  "capataz",
  "manager",
  "gerente",
  "gestor",
  "gestora",
  "responsable",
  "responsible",
  "leader",
  "lead",
  "líder",
  "ledare",
  "director",
  "directora",
  "directeur",
  "directrice",
  "jefe",
  "jefa",
  "chef",
  "head",
  "cap",
  "operator",
  "operador",
  "operadora",
  "opérateur",
  "opératrice",
  "operatör",
  "operatore",
  "operaio",
  "operario",
  "operaria",
  "conducteur",
  "conductrice",
  "inspector",
  "inspectora",
  "inspecteur",
  "inspectrice",
  "controller",
  "controlador",
  "controladora",
  "contrôleur",
  "officer",
  "oficial",
  "specialist",
  "especialista",
  "spécialiste",
  "specialista",
  "specialistka",
  "specialistas",
  "specialistė",
  "speciālists",
  "speciāliste",
  "vadovas",
  "vadovė",
  "vadītājs",
  "vadītāja",
  "vedoucí",
  "mistr",
  "meistras",
  "meistars",
  "consultant",
  "consultor",
  "consultora",
  "analyst",
  "analista",
  "designer",
  "diseñador",
  "diseñadora",
  "dissenyador",
  "dissenyadora",
  "planner",
  "planificador",
  "planificadora",
  "assistant",
  "asistente",
  "auxiliar",
];
export const GENERIC_WORDS = new Set(
  [...ENGINEER_WORDS, ...ROLE_WORDS].map(T.clean),
);
// A few of ESCO's labels are pieces of a broken one: a lone letter, or the German "in" left of a
// "…manager/in" among marketing's titles, which shut out every German title written
// "Ingenieur:in" or "Techniker in Hamburg". "FTE" goes too: a measure of working time that
// ESCO lists among electronics engineers' titles ("Registered Nurse 0.9 FTE"). And the Italian
// "esperto", ESCO's whole Italian label for the cider master (2145): every Italian title with an
// expert in it was a chemical engineer («Cameriere di Sala Esperto», «Cuoco Esperto»: 8 November 2026). And the
// German «Fachmann» and «Fachfrau», pieces of the coding index's «Fachmann/-frau - Multimedia»: every Swiss trade
// named so was a web developer (2513), «Fachmann/-frau Gesundheit» and «Fachfrau Hauswirtschaft» among them.
export const NOT_TITLES = new Set([
  "in",
  "fte",
  "esperto",
  "esperta",
  "fachmann",
  "fachfrau",
]);
export const usableTitle = (label: string): boolean => {
  const c = T.clean(label);
  return (
    !GENERIC_WORDS.has(c) &&
    !NOT_TITLES.has(c) &&
    c.replace(/[^\p{L}\p{N}]/gu, "").length >= 2
  );
};
// Words that put a title outside the vertical whatever else it says: sales and the running of social media (ISCO 24), teaching
// (23), facilities management (1219, as the ONS files it) and property or project development
// (the French "développeur de projet"), and medicine, care, the law's traineeships and chairs in
// German, in the sources' languages. Read only when the title, not a code, decides. Also the landscape gardener named
// as such («Maçon paysagiste», «Ouvrier paysagiste», «Paysagiste CFC», filed as landscape architects on 8 November
// 2026); a bare «paysagiste» can be either and stays. And the sewing machinist, who sews, and the shift leader of a
// restaurant or a warehouse («Schichtleiter Gastronomie», «Schichtleiter Lagerlogistik»), the masseur and medical bath
// attendant («Masseur und medizinischer Bademeister», 180 published physical science technicians), the dietitian, the
// nurse («verpleegkundige») and the social media manager (8 November 2026).
export const OUTSIDE_WORDS =
  /(?:^|[^a-z0-9])(?:marketing (?:manager|lead|specialist|director|executive|coordinator|officer|assistant|analyst|consultant|associate|intern|manager)|head of marketing|growth marketing|product marketing|content marketing|performance marketing|brand manager|verkoopmedewerker|kundenberater|kundenberaterin|customer service|customer success manager|account executive|ingenieur commercial|ingenieure commerciale|ingenieur d affaires|technico[ -]commerciale?|vertrieb[a-z]*|developpeu(?:r|se) (?:de projets?|foncier|fonciere|commercial|commerciale|d affaires)|facility manager|facilities manager|dietist|dietiste|dietitian|verpleegkundige|social media (?:manager|specialist|coordinator|executive|marketeer|editor)|merchandiser|promoter|masseur|masseurin|(?:medizinische[rn]?|med) bademeister(?:in)?|schichtleiter(?:in)? (?:gastronomie|service|logistik|lagerlogistik|lager)|sewing machinists?|(?:macon|ouvrier|ouvriere|aide|jardinier|jardiniere|apprenti|apprentie)[ -]paysagiste|paysagiste[ -](?:cfc|macon|polyvalent|vegetal|jardinier)|(?:ouvrier|macon) du paysage|business developer|business development|(?:gestor|gestora|responsable|tecnico|tecnica|especialista|coordinador|coordinadora|dinamizador|dinamizadora) de redes sociales|comercial|ventas|sales|profesor|profesora|professor|docente|teacher|lecturer|formador|formadora|enseignant|enseignante|professeur|professeure|charge d enseignement|formateur|formatrice|insegnante|pardavimu|pardosanas|tirdzniecibas|prekybos|obchodni|prodej|ucitel|ucitelka|mokytojas|skolotajs|arzt|arztin|pflegefachkraft|krankenpfleger|altenpfleger|lehrkraft|lehrkrafte|referendar|referendarin|rechtsreferendar|rechtsreferendarin|referendariat|professur|professorship|dozent|dozentin)(?![a-z0-9])/;
// The computing vocabulary of job titles, in the sources' languages and in the English of
// company boards: a title that carries one and names no occupation ESCO knows is still a
// software job, and lands in ICT_FAMILY rather than among the engineers.
// "Mobile" counts only beside a developer, an app or software: the German "mobile Pflege" and
// "mobile Blutspende" are care on the move.
export const ICT_WORDS =
  /(?:^|[^a-z0-9])(?:informatic(?:[oa]s?|i|he)|informatica|informatique|informaticien|informaticienne|logiciels?|it|ict|tic|software|programador|programadora|programmeur|programmeuse|programmatore|programmatrice|developer|developpeur|developpeuse|desarrollador|desarrolladora|sviluppatore|sviluppatrice|sistemista|datos|dades|data|ciberseguridad|cybersecurity|network security|netzwerksicherheit|netzwerk sicherheit|firewall|firewalls|cybersecurite|cyber securite|cyber security|systemes et reseaux|reseaux et telecoms?|reseaux et telecommunications|reseaux? informatiques?|back[ -]?end|front[ -]?end|full[ -]?stack|mobile (?:dev|developers?|development|engineers?|engineering|apps?|applications?|software|testing|testers?|qa|games?|entwickler(?:in)?|entwicklung)|devops|sre|cloud|ml|machine learning|ai|analytics|compiler|web|api|firmware|app|apps|android|ios|javascript|typescript|python|java|kubernetes|saas|crm|erp|d365|sap|salesforce|solution|solutions|database|sql|tecnico de soporte|tecnica de soporte|soporte informatico|windows administrator|windows server|windows engineer|linux|unix|vmware|citrix|azure|m365|office 365|active directory|sharepoint|teamcenter|windchill|plm|jira|atlassian|programator|programatorka|programuotojas|programmetajs|dezvoltator|fejleszto|programozo|programer|vyvojar|arendaja|tarkvaraarendaja|duomenu|datu|programovani|programavimo|programmesanas|skaitlotaju|datoru|kompiuteriu|pocitacovy|pocitacova)(?![a-z0-9])/;

export const IT_SECURITY =
  /(?:^|[^a-z])(?:it[ -]?sicherheit|it[ -]security|informationssicherheit|information security|cyber[ -]?security|netzwerk[ -]?sicherheit|network[ -]security)/;
