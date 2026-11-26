// The legacy's test/labels.test.mjs (JustJans/indudex@ec79858), carried whole (legacy resync T002-T003): its imports pointed at
// this repo. Its `withLabels` is the crawl's composed reader (src/bin/page-facts.ts) through crawl-core's merge.
// ➤ The facts a vacancy's page writes as labelled fields (builder/lib/labels.ts), in the shapes read on 117 pages of
// ➤ employers and portals on 1 November 2026, and what must not be read: a form, a list of choices, a cookie notice.
import { harness } from "./harness.mjs";
import {
  contractInTitle,
  deadlineInText,
  inSentences,
  labelledFacts,
  loneFacts,
  writtenFacts,
  loneInText,
} from "../../src/features/advert-facts/labels.ts";
import {
  contractKind,
  contractOf,
  workingTime,
} from "../../src/features/advert-facts/contract.ts";
import { withPageFacts } from "../../src/features/crawl-core/page-facts.ts";
import { readPageFacts } from "../../src/bin/page-facts.ts";

const withLabels = (job, html) => withPageFacts(job, readPageFacts(html));

const { eq, done } = harness("labels");
const facts = (html) => {
  const f = labelledFacts(html);
  return {
    ...contractOf({ contract: f.contract, hours: f.hours }),
    ...(f.years !== undefined ? { years: f.years } : {}),
  };
};

eq(
  facts(
    '<div class="property"><label>Contrat</label><div class="text">CDI - Temps plein</div></div>',
  ),
  { ct: "i", wt: "c" },
  "taleez: «Contrat: CDI - Temps plein»",
);
eq(
  facts(
    "<dl><dt>Ansættelsesform</dt><dd>Fastansættelse</dd><dt>Arbejdstid</dt><dd>Deltid</dd></dl>",
  ),
  { ct: "i", wt: "p" },
  "Danish fields: «Ansættelsesform», «Arbejdstid»",
);
eq(
  facts(
    '<p class="fw-bold">Vertragsart:</p><p>Arbeitnehmerüberlassung</p><p class="fw-bold">Beschäftigungsart:</p><p>Vollzeit</p>',
  ),
  { ct: "e", wt: "c" },
  "a label in one block, its value in the next",
);
eq(
  facts(
    "<dl><dt>Statuut</dt><dd>Interim job met optie vast werk</dd><dt>Contracttype</dt><dd>voltijd</dd><dt>Werkervaring</dt><dd>3-5 jaar</dd></dl>",
  ),
  { ct: "eo", wt: "c", years: 3 },
  "a definition list: status, contract type, experience",
);
eq(
  facts(
    "<table><tr><th>Tipo di Contratto</th><td>Partita IVA</td></tr></table>",
  ),
  { ct: "a" },
  "Partita IVA is freelance",
);
eq(
  facts(
    "<ul><li>Type de contrat : CDI</li><li>Type de contrat : CDD</li><li>Type de contrat : Freelance</li></ul>",
  ),
  {},
  "three contracts named: none said",
);
eq(
  facts(
    "<form><label>Type de contrat</label><select><option>CDI</option><option>CDD</option></select></form><nav>Job Type: Full Time</nav><p>Speicherdauer: 2 Jahre</p>",
  ),
  {},
  "a form, its choices, a menu and a cookie notice say nothing",
);
eq(
  facts("<p>Experience: must be 18 years old</p>"),
  {},
  "an age is no experience",
);
eq(
  withLabels(
    { title: "Elektriker", employmentType: ["FULL_TIME"] },
    "<p>Vertragsart: unbefristet</p>",
  ).contract,
  "unbefristet",
  "the page's contract added beside the block's hours",
);
eq(
  withLabels({ title: "Elektriker", contract: "CDD" }, "<p>Contrat : CDI</p>")
    .contract,
  "CDD",
  "what the block said stands",
);

