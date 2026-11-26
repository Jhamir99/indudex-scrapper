// ➤ Two facts read from an advert's text at build time, so the visitor's browser can apply
// ➤ the degree and language rules without the whole text: which degree families the
// ➤ advert DEMANDS, and which languages it REQUIRES. The rule is Argus's: a language or a
// ➤ degree mentioned as "a plus" or "not required" does not count; only a demand does. A
// ➤ demand read where there is none leaves a good offer out for the visitor, so the readings
// ➤ below lean to reading less.
// The legacy's builder/screens.ts, copied (legacy resync T003): only its imports changed, and ANY_ENGINEERING declared here. Its own comments keep their marks.
import { foldLetters } from "../../shared/kit/fold.js";
import { sentences } from "../../shared/kit/sentences.js";
import {
  anyOf,
  deniedDemand,
  words as tableWords,
} from "../../shared/words/index.js";
// ➤ The degrees catalogue's degree in any engineering (the legacy's app/lib/codec.ts).
const ANY_ENGINEERING = "engineering-any";

const escapeRe = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// ➤ A word ending in "*" is a stem: "fliessend*" is also "fliessende" and "fliessenden".
const alternatives = (list: string[]): string =>
  list
    .map((w) => {
      const stem = w.endsWith("*");
      const word = escapeRe(foldLetters(stem ? w.slice(0, -1) : w)).replace(
        /\s+/g,
        "\\s+",
      );
      return stem ? `${word}[a-z]*` : word;
    })
    .join("|");
const words = (list: string[]): RegExp =>
  new RegExp(`(?:^|[^a-z0-9])(?:${alternatives(list)})(?![a-z0-9])`);
// ➤ A language's name as a whole word, or with the tail that makes it "knowledge of" or
// ➤ "speaking" it ("Deutschkenntnisse" or its slip «Englischkentnisse», "Nederlandstalig",
// ➤ "englischsprachig"); not the country ("Germany", "Deutschland") or another word that starts the same ("polished").
const KNOWLEDGE_TAIL =
  "ken?ntnisse?|sprachkenntnisse|kunskap[a-z]*|kunnskap[a-z]*|kundskab[a-z]*";
const TAILS = `(?:${KNOWLEDGE_TAIL}|sprachig[a-z]*|talig[a-z]*|talende|talande|sprakig[a-z]*)?`;
// ➤ A name with the tail of knowing it gives its own level, as «Kenntnisse in Deutsch» does («Deutschkenntnisse»).
const KNOWN_NAME = new RegExp(`(?:${KNOWLEDGE_TAIL})$`);
// ➤ Names that, folded, are ordinary words in an advert: Spanish "fines" (purposes), English
// ➤ "fins" and "pools", Italian and Spanish "romana", German "Italien" (Italy). The catalogue
// ➤ keeps them (a CV that says "finés" means Finnish); an advert's text is not read by them.
const AMBIGUOUS = new Set(["fines", "fins", "pools", "romana", "italien"]);
const names = (list: string[]): RegExp =>
  new RegExp(
    `(?<![a-z0-9])(?:${alternatives(list.filter((n) => !AMBIGUOUS.has(foldLetters(n))))})${TAILS}(?![a-z0-9])`,
    "g",
  );
