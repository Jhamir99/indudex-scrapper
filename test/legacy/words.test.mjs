// The legacy's test/words.test.mjs (JustJans/indudex@ec79858), carried whole (legacy resync T002-T003): its imports pointed at
// this repo.
// ➤ The words' tables (builder/words): one per language, read by every reader, and what reaches the readers through them.
import { harness } from "./harness.mjs";
import { TABLES, numbers, words } from "../../src/shared/words/index.ts";
import { yearsAsked } from "../../src/features/advert-facts/years.ts";
import {
  contractKind,
  contractOf,
  workingTime,
} from "../../src/features/advert-facts/contract.ts";
import { modeInSentences } from "../../src/features/advert-facts/work-mode.ts";
import { writtenFacts } from "../../src/features/advert-facts/labels.ts";
import { periodOf } from "../../src/features/pay/pay.ts";

const { eq, done } = harness("words");
const CONCEPTS = [
  "year",
  "month",
  "week",
  "day",
  "hour",
  "numbers",
  "atLeast",
  "moreThan",
  "lessThan",
  "experience",
];
// ➤ The concepts each reader asks for, beside the units and numbers every reader shares.
const BY_READER = {
  // ➤ The degrees and languages an advert demands, and the words that soften them (builder/screens.ts).
  screens: [
    "required",
    "fluent",
    "completed",
    "wish",
    "preferably",
    "languageLevel",
    "but",
    "levelWord",
  ],
  // ➤ How a sentence holds a fact (builder/stance.ts).
  stance: [
    "or",
    "and",
    "both",
    "no",
    "possible",
    "chance",
    "can",
    "towardKind",
  ],
  pay: [
    "gross",
    "net",
    "bonus",
    "payLabel",
    "payLabelBefore",
    "payLabelAfter",
    "labelToFigure",
    "minimumWage",
    "accordingTo",
    "collectiveAgreement",
    "payWord",
    "perYear",
    "perMonth",
    "perHour",
    "hourlyPay",
    "perDay",
    "perWeek",
    "trainingYear",
    "upTo",
    "maximum",
    "until",
    "upToFigure",
    "millions",
    "statistic",
    "notPay",
    "besides",
    "includes",
    "benefit",
    "price",
    "businessFigure",
    "projectMoney",
    "joiningBonus",
    "titleBonus",
    "sumOf",
    "bonusOf",
    "fromAmount",
    "payNote",
    "thousand",
    "employmentContract",
  ],
  contract: [
    "contract",
    "temporary",
    "permanent",
    "mayBecome",
    "later",
    "prospectOf",
    "permanentInProspect",
    "temporaryThenPermanent",
    "after",
    "probation",
    "agencyThenPermanent",
    "permanentWithAgency",
    "training",
    "agencyWork",
    "freelance",
    "or",
  ],
  workingTime: [
    "fullTime",
    "partTime",
    "jobInCompound",
    "between",
    "rangeJoin",
    "per",
    "weekly",
    "daily",
    "figureJoin",
  ],
  labels: [
    "contractLabel",
    "durationLabel",
    "hoursLabel",
    "experienceLabel",
    "deadlineLabel",
    "postedLabel",
    "postedPhrase",
    "monthNumbers",
    "hedge",
    "chance",
    "laterStep",
    "notOnly",
    "extension",
    "youWork",
    "mostly",
    "friendly",
    "hireInProspect",
    "notThisJob",
    "fullTimeBasis",
    "can",
    "looseKind",
    "titleKind",
    "notTitleKind",
    "ofAJob",
    "ofTheJob",
    "startSoon",
    "careerProspects",
    "hoursAWeek",
    "hoursAWeekLabel",
    "workingWeek",
  ],
  workMode: [
    "yes",
    "remoteAdjective",
    "and",
    "atHomeInCapitals",
    "hybridWork",
    "weekday",
    "job",
    "remote",
    "atHome",
    "homeBeforeDay",
    "homeDays",
    "homeOffice",
    "homeAllowance",
    "hybrid",
    "hybridAlone",
    "hybridThing",
    "thingHybrid",
    "hybridMachine",
    "remoteThing",
    "remoteJob",
    "onSite",
    "wholly",
    "partly",
    "occasionally",
    "possible",
    "possibility",
    "youMay",
    "arrangement",
    "no",
    "none",
    "workWord",
    "trial",
    "dependingOn",
    "role",
    "modeLabel",
    "jobLabel",
  ],
  // ➤ An advert for a client of the employer, an agency's (builder/normalise.ts FOR_A_CLIENT).
  agencies: ["forAClient"],
  years: [
    "afterYears",
    "numbersBeforeYear",
    "experienceShort",
    "yearShort",
    "yearAdjective",
    "yearAfterMinimum",
    "ageAfterYears",
    "notExperience",
    "recentYears",
    "companyBoast",
    "companyHistory",
    "oneYear",
    "weTheCompany",
    "seek",
    "you",
    "orMore",
    "including",
    "wish",
    "preferably",
    "notRequired",
    "insteadOf",
    "degree",
    "or",
    "equivalent",
    "rangeJoin",
  ],
};
const KNOWN = new Set([...CONCEPTS, ...Object.values(BY_READER).flat()]);