// ➤ A contract or working time shown as a field of its own with no label, in the shapes the offers' diary found on kept
// ➤ pages (1 November 2026); menus and filters are links, a figure is a shift or anything, two values say nothing.
const lone = (html) => {
  const f = loneFacts(html);
  return contractOf({ contract: f.contract, hours: f.hours });
};
eq(
  [
    lone(
      '<ul class="job-meta"><li>Full-time · Amersfoort</li><li>€ 4.100,- tot € 5.500,-</li></ul>',
    ),
    lone(
      '<div class="job-info"><span>Permanent</span><span>Paris, France</span></div>',
    ),
    lone('<p class="tags">Employee - Permanent</p>'),
    lone('<div class="meta">Permanent - Full Time</div>'),
    lone(
      '<span class="badge">Vollzeit</span><p>Wir suchen einen Elektriker.</p>',
    ),
  ],
  [{ wt: "c" }, { ct: "i" }, { ct: "i" }, { ct: "i", wt: "c" }, { wt: "c" }],
  "a chip with the hours or the contract alone, or beside a place",
);
eq(
  [
    lone(
      '<nav>x</nav><div class="menu"><a href="/jobs?type=part-time">Part-time</a></div><p>Wir suchen einen Elektriker.</p>',
    ),
    lone("<p>Work Schedule:</p><p>12 Hours</p><p>20</p>"),
    lone("<p>Type de contrat :</p><p>CDI - Freelance</p>"),
    lone('<ul class="filters"><li>CDI</li><li>CDD</li></ul>'),
    lone('<div class="menu-item">Ausbildung</div>'),
    lone("<span>Vollzeit oder Teilzeit</span>"),
  ],
  [{}, {}, {}, {}, {}, {}],
  "a link, a figure, two contracts in one field, a filter of two, a training menu, both times: nothing",
);
eq(
  withLabels(
    { title: "Elektriker" },
    "<p>Vertragsart: Arbeitnehmerüberlassung</p><span>Unbefristet</span><span>Vollzeit</span>",
  ),
  {
    title: "Elektriker",
    contract: "Arbeitnehmerüberlassung",
    hours: "Vollzeit",
  },
  "a labelled field before a field with no label, which fills only what is left",
);