// ➤ How adverts write a language when it is not the bare name a CV uses: «der deutschen Sprache», «de Engelse taal»,
// ➤ Czech and Slovak name a language with an adjective declined before «jazyk» («znalost německého jazyka», «anglickým
// ➤ jazykem»), not the country («Německo»), or with a noun in any case («angličtinu», «nemčinou»).
const czechSlovak = (adjectives: string, nouns: string): string[] => [
  ...adjectives
    .split(" ")
    .flatMap((stem) => ["y", "eho", "ym"].map((end) => stem + end)),
  ...nouns.split(" ").map((stem) => `${stem}*`),
];
// ➤ «znajomość języka angielskiego», «la lingua italiana». Read in adverts only; the catalogue is the CV's.
const FORMS: Record<string, string[]> = {
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
    "engleza",
    "engleze",
    "angol",
    "englannin",
    "engleski",
    "engleskog",
    ...czechSlovak("anglick", "anglictin"),
  ],
  es: [
    "spanische",
    "spanischen",
    "spaanse",
    "espanola",
    "castellana",
    "hiszpanskiego",
    "spaniola",
    "spaniole",
    "spanyol",
    "espanhola",
    "spanjolski",
    "spanjolskog",
    "espanjan kiel*",
    ...czechSlovak("spanelsk spanielsk", "spanelstin spanielcin"),
  ],
  fr: [
    "franzosische",
    "franzosischen",
    "franse",
    "franske",
    "francesa",
    "francuskiego",
    "franceza",
    "franceze",
    "ranskan",
    "francuskog",
    "francia nyelv*",
    ...czechSlovak("francouzsk francuzsk", "francouzstin francuzstin"),
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
    "germana",
    "germane",
    "nemet",
    "saksan",
    "njemacki",
    "njemackog",
    ...czechSlovak("nemeck", "nemcin"),
  ],
  nl: [
    "niederlandische",
    "niederlandischen",
    "nederlandse",
    "holandesa",
    "neerlandesa",
    "niderlandzkiego",
    "olandeza",
    "flamande",
    "nizozemski",
    "nizozemskog",
    "hollannin kiel*",
    "holland nyelv*",
    ...czechSlovak("nizozemsk holandsk", "nizozemstin holandcin"),
  ],
  sv: [
    "schwedische",
    "schwedischen",
    "svenske",
    "sueca",
    "szwedzkiego",
    "suedeza",
    "ruotsin",
    "svedski",
    "svedskog",
    ...czechSlovak("svedsk", "svedstin svedcin"),
  ],
  no: [
    "norwegische",
    "norwegischen",
    "norske",
    "norweskiego",
    "norvegiana",
    "norjan",
    "norveski",
    "norveskog",
    ...czechSlovak("norsk", "norstin norcin"),
  ],
  da: [
    "danische",
    "danischen",
    "danske",
    "danesa",
    "dunskiego",
    "daneza",
    "tanskan",
    "danski",
    "danskog",
    ...czechSlovak("dansk", "danstin dancin"),
  ],
  fi: [
    "finnische",
    "finnischen",
    "finse",
    "finlandesa",
    "finskiego",
    "finlandeza",
    "suomen",
    "finski",
    "finskog",
    ...czechSlovak("finsk", "finstin fincin"),
  ],
  it: [
    "italienische",
    "italienischen",
    "italiaanse",
    "italiana",
    "wloskiego",
    "olasz",
    "italiene",
    "talijanski",
    "talijanskog",
    ...czechSlovak("italsk taliansk", "italstin taliancin"),
  ],
  pt: [
    "portugiesische",
    "portugiesischen",
    "portugese",
    "portuguesa",
    "portugalskiego",
    "portugheza",
    "portugalski",
    "portugalskog",
    "portugalin kiel*",
    "portugal nyelv*",
    ...czechSlovak("portugalsk", "portugalstin portugalcin"),
  ],
  pl: [
    "polnische",
    "polnischen",
    "poolse",
    "polaca",
    "polskiego",
    "poloneza",
    "lengyel",
    "poljski",
    "poljskog",
    "polones",
    "puolan kiel*",
    ...czechSlovak("polsk", "polstin"),
  ],
  cs: [
    "tschechische",
    "tschechischen",
    "tsjechische",
    "checa",
    "czeskiego",
    "cseh",
    "ceski",
    "ceskog",
    ...czechSlovak("cesk", "cestin"),
  ],
  ro: [
    "rumanische",
    "rumanischen",
    "roemeense",
    "rumunskiego",
    "limba romana",
    "limbii romane",
    "rumunjski",
    "rumunjskog",
    ...czechSlovak("rumunsk", "rumunstin rumuncin"),
  ],
  el: [
    "griechische",
    "griechischen",
    "griekse",
    "griega",
    "greckiego",
    "greaca",
    "gorog",
    "kreikan",
    "grcki",
    "grckog",
    ...czechSlovak("reck greck", "rectin grectin"),
  ],
  hu: [
    "ungarische",
    "ungarischen",
    "hongaarse",
    "hungara",
    "wegierskiego",
    "maghiara",
    "unkarin",
    "madarski",
    "madarskog",
    ...czechSlovak("madarsk", "madarstin madarcin"),
  ],
  // ➤ Not «catalana»: «empresa catalana» is a company's, not a language asked.
  ca: [
    "katalanische",
    "katalanischen",
    "catalaanse",
    "katalonskiego",
    "katalonskog",
    ...czechSlovak("katalansk", "katalanstin katalancin"),
  ],
};
// ➤ A language spoken in it, from its genitive above: Polish «po niemiecku» (niemieckiego), Croatian «na njemačkom»
// ➤ (njemačkog).
const spokenForms = (forms: string[]): string[] =>
  forms.flatMap((f) =>
    f.endsWith("kiego")
      ? [`${f.slice(0, -5)}ku`]
      : f.endsWith("kog")
        ? [`${f.slice(0, -1)}m`]
        : [],
  );
