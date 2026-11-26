// The legacy's test/screens.test.mjs (JustJans/indudex@ec79858), carried whole (legacy resync T002-T003): its imports pointed at
// this repo.
// ➤ The two facts the builder reads for the visitor's screens: the degree an advert
// ➤ demands and the language it requires, in the languages adverts come in.
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { harness } from "./harness.mjs";
import {
  compileScreens,
  requiredDegrees,
  requiredLanguages,
} from "../../src/features/advert-facts/screens.ts";

const { eq, done } = harness("screens");
const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const s = compileScreens({
  degrees: JSON.parse(
    readFileSync(join(ROOT, "catalogues", "degrees.json"), "utf-8"),
  ),
  languages: JSON.parse(
    readFileSync(join(ROOT, "catalogues", "languages.json"), "utf-8"),
  ),
});

eq(
  requiredDegrees("Bachelor or Master in Mechanical Engineering required.", s),
  ["mechanical"],
  "an English degree demand",
);
eq(
  requiredDegrees("Titulación: Ingeniería Industrial o Mecánica.", s).sort(),
  ["industrial", "mechanical"],
  "two Spanish fields in one sentence: either will do",
);
eq(
  requiredDegrees(
    "Abgeschlossenes Studium im Bereich Elektrotechnik.",
    s,
  ).includes("electrical"),
  true,
  "a German Studium",
);
eq(
  requiredDegrees("Afgeronde HBO opleiding werktuigbouwkunde.", s),
  ["mechanical"],
  "a Dutch HBO",
);
eq(
  requiredDegrees("Civilingenjör inom kemiteknik.", s),
  ["chemical"],
  "a Swedish civilingenjör",
);
eq(
  requiredDegrees("An engineering degree is required.", s),
  ["engineering-any"],
  "a degree with no field named is the generic one",
);
eq(
  requiredDegrees("Engineering degree, preferably in naval architecture.", s),
  ["naval"],
  "the generic word steps back when a field is named",
);
eq(
  requiredDegrees("A degree in physics would be a plus.", s),
  [],
  "a softened mention is not a demand",
);
eq(
  requiredDegrees(
    "We are a mechanical engineering company with 20 years of history.",
    s,
  ),
  [],
  "no degree word, no demand",
);

eq(
  requiredLanguages("Fluent German is required for this role.", s),
  ["de"],
  "an English demand of German",
);
eq(
  requiredLanguages("Imprescindible nivel alto de inglés.", s),
  ["en"],
  "a Spanish demand of English",
);
eq(
  requiredLanguages("Sehr gute Deutschkenntnisse erforderlich.", s),
  ["de"],
  "a German demand of German",
);
eq(
  requiredLanguages("Je spreekt vloeiend Nederlands.", s),
  ["nl"],
  "a Dutch demand of Dutch",
);
eq(
  requiredLanguages("Du behärskar svenska flytande i tal och skrift.", s),
  ["sv"],
  "a Swedish demand of Swedish",
);
eq(
  requiredLanguages("Flytende norsk kreves.", s),
  ["no"],
  "a Norwegian demand of Norwegian",
);
eq(
  requiredLanguages("French is a plus. English required.", s),
  ["en"],
  "a plus is not a demand; a demand is",
);
eq(
  requiredLanguages(
    "German required. Actually not required for this position.",
    s,
  ),
  [],
  "the next sentence can take it back",
);
eq(
  requiredLanguages("Our office is in Germany, near the German border.", s),
  [],
  "a country is not a language demand",
);
eq(
  requiredLanguages(
    "Excellent communication skills in English and Spanish are essential.",
    s,
  ).sort(),
  ["en", "es"],
  "two languages in one demand",
);

// ➤ Words that only look like a language, and demands a softener in another part does not undo.
eq(
  requiredLanguages("Fluent Spanish is required, con fines comerciales.", s),
  ["es"],
  '"fines" (purposes) is not Finnish',
);
eq(
  [
    "Must know heat exchanger fins.",
    "Must manage VMware resource pools.",
    "Polished communication skills are essential.",
    "Must hold a work permit for the Czech Republic.",
    "Must be willing to relocate to Germany.",
    "Imprescindible residir en la región Romana.",
  ].map((t) => requiredLanguages(t, s)),
  [[], [], [], [], [], []],
  "fins, pools, polished, a country and a region are no language demand",
);
eq(
  [
    requiredLanguages("Sehr gute Deutschkenntnisse erforderlich.", s),
    requiredLanguages("Nederlandstalig is vereist.", s),
  ],
  [["de"], ["nl"]],
  "a name with its tail still counts",
);
eq(
  requiredLanguages("Fluent German is required; English is a plus.", s),
  ["de"],
  "a softener in another part of the sentence does not undo a demand",
);
eq(
  [
    "Scrum Master for our software teams.",
    "Our office is near the university, with free energy drinks.",
    "Master data management in SAP is required.",
    "Wo Technik auf Zukunft trifft.",
  ].map((t) => requiredDegrees(t, s)),
  [[], [], [], []],
  'a scrum master, a university nearby, master data and the German "wo" demand no degree',
);
eq(
  [
    requiredDegrees("Abgeschlossenes Studium der Elektrotechnik.", s),
    requiredDegrees(
      "Een afgeronde opleiding op WO-niveau in werktuigbouwkunde.",
      s,
    ),
    requiredDegrees(
      "A master's degree in mechanical engineering is required; a PhD is a plus.",
      s,
    ),
  ],
  [["electrical"], ["mechanical"], ["mechanical"]],
  "a completed Studium, WO level and a demand before a softener still count",
);

