// The legacy's test/sentences.test.mjs (JustJans/indudex@ec79858), carried whole (legacy resync T002-T003): its imports pointed at
// this repo.
// ➤ Sentences as adverts write them, each with the fact it states (test/fixtures/sentences.json), read by the reader of
// ➤ that fact as the pile reads an advert's text. Catalonia and Spain first. A sentence a reader leaves out on purpose
// ➤ carries `why`; one under a title of its own carries `title`. To add a case: one line in the fixture.
import { readFileSync } from "fs";
import { test } from "vitest";
import assert from "node:assert/strict";
import {
  compileScreens,
  requiredDegrees,
  requiredLanguages,
} from "../../src/features/advert-facts/screens.ts";
import { workModeOf } from "../../src/features/advert-facts/work-mode.ts";
import { payOfText } from "../../src/features/pay/index.ts";
import {
  deadlineInText,
  labelledInText,
  postedInText,
  writtenFacts,
} from "../../src/features/advert-facts/labels.ts";
import { yearsAsked } from "../../src/features/advert-facts/years.ts";
import { TABLES } from "../../src/shared/words/index.ts";

const json = (path) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const screens = compileScreens({
  degrees: json("../../catalogues/degrees.json"),
  languages: json("../../catalogues/languages.json"),
});
const TITLE = "Técnico de mantenimiento";
const written = (text, title) =>
  writtenFacts({ title, description: text }, text);
const READERS = {
  contract: (text, title) => written(text, title).ct ?? null,
  hours: (text, title) => written(text, title).wt ?? null,
  mode: (text, title) => workModeOf({ title, description: text }) || null,
  pay: (text, title) => {
    const p = payOfText(title, text);
    return p ? [p.min, p.max, p.currency, p.period] : null;
  },
  degrees: (text) => requiredDegrees(text, screens),
  languages: (text) => requiredLanguages(text, screens),
  years: (text, title) => yearsAsked(title, text),
  // ➤ The years a labelled field gives («Kokemus: 3-5 vuotta»), which a careers page's facts take before the text's.
  labelledYears: (text) => labelledInText(text).years ?? null,
  deadline: (text) => deadlineInText(text) || null,
  posted: (text) => postedInText(text) || null,
};

const cases = json("../fixtures/legacy/sentences.json");
for (const fact of Object.keys(READERS))
  test(`${fact}: each sentence read as it states it`, () => {
    const wrong = cases
      .filter((c) => c.fact === fact)
      .map((c) => ({
        text: c.text,
        want: c.want,
        got: READERS[fact](c.text, c.title ?? TITLE),
      }))
      .filter((c) => JSON.stringify(c.got) !== JSON.stringify(c.want));
    assert.deepEqual(wrong, []);
  });

