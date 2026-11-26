// The legacy's test/readers-languages.test.mjs (JustJans/indudex@ec79858), carried whole (legacy resync T002-T003): its imports pointed at
// this repo.
// ➤ The readers part 3 rewrote, held to the same phrases in the six languages the site is served in, and to a time limit
// ➤ on hostile fields (DAA-27): the audit found the tests fixed the cases seen in the data, not the families that fail.
import { test } from "vitest";
import assert from "node:assert/strict";
import { payOfText } from "../../src/features/pay/index.ts";
import { yearsAsked } from "../../src/features/advert-facts/years.ts";
import { workModeOf } from "../../src/features/advert-facts/work-mode.ts";
import {
  contractKind,
  contractOf,
  workingTime,
} from "../../src/features/advert-facts/contract.ts";
import { LANGUAGES } from "../../src/features/title-translation/translate.ts";
import {
  loneFacts,
  writtenFacts,
} from "../../src/features/advert-facts/labels.ts";

// ➤ One row per language, in the order of LANGUAGES: en, es, ca, fr, nl, de.
const SAME = {
  asked: [
    "At least 3 years of experience as a maintenance technician.",
    "Experiencia mínima de 3 años como técnico de mantenimiento.",
    "Experiència mínima de 3 anys com a tècnic de manteniment.",
    "Au moins 3 ans d'expérience en maintenance industrielle.",
    "Minimaal 3 jaar ervaring als onderhoudsmonteur.",
    "Mindestens 3 Jahre Berufserfahrung in der Instandhaltung.",
  ],
  companyYears: [
    "Our company has more than 20 years of experience in the sector.",
    "Empresa con más de 20 años de experiencia en el sector.",
    "Empresa amb més de 20 anys d'experiència en el sector.",
    "Entreprise avec plus de 20 ans d'expérience dans le secteur.",
    "Bedrijf met meer dan 20 jaar ervaring in de sector.",
    "Unternehmen mit über 20 Jahren Erfahrung in der Branche.",
  ],
  daysAtHome: [
    "Hybrid work: 2 days per week from home.",
    "Teletrabajo 2 días por semana.",
    "Teletreball 2 dies per setmana.",
    "Télétravail 2 jours par semaine.",
    "Thuiswerken 2 dagen per week.",
    "Homeoffice 2 Tage pro Woche.",
  ],
  fullyRemote: [
    "Fully remote position.",
    "Trabajo 100% remoto.",
    "Treball 100% remot.",
    "Poste en télétravail complet.",
    "Volledig thuiswerken.",
    "Vollständig remote.",
  ],
  bonusInTitle: [
    "Technician - $5,000 sign-on bonus",
    "Mecánico industrial - 1.500 € de prima de fichaje",
    "Mecànic - 1.500 € de prima d'incorporació",
    "Technicien - prime d'embauche de 2 000 €",
    "Monteur - € 2.000 welkomstbonus",
    "Elektroniker (m/w/d) 3.000 € Startprämie",
  ],
  bonusOnPayLine: [
    "Salary: competitive + signing bonus of $3,000",
    "Salario: a convenir + bonus de 3.000 €",
    "Sou: a convenir + prima de 3.000 €",
    "Salaire : selon profil, prime de 2 000 €",
    "Salaris: marktconform, € 2.000 welkomstbonus",
    "Gehalt: nach Vereinbarung + 2.000 € Startprämie",
  ],
  workingTimeLabel: [
    "Job type: Part-time, flexible hours",
    "Modalidad: jornada parcial flexible",
    "Modalitat: jornada parcial flexible",
    "Organisation du travail : temps partiel, horaires flexibles",
    "Werkrooster: deeltijd, flexibele uren",
    "Arbeitsmodell: Teilzeit, flexible Arbeitszeiten",
  ],
  twoContracts: [
    "Permanent / Temporary",
    "Indefinido o temporal",
    "Indefinit o temporal",
    "CDI ou CDD",
    "Vast of tijdelijk",
    "Unbefristet oder befristet",
  ],
  permanent: [
    "Permanent",
    "Indefinido",
    "Indefinit",
    "CDI",
    "Vast contract",
    "Unbefristet",
  ],
  net: [
    "Net salary: €1,500 per month",
    "Salario neto: 1.500 € al mes",
    "Sou net: 1.500 € al mes",
    "Salaire net : 1 500 € par mois",
    "Nettosalaris: € 1.500 per maand",
    "Nettogehalt: 1.500 € monatlich",
  ],
  gross: [
    "Salary: €1,800 per month",
    "Salario: 1.800 € al mes",
    "Sou: 1.800 € al mes",
    "Salaire : 1 800 € par mois",
    "Salaris: € 1.800 per maand",
    "Gehalt: 1.800 € monatlich",
  ],
};
const mode = (description) =>
  workModeOf({ title: "Técnico", location: "", description });