// ➤ The degrees found missing on 1 November 2026: French levels and vocational diplomas, German and Dutch trades training,
// ➤ Italian, Polish, Czech and Romanian words, a softener in other languages, and a long run-on text read near its degree word.
eq(
  [
    requiredDegrees(
      "Bac+5 en informatique, intelligence artificielle, Data Science, mathématiques appliquées ou domaine équivalent.",
      s,
    ).sort(),
    requiredDegrees(
      "Titulaire d'un CAP, BEP ou Bac Pro en électricité ou équivalent",
      s,
    ),
    requiredDegrees(
      "Abgeschlossene Ausbildung zum Elektroniker für Betriebstechnik",
      s,
    ).sort(),
    requiredDegrees(
      "Je hebt een mbo-opleiding, bij voorkeur in werktuigbouwkunde of autotechniek.",
      s,
    ),
    requiredDegrees("Laurea in Ingegneria Meccanica o equivalente", s),
    requiredDegrees(
      "Wykształcenie wyższe techniczne (automatyka, elektrotechnika)",
      s,
    ).sort(),
    requiredDegrees(
      "Máte elektro vzdělání a chcete se podívat do různých koutů?",
      s,
    ),
  ],
  [
    ["computer-science", "physics-maths"],
    ["electrical"],
    ["electrical", "electronics-telecom"],
    ["mechanical"],
    ["mechanical"],
    ["automation-mechatronics", "electrical"],
    ["electrical"],
  ],
  "French, German, Dutch, Italian, Polish and Czech degrees and training",
);
eq(
  [
    requiredDegrees(
      "Erfahrung im Maschinenbau, gerne eine abgeschlossene Berufsausbildung im Metallbereich – kein muss!",
      s,
    ),
    requiredDegrees(
      "Studii superioare finalizate (domeniul economic prezinta un avantaj);",
      s,
    ),
  ],
  [[], []],
  "a degree that is no must, or an advantage, is not demanded",
);
eq(
  requiredDegrees(
    "Métier de l'employeur : industriel en systèmes mécaniques et électroniques pour les industries lourdes, 30 personnes, marchés en France et à l'international, avec une équipe soudée et des projets variés dans le monde entier depuis plus de vingt ans et une croissance continue. Formation Bac+5 en informatique.",
    s,
  ),
  ["computer-science"],
  "in a long run-on text, the field beside the degree word, not the employer's trade",
);

// ➤ German trades and fields written as one word, and «Absolvent» as a degree (the readers' faults, 1 November 2026).
eq(
  [
    requiredDegrees(
      "Abgeschlossene Berufsausbildung zum Industriemechaniker/Zerspanungsmechaniker oder vergleichbare Qualifikation.",
      s,
    ),
    requiredDegrees(
      "Abgeschlossene Ausbildung im Metallbau mit technischem Verständnis.",
      s,
    ),
    requiredDegrees(
      "Erfolgreich abgeschlossene technische Berufsausbildung in den Bereichen Elektrotechnik/ Automatisierungstechnik.",
      s,
    ).sort(),
    requiredDegrees(
      "Gesucht werden Absolventen des Bauingenieurwesens mit verhandlungssicherem Deutsch.",
      s,
    ),
  ],
  [
    ["mechanical"],
    ["mechanical"],
    ["automation-mechatronics", "electrical"],
    ["civil"],
  ],
  "a trade or a field written as a compound names its family, and a graduate sought demands a degree",
);

