// Two facts read from an advert's text at build time, so the visitor's browser can apply
// the degree and language rules without the whole text: which degree families the
// advert DEMANDS, and which languages it REQUIRES. The rule is Argus's: a language or a
// degree mentioned as "a plus" or "not required" does not count; only a demand does. A
// demand read where there is none leaves a good offer out for the visitor, so the readings
// below lean to reading less.
// Legacy builder/screens.mjs, ported rule for rule (advert-facts FR-6, FR-7).
import { fold } from "../../shared/kit/fold.js";
import { sentences } from "./sentences.js";

// The catalogues' parts the screens read (catalogues/degrees.json, catalogues/languages.json).
export interface ScreenCatalogues {
  readonly degrees: {
    readonly words: string;
    readonly degrees: readonly {
      readonly id: string;
      readonly stems: string;
    }[];
  };
  readonly languages: {
    readonly languages: readonly {
      readonly code: string;
      readonly names: readonly string[];
    }[];
    readonly required: readonly string[];
    readonly softened: readonly string[];
  };
}

interface Mention {
  readonly code: string;
  readonly at: number;
  readonly end: number;
  readonly strict: boolean;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// A word ending in "*" is a stem: "fliessend*" is also "fliessende" and "fliessenden".
const alternatives = (list: readonly string[]) =>
  list
    .map((w) => {
      const stem = w.endsWith("*");
      const word = escapeRe(fold(stem ? w.slice(0, -1) : w)).replace(
        /\s+/g,
        "\\s+",
      );
      return stem ? `${word}[a-z]*` : word;
    })
    .join("|");
const words = (list: readonly string[]) =>
  new RegExp(`(?:^|[^a-z0-9])(?:${alternatives(list)})(?![a-z0-9])`);
// A language's name as a whole word, or with the tail that makes it "knowledge of" or
// "speaking" it ("Deutschkenntnisse", "Nederlandstalig", "englischsprachig"); not the
// country ("Germany", "Deutschland") or another word that starts the same ("polished").
const TAILS =
  "(?:kenntnisse?|sprachkenntnisse|sprachig[a-z]*|talig[a-z]*|talende|talande|sprakig[a-z]*|kunskap[a-z]*|kunnskap[a-z]*)?";
// Names that, folded, are ordinary words in an advert: Spanish "fines" (purposes), English
// "fins" and "pools", Italian and Spanish "romana", German "Italien" (Italy). The catalogue
// keeps them (a CV that says "finés" means Finnish); an advert's text is not read by them.
const AMBIGUOUS = new Set(["fines", "fins", "pools", "romana", "italien"]);
const names = (list: readonly string[]) =>
  new RegExp(
    `(?<![a-z0-9])(?:${alternatives(list.filter((n) => !AMBIGUOUS.has(fold(n))))})${TAILS}(?![a-z0-9])`,
    "g",
  );
// How adverts write a language when it is not the bare name a CV uses: «der deutschen Sprache», «de Engelse taal»,
// «znajomość języka angielskiego», «la lingua italiana». Read in adverts only; the catalogue is the CV's.
const FORMS: Readonly<Record<string, readonly string[]>> = {
  en: [
    "englische",
    "englischen",
    "englischer",
    "engelse",
    "engelske",
    "inglesa",
    "anglesa",
    "angielskiego",
    "angielskim",
    "anglicky",
    "anglictina",
    "anglictiny",
    "anglickeho",
    "engleza",
    "angol",
    "englannin",
  ],
  es: [
    "spanische",
    "spanischen",
    "spaanse",
    "espanola",
    "castellana",
    "hiszpanskiego",
    "spanelsky",
    "spaniola",
    "spanyol",
    "espanhola",
  ],
  fr: [
    "franzosische",
    "franzosischen",
    "franse",
    "franske",
    "francesa",
    "francuskiego",
    "francouzsky",
    "franceza",
    "ranskan",
  ],
  de: [
    "deutsche",
    "deutschen",
    "deutscher",
    "duitse",
    "tyske",
    "alemana",
    "alemanya",
    "tedesca",
    "niemieckiego",
    "niemieckim",
    "nemecky",
    "nemciny",
    "germana",
    "nemet",
    "saksan",
  ],
  nl: [
    "niederlandische",
    "niederlandischen",
    "nederlandse",
    "holandesa",
    "neerlandesa",
    "niderlandzkiego",
    "nizozemsky",
    "olandeza",
    "flamande",
  ],
  sv: [
    "schwedische",
    "schwedischen",
    "svenske",
    "sueca",
    "szwedzkiego",
    "svedsky",
    "suedeza",
    "ruotsin",
  ],
  no: [
    "norwegische",
    "norwegischen",
    "norske",
    "norweskiego",
    "norsky",
    "norvegiana",
    "norjan",
  ],
  da: [
    "danische",
    "danischen",
    "danske",
    "danesa",
    "dunskiego",
    "dansky",
    "daneza",
    "tanskan",
  ],
  fi: [
    "finnische",
    "finnischen",
    "finse",
    "finlandesa",
    "finskiego",
    "finsky",
    "finlandeza",
    "suomen",
  ],
  it: [
    "italienische",
    "italienischen",
    "italiaanse",
    "italiana",
    "wloskiego",
    "italsky",
    "olasz",
  ],
  pt: [
    "portugiesische",
    "portugiesischen",
    "portugese",
    "portuguesa",
    "portugalskiego",
    "portugalsky",
    "portugheza",
  ],
  pl: [
    "polnische",
    "polnischen",
    "poolse",
    "polaca",
    "polskiego",
    "polsky",
    "poloneza",
    "lengyel",
  ],
  cs: [
    "tschechische",
    "tschechischen",
    "tsjechische",
    "checa",
    "czeskiego",
    "cesky",
    "ceskeho",
    "cseh",
  ],
  ro: ["rumanische", "rumanischen", "roemeense", "rumunskiego"],
  el: [
    "griechische",
    "griechischen",
    "griekse",
    "griega",
    "greckiego",
    "recky",
    "greaca",
    "gorog",
    "kreikan",
  ],
  hu: [
    "ungarische",
    "ungarischen",
    "hongaarse",
    "hungara",
    "wegierskiego",
    "madarsky",
    "maghiara",
    "unkarin",
  ],
  // Not «catalana»: «empresa catalana» is a company's, not a language asked.
  ca: ["katalanische", "katalanischen", "catalaanse", "katalonskiego"],
};
// Demands beyond the catalogue's: the words' other endings («fließende», «verhandlungssicheres», «uitstekende»), a
// mother tongue, and demands in Italian, Polish, Czech, Romanian, Hungarian and Finnish.
const MORE_REQUIRED = [
  "requereix",
  "fliessend*",
  "verhandlungssicher*",
  "muttersprachlich*",
  "muttersprache",
  "voraussetzung",
  "uitstekend*",
  "vloeiend*",
  "moedertaal",
  "bilingual",
  "natif",
  "nativo",
  "nativa",
  "madrelingua",
  "modersmal",
  "morsmal",
  "flydende",
  "obbligatori*",
  "indispensabile",
  "richiest*",
  "wymagan*",
  "biegl*",
  "obowiazkow*",
  "plynul*",
  "podminkou",
  "obligatoriu",
  "elvaras",
  "felsofok*",
  "sujuva*",
];
// Words that demand a language only beside its name (a few words before or after it, in the same part of the
// sentence): a level ("gute", "strong command of", «bon niveau»), how it is used ("written and spoken"), or speaking it
// ("you speak"). Elsewhere in a sentence they speak of something else ("good communication skills").
const LEVELS = [
  "good",
  "very good",
  "strong",
  "solid",
  "exceptional",
  "outstanding",
  "superb",
  "perfect",
  "advanced",
  "upper intermediate",
  "upper-intermediate",
  "intermediate",
  "basic",
  "conversational",
  "professional",
  "working knowledge",
  "working proficiency",
  "business level",
  "business-level",
  "business fluent",
  "business-fluent",
  "command",
  "mastery",
  "knowledge",
  "spoken",
  "written and spoken",
  "spoken and written",
  "written and verbal",
  "verbal and written",
  "oral and written",
  "written and oral",
  "you speak",
  "speak fluently",
  "able to speak",
  "ability to speak",
  "can speak",
  "communicate",
  "communicating",
  "communication skills",
  "written",
  "high level",
  "gute",
  "guten",
  "gutes",
  "guter",
  "gutem",
  "gut",
  "sicher in",
  "sicher auf",
  "sichere",
  "sicheres",
  "sicheren",
  "fortgeschritten*",
  "stilsicher*",
  "ausgezeichnet*",
  "hervorragend*",
  "exzellent*",
  "fundiert*",
  "solide*",
  "perfekt*",
  "grundkenntnisse",
  "kenntnisse",
  "wort und schrift",
  "wort & schrift",
  "beherrsch*",
  "sprichst",
  "kommunizier*",
  "niveau",
  "buen",
  "buena",
  "bueno",
  "alto",
  "avanzado*",
  "fluido*",
  "fluidez",
  "conocimiento*",
  "manejo",
  "hablado",
  "escrito",
  "nivel",
  "conversacional",
  "intermedio",
  "basico",
  "hablas",
  "bon nivell",
  "domini",
  "nivell",
  "coneixement*",
  "parlat",
  "escrit",
  "parles",
  "bom",
  "boa",
  "fluente",
  "fluencia",
  "conhecimento*",
  "avancado*",
  "falado",
  "bon",
  "bonne",
  "tres bon",
  "tres bonne",
  "excellente",
  "parfait*",
  "courante",
  "parle",
  "ecrit",
  "connaissance*",
  "pratique",
  "notions",
  "avance*",
  "professionnel*",
  "technique",
  "vous parlez",
  "tu parles",
  "buon",
  "buona",
  "ottim*",
  "eccellent*",
  "conoscenza",
  "padronanza",
  "livello",
  "scritto",
  "parlato",
  "avanzat*",
  "parli",
  "goed",
  "goede",
  "zeer goede",
  "beheersing",
  "beheers*",
  "kennis",
  "mondeling",
  "schriftelijk",
  "perfect*",
  "spreek*",
  "goda",
  "goda kunskaper",
  "tal och skrift",
  "beharsk*",
  "talar",
  "gode",
  "god",
  "meget gode",
  "skriftlig*",
  "muntlig*",
  "mundtlig*",
  "behersk*",
  "snakker",
  "taler",
  "hyva",
  "hyvat",
  "erinomai*",
  "dobra",
  "dobry",
  "bardzo dobra",
  "znajomosc",
  "komunikatywn*",
  "poziom*",
  "zaawansowan*",
  "dobre",
  "znalost",
  "aktivni",
  "pokrocil*",
  "uroven",
  "komunikativni",
  "bune",
  "foarte bune",
  "cunostinte",
  "avansat",
  "kivalo",
  "targyalokepes",
  "nyelvtudas",
];
// A level of the European framework (A1 to C2) beside the name: "English C1", «Deutsch (B2)», "a B2 level of English".
const CEFR = /(?<![a-z0-9])[abc][12]\+?(?![a-z0-9])/;
// Softeners beyond the catalogue's, and "plus" and "bonus" only as softeners: "a plus", «un plus», «ein großes Plus»,
// "Plus:", "an added bonus", "bonus points". Alone, "plus" is also "and" ("English plus a local language") and French
// «plus de 3 ans»; "bonus" is also pay ("annual bonus", "signing bonus").
const MORE_SOFTENED = [
  "es valorara",
  "es valora",
  "strong plus",
  "big plus",
  "pluspunkte",
  "pluspunkt",
  "pluss",
  "ideally",
  "idealerweise",
  "idealmente",
  "idealement",
  "desired",
  "highly desired",
  "nice to haves",
  "nice-to-have",
  "nice-to-haves",
  "helpful",
  "useful",
  "preferably",
  "preferable",
  "vorteilhaft",
  "erwunscht",
  "hilfreich",
  "von nutzen",
  "vorzugsweise",
  "bevorzugt",
  "gerne",
  "gern",
  "eventuell",
  "meerwaarde",
  "meegenomen",
  "strekt tot aanbeveling",
  "gewenst",
  "wenselijk",
  "bij voorkeur",
  "eventueel",
  "voordeel",
  "helst",
  "preferencia",
  "de preferencia",
  "preferentemente",
  "preferiblemente",
  "valoramos",
  "valorables",
  "valorado",
  "valorada",
  "se valoran",
  "de preference",
  "eventuellement",
  "possibly",
  "optional",
  "opcional",
  "facoltativo",
  "atut",
  "atutem",
  "plusz",
];
const PLUS =
  "(?<![a-z0-9])(?:a|an|un|une|ein|eine|einen|einem|een|ett|big|huge|great|real|vrai|gros|grand|grosses|grosser|groot|grote|stort|added|definite|major|bonus|extra)\\s+plus(?![a-z0-9])|(?<![a-z0-9])plus\\s*[:!)]" +
  "|(?<![a-z0-9])(?:a|an|added|big|huge|real|great|definite|nice|extra|massive)\\s+bonus(?![a-z0-9])|(?<![a-z0-9])bonus\\s+(?:points?|skills?|qualifications?|if|for)(?![a-z0-9])|(?<![a-z0-9])bonus\\s*[:!)]";
// Softeners that say "not required" rather than "a plus": only they take back a demand from the next part.
const NEGATION =
  /(?:^|\s)(?:not|nicht|no|non|pas|niet|inte|ikke|kein|keine)(?:\s|$)/;
// A name followed by one of these words is that word's adjective, not the language: "French payroll", "the German
// market", "an English version of your CV", «unsere deutschen Kunden», «Nederlandse klanten».
const ADJECTIVE_OF = new Set(
  `market markets marketplace payroll law laws legislation legal social security tax taxes taxation vat clients client customers customer
  team teams company companies firm firms territory territories region regions area areas office offices entity entities subsidiary subsidiaries branch branches
  version versions cv cvs resume resumes site sites website websites accounting gaap ifrs standards regulation regulations regulatory rules authorities authority
  government administration labour labor employment people nationals national citizen citizens citizenship nationality passport passports residents resident residency
  culture cultural cuisine food restaurant restaurants school schools university universities border borders coast side part parts business businesses operations
  partners partner network networks grid railway railways economy industry industries sector banks bank banking insurance pension pensions healthcare hospitals hospital
  products product brand brands organisation organisations organization organizations group headquarters parent startup startups manufacturer manufacturers automotive
  staff colleagues employees workers sales distributors distributor suppliers supplier retail retailers stores store shops shop accounts portfolio clientele audience
  audiences users players community communities press media newspapers channel channels arctic alps riviera division unit plant plants factory factories facility
  facilities locations location mittelstand enterprises institutions courts court learner learners literature studies countries country world environment
  kunden markt marktes unternehmen firmen gesellschaft niederlassung niederlassungen standorte standort tochtergesellschaft behorden behorde recht steuerrecht
  arbeitsrecht vertrieb raum schweiz kollegen bahn telekom post staatsangehorigkeit klanten bedrijven bedrijf overheid wetgeving organisatie vestiging vestigingen
  nationaliteit kunder marknaden marknad markedet marked virksomheder foretag foretaget selskap statsborgerskab medborgarskap
  switzerland belgium canada africa america europe latam cantons canton`.split(
    /\s+/,
  ),
);
// "-speaking" names the language unless a place or a people follows ("German-speaking Switzerland", "Spanish-speaking
// markets"): "Spanish speaking required", "Private Client Solicitor (French Speaking)".
const SPEAKING = new Set([
  "speaking",
  "sprechend",
  "sprechende",
  "sprechenden",
  "parlant",
  "parlante",
  "hablante",
  "hablantes",
]);
// What may follow a name for a demand far from it to count (one beyond the few words beside it): a mark, "and", a verb,
// a word for language or skill, a level. A demand that far could be another sentence's, run on without a full stop.
const AFTER_NAME = new Set(
  `and or und oder sowie bzw et ou y o e ed en of och eller samt og ja tai seka oraz lub albo i a si sau es vagy nebo plus as but aber mais pero ma maar men ale dar
  is are be ist sind est sont son er ar jest sa je este sunt at to in im auf op na au aux al de d del du des della dello di da mit with avec con com med met z ze w v pa als like
  language languages skills skill knowledge proficiency fluency level levels speaker speakers communication communications writing written spoken verbal oral reading comprehension conversation conversational
  sprache sprachen kenntnisse kenntnissen lingua lingue linguistiche linguistica taal talen taalvaardigheid sprak spraket sprog sproget kieli kielen kielitaito langue langues idioma idiomas lengua lenguas
  jazyk jazyka jezyk jezyka jezykiem limba limbii nyelv nyelvtudas nivel niveau niveaux livello poziom poziomie uroven vocabulary grammar test certificate certification exam mother
  native natif nativo nativa fluent fluently fluente fluido fluida fluidez courant courante couramment flytande flytende flydende vloeiend sujuva muttersprache muttersprachler madrelingua moedertaal modersmal morsmal
  required mandatory essential obligatoire requis requise exige exigee indispensable imprescindible obligatorio obligatoria necesario necesaria necessario necessaria avanzado avanzada alto alta medio media
  basico basica intermedio intermedia avance avancee parle ecrit lu beherrschen beherrscht erforderlich vorausgesetzt zwingend vereist verplicht noodzakelijk kravs krav kreves wymagany wymagana wymagane
  obbligatorio obbligatoria richiesto richiesta perfect perfectly perfekt perfekte well bien goed gut good very excellent technique technical business professional professionnel
  von vom zu wird werden erwunscht bevorzugt preferred desirable desired mindestens minimum minimo minima minimal least moins menos almeno minstens minst minimaal vahintaan najmniej
  mind min ab for fur pour para per voor zum zur um on setzen sollten sollte should must muss moet skal ska deve debe doit notwendig wichtig unbedingt besonders voraussetzung
  fliessend verhandlungssicher versiert muttersprachlich sicher muntlig skriftlig mundtlig mondeling schriftelijk scritto parlato hablado escrito orale falado escrita
  proficient bilingue bilingual read que qui che die der das dat som which that who afin muy sehr tres zeer molto bardzo both beide tanto aussi requerido requerida
  exigido exigida runden rundet speaker speakers translator translators interpreter interpreters teacher teachers god`.split(
    /\s+/,
  ),
);
// Words for a language without naming one ("other languages are a plus", «weitere Fremdsprachen von Vorteil»,
// "the local language"): a softener beside them speaks for those, not for the language named before.
const LANGUAGE_WORD =
  /(?<![a-z0-9])(?:languages?|sprachen|sprache|sprachkenntnisse|fremdsprachen[a-z]*|fremdsprache|langues?|idiomas?|lenguas?|lingua|lingue|talen|taal|sprak|spraket|sprog|sproget|kieli|kielet|kielia|jazyky?|jezyki?|jezykow|limbi|limba|nyelv|nyelvek)(?![a-z0-9])/;
// A level in a sentence about lessons is the course's, not the advert's demand ("Danish lessons up to B2").
// And the training an employer offers («Ofrecemos formación en inglés hasta nivel B2», DAB-08).
const COURSE =
  /(?<![a-z0-9])(?:formacion|formacio|formation|formazione|schulung|schulungen|course|courses|training|trainings|lessons|classes|kurs|kurse|kursen|sprachkurs|sprachkurse|unterricht|cours|curso|cursos|corso|corsi|clases|lezioni|lessen|cursus|taalcursus|undervisning|kurssi|kurzy|curs|cursuri|tanfolyam)(?![a-z0-9])/;
// Headings that end a softened list ("Nice to have:" then "What we offer"), besides any line ending in a colon.
export const PLAIN_HEADING = new RegExp(
  `^[^a-z0-9]*(?:${["requirements", "required", "qualifications", "must have", "must haves", "must-haves", "profile", "your profile", "about you", "who you are", "what you bring", "what we expect", "what we offer", "we offer", "benefits", "perks", "about us", "responsibilities", "tasks", "your tasks", "the role", "about the role", "job description", "how to apply", "requisitos", "perfil", "ofrecemos", "funciones", "anforderungen", "profil", "ihr profil", "dein profil", "aufgaben", "wir bieten", "das bieten wir", "votre profil", "profil recherche", "missions", "vos missions", "nous offrons", "avantages", "functie-eisen", "functieeisen", "wij vragen", "jouw profiel", "wij bieden", "taken", "kvalifikationer", "krav", "vi erbjuder", "arbetsuppgifter", "wymagania", "oferujemy", "obowiazki", "requisiti", "offriamo", "competenze", "kvalifikasjoner", "vi tilbyr", "arbeidsoppgaver", "vi tilbyder", "opgaver", "vaatimukset", "tarjoamme", "pozadavky", "nabizime", "cerinte", "oferim", "elvarasok", "kinalunk"].map(escapeRe).join("|")})[^a-z0-9]*$`,
);
// "Master" that names no degree ("Scrum Master", "master data", a master plan), "Czech
// Republic" (the country, not the language), and the Dutch "WO" only as a level ("WO-niveau"),
// never the German "wo" (where).
const NOT_A_DEGREE =
  /(?:scrum|quarter|web|head|post|ring|grand|toast)\s*master|master\s*(?:data|plan|file|schedul[a-z]*|class|key|copy|record|mind|piece|card|chef|brewer)/g;
const cleaned = (f: string) =>
  f.replace(NOT_A_DEGREE, " ").replace(/czech\s+republic/g, "czechia");
// Words that name a place of study rather than a degree ("near the university", "Studium",
// "formación"): they count only in a sentence that demands something.
// Also the trades' own training (German "Ausbildung", Danish «uddannelse») and the Swedish «examen», which is also an
// exam in French and Spanish (1 November 2026).
const WEAK = [
  "university",
  "universidad",
  "universite",
  "universitat",
  "universitet",
  "universitair",
  "hogeskole",
  "hogskole",
  "studium",
  "studiengang",
  "formacion",
  "formation",
  "opleiding",
  "utbildning",
  "utdanning",
  "ausbildung",
  "berufsausbildung",
  "uddannelse",
  "utdannelse",
  "examen",
];
const DEMANDS = [
  "abgeschlossen",
  "abgeschlossenes",
  "abgeschlossener",
  "abgeschlossene",
  "abgeschlossenen",
  "completed",
  "minimum",
  "erforderlich",
  "vorausgesetzt",
  "krav",
  "skallkrav",
  "kreves",
  "vereist",
  "required",
  "requis",
  "requise",
  "exige",
  "exigee",
  "requerido",
  "requerida",
  "imprescindible",
  "obligatorio",
  "richiesto",
  "richiesta",
  "wymagane",
  "wymagany",
  "titulaire",
  "issu",
  "issue",
];

export type Screens = ReturnType<typeof compileScreens>;

export function compileScreens({ degrees, languages }: ScreenCatalogues) {
  const all = String(degrees.words).split("|");
  const strong = all.filter((w) => !WEAK.includes(w) && w !== "wo");
  const softenerWords = [...languages.softened, ...MORE_SOFTENED];
  const known = languages.languages.map((l) => ({
    code: l.code,
    names: [...l.names, ...(FORMS[l.code] || [])],
  }));
  return {
    degreeWord: new RegExp(
      `(?:^|[^a-z0-9])(?:${[...strong, "wo[ -](?:niveau|opleiding|diploma|bachelor|master)"].join("|")})(?![a-z0-9])`,
    ),
    weakDegreeWord: new RegExp(
      `(?:^|[^a-z0-9])(?:${all.filter((w) => WEAK.includes(w)).join("|")})(?![a-z0-9])`,
    ),
    degrees: degrees.degrees.map((d) => ({
      id: d.id,
      re: new RegExp(`(?:^|[^a-z0-9])(?:${d.stems})`),
    })),
    languages: known.map((l) => ({ code: l.code, re: names(l.names) })),
    anyName: new RegExp(
      `(?<![a-z0-9])(?:${alternatives(known.flatMap((l) => l.names).filter((n) => !AMBIGUOUS.has(fold(n))))})`,
    ),
    nameWords: new Set(known.flatMap((l) => l.names.map(fold))),
    required: words([...languages.required, ...MORE_REQUIRED]),
    demanded: words([...languages.required, ...DEMANDS]),
    level: words(LEVELS),
    // A degree keeps the catalogue's softeners: "preferably" names its preferred field («mbo, bij voorkeur in
    // werktuigbouwkunde»), while the degree is still asked.
    degreeSoftened: new RegExp(`${words(languages.softened).source}|${PLUS}`),
    softened: new RegExp(`${words(softenerWords).source}|${PLUS}`),
    softeners: new RegExp(
      `(?<![a-z0-9])(?:${alternatives(softenerWords)})(?![a-z0-9])|${PLUS}`,
      "g",
    ),
    negation: words(softenerWords.filter((w) => NEGATION.test(fold(w)))),
  };
}

// The parts of a text a demand or a softener speaks for: its sentences, and within one, the
// parts a semicolon keeps apart ("Fluent German is required; English is a plus").
// The letters folding leaves as they are written the way the word lists write them: «fließend», «biegły», «nødvendig».
const plain = (f: string) =>
  f
    .replace(/ß/g, "ss")
    .replace(/ł/g, "l")
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae");
const clauses = (text: string) =>
  sentences(text)
    .flatMap((s) => s.split(/\s*;\s*/))
    .map((c) => cleaned(plain(fold(c))))
    .filter(Boolean);

// Degree families an advert demands: a part with a degree word and a family stem, not
// softened. Several families in one part ("mechanical or electrical engineering") are all
// listed: the visitor needs one of them.
// A part longer than a requirement (a page's text with no full stops) is read only around its degree word: the field a
// degree names follows it closely ("Abgeschlossene Ausbildung zum Elektroniker", "Bac+5 en informatique"), and the
// rest of such a part is the employer's trade or the job's tasks («Métier de l'employeur : systèmes mécaniques»).
const LONG_PART = 300;
const nearDegree = (f: string, word: RegExp) => {
  if (f.length <= LONG_PART) return f;
  const m = f.match(word);
  return m
    ? f.slice(Math.max(0, (m.index ?? 0) - 60), (m.index ?? 0) + 160)
    : "";
};
export function requiredDegrees(text: string, s: Screens): string[] {
  const out = new Set<string>();
  for (const f of clauses(text)) {
    const strong = s.degreeWord.test(f);
    const named = strong || (s.weakDegreeWord.test(f) && s.demanded.test(f));
    if (!named || s.degreeSoftened.test(f)) continue;
    const part = nearDegree(f, strong ? s.degreeWord : s.weakDegreeWord);
    for (const d of s.degrees) if (d.re.test(part)) out.add(d.id);
  }
  // The generic "an engineering degree" says nothing more when a field was named.
  if (out.size > 1) out.delete("engineering-any");
  return [...out];
}

const wordsOf = (t: string) => t.split(/\s+/).filter(Boolean);
const lastWords = (t: string, n: number) => wordsOf(t).slice(-n).join(" ");
const firstWords = (t: string, n: number) => wordsOf(t).slice(0, n).join(" ");

// Each place a language is named in a part, unless the name is another word's adjective. `strict`: what follows it is
// a mark or a word that goes with a language, so a demand far from it can count.
// A name after a word for the company is its nationality: «Multinacional francesa con alto nivel…» asks no French (DAB-02).
const COMPANY_BEFORE = new Set(
  "multinacional multinational multinationale multinazionale empresa empreses compania companyia company firma firm grupo grup group groupe entreprise societe unternehmen konzern bedrijf azienda societa".split(
    " ",
  ),
);
function mentions(f: string, s: Screens): Mention[] {
  if (!s.anyName.test(f)) return [];
  const found: Mention[] = [];
  for (const l of s.languages) {
    for (const m of f.matchAll(l.re)) {
      const end = m.index + m[0].length,
        rest = f.slice(end);
      const mark = /^(?:\s*$|-\s|\s+[-–—]\s|\s*[^\sa-z0-9-])/.test(rest);
      const [, next = "", then = ""] = mark
        ? []
        : rest.match(/^\s*-?([a-z0-9]+)(?:\s+([a-z0-9]+))?/) || [];
      if (
        ADJECTIVE_OF.has(next) ||
        (SPEAKING.has(next) && ADJECTIVE_OF.has(then))
      )
        continue;
      if (
        COMPANY_BEFORE.has(
          f.slice(0, m.index).match(/([a-z0-9]+)\s*$/)?.[1] ?? "",
        )
      )
        continue;
      const strict =
        mark ||
        AFTER_NAME.has(next) ||
        CEFR.test(next) ||
        s.nameWords.has(next) ||
        (SPEAKING.has(next) && (!then || AFTER_NAME.has(then)));
      found.push({ code: l.code, at: m.index, end, strict });
    }
  }
  return found.toSorted((a, b) => a.at - b.at);
}

// Names joined by "and", a comma or a slash ("good German, English and French") share what stands before the first
// and after the last. Joined by "or" («Englisch oder Deutsch»), or listed as "one of the following", they are a choice:
// the advert asks for one of them, which a list of required languages cannot say, so none is read.
const JOINED =
  /^(?:[\s,/&+()'-]|and|or|und|oder|sowie|bzw|et|ou|y|o|e|ed|en|och|eller|og|i|oraz|lub|si|sau|es|vagy|a|the|der|die|das|des|la|le|l|el|del|de|della|dell|het|van)*$/;
const OR =
  /(?<![a-z0-9])(?:or|oder|bzw|ou|o|eller|lub|albo|sau|vagy|nebo|tai)(?![a-z0-9])/;
const CHOICE =
  /(?<![a-z0-9])(?:one or more|at least one|any of|either|one of the following|one additional|einer der folgenden|eine der folgenden|une des langues|uno de los siguientes|una de las siguientes)(?![a-z0-9])/;
const runsOf = (f: string, named: readonly Mention[]): Mention[][] =>
  named.reduce<Mention[][]>((runs, m) => {
    const run = runs.at(-1);
    if (run && JOINED.test(f.slice(run.at(-1)!.end, m.at))) run.push(m);
    else runs.push([m]);
    return runs;
  }, []);
const aChoice = (f: string, run: readonly Mention[]) =>
  run.length > 1 &&
  (CHOICE.test(f) ||
    run.slice(1).some((m, i) => OR.test(f.slice(run[i].end, m.at))));

// The stretch of a part around a name up to the commas on either side, leaving those inside brackets («Deutsch
// (C1-C2, verhandlungssicher)»).
function stretch(f: string, at: number, end: number): [number, number] {
  let from = at,
    to = end,
    depth = 0;
  for (let i = at - 1; i >= 0; i--) {
    if (f[i] === ")") depth++;
    else if (f[i] === "(" && depth) depth--;
    else if (!depth && (f[i] === "," || f[i] === ";")) break;
    from = i;
  }
  depth = 0;
  for (let i = end; i < f.length; i++) {
    if (f[i] === "(") depth++;
    else if (f[i] === ")" && depth) depth--;
    else if (!depth && (f[i] === "," || f[i] === ";")) break;
    to = i + 1;
  }
  return [from, to];
}

// The names of a run a demand speaks for: all of them when a demand or a level stands within a few words of the run;
// only those a mark or a language word follows when the demand is further away in its part (near the run, in a long
// part with no full stops).
const LONG = 40;
function demandedOf(
  f: string,
  run: readonly Mention[],
  s: Screens,
): readonly Mention[] {
  const first = run[0]!,
    last = run.at(-1)!;
  const before = lastWords(
    f.slice(stretch(f, first.at, first.end)[0], first.at),
    5,
  );
  const after = firstWords(
    f.slice(last.end, stretch(f, last.at, last.end)[1]),
    4,
  );
  const near = [before, f.slice(first.end, last.at), after].map(
    (t) => ` ${t} `,
  );
  if (near.some((t) => s.required.test(t))) return run;
  if (!COURSE.test(f) && near.some((t) => s.level.test(t) || CEFR.test(t)))
    return run;
  const wide =
    wordsOf(f).length <= LONG
      ? f
      : `${lastWords(f.slice(0, first.at), 12)} ${f.slice(first.at, last.end)} ${firstWords(f.slice(last.end), 12)}`;
  return s.required.test(wide) ? run.filter((m) => m.strict) : [];
}

// A sentence's items: the stretches between commas, brackets, dashes and "but". A softener speaks for the names of its
// own item, save one its own "and"-part demands outright («dominio del español y deseable fluidez en inglés», but not
// "Bilingual in French and English preferred"), and for the item before it when it is an item of its own ("English
// (preferred)", «Deutsch, von Vorteil»).
const ITEM_EDGE =
  /[,;()[\]]|\s[-–—]\s|\s(?:but|aber|mais|pero|ma|maar|men|ale|dar|however|jedoch|cependant)\s/g;
const AND =
  /\s(?:and|or|und|oder|sowie|bzw|et|ou|y|o|e|ed|och|eller|samt|og|ja|tai|seka|oraz|lub|albo|i|si|sau|es|vagy|nebo|en)\s/g;
const BOTH =
  /(?<![a-z0-9])(?:bi-?lingual|bilingue|zweisprachig|tweetalig|tvasprakig)(?![a-z0-9])/g;
const FILLER = new Set(
  "is are would be will also considered very highly strongly much an a the big great it this ist sind ware waren sehr ein eine est sont serait un une es son seria sera muy una e sarebbe molto zijn zou een ar vore ett er vil vaere et jest je este".split(
    " ",
  ),
);
function softened(
  f: string,
  m: Mention,
  named: readonly Mention[],
  s: Screens,
): boolean {
  const edges = [...f.matchAll(ITEM_EDGE)].map((e) => [
    e.index,
    e.index + e[0].length,
  ]);
  const itemOf = (p: number) => edges.filter(([a]) => a < p).length;
  const start = (k: number) => (k ? edges[k - 1][1] : 0),
    stop = (k: number) => (k < edges.length ? edges[k][0] : f.length);
  const own = itemOf(m.at);
  return [...f.matchAll(s.softeners)].some((x) => {
    const at = x.index,
      k = itemOf(at);
    // A softener heading inside the part ("Nice to have: German", "Plus: Dutch") speaks for all that follows it.
    if (
      (/:\s*$/.test(x[0]) || /^\s*:/.test(f.slice(at + x[0].length))) &&
      at < m.at
    )
      return true;
    if (k === own) {
      let a = start(k),
        b = stop(k);
      for (const c of f.slice(a, b).matchAll(AND)) {
        const p = a + c.index;
        if (f[p - 1] === "-") continue;
        if (p < m.at) a = p + c[0].length;
        else {
          b = p;
          break;
        }
      }
      return (
        (at >= a && at < b) ||
        !s.required.test(f.slice(a, b).replace(BOTH, " "))
      );
    }
    const rest =
      `${f.slice(start(k), at)} ${f.slice(at + x[0].length, stop(k))}`.replace(
        /[^a-z0-9\s]/g,
        " ",
      );
    return (
      k === own + 1 &&
      !named.some((n) => itemOf(n.at) === k) &&
      wordsOf(rest).every((w) => FILLER.has(w))
    );
  });
}

// A line that heads the lines under it. A softened one ("Nice to have", "Preferred qualifications", «Von Vorteil:»,
// "Added bonus") softens them until the next heading: a line ending in a colon, or a known one ("What we offer", «Ihr
// Profil»). A short item with a softener ("Master degree preferred", «SAP-Kenntnisse von Vorteil») heads nothing.
const STRONG =
  /(?<![a-z0-9])(?:required|mandatory|must|essential|erforderlich|zwingend|unbedingt|voraussetzung|imprescindible|obligatori[a-z]*|requis|requise|indispensable|vereist|verplicht|kravs|kreves|wymagan[a-z]*|richiest[a-z]*)(?![a-z0-9])/;
const HEADING_WORDS = new Set([
  ...FILLER,
  ..."qualifications qualification skills skill experience experiences requirements requirement profile points extras extra but not required if you we have to for und oder du sie hast haben mitbringst bringst mit folgendes wenn kenntnisse qualifikationen de la le les el los y se si tienes det om har aven heeft je hebt ook".split(
    " ",
  ),
]);
function headingKind(f: string, s: Screens): "soft" | "plain" | null {
  const colon = /:\s*$/.test(f);
  if (s.softened.test(f)) {
    if (LANGUAGE_WORD.test(f) || /[()\d$€£%]/.test(f)) return null;
    const rest = f.replace(s.softeners, " ").replace(/[^a-z\s]/g, " ");
    return (colon && wordsOf(f).length <= 10) ||
      wordsOf(rest).every((w) => HEADING_WORDS.has(w))
      ? "soft"
      : null;
  }
  return colon || PLAIN_HEADING.test(f) ? "plain" : null;
}

// Languages an advert requires: a language named in a part that demands it ("Fluent German is required", «Imprescindible
// inglés»), or with a level beside its name ("gute Englischkenntnisse", "strong command of English", «Deutsch (B2)»).
// Not when a softener speaks for it ("German is a plus", a "Nice to have" heading over it), when the next part takes the
// demand back ("Actually not required"), when it is one of a choice («Englisch oder Deutsch»), or when the name is
// another word's adjective ("French payroll").
export function requiredLanguages(text: string, s: Screens): string[] {
  const out = new Set<string>();
  const all = clauses(text);
  let underSoftHeading = false;
  all.forEach((f, i) => {
    const named = mentions(f, s);
    if (!named.length) {
      const kind = headingKind(f, s);
      if (kind) underSoftHeading = kind === "soft";
      return;
    }
    // Under a softened heading a line counts only when it insists ("Fluent English is required for this role").
    if (underSoftHeading && !STRONG.test(f)) return;
    const next = all[i + 1] || "";
    const nextNamed = s.negation.test(next) ? mentions(next, s) : null;
    for (const run of runsOf(f, named)) {
      if (aChoice(f, run)) continue;
      for (const m of demandedOf(f, run, s)) {
        if (softened(f, m, named, s)) continue;
        // The next part takes a demand back when it says "not required" of the same language, or briefly of none.
        if (
          nextNamed &&
          (nextNamed.some((n) => n.code === m.code) ||
            (!nextNamed.length && wordsOf(next).length <= 8))
        )
          continue;
        out.add(m.code);
      }
    }
  });
  return [...out];
}