const pay = (text) => {
  const p = payOfText("Técnico", text);
  return p && [p.min, p.currency, p.period];
};
const each = (value) => LANGUAGES.map(() => value);

test("the same phrase reads the same in every language served", () => {
  assert.equal(
    LANGUAGES.join(),
    "en,es,ca,fr,nl,de",
    "the rows follow LANGUAGES",
  );
  for (const rows of Object.values(SAME))
    assert.equal(rows.length, LANGUAGES.length);
  assert.deepEqual(
    SAME.asked.map((t) => yearsAsked("Técnico", t)),
    each(3),
    "years asked",
  );
  assert.deepEqual(
    SAME.companyYears.map((t) => yearsAsked("Técnico", t)),
    each(null),
    "a company's own years",
  );
  assert.deepEqual(
    SAME.daysAtHome.map(mode),
    each("h"),
    "days at home are hybrid",
  );
  assert.deepEqual(
    SAME.fullyRemote.map(mode),
    each("r"),
    "remote work as the whole job",
  );
  assert.deepEqual(
    SAME.workingTimeLabel.map(mode),
    each(""),
    "a working time under a generic label is no mode",
  );
  assert.deepEqual(
    SAME.twoContracts.map((v) => contractKind(v)),
    each(""),
    "two kinds say none",
  );
  assert.deepEqual(
    SAME.permanent.map((v) => contractKind(v)),
    each("i"),
    "a permanent contract",
  );
  assert.deepEqual(
    ["Vast", "Vaste baan", "Tijdelijk met uitzicht op vast"].map((v) =>
      contractKind(v),
    ),
    ["i", "i", "to"],
  );
  assert.deepEqual(SAME.net.map(pay), each(null), "a net pay is not read");
  assert.deepEqual(
    SAME.gross.map(pay),
    each([1800, "EUR", "month"]),
    "a gross pay is",
  );
  assert.deepEqual(
    SAME.bonusInTitle.map((t) => payOfText(t, "")),
    each(null),
    "a bonus in the title is no pay (DAA-04)",
  );
  assert.deepEqual(
    SAME.bonusOnPayLine.map(pay),
    each(null),
    "nor one on the pay line",
  );
  assert.deepEqual(
    [
      "Salary: €70K + bonus",
      "Gehalt: 45.000 € + Prämie",
      "Salario: 1.800 € al mes + prima de 300 €",
    ].map(pay),
    [
      [70000, "EUR", ""],
      [45000, "EUR", ""],
      [1800, "EUR", "month"],
    ],
    "a pay a bonus comes on top of is read",
  );
});

// ➤ A long run of one character in a field read as is (a page's own data): a pattern that starts over at every character
// ➤ of the run takes seconds. The server is some 3.5 times slower than a laptop, hence the margin.
const RUNS = [
  " ",
  "\n",
  "\r\n",
  "\t",
  "1 ",
  "1.",
  "- ",
  "a ",
  "ab-",
  "€1 ",
  "CDI / ",
  "remote ",
  "3 days ",
  "Salary: ",
];
const READERS = {
  pay: (s) => payOfText(s.slice(0, 300), s),
  payInTitle: (s) => payOfText(s, ""),
  years: (s) => yearsAsked(s.slice(0, 300), s),
  mode: (s) =>
    workModeOf({
      title: s.slice(0, 300),
      location: s.slice(0, 2000),
      description: s,
    }),
  modeOfPlace: (s) => workModeOf({ title: "", location: s, description: "" }),
  kind: (s) => contractKind(s),
  time: (s) => workingTime(s),
  contract: (s) =>
    contractOf({
      title: "x",
      description: s,
      contract: s,
      employmentType: [s],
    }),
};
test("a hostile field is read in well under a second", () => {
  const slow = [];
  for (const run of RUNS) {
    const s = `${run.repeat(Math.ceil(50000 / run.length))}x`;
    for (const [name, read] of Object.entries(READERS)) {
      const t0 = performance.now();
      read(s);
      const ms = performance.now() - t0;
      if (ms > 500)
        slow.push(`${name} on ${JSON.stringify(run)}: ${Math.round(ms)} ms`);
    }
  }
  assert.deepEqual(slow, []);
});