// ➤ The same fields written in an advert's text, and a contract a title names in a part of its own (found by the offers'
// ➤ diary on 1 November 2026: «Type de contrat : CDI» and "Job Type: Full-time, Permanent" in boards' texts, «- CDI -»).
const lines = (...l) => l.join(String.fromCharCode(10));
eq(
  [
    writtenFacts({
      title: "Multi-Skilled Maintenance Engineer",
      description: lines(
        "About us",
        "Job Type: Full-time, Permanent",
        "Location: Leeds",
      ),
    }),
    writtenFacts({
      title: "Développeur Cobol",
      description: lines(
        "Lieu : Monaco",
        "Type de contrat : CDI",
        "Salaire : selon profil",
      ),
    }),
    writtenFacts({
      title: "Elektriker",
      description: "Arbeitszeit: Vollzeit · Befristung: unbefristet",
    }),
    writtenFacts({
      title: "Technician",
      description: "Contract: CDD de 6 mois, possibilité de CDI",
    }),
    writtenFacts({
      title: "Engineer",
      description: "Our team: great people. Note: we value diversity",
    }),
  ],
  [{ ct: "i", wt: "c" }, { ct: "i" }, { ct: "i", wt: "c" }, { ct: "to" }, {}],
  "a text's labelled lines are its fields",
);
eq(
  [
    writtenFacts({
      title: "Field Service Engineer",
      description: lines(
        "Benefits: Company van",
        "Job Types: Permanent, Full-time",
        "Work Location: In person",
      ),
    }),
    writtenFacts({
      title: "Electrician",
      description: lines("Employment types: Part-time, Temporary"),
    }),
  ],
  [
    { ct: "i", wt: "c" },
    { ct: "t", wt: "p" },
  ],
  "Indeed's «Job Types:» line, in the plural, as many employers' texts copy it (the diary's live check)",
);
eq(
  [
    writtenFacts({
      title: "Network Engineer",
      description: lines(
        "Worker Type: Permanent",
        "Language(s) Required: English",
      ),
    }),
    writtenFacts({
      title: "Field Engineer",
      description: lines("Time Type: Full time", "Department: Field Service"),
    }),
    writtenFacts({
      title: "Quality Engineer",
      description: lines("Worker Sub-Type: Fixed Term (Fixed Term)"),
    }),
  ],
  [{ ct: "i" }, { wt: "c" }, { ct: "t" }],
  "Workday's own lines at the end of its texts: worker type, sub-type and time type",
);
eq(
  [
    writtenFacts({
      title: "Elektroniker",
      description: lines(
        "Wir bieten:",
        "Unbefristet · Vollzeit",
        "30 Tage Urlaub",
      ),
    }),
    writtenFacts({
      title: "Anlagenmechaniker",
      description: lines("Ihr Profil:", "Vollzeit (Unbefristet)"),
    }),
    writtenFacts({
      title: "Technicien",
      description: lines(
        "Nous proposons un CDI à temps plein dans une équipe dynamique et bienveillante.",
      ),
    }),
    writtenFacts({
      title: "Mechaniker",
      description: lines("Befristet", "Unbefristet"),
    }),
    writtenFacts({
      title: "Mechaniker",
      description: lines("Ausbildung", "Wir freuen uns auf Sie"),
    }),
  ],
  [{ ct: "i", wt: "c" }, { ct: "i", wt: "c" }, { ct: "i", wt: "c" }, {}, {}],
  "a text's line that is only the contract or the hours, or a clear sentence (inSentences, below); two values or a training word say nothing",
);
eq(
  [
    "Ingeniero DevOps Senior - CDI - Mónaco",
    "Architecte Solutions - Paris [CDI]",
    "Content Marketing Writer (Contract)",
    "Stage - Ingénieur méthodes",
    "Stage Manager",
    "Contract Manager - Construction",
    "Affiliate Marketing Manager | Mid-Senior | B2B",
    "Interim General Counsel – Infrastructure",
  ].map(contractInTitle),
  ["CDI", "CDI", "Contract", "Stage", "", "", "", ""],
  "a title's part of its own; a title in one piece, a role, a market say nothing",
);