// ➤ A level of the European framework (A1 to C2) beside the name: "English C1", «Deutsch (B2)», "a B2 level of English".
const CEFR = /(?<![a-z0-9])[abc][12]\+?(?![a-z0-9])/;
// ➤ "plus" and "bonus" only as softeners: "a plus", «un plus», «ein großes Plus», "Plus:", "an added bonus", "bonus
// ➤ points". Alone, "plus" is also "and" ("English plus a local language") and French «plus de 3 ans»; "bonus" is also
// ➤ pay ("annual bonus", "signing bonus").
const PLUS =
  "(?<![a-z0-9])(?:a|an|un|une|ein|eine|einen|einem|een|ett|big|huge|great|real|vrai|gros|grand|grosses|grosser|groot|grote|stort|added|definite|major|bonus|extra)\\s+plus(?![a-z0-9])|(?<![a-z0-9])plus\\s*[:!)]" +
  "|(?<![a-z0-9])(?:a|an|added|big|huge|real|great|definite|nice|extra|massive)\\s+bonus(?![a-z0-9])|(?<![a-z0-9])bonus\\s+(?:points?|skills?|qualifications?|if|for)(?![a-z0-9])|(?<![a-z0-9])bonus\\s*[:!)]";
const tableList = (...concepts: string[]) => [
  ...new Set(concepts.flatMap((c) => tableWords(c, { folded: true }))),
];
// ➤ Softeners that say "not required" rather than "a plus": only they take back a demand from the next part.
const connectors = (...concepts: string[]) => anyOf(tableList(...concepts));
const NEGATION = new RegExp(`(?:^|\\s)${connectors("no")}(?:\\s|$)`);
// ➤ A demand denied is a softener, as "not required" is.
const DENIED = deniedDemand(
  alternatives(tableList("no")),
  alternatives(tableList("required")),
  "[a-z0-9]",
);
// ➤ A name followed by one of these words is that word's adjective, not the language: "French payroll", "the German
// ➤ market", "an English version of your CV", «unsere deutschen Kunden», «Nederlandse klanten».
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
// ➤ "-speaking" names the language unless a place or a people follows ("German-speaking Switzerland", "Spanish-speaking
// ➤ markets"): "Spanish speaking required", "Private Client Solicitor (French Speaking)".
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
// ➤ What may follow a name for a demand far from it to count (one beyond the few words beside it): a mark, "and", a verb,
// ➤ a word for language or skill, a level. A demand that far could be another sentence's, run on without a full stop.
const AFTER_NAME = new Set(
  `and or und oder sowie bzw et ou y o e ed en of och eller samt og ja tai seka oraz lub albo i a si sau es vagy nebo plus as but aber mais pero ma maar men ale dar
  is are be ist sind est sont son er ar jest sa je este sunt at to in im auf op na au aux al de d del du des della dello di da mit with avec con com med met z ze w v pa als like
  language languages skills skill knowledge proficiency fluency level levels speaker speakers communication communications writing written spoken verbal oral reading comprehension conversation conversational
  sprache sprachen kenntnisse kenntnissen lingua lingue linguistiche linguistica taal talen taalvaardigheid sprak spraket sprog sproget kieli kielen kielitaito langue langues idioma idiomas lengua lenguas
  jazyk jazyka jezyk jezyka jezykiem jezik jezika limba limbii nyelv nyelvtudas nivel niveau niveaux livello poziom poziomie uroven vocabulary grammar test certificate certification exam mother
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
// ➤ Words for a language without naming one ("other languages are a plus", «weitere Fremdsprachen von Vorteil»,
// ➤ "the local language"): a softener beside them speaks for those, not for the language named before.
const LANGUAGE_WORD =
  /(?<![a-z0-9])(?:languages?|sprachen|sprache|sprachkenntnisse|fremdsprachen[a-z]*|fremdsprache|langues?|idiomas?|idiomes|lenguas?|llengues|llengua|lingua|lingue|talen|taal|sprak|spraket|sprog|sproget|kieli|kielet|kielia|jazyky?|jezyki?|jezykow|limbi|limba|nyelv|nyelvek)(?![a-z0-9])/;
// ➤ A level in a sentence about lessons is the course's, not the advert's demand ("Danish lessons up to B2").
// ➤ And the training an employer offers («Ofrecemos formación en inglés hasta nivel B2», DAB-08).
const COURSE =
  /(?<![a-z0-9])(?:formacion|formacio|formation|formazione|schulung|schulungen|course|courses|training|trainings|lessons|classes|kurs|kurse|kursen|sprachkurs|sprachkurse|unterricht|cours|curso|cursos|corso|corsi|clases|lezioni|lessen|cursus|taalcursus|undervisning|kurssi|kurzy|curs|cursuri|tanfolyam)(?![a-z0-9])/;
// ➤ Headings that end a softened list ("Nice to have:" then "What we offer"), besides any line ending in a colon.
export const PLAIN_HEADING = new RegExp(
  `^[^a-z0-9]*(?:${["requirements", "required", "qualifications", "must have", "must haves", "must-haves", "profile", "your profile", "about you", "who you are", "what you bring", "what we expect", "what we offer", "we offer", "benefits", "perks", "about us", "responsibilities", "tasks", "your tasks", "the role", "about the role", "job description", "how to apply", "requisitos", "perfil", "ofrecemos", "funciones", "anforderungen", "profil", "ihr profil", "dein profil", "aufgaben", "wir bieten", "das bieten wir", "votre profil", "profil recherche", "missions", "vos missions", "nous offrons", "avantages", "functie-eisen", "functieeisen", "wij vragen", "jouw profiel", "wij bieden", "taken", "kvalifikationer", "krav", "vi erbjuder", "arbetsuppgifter", "wymagania", "oferujemy", "obowiazki", "requisiti", "offriamo", "competenze", "kvalifikasjoner", "vi tilbyr", "arbeidsoppgaver", "vi tilbyder", "opgaver", "vaatimukset", "tarjoamme", "pozadavky", "nabizime", "cerinte", "oferim", "elvarasok", "kinalunk"].map(escapeRe).join("|")})[^a-z0-9]*$`,
);
// ➤ "Master" that names no degree ("Scrum Master", "master data", a master plan), reverse engineering («ingeniería
// ➤ inversa», «engenharia reversa»), "Czech
// ➤ Republic" (the country, not the language), and the Dutch "WO" only as a level ("WO-niveau"),
// ➤ never the German "wo" (where).
const NOT_A_DEGREE =
  /(?:scrum|quarter|web|head|post|ring|grand|toast)\s*master|master\s*(?:data|plan|file|schedul[a-z]*|class|key|copy|record|mind|piece|card|chef|brewer)|(?:ingenieria|enginyeria|ingegneria|engenharia)\s+(?:inversa|reversa)/g;
// ➤ Spain's old university levels, listed as a level of studies, name no field: «Diplomado, Ingeniero Técnico,
// ➤ Arquitecto Técnico» (the first cycle), «Licenciado, Ingeniero o Arquitecto» (the second).
const LEVEL_NAME =
  "(?:diplomad[oa]|diplomat|diplomatura|licenciad[oa]|licenciatura|llicenciat|llicenciatura|" +
  "ingenier(?:o|a|ia)(?: tecnic[oa])?|enginyer(?:a|ia)?(?: tecnica?)?|arquitect(?:o|a|e|ura)(?: tecnic[oa]?)?)";
const LEVEL_OF_STUDIES = new RegExp(
  `(?<![a-z])${LEVEL_NAME}(?:[ ,/]+(?:(?:o|i|y|u|or)[ ,/]+)?${LEVEL_NAME}){2,}(?![a-z])`,
  "g",
);
const cleaned = (f: string): string =>
  f
    .replace(NOT_A_DEGREE, " ")
    .replace(LEVEL_OF_STUDIES, " ")
    .replace(/czech\s+republic/g, "czechia");
// ➤ Words that name a place of study rather than a degree ("near the university", "Studium",
// ➤ "formación"): they count only in a sentence that demands something, or holds one («Du har en uddannelse som…»), or
// ➤ allows an equivalent («Formación en mecánica o equivalente»).
// ➤ Also the trades' own training (German "Ausbildung", Danish «uddannelse») and the Swedish «examen», which is also an
// ➤ exam in French and Spanish (1 November 2026). A «Lehre» alone is the apprenticeship on offer («Elektriker
// ➤ Lehre»), unless finished.
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
  "formacao",
  "lehre",
  "berufslehre",
];

export type Catalogues = {
  degrees: { words: string; degrees: { id: string; stems: string }[] };
  languages: { languages: { code: string; names: string[] }[] };
};
export type Screens = ReturnType<typeof compileScreens>;
type Mention = { code: string; at: number; end: number; strict: boolean };

// ➤ Languages written as their codes, in capitals, after a languages label or a word for speaking two or three («Langues :
// ➤ FR, NL, EN», «Vous êtes bilingue FR/NL», «Idiomas: ES/CA») are those languages.
const CODES_OPENERS =
  "bilingue bilingual tweetalig drietalig zweisprachig trilingue langue langues talen language languages sprachen idiomas idiomes"
    .split(" ")
    .flatMap((w) => [w, w[0].toUpperCase() + w.slice(1)]);
const CODES_OPENER = `(?<![\\p{L}])(?:${CODES_OPENERS.join("|")})\\s*:?\\s*`;
const CODES_JOIN = "\\s*(?:[/,-]|et|en|and|und|y|i|e)\\s*";
const namedCodes = (text: string, s: Screens): string =>
  text.replace(
    s.codesListed,
    (_, opener: string, codes: string) =>
      opener + codes.replace(/[A-Z]+/g, (c) => s.nameOfCode.get(c) ?? c),
  );

export function compileScreens({ degrees, languages }: Catalogues) {
  const all = String(degrees.words).split("|");
  const strong = all.filter((w) => !WEAK.includes(w) && w !== "wo");
  // ➤ «preferably» softens a language, but for a degree it picks the field of one still asked («mbo, bij voorkeur in
  // ➤ werktuigbouwkunde»).
  const degreeSoftened = tableList("wish");
  const softened = tableList("wish", "preferably");
  const known = languages.languages.map((l) => {
    const forms = FORMS[l.code] || [];
    return {
      code: l.code,
      names: [...l.names, ...forms, ...spokenForms(forms)],
    };
  });
  const code = `(?:${known.map((l) => l.code.toUpperCase()).join("|")})`;
  return {
    codesListed: new RegExp(
      `(${CODES_OPENER})(${code}(?:${CODES_JOIN}${code})+)(?![\\p{L}])`,
      "gu",
    ),
    nameOfCode: new Map(known.map((l) => [l.code.toUpperCase(), l.names[0]])),
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
      `(?<![a-z0-9])(?:${alternatives(known.flatMap((l) => l.names).filter((n) => !AMBIGUOUS.has(foldLetters(n))))})`,
    ),
    nameWords: new Set(known.flatMap((l) => l.names.map(foldLetters))),
    required: words(tableList("required", "fluent")),
    // ➤ A word that demands whatever it speaks of; a fluency is a level, which a softener beside it can take back.
    insisted: words(tableList("required")),
    demanded: words(tableList("required", "fluent", "completed", "equivalent")),
    // ➤ Words that demand a language only beside its name, in the same part of the sentence: a level ("gute", «bon
    // ➤ niveau»), how it is used ("written and spoken"), or speaking it. Elsewhere they speak of something else.
    level: words(tableList("languageLevel", "fluent")),
    degreeSoftened: new RegExp(
      `${words(degreeSoftened).source}|${PLUS}|${DENIED}`,
    ),
    softened: new RegExp(`${words(softened).source}|${PLUS}|${DENIED}`),
    softeners: new RegExp(
      `${DENIED}|(?<![a-z0-9])(?:${alternatives(softened)})(?![a-z0-9])|${PLUS}`,
      "g",
    ),
    negation: new RegExp(
      `${words(softened.filter((w) => NEGATION.test(foldLetters(w)))).source}|${DENIED}`,
    ),
  };
}

// ➤ The parts of a text a demand or a softener speaks for: its sentences, and within one, the
// ➤ parts a semicolon keeps apart ("Fluent German is required; English is a plus").
const clauses = (text: string): string[] =>
  sentences(text)
    .flatMap((s) => s.split(/\s*;\s*/))
    .map((c) => cleaned(foldLetters(c)))
    .filter(Boolean);

// ➤ Degree families an advert demands: a part with a degree word and a family stem, not
// ➤ softened. Several families in one part ("mechanical or electrical engineering") are all
// ➤ listed: the visitor needs one of them.
// ➤ A part longer than a requirement (a page's text with no full stops) is read only around its degree word: the field a
// ➤ degree names follows it closely ("Abgeschlossene Ausbildung zum Elektroniker", "Bac+5 en informatique"), and the
// ➤ rest of such a part is the employer's trade or the job's tasks («Métier de l'employeur : systèmes mécaniques»).
const LONG_PART = 300;
const nearDegree = (f: string, word: RegExp): string => {
  if (f.length <= LONG_PART) return f;
  const m = f.match(word);
  return m
    ? f.slice(Math.max(0, (m.index ?? 0) - 60), (m.index ?? 0) + 160)
    : "";
};
// ➤ A clause up to the first item with a softener, which speaks for the items after it too («Deseable licenciatura (Ciencias
// ➤ Químicas, Ingeniería Química)»), and for the item before it when it stands alone («Ingeniería Mecánica, deseable»).
// ➤ What comes before it is still asked ("Master's degree in Electrical Engineering, PhD preferred", «Grado en cualquier
// ➤ ingeniería, muy valorable Máster»).
function firmItems(f: string, s: Screens): string {
  const items = f.split(ITEM_EDGE);
  const first = items.findIndex((item) => s.degreeSoftened.test(item));
  if (first < 0) return f;
  const rest = items[first]
    .replace(s.softeners, " ")
    .replace(/[^a-z0-9\s]/g, " ");
  return items
    .slice(0, wordsOf(rest).every((w) => FILLER.has(w)) ? first - 1 : first)
    .join(", ");
}
// ➤ «Studium der Informatik», «Studium in Robotik oder Maschinenbau»: a study named with its field is a degree asked, with
// ➤ no demand word; a dual study is the job itself, an apprenticeship.
const STUDY_OF = /(?<![a-z])(?<!dual[a-z]* )studium (?:der|des|in|im)(?![a-z])/;
export function requiredDegrees(text: string, s: Screens): string[] {
  const out = new Set<string>();
  for (const f of clauses(text).map((c) => firmItems(c, s))) {
    const strong = s.degreeWord.test(f);
    const named =
      strong ||
      (s.weakDegreeWord.test(f) && (s.demanded.test(f) || STUDY_OF.test(f)));
    if (!named) continue;
    const part = nearDegree(f, strong ? s.degreeWord : s.weakDegreeWord);
    for (const d of s.degrees) if (d.re.test(part)) out.add(d.id);
  }
  // ➤ The generic "an engineering degree" says nothing more when a field was named.
  if (out.size > 1) out.delete(ANY_ENGINEERING);
  return [...out];
}

const wordsOf = (t: string): string[] => t.split(/\s+/).filter(Boolean);
const lastWords = (t: string, n: number): string =>
  wordsOf(t).slice(-n).join(" ");
const firstWords = (t: string, n: number): string =>
  wordsOf(t).slice(0, n).join(" ");

// ➤ Each place a language is named in a part, unless the name is another word's adjective. `strict`: what follows it is
// ➤ a mark or a word that goes with a language, so a demand far from it can count.
// ➤ A name after a word for the company is its nationality: «Multinacional francesa con alto nivel…» asks no French (DAB-02).
const COMPANY_BEFORE = new Set(
  "multinacional multinational multinationale multinazionale empresa empreses compania companyia company firma firm grupo grup group groupe entreprise societe unternehmen konzern bedrijf azienda societa".split(
    " ",
  ),
);
const wordBefore = (f: string, at: number): string =>
  f.slice(0, at).match(/([a-z0-9]+)\s*$/)?.[1] ?? "";
function mentions(f: string, s: Screens): Mention[] {
  if (!s.anyName.test(f)) return [];
  const found: Mention[] = [];
  for (const l of s.languages) {
    for (const m of f.matchAll(l.re)) {
      const at = m.index,
        end = at + m[0].length,
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
      if (COMPANY_BEFORE.has(wordBefore(f, at))) continue;
      const strict =
        mark ||
        AFTER_NAME.has(next) ||
        CEFR.test(next) ||
        s.nameWords.has(next) ||
        (SPEAKING.has(next) && (!then || AFTER_NAME.has(then)));
      found.push({ code: l.code, at, end, strict });
    }
  }
  return found.sort((a, b) => a.at - b.at);
}

// ➤ Names joined by "and", a comma or a slash ("good German, English and French", «zowel Nederlands als Engels») share
// ➤ what stands before the first and after the last. Joined by "or" («Englisch oder Deutsch», «Nederlands of Engels»),
// ➤ or listed as "one of the following", they are a choice: the advert asks for one of them, which a list of required
// ➤ languages cannot say, so none of them is read. A name joined to the choice by "and" is asked all the same ("Dutch
// ➤ and/or French and English is required").
// ➤ Every language's "and" and "or" join them (Finnish «englanti ja ranska tai saksa»), and so do articles.
const JOINED = new RegExp(
  `^(?:[\\s,/&+()'-]|${connectors("and", "or")}|als|a|the|der|die|das|des|la|le|l|el|del|de|della|dell|het|van)*$`,
);
const OR = new RegExp(`(?<![a-z0-9])${connectors("or")}(?![a-z0-9])`);
const CHOICE =
  /(?<![a-z0-9])(?:one or more|at least one|any of|either|one of the following|one additional|einer der folgenden|eine der folgenden|une des langues|uno de los siguientes|una de las siguientes)(?![a-z0-9])/;
const runsOf = (f: string, named: Mention[]): Mention[][] =>
  named.reduce<Mention[][]>((runs, m) => {
    const run = runs.at(-1);
    if (run && JOINED.test(f.slice(run[run.length - 1].end, m.at))) run.push(m);
    else runs.push([m]);
    return runs;
  }, []);
// ➤ An "or" before a list's last name makes a choice of the whole list ("English, Portuguese, and/or Spanish").
const LISTED = /^\s*[,/]\s*$/;
function choiceOf(f: string, run: Mention[]): Set<Mention> {
  if (run.length > 1 && CHOICE.test(f)) return new Set(run);
  const gap = (i: number) => f.slice(run[i].end, run[i + 1].at);
  const either = new Set<Mention>();
  for (let i = 0; i < run.length - 1; i++) {
    if (!OR.test(gap(i))) continue;
    let j = i;
    while (j > 0 && LISTED.test(gap(j - 1))) j--;
    run.slice(j, i + 2).forEach((m) => either.add(m));
  }
  return either;
}

// ➤ The stretch of a part around a name up to the commas on either side, leaving those inside brackets («Deutsch
// ➤ (C1-C2, verhandlungssicher)»).
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

// ➤ The names of a run a demand speaks for: all of them when a demand or a level stands within a few words of the run;
// ➤ only those a mark or a language word follows when the demand is further away in its part (near the run, in a long
// ➤ part with no full stops).
const LONG = 40;
// ➤ A level written as the next item of the list («Idiomas: Catalán, nivel C1», «inglés y portugués, B1»).
// ➤ A line labelled with the word for language lists the advert's demands, as a form's field does («Taal: Nederlands»,
// ➤ «Langues : anglais», "Languages: English").
const LANGUAGE_LABEL = new RegExp(
  `^[^a-z0-9]*(?:${LANGUAGE_WORD.source})\\s*:\\s*$`,
);
const LEVEL_ITEM = new RegExp(
  `^,\\s*(?:${connectors("levelWord")}\\s*:?\\s*)?[abc][12]\\+?(?![a-z0-9])`,
);
function demandedOf(f: string, run: Mention[], s: Screens): Mention[] {
  const first = run[0],
    last = run[run.length - 1];
  if (LANGUAGE_LABEL.test(f.slice(0, first.at))) return run;
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
  // ➤ A level beside a course is the course's («clases de inglés B1»), not the job's.
  const aLevel =
    near.some((t) => s.level.test(t) || CEFR.test(t)) ||
    run.some((m) => KNOWN_NAME.test(f.slice(m.at, m.end))) ||
    LEVEL_ITEM.test(f.slice(stretch(f, last.at, last.end)[1]));
  if (aLevel && !near.some((t) => COURSE.test(t))) return run;
  const wide =
    wordsOf(f).length <= LONG
      ? f
      : `${lastWords(f.slice(0, first.at), 12)} ${f.slice(first.at, last.end)} ${firstWords(f.slice(last.end), 12)}`;
  return s.required.test(wide) ? run.filter((m) => m.strict) : [];
}

// ➤ A sentence's items: the stretches between commas, brackets, dashes and "but". A softener speaks for the names of its
// ➤ own item, save one its own "and"-part demands outright or gives a level («dominio del español y deseable fluidez en
// ➤ inglés», «Gute Deutschkenntnisse und Englisch von Vorteil», but not "Bilingual in French and English preferred"), and for the item before it when it is an item of its own ("English
// ➤ (preferred)", «Deutsch, von Vorteil»).
const ITEM_EDGE = new RegExp(
  `[,;()[\\]]|\\s[-–—]\\s|\\s${connectors("but")}\\s`,
  "g",
);
// ➤ Not a connector that only a softener follows to the item's end: Nordic «en» is an article there («Fransk er en
// ➤ fordel»), not Dutch «en».
const AND = new RegExp(
  `\\s${connectors("and", "or")}\\s(?!(?:${alternatives(tableList("wish"))})[^a-z0-9]*$)`,
  "g",
);
const BOTH =
  /(?<![a-z0-9])(?:bi-?lingual|bilingue|zweisprachig|tweetalig|tvasprakig)(?![a-z0-9])/g;
const FILLER = new Set(
  "is are would be will also considered considerata considerato considerada considerado consideree considere very highly strongly much an a the big great it this ist sind ware waren sehr ein eine est sont serait un une es son seria sera muy una e sarebbe molto zijn zou een ar vore ett er vil vaere et jest je este um uma".split(
    " ",
  ),
);
// ➤ In an item as long as a page with no full stops runs on, a softener speaks only for the names a few words from it
// ➤ («Du verfügst über gute Deutsch und Englisch Kenntnisse Du bist genau so herzlich und gerne Gastgeber»).
const RUN_ON_ITEM = 25,
  SOFTENER_REACH = 6;
const SKILLS_NOUN =
  /^\s*(?:language\s+)?(?:skills?|knowledge|proficiency|kenntnissen?|kennis|vaardigheden|connaissances|conocimientos|competenze|conoscenze)(?![a-z0-9])/;
// ➤ The "and"-part of an item, from `from` to `to`, that holds the place `at`; not split at a hyphen's «-und».
// ➤ «B2 ou plus», "C1 or higher": a level's floor, not a second part.
const OR_ABOVE =
  /^(?:plus|higher|above|superior|superieur|hoher|hoger|superiore)(?![a-z])/;
function andPart(
  f: string,
  from: number,
  to: number,
  at: number,
): [number, number] {
  let a = from,
    b = to;
  for (const c of f.slice(from, to).matchAll(AND)) {
    const p = from + c.index;
    if (f[p - 1] === "-" || OR_ABOVE.test(f.slice(p + c[0].length))) continue;
    if (p < at) a = p + c[0].length;
    else {
      b = p;
      break;
    }
  }
  return [a, b];
}
function softened(
  f: string,
  m: Mention,
  named: Mention[],
  s: Screens,
): boolean {
  const edges = [...f.matchAll(ITEM_EDGE)].map((e) => [
    e.index,
    e.index + e[0].length,
  ]);
  const itemOf = (p: number): number => edges.filter(([a]) => a < p).length;
  const start = (k: number): number => (k ? edges[k - 1][1] : 0),
    stop = (k: number): number => (k < edges.length ? edges[k][0] : f.length);
  const own = itemOf(m.at);
  return [...f.matchAll(s.softeners)].some((x) => {
    const at = x.index,
      k = itemOf(at);
    // ➤ A softener heading inside the part ("Nice to have: German", "Plus: Dutch") speaks for all that follows it.
    if (
      (/:\s*$/.test(x[0]) || /^\s*:/.test(f.slice(at + x[0].length))) &&
      at < m.at
    )
      return true;
    if (k === own) {
      const between = wordsOf(
        f.slice(Math.min(at, m.at), Math.max(at, m.at)),
      ).length;
      if (
        wordsOf(f.slice(start(k), stop(k))).length > RUN_ON_ITEM &&
        between > SOFTENER_REACH
      )
        return false;
      const [a, b] = andPart(f, start(k), stop(k), m.at);
      // ➤ Reaching into the name's part is enough: a folded «è»/«é» is also "and" («Non è richiesta la conoscenza»).
      if (at < b && at + x[0].length > a) return true;
      const part = f.slice(a, b).replace(BOTH, " ");
      if (s.insisted.test(part)) return false;
      // ➤ A level demands too when the softener's own part says more than the softener («Gute Deutschkenntnisse und
      // ➤ Englisch von Vorteil», «Sie arbeiten gern selbständig und verfügen über gute Deutschkenntnisse»), not when that
      // ➤ part is only the softener («Inglese fluente è un plus»), nor when the two names share the level's noun ("Good
      // ➤ German and English skills are an advantage").
      const [c, d] = andPart(f, start(k), stop(k), at);
      const others = named.filter((n) => n.at >= c && n.at < d);
      const onlySoftener = wordsOf(
        f
          .slice(c, d)
          .replace(s.softeners, " ")
          .replace(/[^a-z0-9\s]/g, " "),
      ).every((w) => FILLER.has(w));
      const shared =
        !f.slice(m.end, b).trim() &&
        others.some((n) => SKILLS_NOUN.test(f.slice(n.end)));
      return !(
        (s.level.test(part) || CEFR.test(part)) &&
        (others.length || !onlySoftener) &&
        !shared
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

// ➤ A line that heads the lines under it. A softened one ("Nice to have", "Preferred qualifications", «Von Vorteil:»,
// ➤ "Added bonus") softens them until the next heading: a line ending in a colon, or a known one ("What we offer", «Ihr
// ➤ Profil»). A short item with a softener ("Master degree preferred", «SAP-Kenntnisse von Vorteil») heads nothing.
const HEADING_WORDS = new Set([
  ...FILLER,
  ..."qualifications qualification skills skill experience experiences requirements requirement profile points extras extra but not required if you we have to for und oder du sie hast haben mitbringst bringst mit folgendes wenn kenntnisse qualifikationen de la le les el los y se si tienes det om har aven heeft je hebt ook requisitos requisito requisits conocimientos coneixements idiomas idiomes".split(
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

// ➤ Languages an advert requires: a language named in a part that demands it ("Fluent German is required", «Imprescindible
// ➤ inglés»), or with a level beside its name ("gute Englischkenntnisse", "strong command of English", «Deutsch (B2)»).
// ➤ Not when a softener speaks for it ("German is a plus", a "Nice to have" heading over it), when the next part takes the
// ➤ demand back ("Actually not required"), when it is one of a choice («Englisch oder Deutsch»), or when the name is
// ➤ another word's adjective ("French payroll").
export function requiredLanguages(text: string, s: Screens): string[] {
  const out = new Set<string>();
  const all = clauses(namedCodes(text, s));
  let underSoftHeading = false;
  all.forEach((f, i) => {
    const named = mentions(f, s);
    if (!named.length) {
      const kind = headingKind(f, s);
      if (kind) underSoftHeading = kind === "soft";
      return;
    }
    // ➤ Under a softened heading a line counts only when it insists ("Fluent English is required for this role").
    if (underSoftHeading && !s.insisted.test(f)) return;
    const next = all[i + 1] || "";
    const nextNamed = s.negation.test(next) ? mentions(next, s) : null;
    for (const run of runsOf(f, named)) {
      const choice = choiceOf(f, run);
      for (const m of demandedOf(f, run, s)) {
        if (choice.has(m) || softened(f, m, named, s)) continue;
        // ➤ The next part takes a demand back when it says "not required" of the same language, or briefly of none.
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