// ➤ What the server's comparison of 15 November 2026 found the bonus and Dutch contract rules had got wrong.
test("a bonus is taken out only beside its sum; a prospect of a permanent post is one", () => {
  assert.deepEqual(
    [
      "Prima arbeidsvoorwaarden: € 17,62 per uur",
      "RAL (da prima occupazione a senior €23.000-€38.000 lordi annui)",
      "Salary: Bonus In excess of £29,000 – £38,000 per annum",
    ].map(pay),
    [
      [17.62, "EUR", "hour"],
      [23000, "EUR", "year"],
      [29000, "GBP", "year"],
    ],
  );
  assert.deepEqual(
    [
      "Een tekenpremie van maar liefst € 2.000 bruto!",
      "Wir zahlen eine Willkommensprämie i.H.v. maximal 3.000€",
      "Overstappremie van € 5.000,-",
    ].map(pay),
    [null, null, null],
  );
  assert.deepEqual(
    [
      "Je krijgt een aanstelling in tijdelijke dienst voor een proeftijd van een jaar. Daarna volgt een vaste aanstelling.",
      "Direct een jaarcontract met uitzicht op vaste dienst. Een vaste baan bij ons.",
      "Wij bieden een jaarcontract.",
    ].map((description) => writtenFacts({ title: "Monteur", description }).ct),
    ["to", "to", "t"],
  );
});

// ➤ The adverts the server's second look found read wrong (15 November 2026), as their texts say it.
const ADVERTS = [
  [
    "Operator",
    'Interim met optie "vast werk" · Dagwerk · Voltijds\nNaast een aantrekkelijk loon vanaf €17,62 ploegenpremie bieden we tal van extra voordelen:',
  ],
  [
    "Onderhoudstechnieker",
    "Loon: 17.5€   ploegnepremie 1.28€.\nStabiele job met uitzicht op vast contract.",
  ],
  [
    "Pflegefachkraft für die Anästhesiepflege",
    "eine Willkommensprämie von insgesamt 3.000,00€ (Brutto)!\nDie erste Prämie von 1.500,00 € (Brutto) erhältst du direkt zum Beginn, die zweite Auszahlung erfolgt mit 1.500,00 € (Brutto) nach der Probezeit\n3.000,00 € (brutto) Willkommensprämie bei Eintritt.",
  ],
  [
    "Longarts",
    "Contractduur 12 maanden Uren per week 38 - 38 Maandsalaris €7.427,00 - €10.124,00 Dienstverband Tijdelijke aanstelling\nInitieel krijgt u een tijdelijke aanstelling als burger bij Defensie voor maximaal 1 jaar.\nDaarna zal, na gebleken geschiktheid, een vaste aanstelling als militair longarts volgen.",
  ],
  [
    "Allround monteur TD dagdienst, jaarcontract",
    "Je start met een jaarcontract en bij goed functioneren kun je rekenen op een vaste aanstelling!\nSalaris tussen € 3500 en € 4500 per maand\nEen jaarcontract met uitzicht op een vaste baan",
  ],
];
test("the server's adverts: a shift premium is pay, a joining bonus none, a permanent post after a temporary one a prospect", () => {
  assert.deepEqual(
    ADVERTS.map(([title, text]) => {
      const p = payOfText(title, text);
      return [p && p.min, writtenFacts({ title, description: text }).ct ?? ""];
    }),
    [
      [17.62, "eo"],
      [17.5, "to"],
      [null, ""],
      // ➤ A year's appointment, then «na gebleken geschiktheid» a permanent one: the prospect, read since 16 November 2026.
      [7427, "to"],
      [3500, "to"],
    ],
  );
});

// ➤ The server's third look (15 November 2026): a premium beside the pay leaves the pay, a joining bonus takes it; «vast»
// ➤ only as a word, a permanent post after a year's contract a prospect.
test("the server's third look: premiums beside the pay, «vast» as a word", () => {
  assert.deepEqual(
    [
      "Lehrlingsentschädigung im 1. Lehrjahr von € 1.071,- brutto/Monat, Prämien für besondere Leistungen.",
      "Garantie-Einstiegsgehalt von mind. 3.000€ Brutto mit Erhöhung durch Prämien & Provision.",
      "Wir bieten 40.000–45.000 € im Jahr plus Bereitschaftsvergütung und Leistungsprämien.",
      "Willkommensprämie: 3.000,00 € (brutto) bei Eintritt.",
      "2.000 € brutto WECHSELBONUS bei Eintritt.",
      "Slagingsbonus van € 500 bruto per maand.",
    ].map((text) => payOfText("", text)?.min ?? null),
    [1071, 3000, 40000, null, null, null],
  );
  assert.deepEqual(
    [
      "Je werkt volgens vastgestelde protocollen.",
      "Jij bent het vaste aanspreekpunt voor klanten, met uitzicht op vastgestelde doelen.",
      "Je zorgt voor correcte vastlegging van het klantcontract.",
      "Je krijgt via Eminent een jaarcontract en aansluitend een vast contract.",
      "Vast dienstverband bij goed functioneren.",
    ].map(
      (description) => writtenFacts({ title: "Monteur", description }).ct ?? "",
    ),
    ["", "", "", "to", "i"],
  );
  assert.deepEqual(loneFacts("<div>Vast</div><div>Monteur, Lier</div>"), {});
});