// ➤ «auf sehr gutem Deutsch», «fortgeschrittene Englischkenntnisse», «sicher in Wort und Schrift» demand a language; «sicher im
// ➤ Umgang mit der Kasse» and «stellst sicher, dass» say nothing of one (the readers' faults, 7 November 2026).
eq(
  [
    "auf sehr gutem Deutsch",
    "Das bringst du mit … fortgeschrittene Deutsch- und Englischkenntnisse",
    "Die deutsche Sprache sicher in Wort und Schrift beherrschst",
    "Sie sind sicher im Umgang mit Kasse und Scanner. Deutschkenntnisse von Vorteil.",
  ].map((t) => requiredLanguages(t, s).sort().join(",")),
  ["de", "de,en", "de", ""],
  "a German level in its inflected and advanced forms, and «sicher» only before «in» or «auf»",
);

// ➤ The languages found missing on 1 November 2026: a level beside the name, other endings and forms, a level of the
// ➤ European framework, a softener that speaks for its own language only, softened headings, a choice, an adjective.
const langs = (t) => requiredLanguages(t, s).sort().join(",");
eq(
  [
    "Verhandlungssicheres bis muttersprachliches Deutsch sowie gute Englischkenntnisse.",
    "Strong command of English",
    "Hai un'ottima padronanza dell'italiano e dell'inglese (livello C1)",
    "Langues: français natif.",
    "You speak both Spanish and English.",
    "Deutschkenntnisse mindestens auf B1-Niveau",
    "Znajomość języka angielskiego na poziomie B2",
    "Gute Kenntnisse der deutschen Sprache",
    "Goda kunskaper i svenska och engelska",
    "<ul><li>Fluent Dutch</li><li>English is a plus</li></ul>",
  ].map(langs),
  ["de,en", "en", "en,it", "fr", "en,es", "de", "en", "de", "en,sv", "nl"],
  "a level, a form or a CEFR level beside the name is a demand",
);
eq(
  [
    "You are fluent in English (German is a plus).",
    "Sehr gute Deutschkenntnisse in Wort und Schrift, weitere Fremdsprachen von Vorteil",
    "Fließend Deutsch und Englisch von Vorteil",
    "Dominio del español y deseable fluidez en inglés.",
    "Je hebt een goede kennis van Nederlands en Frans, Engels is een plus",
    "Excellent English (written and spoken) plus fluency in local language",
    "Fluent German required, English (preferred)",
  ].map(langs),
  ["en", "de", "de", "es", "fr,nl", "en", "de"],
  "a softener speaks for its own language, not for the one demanded before it",
);
eq(
  [
    "Sehr gute Deutsch- und Englischkenntnisse sind von Vorteil",
    "Good German and English skills are an advantage",
    "Bilingual in French and English preferred",
    "High proficiency (written, verbal and reading) in English and Mandarin (preferred)",
    "Fluent English\nNice to have:\nFluent German",
    "Fluent English\nPreferred qualifications\nGerman, fluent",
    "Proficiency in English\nAdditional languages are a plus",
    "Annual bonus\nFluent German",
    "Master degree preferred\nFluent German",
  ].map(langs),
  ["", "", "", "", "en", "en", "en", "de", "de"],
  "softened together, under a softened heading, and not under pay or a softened item",
);
eq(
  [
    "Good English or German skills are required.",
    "Fluency in one or more of the following languages: English, German, French",
    "4-6+ years of experience processing French payroll, with a strong understanding of French social security.",
    "Please provide a copy of your CV in English.",
    "Language training: Danish lessons up to B2 level.",
    "Make smart tradeoffs between speed and polish",
    "German required. Actually not required for this position.",
    "Fluent English. Korean proficiency would be an advantage, but is not required.",
  ].map(langs),
  ["", "", "", "", "", "", "", "en"],
  "a choice, an adjective, a course and a take-back demand no language",
);
// ➤ The French feminine forms: «la langue anglaise», «la langue française»; a «clé anglaise» (a wrench) names no language.
eq(
  [
    "Bonne maîtrise de la langue anglaise",
    "Maîtrise de la langue française",
    "Munissez-vous d'une clé anglaise",
  ].map((t) => requiredLanguages(t, s)),
  [["en"], ["fr"], []],
  "a language named by its French feminine form, and a wrench that is none",
);
eq(
  [
    "Coneixement de català (nivell C).",
    "Imprescindible catalán y castellano.",
    "Català parlat i escrit.",
    "Empresa catalana del sector.",
    "Es valorarà el català.",
    "Es valorarà: Català: Nivell C1.",
    "Fluency in Spanish is required, with Catalan as a strong plus.",
  ].map((t) => requiredLanguages(t, s)),
  [["ca"], ["ca", "es"], ["ca"], [], [], [], ["es"]],
  "Catalan asked, in Catalan or Spanish; a Catalan company or a plus asks none (decision 16)",
);
done();