// ➤ «Art der Stelle» names both, as German employers' pages write it (the text corpus, 1 November 2026).
eq(
  writtenFacts({
    title: "Techniker",
    description: lines(
      "Wir bieten",
      "Art der Stelle: Vollzeit, Festanstellung",
      "Kontakt",
    ),
  }),
  { ct: "i", wt: "c" },
  "«Art der Stelle» gives the contract and the hours",
);
// ➤ The last day to apply as a labelled line writes it (the text corpus, 1 November 2026); a start day is none.
eq(
  [
    "Sista ansökningsdag: 2026-11-19",
    "Søknadsfrist: 08.11.2026",
    "Die Bewerbungsfrist endet am 15.11.2026.",
    "Closing date: 15 November 2026",
    "Date limite de candidature : 30/11/2026",
    "Eintritt: 01.12.2026",
  ].map(deadlineInText),
  ["2026-11-19", "2026-11-08", "2026-11-15", "2026-11-15", "2026-11-30", ""],
  "a labelled last day in any of its forms; a start day is no deadline",
);
// ➤ Formats the diary over the text corpus found unread (1 November 2026): a line of facts set off by dashes, a range of
// ➤ hours a week, a value with its workload.
eq(
  [
    loneInText(
      "Wir bieten\nVollzeit - ab sofort - unbefristet - Home Office 60 % - Deutsch C1\nKontakt",
    ),
    loneInText("Werktijden\n32 - 40 uur per week\nSalaris"),
    loneFacts("<div><span>Festanstellung 80-100%</span></div>"),
  ],
  [
    { contract: "unbefristet", hours: "vollzeit" },
    { hours: "32 40 uur per week" },
    { contract: "Festanstellung" },
  ],
  "a dashed line of facts, hours a week as a range, a value and its workload",
);
// ➤ Hours a week before a language's own phrase for «a week» or after «weekly», alone or after the time they detail
// ➤ (19 November 2026).
eq(
  [
    loneInText("Wymiar pracy\n20 godz. tygodniowo\nKontakt"),
    loneInText("Munkaidő\nheti 20 óra\nKapcsolat"),
    inSentences("Media jornada (20 horas semanales)."),
  ],
  [
    { hours: "20 godz. tygodniowo" },
    { hours: "heti 20 ora" },
    { hours: "20 horas semanales" },
  ],
  "hours a week before «tygodniowo», after «heti», and beside the time they detail",
);
// ➤ The pay and the last day a page writes as labelled fields of their own (the text corpus, 1 November 2026).
const withFields = withLabels(
  { title: "Data Scientist", description: "x" },
  "<ul><li><strong>Salary:</strong> £90,000 - £105,000 per annum + Bonus</li><li>Bewerbungsfrist</li><li>08.11.2026</li></ul>",
);
eq(
  [withFields.pay, withFields.expires],
  [{ min: 90000, max: 105000, currency: "GBP", period: "year" }, "2026-11-08"],
  "a page's labelled pay and last day, where its block gave none",
);
// ➤ Workday's fields: «Employee Type» and «Position Type» name the contract; a value ends where the next field of its line begins.
eq(
  [
    "Employee Type: Regular",
    "Position Type: Regular",
    "Job Type: Regular Pay Type: Hourly",
  ].map(
    (line) =>
      writtenFacts({ title: "Engineer", description: `Intro.\n${line}\nMore.` })
        .ct,
  ),
  ["i", "i", "i"],
  "Workday's employee and position types, and a value that ends at the next field",
);
// ➤ Fields one after another in a line that runs on, each where its label begins (the free-label bench, 17 November 2026).
eq(
  [
    "Företag: Montico HR Partner Ort: Ängelholm Omfattning: Visstidsanställning Ansök Vill du vara en viktig del i produktionen hos ett välrenommerat företag i Ängelholm?",
    "CONTRACT: Full-time permanent position, hybrid working model SALARY: €50,000 Key Responsibilities Lead the development of a new Research Strategy.",
    "Salary: £31,063 (FTE) Hours: Contract: Fixed Term - 18 months Deadline: 5:00pm on Monday 23rd",
    "Arbetstider: Måndag-fredag 7-16 Omfattning: Tillsvidaretjänst på heltid som inleds med 6 månaders provanställning.",
  ].map((line) => writtenFacts({ title: "Engineer", description: line })),
  [{ ct: "t" }, { ct: "i", wt: "c" }, { ct: "t18" }, { ct: "i", wt: "c" }],
  "fields inside a line that runs on, each value ending at the next field or after 80 characters",
);
// ➤ «ETT» is a Spanish temp agency in capitals, and Swedish «ett» ("a") in small letters.
eq(
  [
    "Operario (ETT)",
    "Temporal per ett",
    "Visstidsanställning hos ett företag",
  ].map((v) => contractKind(v)),
  ["e", "e", "t"],
  "a temp agency in capitals, not the Swedish word",
);
// ➤ A sentence that states the contract or the hours, when no line says them alone (the owner's choice, 1 November 2026).
const said = (t) => {
  const f = inSentences(t);
  return [contractKind(f.contract), workingTime(f.hours)];
};
eq(
  [
    said("Nous recrutons. AUDI recrute un Mécanicien Automobile H/F, en CDI."),
    said(
      "Wir suchen ab sofort, unbefristet und in Vollzeit einen Projektleiter (m/w/d).",
    ),
    said("This is a permanent, full-time position based in Leeds."),
    said("Je ontvangt direct een vast contract."),
    said("Poste en CDD de 6 mois à pourvoir rapidement."),
  ],
  [
    ["i", ""],
    ["i", "c"],
    ["i", "c"],
    ["i", ""],
    ["t6", ""],
  ],
  "one kind or one working time, said in a sentence",
);
eq(
  [
    said("Vast contract in het vooruitzicht."),
    said(
      "La possibilité d'obtenir un CDI après une période intérimaire réussie.",
    ),
    said(
      "Die Einstellung erfolgt direkt beim Kunden – keine Arbeitnehmerüberlassung.",
    ),
    said("Wir bieten CDI ou CDD selon profil."),
    said("Softwareentwickler (m/w/d) in Voll- und Teilzeit."),
    said("Sie haben eine abgeschlossene Ausbildung als Elektriker."),
    said("Ein unbefristeter Vertrag. Zunächst befristet auf zwei Jahre."),
  ],
  [
    ["", ""],
    ["", ""],
    ["", ""],
    ["", ""],
    ["", ""],
    ["", ""],
    ["", ""],
  ],
  "no chance, later step, denial or choice; no degree asked; and the sentences must agree",
);
eq(
  [
    said("Chercher le progrès permanent."),
    said("Je zorgt voor de uitvoering van tijdelijke nutsvoorzieningen."),
    said(
      "Ein unbefristetes Beschäftigungsverhältnis nach der Ausbildungszeit.",
    ),
    said("Contrato temporal de 6 meses."),
    said("Een tijdelijke functie van 12 maanden."),
  ],
  [
    ["", ""],
    ["", ""],
    ["", ""],
    ["t6", ""],
    ["t12", ""],
  ],
  "a loose word names a contract only beside a word of one; a step after training is no contract yet",
);
eq(
  [
    said("Enjoy unlimited PTO and paid holidays."),
    said("We offer contract hire and permanent placements."),
    said("Advice on permanent establishment and co-employment risk."),
    said(
      "Nous comptons des milliers de collaborateurs en CDI à travers le monde.",
    ),
    said("Vast contract na geslaagde interimperiode."),
    said("An unlimited employment contract."),
  ],
  [
    ["", ""],
    ["", ""],
    ["", ""],
    ["", ""],
    ["", ""],
    ["i", ""],
  ],
  "no perk, agency's or company's own line, or later step read as the job's contract (the whole store's sample)",
);
eq(
  [
    said("Medical, dental and vision coverage for full time employees."),
    said("25 vakantiedagen op jaarbasis bij een fulltime dienstverband."),
    said(
      "Applicants must be authorized to work in the United States on a full time basis.",
    ),
    said("Per direct een jaarcontract en zicht op een vast dienstverband."),
    said("Dan zetten we samen de stap naar een vast contract."),
    said("Frankfurt am Main, Teil-/Vollzeit, Softwareentwicklung."),
    said("Auch als Studentenjob geeignet."),
    said("Het betreft een fulltime rol in dagdienst."),
  ],
  [
    ["", ""],
    ["", ""],
    ["", ""],
    // ➤ A year's contract with a view to a permanent one is that prospect, as «met uitzicht op» is (15 November 2026).
    ["to", ""],
    ["", ""],
    ["", ""],
    ["", ""],
    ["", "c"],
  ],
  "a benefit or permit per full-time employee, a later step, a choice by slash or a job's suitability say nothing (the second sample)",
);
eq(
  [
    said("57"),
    said("Op zoek naar een nieuwe vaste job?"),
    said("Both permanent and contract opportunities are available."),
    said("Wir bieten flexible Arbeits- und Teilzeitmodelle."),
    said("Le remplacement de petits composants."),
    said("Contrat de remplacement de 3 mois."),
  ],
  [
    ["", ""],
    ["", ""],
    ["", ""],
    ["", ""],
    ["", ""],
    ["t3", ""],
  ],
  'a bare figure, a question, a choice with "both", part-time models and a replaced part say nothing; a replacement contract does (the third sample)',
);
eq(
  [
    said("Aussicht auf eine Festanstellung."),
    said("Med möjlighet till fast anställning hos Cobolt."),
    said("Compensation may be prorated relative to a full time schedule."),
    said("Annual bonus opportunities for all full time team members."),
    said(
      "Ernest Gordon acts as an employment agency for permanent recruitment.",
    ),
    said("We hire for temporary contracts and permanent job roles."),
    said("Vollzeit- und Teilzeitstellen in Lauda."),
    said("Vervanging van de legacy oplossing door Dynamics."),
    said(
      "Medical, dental and vision insurance from your first day in the full time team here.",
    ),
    said("This is a full time position based in Malta."),
  ],
  [
    ["", ""],
    ["", ""],
    ["", ""],
    ["", ""],
    ["", ""],
    ["", ""],
    ["", ""],
    ["", ""],
    ["", ""],
    ["", "c"],
  ],
  "hedges, prorations, benefits per member, agencies, choices and a replaced system say nothing; a long sentence about the job does (the fourth sample)",
);
eq(
  [
    said("That’s why most of our teams work from the office full time."),
    said("We offer great family friendly benefits to full time associates."),
    said("Een trimesterbonus van 600€ vanaf je een vast contract hebt."),
    said("Nous sommes aussi à la recherche d’étudiant."),
    said(
      "Du kannst beispielsweise bis zu 2 Wochen zusätzliche Ferien einkaufen und auf allen Stufen Teilzeit arbeiten.",
    ),
    said("Job étudiant."),
    said("This is a full-time position based in our office in Madrid."),
  ],
  [
    ["", ""],
    ["", ""],
    ["", ""],
    ["", ""],
    ["", ""],
    ["t", ""],
    ["", "c"],
  ],
  "the office kept full time, benefits for full-time staff, a contract that comes later, a student wanted besides and a part-time option say nothing; a student job and a job in an office do (the sixth sample)",
);
{
  const facts = (d) =>
    writtenFacts({ title: "Elektriker", description: d }, d).wt || "";
  eq(
    [
      facts("Art der Stelle: Vollzeit, Teilzeit, Festanstellung"),
      facts("Type Full-time · 40 hrs/week or Part time - 20 hrs/week"),
      facts("Arbeitszeit: Vollzeit"),
      facts("Vollzeit mit vielen Vorteilen"),
    ],
    ["", "", "c", "c"],
    "a line offering both times says neither; one time, or «Vorteile» beside it, says it",
  );
}
// ➤ Contracts the free-label bench found misread (9 November 2026): a benefit called unlimited, a hedge, a Dutch choice, positions
// ➤ in general say none; a temporary start with a prospect of a permanent one is read as such.
{
  const ct = (d) =>
    writtenFacts({ title: "Monteur", description: d, source: "x" }, d).ct || "";
  eq(
    [
      ct(lines("Benefits:", "Unlimited PTO", "Health insurance")),
      ct("Wir bieten in der Regel einen unbefristeten Arbeitsvertrag."),
      ct(
        "Wij bieden een contract op basis van een flexibele of meer vast dienstverband bij ons.",
      ),
      ct("You will not have the security offered by permanent positions."),
      ct("Contract: 1 jaar, met uitzicht op een vast contract."),
      ct(
        "Je krijgt direct uitzicht op een vast contract bij een groeiend bedrijf.",
      ),
      ct("Geen uitzicht op een vast contract."),
      ct("This is a permanent position based in London."),
      ct("Je krijgt een vast contract."),
    ],
    ["", "", "", "", "to", "to", "", "i", "i"],
    "unlimited PTO, a hedge, a choice and positions in general say none; a prospect of a permanent contract is a temporary start",
  );
}
// ➤ The working time a title names, and hours a week anywhere in the text, also in a page with no full stops (the free-label
// ➤ bench, 9 November 2026): not a choice of both, not two different weeks, not a short full week.
{
  const hours = (title, d = "Wir suchen dich.") =>
    writtenFacts({ title, description: d, source: "x" }, d).wt || "";
  eq(
    [
      hours("Elektriker (m/w/d) Vollzeit"),
      hours("Sales Advisor (Part-time) | London", "Join us."),
      hours("Examinierte Pflegefachkraft in Voll- u. Teilzeit (m/w/d)"),
      hours("Technicien (H/F) temps plein ou partiel"),
      hours("Mecánico (jornada completa o parcial)"),
      hours("Full Stack Developer"),
    ],
    ["c", "p", "", "", "", ""],
    "a title names the working time; a choice of both or a stack names none",
  );
  eq(
    [
      hours("Monteur", "Een afwisselende functie voor 16 tot 24 uur per week."),
      hours(
        "Elektroniker",
        "Der obligatorische Obstkorb, oder freie Getränke wie Wasser & Kaffee, sind für uns eine Selbstverständlichkeit Arbeitszeit: 40,00 Stunden pro Woche",
      ),
      hours(
        "Cook",
        "Weekly Hours: 39 hrs Responsibilities: Daily food preparation",
      ),
      hours("Monteur", "Wochenarbeitszeit: 40 Stunden"),
      hours(
        "Engineer",
        "You work 40 hours per week, or 32 hours per week if you prefer.",
      ),
      hours("Engineer", "A 32-hour week over four days."),
      hours("Support", "We answer within 24 hours."),
      hours("Fahrer", "Arbeitszeit: 8 Stunden pro Tag"),
      hours(
        "Account Executive",
        "Location: New York, NY (Hybrid - 3 days in office) | Type: Full-Time | Reports to: Head of Revenue",
      ),
    ],
    ["p24", "c", "c", "c", "", "", "", "", "c"],
    "hours a week anywhere in the text, alike throughout; a bare Type label",
  );
}
// ➤ A contract stated inside a run of words with no full stops (the free-label bench, 9 November 2026); a chance of one, there
// ➤ too, says none.
{
  const ct = (d) =>
    writtenFacts({ title: "Monteur", description: d, source: "x" }, d).ct || "";
  const pad =
    "Ein familiäres, nahbares Umfeld mit flachen Hierarchien und kurzen Entscheidungswegen Viel Freiraum zur persönlichen und fachlichen Weiterentwicklung";
  eq(
    [
      ct(
        `Das bieten wir Dir: ${pad} Unbefristeter Arbeitsvertrag Umfassendes Benefit-Programm mit betrieblicher Altersvorsorge, Firmenfitness und Jobrad ${pad}`,
      ),
      ct(
        `Opérateur Logistique H/F/D, Offre d emploi Esaris Métier : Supply Chain Type contrat : CDI Temps de travail : Temps plein Site(s) : Illkirch (67) Vos missions : ${pad} ${pad}`,
      ),
      ct(
        `Wir bieten nach erfolgreicher Probezeit die Chance auf ein unbefristetes Arbeitsverhältnis sowie viele weitere Vorteile ${pad} ${pad}`,
      ),
    ],
    ["i", "i", ""],
    "a contract in a run of words is read by its own phrase; a chance of one is none",
  );
}
// ➤ A choice, a denial or a prospect word traps a working time only near it; a short part of a long sentence that is a
// ➤ working time is one; decimal hours stay whole (the free-label bench, 9 November 2026).
{
  const wt = (d) =>
    writtenFacts({ title: "Engineer", description: d, source: "x" }, d).wt ||
    "";
  eq(
    [
      wt(
        "This is a full-time role which will operate out of the New York office, with the option to work remote 2-3x per week.",
      ),
      wt(
        "The base salary for this US-based, full-time, and exempt position is $100,000 not including variable compensation.",
      ),
      wt(
        "Full Time – £Competitive + Door to Door + Overtime + On Call and Call out",
      ),
      wt(
        "Newport News, VA; Virginia Beach, VA; Jacksonville, FL; Hampstead, NC - Regular Full-Time",
      ),
      wt(
        "Beginn: Zum nächstmöglichen Zeitpunkt, in Teilzeit (30,8 Std./Wo.), befristet bis 05.03.2027 mit Option auf Verlängerung",
      ),
    ],
    ["c", "c", "c", "c", "p"],
    "traps far from the working time; a short part; decimal hours",
  );
  eq(
    [
      wt("Die Stelle ist in Vollzeit oder Teilzeit zu besetzen."),
      wt(
        "This is a full-time role, but we are open to part-time arrangements.",
      ),
      wt("Not a full-time role."),
      wt("The position is full-time with the possibility of part-time later."),
      wt("Health insurance is offered to full-time employees."),
    ],
    ["", "", "", "c", ""],
    "a choice, a denial or a benefit near the working time still traps it; the other one offered later does not",
  );
  eq(
    [
      wt("Wir suchen dich in Vollzeit in Grevenkrug oder Stocksee."),
      wt("Type d'emploi : CDI ou CDD Temps plein"),
    ],
    ["c", "c"],
    "a choice of places or of contracts near the working time leaves it said",
  );
  const ct = (d) =>
    writtenFacts({ title: "Engineer", description: d, source: "x" }, d).ct ||
    "";

  eq(
    [
      ct(
        "Wir bieten eine befristete Stelle in Vollzeit, mit Option auf Verlängerung.",
      ),
      ct("Befristete oder unbefristete Stelle in Vollzeit."),
    ],
    ["t", ""],
    "an extension is no prospect, the contract stays temporary; a choice of contracts says none",
  );
}
// ➤ «in Vollzeit» speaks of the job; up to 60 hours a week is full time; a label value ends where «Start Date:» begins.
{
  const wt = (d) =>
    writtenFacts({ title: "Engineer", description: d, source: "x" }, d).wt ||
    "";
  eq(
    [
      wt(
        "Verstärken Sie ab sofort in Vollzeit unser Team in Friedberg bei Augsburg.",
      ),
      wt(
        "Working ~60 hrs/week in person with some of the most ambitious people in NYC",
      ),
      wt(
        "Job Title: Chief AI Architect Employment: Full time Start Date: ASAP Country: Cambridge, UK - Office based",
      ),
      wt("Hours: 50 to 70 hours per week with space for personal interests"),
      wt("Die Möglichkeit, in Teilzeit zu arbeiten, besteht."),
    ],
    ["c", "c", "c", "", ""],
    "in Vollzeit, sixty hours, a label before Start Date; not seventy hours nor a possibility",
  );
  const ct = (d) =>
    writtenFacts({ title: "Engineer", description: d, source: "x" }, d).ct ||
    "";
  eq(
    [
      ct("Un poste en CDI à pourvoir dès que possible."),
      ct(
        "Wir suchen so bald wie möglich eine unbefristete Stelle in Vollzeit zu besetzen.",
      ),
      ct("CDD avec possibilité de CDI."),
      ct("Possibilité de CDI après la période d'essai."),
    ],
    ["i", "i", "to", ""],
    "a start as soon as possible is no trap; a possibility of a contract still is, but a fixed term with the possibility of a permanent one is that prospect",
  );
}
// ➤ A long run of blank lines between a label and a long value (DAB-01) took minutes; now one space.
{
  const t0 = performance.now();
  eq(
    [
      labelledFacts(
        `<ul><li>Jornada:${"\n    ".repeat(2000)}${"x".repeat(100)}</li></ul>`,
      ),
      performance.now() - t0 < 1000,
    ],
    [{}, true],
    "a run of blank lines after a label reads fast",
  );
  eq(
    facts("<ul><li>Contract:\n\n   CDI</li></ul>"),
    { ct: "i" },
    "a value on a line after its label",
  );
}
// ➤ A Swiss title's share of a full week (the free-label bench, 16 November 2026: «Maler 100%», «Plattenleger 100%»).
eq(
  [
    "Maler 100%",
    "HR Administrator 50%",
    "Elektriker 50-80%",
    "Projektleiter 80-100%",
    "Desarrollador Java - Teletrabajo 100%",
  ].map((title) =>
    writtenFacts({ title, description: "Wir freuen uns auf Sie." }),
  ),
  [{ wt: "c" }, { wt: "p" }, { wt: "p" }, {}, {}],
  "a title's share of the week is its time; not a range up to a whole week, nor a mode's share",
);

done();