// ➤ The same plain facts in every language whose working time is read (test/fixtures/every-language.json): a reader
// ➤ that misses one in a language lacks that language's words, as Croatian lacked days and its demands for a language.
const EVERY_LANGUAGE = json("../fixtures/legacy/every-language.json");
// ➤ Each sentence's fact, its reader and what it reads.
const PLAIN_FACTS = {
  contract: ["contract", "i"],
  temporary: ["contract", "t6"],
  prospect: ["contract", "to"],
  hours: ["hours", "c"],
  partTime: ["hours", "p20"],
  hoursChoice: ["hours", null],
  partTimeAlone: ["hours", "p"],
  years: ["years", 3],
  yearsRange: ["years", 3],
  yearsInWords: ["years", 2],
  degrees: ["degrees", ["electrical"]],
  mechanical: ["degrees", ["mechanical"]],
  anyEngineering: ["degrees", ["engineering-any"]],
  languages: ["languages", ["en"]],
  languageLevel: ["languages", ["en"]],
  // ➤ Asked, with another language and a degree only welcome.
  languageSoftened: ["languages", ["en"]],
  languageMust: ["languages", ["en"]],
  degreeSoftened: ["degrees", []],
  yearsSoftened: ["years", null],
  mode: ["mode", "h"],
  remote: ["mode", "r"],
  onSite: ["mode", "o"],
  hybrid: ["mode", "h"],
  pay: ["pay", [3000, 3000, "EUR", "month"]],
  yearlyPay: ["pay", [40000, 50000, "EUR", "year"]],
  hourlyPay: ["pay", [15, 15, "EUR", "hour"]],
  monthlyRange: ["pay", [2500, 3000, "EUR", "month"]],
  officeDays: ["mode", "h"],
  remotePossible: ["mode", "h"],
  moreThanYears: ["years", 5],
  oneYear: ["years", 1],
  payInThousands: ["pay", [40000, 50000, "EUR", "year"]],
  payEuroSign: ["pay", [3000, 3000, "EUR", "month"]],
  // ➤ An option is no working time of the job's own.
  partTimeOption: ["hours", null],
  // ➤ A title alone, with no text.
  partTimeTitle: ["hours", "p", "title"],
  fullTimeTitle: ["hours", "c", "title"],
  remoteTitle: ["mode", "r", "title"],
  hybridTitle: ["mode", "h", "title"],
  onSiteTitle: ["mode", "o", "title"],
  // ➤ A title of one piece that names a trainee («Stagiaire ingénieur méthodes», «Villamosmérnök gyakornok»).
  traineeTitle: ["contract", "p", "title"],
  // ➤ A title of one piece that ends with working from home («Ingeniero de software en remoto», «Programista zdalnie»).
  remoteTitleEnd: ["mode", "r", "title"],
  // ➤ A degree said another common way («Formación en mecánica o equivalente», «Du har en uddannelse som maskiningeniør»).
  degreeOther: ["degrees", ["mechanical"]],
  // ➤ A language at a working level, or only known («Tyska på arbetsnivå», «Komunikatívna znalosť nemeckého jazyka»,
  // ➤ «Deutschkenntnisse»).
  languageWorking: ["languages", ["de"]],
  languageKnowledge: ["languages", ["de"]],
  // ➤ A temporary contract's length in words («Contrato temporal de un año», «Umowa na czas określony na rok»).
  temporaryYear: ["contract", "t12"],
  // ➤ A month's hours, as a week's (80 a month is 18 a week: «80 horas al mes», «Havi 80 óra»).
  hoursMonth: ["hours", "p18"],
  // ➤ A label that names a year's pay («Jahresgehalt: 45.000 €», «Årslön: 45 000 €»).
  yearlyLabel: ["pay", [45000, 45000, "EUR", "year"]],
  // ➤ Some days a week at home, their count in words («To dage om ugen hjemmefra», «Kaksi etäpäivää viikossa»).
  remoteDays: ["mode", "h"],
  // ➤ So many years «or more», the number in words («Tre eller fler års erfarenhet», «Tri ili više godina iskustva»).
  yearsOrMore: ["years", 3],
  // ➤ Home work denied beside the place of work, and home work in part («Rad na lokaciji, rad od kuće nije moguć»,
  // ➤ «Częściowo praca zdalna»).
  noRemote: ["mode", "o"],
  remotePartly: ["mode", "h"],
  // ➤ A language with a level, only wished («Goda kunskaper i tyska är önskvärt», «Dobrá znalost němčiny vítána»).
  languageAsset: ["languages", []],
  // ➤ Full and part time said as the post's kind («Het betreft een voltijdse functie», «Práca na plný pracovný úväzok»).
  fullOther: ["hours", "c"],
  partOther: ["hours", "p"],
  // ➤ A label that names a month's pay («Maandsalaris: € 3.000», «Kuukausipalkka: 3 000 €»).
  monthlyLabel: ["pay", [3000, 3000, "EUR", "month"]],
  // ➤ A contract field that names a traineeship or self-employment another way («Ansættelsesform: praktikophold»,
  // ➤ «Druh pracovního poměru: živnostenský list»).
  internOther: ["contract", "p"],
  freelanceOther: ["contract", "a"],
  // ➤ A language asked at a native level, and a fluent one only wished («Njemački jezik na razini izvornog govornika»,
  // ➤ «Alemão fluente é um diferencial»).
  languageNative: ["languages", ["de"]],
  languageFluentWished: ["languages", []],
  // ➤ A demand denied, of a language and of years («Kunskaper i tyska krävs inte», «3 lata doświadczenia nie są wymagane»).
  languageNotNeeded: ["languages", []],
  yearsNotNeeded: ["years", null],
  // ➤ A pay in thousands written as a word, the euro inflected («40 i 50 tisuća eura godišnje», «40–50 tuhatta euroa»).
  payThousandWords: ["pay", [40000, 50000, "EUR", "year"]],
  // ➤ A week's hours with a half, «a week» in the language's own phrase («22,5 godziny tygodniowo»).
  hoursHalf: ["hours", "p23"],
  // ➤ The job done wholly from home, and the job partly remote («Pracę można wykonywać w całości z domu», «Praca częściowo
  // ➤ zdalna»).
  fullyRemote: ["mode", "r"],
  jobPartlyRemote: ["mode", "h"],
  // ➤ The contract's period said, not its kind («Anstellung auf unbestimmte Zeit», «Ansættelse på bestemt tid»).
  indefinitePeriod: ["contract", "i"],
  fixedPeriod: ["contract", "t"],
  // ➤ A degree's field in each language's usual words, its study a compound or its degree inflected
  // ➤ («Informatikstudium», «Kandidatgrad i datalogi», «sähkötekniikan insinöörin tutkintoa»).
  degreeElectrical: ["degrees", ["electrical"]],
  degreeComputer: ["degrees", ["computer-science"]],
  degreeMechanical: ["degrees", ["mechanical"]],
  degreeCivil: ["degrees", ["civil"]],
  degreeChemical: ["degrees", ["chemical"]],
  degreeIndustrial: ["degrees", ["industrial"]],
  degreeAutomation: ["degrees", ["automation-mechatronics"]],
  degreeElectronics: ["degrees", ["electronics-telecom"]],
  degreeEnergy: ["degrees", ["energy"]],
  degreeEnvironmental: ["degrees", ["environmental"]],
  degreeBusiness: ["degrees", ["business"]],
  degreeAerospace: ["degrees", ["aerospace"]],
  degreeNaval: ["degrees", ["naval"]],
  degreeMaterials: ["degrees", ["materials"]],
  degreePhysics: ["degrees", ["physics-maths"]],
  degreeArchitecture: ["degrees", ["architecture"]],
  degreeGeomatics: ["degrees", ["geomatics"]],
  // ➤ A pay «from X to Y», its period before the figures («Évi 40 000 € és 50 000 € közötti fizetést kínálunk»).
  payFromToYear: ["pay", [40000, 50000, "EUR", "year"]],
  // ➤ Two languages demanded together, and a language the employer says it requires («Edellytämme hyvää saksan ja
  // ➤ englannin kielen taitoa», «Vi kräver tyska», «Wymagamy języka niemieckiego»).
  languagesPair: ["languages", ["de", "en"]],
  weRequireLanguage: ["languages", ["de"]],
  languageNecessity: ["languages", ["de"]],
  languageCondition: ["languages", ["de"]],
  weRequireYears: ["years", 3],
  weRequireDegree: ["degrees", ["mechanical"]],
  degreeHeld: ["degrees", ["mechanical"]],
  payBetweenYear: ["pay", [40000, 50000, "EUR", "year"]],
  payHourRate: ["pay", [25, 25, "EUR", "hour"]],
  payHourPrice: ["pay", [25, 25, "EUR", "hour"]],
  contractSixMonths: ["contract", "t6"],
  contractTwelveMonths: ["contract", "t12"],
  temporaryDuration: ["contract", "t6"],
  yearsField: ["labelledYears", 3],
  insistUnderSoft: ["languages", ["de"]],
  butRequired: ["languages", ["de"]],
  levelItem: ["languages", ["de"]],
  timeOptionsLabel: ["hours", "c"],
  timeBothLine: ["hours", null],
  homeOfficeYes: ["mode", "h"],
  modeFieldPartly: ["mode", "h"],
  modeFieldOnSite: ["mode", "o"],
  modeFieldDays: ["mode", "h"],
  deadlineMonth: ["deadline", "2026-12-15"],
  postedMonth: ["posted", "2026-10-15"],
  payAverage: ["pay", null],
  payAllowance: ["pay", null],
  payJoining: ["pay", null],
  payAtMost: ["pay", [0, 3000, "EUR", "month"]],
  payFromMonth: ["pay", [2000, 2000, "EUR", "month"]],
  payIncluding: ["pay", [2500, 2500, "EUR", "month"]],
  probationTemporary: ["contract", "t"],
  languageCourses: ["languages", []],
  languageCustomers: ["languages", []],
  languageWelcome: ["languages", []],
  languageWelcomeAlone: ["languages", []],
  languageHelpful: ["languages", []],
  languageOptional: ["languages", []],
  languageAdvantage: ["languages", []],
  degreeAdvantage: ["degrees", []],
  degreeValued: ["degrees", []],
  contractSeasonal: ["contract", "t"],
  contractCover: ["contract", "t"],
  contractSummer: ["contract", "t"],
  contractReplacement: ["contract", "t"],
  yearsSimilarRole: ["years", 2],
  yearsTraining: ["years", null],
  yearsWarranty: ["years", null],
  yearsExperienceOf: ["years", 3],
  yearsPreferablyIn: ["years", 3],
  languageOrHigher: ["languages", ["en"]],
  payPackage: ["pay", [2000, 2000, "EUR", "month"]],
  modeLocationHybrid: ["mode", "h"],
  // ➤ A ceiling, a floor, a day's rate, more than some years, no degree asked, a contract to a date, the week's hours.
  payUpTo: ["pay", [0, 3000, "EUR", "month"]],
  payFrom: ["pay", [3000, 3000, "EUR", "month"]],
  dailyPay: ["pay", [300, 300, "EUR", "day"]],
  yearsPlus: ["years", 5],
  degreeNotRequired: ["degrees", []],
  fixedTermUntil: ["contract", "t"],
  weeklyHours: ["hours", "c"],
  // ➤ The other kinds of contract: training, freelance, agency work.
  internship: ["contract", "p"],
  apprenticeship: ["contract", "p"],
  freelance: ["contract", "a"],
  agency: ["contract", "e"],
  // ➤ A probation, an extension, home work denied, a share or days of it, a band, a label, the hours in brackets.
  probationPermanent: ["contract", "i"],
  extension: ["contract", "t"],
  noHomeOffice: ["mode", "o"],
  remoteShare: ["mode", "h"],
  homeDays: ["mode", "h"],
  payFromTo: ["pay", [3000, 3500, "EUR", "month"]],
  yearsLabel: ["years", 3],
  yearsBetween: ["years", 3],
  partTimeHours: ["hours", "p30"],
  // ➤ A net pay (not read: the site shows gross), a band «between», a week's pay, a mode as a field.
  netPay: ["pay", null],
  payBetween: ["pay", [3000, 3500, "EUR", "month"]],
  weeklyPay: ["pay", [600, 600, "EUR", "week"]],
  modeLabelRemote: ["mode", "r"],
  modeLabelHybrid: ["mode", "h"],
  // ➤ A language asked by its level, its use or its command, with no demand word.
  languageGood: ["languages", ["en"]],
  languageSpoken: ["languages", ["en"]],
  languageCommand: ["languages", ["en"]],
  // ➤ German, French, Spanish, Italian, Dutch, Portuguese and Polish asked by name; an electrical, a computing and a
  // ➤ vocational degree.
  germanRequired: ["languages", ["de"]],
  frenchRequired: ["languages", ["fr"]],
  spanishRequired: ["languages", ["es"]],
  italianRequired: ["languages", ["it"]],
  dutchRequired: ["languages", ["nl"]],
  portugueseRequired: ["languages", ["pt"]],
  polishRequired: ["languages", ["pl"]],
  electrical: ["degrees", ["electrical"]],
  computing: ["degrees", ["computer-science"]],
  vocational: ["degrees", ["electrical"]],
  thenPermanent: ["contract", "to"],
  agencyThenPermanent: ["contract", "eo"],
  floorNote: ["pay", [44000, 44000, "EUR", ""]],
  bandNote: ["pay", [45000, 55000, "EUR", ""]],
  payShortMonth: ["pay", [3000, 3000, "EUR", "month"]],
  payShortYear: ["pay", [45000, 45000, "EUR", "year"]],
  hoursShort: ["hours", "c"],
  partTimeShort: ["hours", "p20"],
  yearsShort: ["years", 3],
  homeDaysShort: ["mode", "h"],
  // ➤ An hourly pay named by its label («Timlön», «Órabér», «Satnica», «Paga oraria», «Taux horaire»).
  hourlyLabel: ["pay", [15, 15, "EUR", "hour"]],
  // ➤ A month's pay said with another of its words («pcm», «b.p.m.», «/månad», «pr. mnd.», «za měsíc», «na mjesec»).
  payMonthOther: ["pay", [3000, 3000, "EUR", "month"]],
  // ➤ The years as an adjective before experience («3-årig erfarenhet», «3 éves tapasztalat», «3-ročná prax»).
  yearsAdjective: ["years", 3],
  // ➤ A permanent post and a cover contract said the second most common way («Fast fuldtidsstilling», «Sostituzione maternità»).
  permanentOther: ["contract", "i"],
  temporaryOther: ["contract", "t"],
  // ➤ Remote work said as work at a distance («a distancia», «a distanza», «la distanță», «fjernarbejde», «távmunka»).
  remoteDistance: ["mode", "r"],
  // ➤ A chance of moving to a permanent contract is no permanent one («posibilidad de pasar a un contrato indefinido»).
  contractChanceToward: ["contract", null],
  // ➤ The pay under its short label, a fixed or base pay («Comp:», «Fijo:», «Fixe :», «Fixum:», «Podstawa:»).
  payBaseLabel: ["pay", [40000, 45000, "EUR", ""]],
  // ➤ A band in thousands beside a benefit's sum in a currency («RAL (Range 30K - 35K), Ticket Restaurant 6,00€»).
  payThousandsBeside: ["pay", [30000, 35000, "EUR", ""]],
  // ➤ A language asked beside a choice of two others («Fließend Englisch und Französisch oder Niederländisch»).
  languageAndChoice: ["languages", ["en"]],
  // ➤ A part time whose full time is only offered («Media jornada con opción a jornada completa»).
  partTimeWithOption: ["hours", "p"],
  // ➤ A working time in a long sentence that names the job («Stillingen er på fuld tid og placeret på vores kontor…»).
  hoursOfTheJob: ["hours", "c"],
  // ➤ A permanent contract the job may become is no permanent one («Mission longue durée, évolutive en CDI»).
  contractMayBecome: ["contract", null],
  payPeriodWithWord: ["pay", [2500, 2500, "EUR", "month"]],
  payCeilingCases: ["pay", null],
  yearsWithWorkExperience: ["years", 2],
  yearsAfterCompanysOwn: ["years", 2],
};
// ➤ Where the others ask for English, English asks for German.
const wantFor = (lang, fact, want) =>
  lang === "en" && PLAIN_FACTS[fact][0] === "languages" && want.join() === "en"
    ? ["de"]
    : want;
test("every language reads each plain fact", () => {
  const langs = Object.keys(TABLES).filter((lang) => TABLES[lang].fullTime);
  assert.deepEqual(Object.keys(EVERY_LANGUAGE).sort(), langs.sort());
  const wrong = langs.flatMap((lang) =>
    Object.entries(PLAIN_FACTS)
      .map(([fact, [reader, want, asTitle]]) => {
        const said = EVERY_LANGUAGE[lang][fact];
        const got = asTitle
          ? READERS[reader]("", said)
          : READERS[reader](said, TITLE);
        return { lang, fact, want: wantFor(lang, fact, want), got };
      })
      .filter((c) => JSON.stringify(c.got) !== JSON.stringify(c.want)),
  );
  assert.deepEqual(wrong, []);
});