eq(
  Object.entries(TABLES).flatMap(([lang, table]) =>
    Object.keys(table)
      .filter((k) => !KNOWN.has(k))
      .map((k) => `${lang}.${k}`),
  ),
  [],
  "each table holds only the concepts the readers ask for",
);
eq(
  Object.entries(TABLES).flatMap(([lang, table]) =>
    Object.entries(table)
      .filter(([, list]) => Array.isArray(list))
      .flatMap(([k, list]) =>
        list
          .filter((w, i) => w !== w.toLowerCase() || list.indexOf(w) !== i)
          .map((w) => `${lang}.${k}: ${w}`),
      ),
  ),
  [],
  "words in small letters, each once",
);
// ➤ Every language whose working time is read has the words each reader needs: the contract, the working time, the
// ➤ stance (a choice, a denial, a possibility, a chance, a later step), the years, the work's place and the pay's period.
// ➤ A language lacking one was read worse by that reader than the others (17 November 2026).
const CORE = [
  [
    "permanent",
    "temporary",
    "training",
    "agencyWork",
    "freelance",
    "extension",
    "month",
    "contractLabel",
    "durationLabel",
  ],
  ["fullTime", "partTime", "hour", "week", "hoursLabel"],
  ["or", "but", "no", "possible", "chance", "laterStep"],
  [
    "year",
    "experience",
    "atLeast",
    "wish",
    "preferably",
    "required",
    "languageLevel",
  ],
  [
    "modeLabel",
    "atHome",
    "onSite",
    "remote",
    "hybridAlone",
    "day",
    "numbers",
    "possibility",
    "wholly",
    "workWord",
  ],
  [
    "payLabel",
    "payWord",
    "perMonth",
    "perYear",
    "perHour",
    "hourlyPay",
    "perDay",
    "perWeek",
    "gross",
    "net",
  ],
].flat();
eq(
  Object.entries(TABLES)
    .filter(([, table]) => table.fullTime)
    .flatMap(([lang, table]) =>
      CORE.filter((k) => !table[k]).map((k) => `${lang}.${k}`),
    ),
  [],
  "the core words in every language read",
);
// ➤ A word two languages share means the same number in both («vier», «dos», «uno»; «mai», May).
const clashes = [];
for (const concept of ["numbers", "monthNumbers"]) {
  const said = {};
  for (const [lang, table] of Object.entries(TABLES))
    for (const [word, n] of Object.entries(table[concept] || {})) {
      if (said[word] !== undefined && said[word] !== n)
        clashes.push(`${lang}.${word}`);
      said[word] = n;
    }
}
eq(clashes, [], "one number for each word of a number");
eq(
  [
    words("year", { langs: ["ca"] }),
    numbers({ langs: ["ca"], least: 7, most: 7 }),
  ],
  [["anys"], {}],
  "no «any» or «set»",
);

// ➤ A word added to a table reaches every reader: words a reader's own list once lacked.
eq(
  [
    yearsAsked("", "Es requereix: cinc anys d'experiència en manteniment."),
    yearsAsked("", "Si richiedono almeno tre anni di esperienza nel settore."),
    yearsAsked("", "Minimum 1 an d'expérience en usinage."),
    contractKind("Befristet auf 1 Jahr"),
    contractKind("Tempo determinato 12 mesi"),
    workingTime("20 hores"),
    modeInSentences("", "Thuiswerken 2 dag per week."),
    periodOf("Monate"),
  ],
  [5, 3, 1, "t12", "t12", "p20", "hybrid", "m"],
  "the tables reach every reader",
);
// ➤ A company's own years are told by its own languages' words: Swedish «som» is «who», not Catalan's «we are» (the
// ➤ server's comparison of 15 November 2026: «Teletekniker – Göteborg» lost its 2 years).
eq(
  yearsAsked(
    "Teletekniker",
    "Vi söker dig som har minst 2 års erfarenhet av teleteknik.",
  ),
  2,
  "som is no company",
);
// ➤ Nor is one year a company's history, and a kind beside the same kind with its months is one contract (the same
// ➤ comparison: belros.com's template, and a list of «TEMPORARY» and «… 12 mesi»).
eq(
  yearsAsked(
    "",
    "Somos una empresa del sector y queremos un dependiente con experiencia de al menos 1 año.",
  ),
  1,
  "one year",
);
eq(
  contractOf({
    employmentType: ["TEMPORARY", "contratto a tempo determinato 12 mesi"],
  }).ct,
  "t12",
  "one contract",
);
const told =
  "Offriamo un contratto a tempo determinato. Si offre contratto a tempo determinato 12 mesi finalizzato a indeterminato.";
eq(
  writtenFacts({ title: "Segretario/a", description: told }, told).ct,
  "t12",
  "one contract in the text",
);
done();