// ➤ The server's fourth look (15 November 2026): a care bonus added to the pay leaves it, a bonus a pay's floor follows is
// ➤ none; the steps to a permanent post after a year's contract are its prospect.
test("the server's fourth look: a pay plus a bonus, the steps to a permanent post", () => {
  assert.deepEqual(
    [
      "Brutto-Monatsgehalt bei Vollzeit (39 Wochenstunden) ab € 3.943,00 zuzüglich € 158,33 Pflegebonus",
      "Package de rémunération: fixe + primes à partir de 42 000 € brut annuel + intéressement et participation.",
    ].map((text) => payOfText("", text)?.min ?? null),
    [3943, 42000],
  );
  assert.deepEqual(
    [
      "Jaarcontract, hierna vast dienstverband",
      "Een contract voor 7 maanden. Bij goed functioneren daarna een jaarcontract, met uitzicht op een vast contract",
      "Je krijgt een jaarcontract met de intentie om na dit jaar een vast contract te ontvangen.",
    ].map(
      (description) => writtenFacts({ title: "Monteur", description }).ct ?? "",
    ),
    ["to", "to", "to"],
  );
});

// ➤ The server's fifth look (15 November 2026): a shift premium added to an hourly pay leaves it, a bonus for joining
// ➤ after the pay word is no pay, and a temporary start turned, extended or followed into a permanent post is its prospect.
test("the server's fifth look: shift premiums, a joining bonus, a temporary start that becomes permanent", () => {
  assert.deepEqual(
    [
      "Je uurloon bedraagt €18.48 en hierbij komt een ploegenpremie: €0.68/uur in de 2 ploegen.",
      "Je start met een aantrekkelijk bruto uurloon van €17,30 aangevuld met ploegenpremie van € 1,1986/u",
      "Je ontvangt een aantrekkelijk loonpakket (€16,4795 + €1,472 ploegenpremie = €17,9515/uur )",
      "Deine Benefits am Standort Freiburg erfahrungsbasiertes Gehalt 4.000€ Willkommensprämie E-Firmenwagen 30 Tage Urlaub",
    ].map((text) => payOfText("", text)?.min ?? null),
    [18.48, 17.3, 17.95, null],
  );
  const facts = (raw) =>
    ({ ...writtenFacts({ title: "Medewerker", ...raw }), ...contractOf(raw) })
      .ct ?? "";
  assert.deepEqual(
    [
      {
        description:
          "Uren per week 32 - 36 Dienstverband Vast. J e start met een jaarcontract dat we bij goed functioneren graag omzetten in een vast contract.",
      },
      {
        employmentType: ["OTHER"],
        description:
          "Na het voltooien van de opleiding bieden we je een tijdelijke aanstelling aan. Na deze proeftijd volgt zo snel mogelijk een vaste aanstelling.",
      },
      {
        description:
          "Een jaarcontract dat bij de juiste match verlengd kan worden naar een vast contract.",
      },
      {
        contract:
          "Een jaarcontract, gevolgd door een vast contract bij wederzijdse tevredenheid.",
        hours: "28 uur",
      },
      {
        employmentType: ["Vast / Tijdelijk"],
        description:
          "Een contract voor bepaalde tijd bij ons met de intentie om dat daarna om te zetten in een contract voor onbepaalde tijd.",
      },
    ].map(facts),
    ["to", "to", "to", "to", "to"],
  );
});

// ➤ The server's sixth look (15 November 2026): a premium the pay includes is part of it, and a permanent post after a
// ➤ year's contract or a traineeship, in the next sentence or on the same line, is the prospect; «vast te stellen» is a verb.
test("the server's sixth look: a premium included, a permanent post after a first year", () => {
  assert.equal(
    payOfText(
      "",
      "Kollektivvertraglicher Mindestlohn, inklusive Fixprämie: € 2.830,65 brutto/Monat bei Vollzeit.",
    )?.min,
    2830.65,
  );
  const facts = (description) =>
    ({ ...writtenFacts({ title: "Medewerker", description }) }).ct ?? "";
  assert.deepEqual(
    [
      "Binnen 12 maanden opgeleid worden tot junior DevOps engineer. En daarna direct een vast contract.",
      "Een jaarcontract, bij gebleken geschiktheid een vast contract",
      "Een jaarcontract. En blijkt dat we goed bij elkaar passen, dan wordt dit contract daarna omgezet naar een vast dienstverband.",
      "Je krijgt een tijdelijk contract. We kijken samen naar je ontwikkeling om zo vast te stellen wat je nodig hebt.",
    ].map(facts),
    ["to", "to", "to", "t"],
  );
});
