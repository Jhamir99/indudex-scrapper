// The legacy's test/text-pay.test.mjs (JustJans/indudex@ec79858), carried whole (legacy resync T004): its imports pointed at
// this repo.
// ➤ The pay an advert writes in its title or on a labelled line of its text (builder/text-pay.ts), read on the store's
// ➤ sample of 1 November 2026: ranges by their joining word, the figure beside the currency, no net pay, no ceiling alone.
import { harness } from "./harness.mjs";
import { payOfText, payInText } from "../../src/features/pay/text-pay.ts";

const { eq, done } = harness("text pay");
const p = (title, text) => {
  const r = payOfText(title, text);
  return r ? [r.min, r.max, r.currency, r.period] : null;
};

eq(
  [
    p(
      "Dessinateur",
      "Nous recherchons.\nRémunération : De 34 000 € à 50 000 € brut par an\nContrat : CDI",
    ),
    p("Software Engineer at AIOS — Hybrid, €60k-€120k /yr + equity", ""),
    p("Analista", "Retribución: 36.000 € - 42.000 € Bruto/año"),
    p("Technicien", "Salaire : 25-34 k€ selon profil"),
    p("Monteur", "Gehalt: 3.500 € - 4.200 € brutto pro Monat"),
    p("Werfleider startloon €21,8 + 32 verlofdagen", ""),
    p("Operator", "Wynagrodzenie: 16 EUR/h, 40 h tygodniowo"),
  ],
  [
    [34000, 50000, "EUR", "year"],
    [60000, 120000, "EUR", "year"],
    [36000, 42000, "EUR", "year"],
    [25000, 34000, "EUR", ""],
    [3500, 4200, "EUR", "month"],
    [21.8, 21.8, "EUR", "hour"],
    [16, 16, "EUR", "hour"],
  ],
  "ranges joined by a word or a dash; otherwise the figure beside the currency, not a number of days or hours",
);
eq(
  [
    p("Electricien", "Salaire : 2500 € net / mois"),
    p("Wohnmobil Techniker (M/W/D) - Bis Zu €45.000 Pro Jahr", ""),
    p(
      "Product Owner",
      "Salaris: tot €89.000 bruto per jaar, afhankelijk van ervaring",
    ),
    p("Ingénieur", "Salaire : selon profil"),
    payInText("About 40 people work here"),
  ],
  [null, null, [0, 89000, "EUR", "year"], null, null],
  "no net pay, no ceiling in a title, a ceiling a pay word names as its top alone (DAA-28), no words without figures, no figures without a currency",
);
// ➤ Labels with a word beside them, and without a colon before the figure (the offers' diary, 1 November 2026).
eq(
  [
    p("Electrician", "About us.\nStarting Salary £38,500 / O/T available"),
    p("Engineer", "Salary range: €70,000–€90,000 per year"),
    p(
      "Account Executive",
      "Compensation: £65,000 - 75,000 (£78-90k OTE uncapped)",
    ),
    p("Elektroniker", "Jahresgehalt: 40.000 € - 44.000 €"),
    p("Analyste", "Salaire annuel brut : 42 000 € à 48 000 €"),
    p(
      "Developer",
      "Benefits.\nCompetitive salary and benefits\nSalary sacrifice scheme available",
    ),
  ],
  [
    [38500, 38500, "GBP", ""],
    [70000, 90000, "EUR", "year"],
    [65000, 75000, "GBP", ""],
    [40000, 44000, "EUR", "year"],
    [42000, 48000, "EUR", "year"],
    null,
  ],
  "a word before or after the label, the period it names, and no colon before a figure; words alone still say nothing",
);
eq(
  [
    p("Developer", "Perks\n💰 Compensation: €50–70K + equity"),
    p("Engineer", "Total Compensation: 140,000 to 200,000 GBP"),
    p(
      "Engineer",
      "Base salary is €55,000 to €70,000 annually, plus €5,000 variable compensation.",
    ),
    p("Engineer", "Competitive salary of £120,000 to £150,000"),
    p(
      "Techniker",
      "Attraktives Gehalt, inklusive 500 € Close-to-Office-Bonus.",
    ),
    p("Engineer", "Salary of up to £50,000"),
  ],
  [
    [50000, 70000, "EUR", ""],
    [140000, 200000, "GBP", ""],
    [55000, 70000, "EUR", "year"],
    [120000, 150000, "GBP", ""],
    null,
    [0, 50000, "GBP", ""],
  ],
  "a mark before the label, «total» or «competitive» before it, «is» or «of» before the figure (the diary, 1 November 2026); a bonus beside the word says nothing, a ceiling its top alone",
);
eq(
  [
    p(
      "Monteur",
      "Wat bieden wij:\nEen salaris tussen € 3.500,- en € 4.500,- bruto per maand, afhankelijk van ervaring.",
    ),
    p(
      "Engineer",
      "The salary range for this position is EUR 48,000 – EUR 55,000 gross annual (RAL).",
    ),
    p(
      "Technicien",
      "Rémunération entre 32 000 et 37 000€ brut par an, selon profil.",
    ),
    p("Elektriker", "Wir bieten eine attraktive Vergütung – ab 22,50 €/Std."),
    p(
      "Techniker",
      "Wir bieten ein attraktives Gehalt sowie einen Bonus von 5.000 €.",
    ),
    p(
      "Engineer",
      "Our company raised €20 million last year and pays a competitive salary.",
    ),
  ],
  [
    [3500, 4500, "EUR", "month"],
    [48000, 55000, "EUR", "year"],
    [32000, 37000, "EUR", "year"],
    [22.5, 22.5, "EUR", "hour"],
    null,
    null,
  ],
  "a sentence that names the pay with its figure; a Dutch «,-», a range naming its currency twice; a bonus or a company's millions say nothing",
);
const flat =
  "Unser Kunde ist ein innovatives Unternehmen aus der Medizintechnik und wir suchen für ihn in München mehrere Mechatroniker (m/w/d) Das bieten wir dir als Mechatroniker an: Unbefristete Einstellung Attraktive Vergütung ab 20 € Brutto pro Stunde Weihnachts- und Urlaubsgeld Zahlreiche Mitarbeiterrabatte Einen sauberen und ergonomischen Arbeitsplatz Kostenlose Parkplätze Mitarbeiterkantine Firmen-Events";
eq(
  [
    p("Mechatroniker", flat),
    p(
      "Mechatroniker",
      flat.replace("Weihnachts- und Urlaubsgeld", "ein Bonus von 500 €"),
    ),
  ],
  [[20, 20, "EUR", "hour"], null],
  "a text flattened into one run is read around its pay word; a bonus beside it still says nothing",
);
// ➤ Dollars, shown as written (the owner's choice, 1 November 2026); another dollar or a company's millions are no pay.
eq(
  [
    p("Software Engineer at AIOS — Hybrid, $200k-$400k /yr + equity", ""),
    p("Engineer", "Salary: $120,000 - $150,000 per year"),
    p("Engineer", "Base salary range: USD 90,000–110,000"),
    p("Engineer", "Salary: CA$90,000 - CA$110,000"),
    p("AI Engineer — $20M Series A startup", ""),
    p("Ingenieur (m/w/d) – €5 Mio. Projekte", ""),
  ],
  [
    [200000, 400000, "USD", "year"],
    [120000, 150000, "USD", "year"],
    [90000, 110000, "USD", ""],
    null,
    null,
    null,
  ],
  "the US dollar by its sign or code; a Canadian one is not read, nor millions a company raised or builds",
);
eq(
  [
    p(
      "Werkvoorbereider",
      "Wat wij bieden\nSalaris tussen de € 2500 en € 3500 b.p.m. Op fulltime basis.",
    ),
    p(
      "Senior Health & Safety Advisor",
      "Salary: €100,000 Package (including flights) Type: Permanent Project Value: €30M Our client",
    ),
    p(
      "Environmental Engineers",
      "Salary : The median annual wage for environmental engineers is $96,820.",
    ),
    p(
      "Business Analyst",
      "Employees can expect to earn an average total compensation of $112,000 based on 67 salaries.",
    ),
  ],
  [[2500, 3500, "EUR", "month"], [100000, 100000, "EUR", ""], null, null],
  "a project's millions are set aside and the pay beside them read; «b.p.m.» is a month, not billions; a statistic is no pay",
);

// ➤ A contractor's rate is a pay (the text corpus, 1 November 2026); a success or interest rate is not.
eq(
  [
    p("Electrician", "Electrician\nRate: £240-£250 a day\nLocation: Leeds"),
    p("Engineer", "Day rate: €450 - €550"),
    p("Engineer", "Success rate: 95 % of our projects"),
    p("Analyst", "Interest rate of 5 % on savings accounts"),
  ],
  [[240, 250, "GBP", "day"], [450, 550, "EUR", "day"], null, null],
  "a rate with its figures and currency; a success or interest rate says nothing",
);
// ➤ Austria's minimum pay by collective agreement, which its adverts must state (the text corpus, 1 November 2026).
eq(
  [
    p(
      "Consultant",
      "Für die Funktion ist (laut Rahmenkollektivvertrag) ein Mindestentgelt von € 42.000,- brutto pro Jahr vorgesehen. Eine Überzahlung ist möglich.",
    ),
    p("Techniker", "Mindestgehalt: € 3.200 brutto pro Monat"),
  ],
  [
    [42000, 42000, "EUR", "year"],
    [3200, 3200, "EUR", "month"],
  ],
  "a «Mindestentgelt» in a sentence, a «Mindestgehalt» as a label",
);
// ➤ The German hourly wage, labelled or in a sentence, and «/hour»; the legal minimum («Mindestlohn») is no label.
eq(
  [
    p("Elektriker", "Stundenlohn: 18,50 €"),
    p("Monteur", "Wir zahlen einen Stundenlohn von 17,50 € brutto."),
    p("Electrical Technician — £39.29/hour Outside IR35", ""),
    p("Helfer", "Mindestlohn 12,82 € wird gezahlt"),
  ],
  [
    [18.5, 18.5, "EUR", "hour"],
    [17.5, 17.5, "EUR", "hour"],
    [39.29, 39.29, "GBP", "hour"],
    null,
  ],
  "an hourly wage in German, and per hour after a slash",
);
// ➤ German pay in any compound of Lohn, Gehalt or Vergütung, but not the legal minimum, nor a training year read as a pay per year.
eq(
  [
    p("CNC-Dreher", "Lohn ab 18,00 € / h"),
    p("Mechaniker", "Einstiegslohn ab 18,09 € pro Stunde"),
    p("Azubi", "Die Ausbildungsvergütung beträgt 1.200 € im ersten Jahr")?.[3],
    p("Buchhalter", "Erfahrung in der Lohnbuchhaltung und Gehaltsabrechnung"),
  ],
  [[18, 18, "EUR", "hour"], [18.09, 18.09, "EUR", "hour"], "", null],
  "a Lohn compound reads a pay; a training year is no year of pay; payroll words alone are none",
);
// ➤ The pay words and forms the offers' report found unread (8 November 2026): German «Verdienst», «Bezahlung», «Gehaltsspanne»,
// ➤ «Gehaltspaket»; Dutch «uurloon»; English «pay range»; a code stuck to its figure; the Nordic crowns; Austria's
// ➤ «Mindestlohn laut KV» (the job's minimum, not the legal one), and «€ … Std.» per hour, but not «40 Std./Woche».
eq(
  [
    p(
      "Bauleiter",
      "Verdienst: 60.000,00€ bis 90.000,00€ (je nach Qualifikation)",
    ),
    p(
      "Elektroniker",
      "Verdienst zwischen 23,90 € und 26,50 € brutto je Arbeitsstunde",
    ),
    p(
      "Anlagenmechaniker",
      "Bezahlung nach Qualifikation: 15,66€ - 23,54€ Std.",
    ),
    p(
      "Architect",
      "Die Position ist mit einer Gehaltsspanne von 74.400 € bis 81.200 € brutto jährlich ausgestattet",
    ),
    p(
      "Developer",
      "Gehaltspaket: 58.000 - 63.000€ brutto/jährlich (inkl. Bonus)",
    ),
    p("Servicetechnieker", "Bruto uurloon tussen €32,32 en €35,88"),
    p("Lead", "The annual pay range for the role is €150,000 - €180,000"),
    p("Engineer", "Salary: GBP45,000 - GBP55,000 per annum"),
    p("Montör", "Lön: SEK 30 000 per månad"),
    p("Snickare", "Lön 32 000 kr/mån"),
    p("Elektriker", "Mindestlohn laut KV ab € 2.948,85 brutto pro Monat"),
    p("Techniker", "Bezahlung: € 3.000 brutto, 40 Std./Woche")?.[3],
  ],
  [
    [60000, 90000, "EUR", ""],
    [23.9, 26.5, "EUR", "hour"],
    [15.66, 23.54, "EUR", "hour"],
    [74400, 81200, "EUR", "year"],
    [58000, 63000, "EUR", "year"],
    [32.32, 35.88, "EUR", "hour"],
    [150000, 180000, "EUR", "year"],
    [45000, 55000, "GBP", "year"],
    [30000, 30000, "SEK", "month"],
    [32000, 32000, "kr", "month"],
    [2948.85, 2948.85, "EUR", "month"],
    "",
  ],
  "the pay words, codes, crowns and periods the offers' report found unread",
);
// ➤ A figure called gross with no pay word; a Czech title's crowns, its thousands written once, not a bonus for joining; a pay
// ➤ word's figure judged by its own words; a figure just before the pay word (the report of 2 November 2026).
eq(
  [
    p(
      "Wirtschaftsinformatiker",
      "Hitzendorf 270 Vollzeit € 3.300 brutto / Monat Jetzt bewerben",
    ),
    p("Engineer", "Employment Agreement: 3.400 - 5.000 EUR gross"),
    p("Elektrikář Na Jednu Směnu (38-42.000 Kč) - Absolventi", "text"),
    p("Elektrikář - NÁBOROVÝ PŘÍSPĚVEK 100 000 Kč!!!", "text"),
    p("Electrical Foreman $2,500 Sign on Bonus!", "text"),
    p("Diesel Technician - Earn a $5,000 Bonus!", "text"),
    p(
      "Data Analyst | Amsterdam | Online Platform | €70K + bonus",
      "text",
    )?.slice(0, 3),
    p(
      "Engineer",
      "€1,200 Gross (paid in 2 instalments) - to support relocation and initial rent costs",
    ),
  ],
  [
    [3300, 3300, "EUR", "month"],
    [3400, 5000, "EUR", ""],
    [38000, 42000, "CZK", ""],
    null,
    null,
    null,
    [70000, 70000, "EUR"],
    null,
  ],
  "a gross figure, a Czech title; a bonus for joining is no pay, a pay with a bonus on top is; a relocation sum is none",
);
eq(
  [
    p(
      "Engineer",
      "The annual pay range for the role is €150,000 - €200,000 OTE plus benefits and pre-IPO stock options.",
    ),
    p(
      "Progettista",
      "La retribuzione annua lorda per questo ruolo in base al sistema di politica retributiva applicato in azienda è compresa tra € 29.400 e € 36.500 lordi.",
    ),
    p("Engineer", "€70-100K salary + equity as Full Time"),
    p(
      "Engineer",
      "Total rewards: Competitive €3,000 monthly base salary + lunch & wellness benefits.",
    ),
    p(
      "Engineer",
      "The estimated total compensation for this role ranges from € 140,000 - € 215,000, along with an equity component.",
    ),
    p(
      "Engineer",
      "Support for your relocation and a one-off compensation of EUR 5,000",
    ),
  ],
  [
    [150000, 200000, "EUR", "year"],
    [29400, 36500, "EUR", "year"],
    [70000, 100000, "EUR", ""],
    [3000, 3000, "EUR", "month"],
    [140000, 215000, "EUR", ""],
    null,
  ],
  "shares or a bonus offered besides the pay; a figure before the pay word; a relocation sum is none",
);

// ➤ A window of words is never cut inside a figure, and the period after the figure is read past it (the pay measurement of
// ➤ 8 November 2026: «£9» of a cut "£93,000"; a month lost after a long sentence's figure).
eq(
  [
    p(
      "Director",
      "Base Pay Ranges and Benefits Information The estimated annual base salary as a new hire for this position ranges from £93,000 to £112,500.",
    ),
    p(
      "KFZ-Techniker",
      "Unser Gehaltsangebot basiert auf Marktgehältern, Qualifikation und Erfahrung und kann bei dieser Position über dem kollektivvertraglichen Mindestgehalt von € 3.000,- brutto/Monat liegen.",
    ),
  ],
  [
    [93000, 112500, "GBP", "year"],
    [3000, 3000, "EUR", "month"],
  ],
  "a figure is never cut, its period is read",
);

// ➤ A label followed by «between» or «from» in other languages, and Italian «RAL» as the year (the rebuilt report, 8 November 2026).
eq(
  [
    p("Developer", "RAL tra 45.000 € e 65.000 €, in base all'esperienza;"),
    p("Techniker", "Gehalt ab 4.000 € brutto im Monat"),
    p("Monteur", "Salaris vanaf € 3.000 per maand"),
  ],
  [
    [45000, 65000, "EUR", "year"],
    [4000, 4000, "EUR", "month"],
    [3000, 3000, "EUR", "month"],
  ],
  "a label with «tra», «ab», «vanaf» before its figure",
);

// ➤ Finnish «palkka» with «€/kk» and «€/v», English «wage», Danish «løn», Polish «zarobki» and «zł» before a space; a statistic
// ➤ stays none wherever its pay word stands (the rebuilt report, 8 November 2026).
eq(
  [
    p("Assistant", "Palkka: 3 300–4 000 €/kk kokemuksen mukaan."),
    p("Engineer", "Palkka on keskimäärin 92 000 €/v."),
    p("Operative", "The hourly wage is £12.50 plus holiday pay."),
    p("Tekniker", "Løn: 35.000 kr. pr. måned"),
    p("Programista", "Zarobki: 8 000 - 10 000 zł brutto miesięcznie"),
    p(
      "Engineer",
      "The median annual wage for environmental engineers is $96,820.",
    ),
  ],
  [
    [3300, 4000, "EUR", "month"],
    [92000, 92000, "EUR", "year"],
    [12.5, 12.5, "GBP", "hour"],
    [35000, 35000, "kr", "month"],
    [8000, 10000, "PLN", "month"],
    null,
  ],
  "more pay words; a statistic is none",
);

// ➤ Belgian hourly pays (the rebuilt report, 8 November 2026): the period beside the figure read, not a second figure's further
// ➤ on; «/heures»; a figure with four decimals is no thousands.
eq(
  [
    p(
      "Schipper",
      "Salaris: €16,27 bruto per uur + toeslagen (20% - 100%) bij 36 uur: € 2538,- bruto per maand",
    ),
    p(
      "Electromécanicien",
      "Ce que nous vous offrons: un salaire selon votre expérience de 20euros à 24 euros/heures.",
    ),
    p("Technieker", "Bruto uurloon: €18,1732 (start)"),
    p(
      "Technieker",
      "Een competitief bruto-uurloon tussen €18 en €22, afhankelijk van jouw ervaring",
    ),
  ],
  [
    [16.27, 16.27, "EUR", "hour"],
    [20, 24, "EUR", "hour"],
    [18.17, 18.17, "EUR", "hour"],
    [18, 22, "EUR", "hour"],
  ],
  "Belgian hourly pays",
);

// ➤ A reference written as a band is no pay beside a figure with its currency; a period further on in the sentence, with no
// ➤ other figure between, is the band's (9 November 2026).
eq(
  [
    p(
      "Conducteur de ligne",
      "Contrat CDD Salaire brut mensuel SMIC à 2 000 € Postuler à cette offre L’offre en résumé Référence : 2026-3332",
    ),
    p(
      "Engineer",
      "Competitive salary in the range of 4,500 to 8,000 eur gross (and more in exceptional cases) per month depending on your qualifications.",
    ),
  ],
  [
    [2000, 2000, "EUR", "month"],
    [4500, 8000, "EUR", "month"],
  ],
  "a reference is no band, and the month of a band said further on",
);

// ➤ The forms the free-label bench found missed (9 November 2026): a figure with its period and no pay word, Dutch
// ➤ compounds and «t/m», Italy's RAL with no currency, Polish and Czech ranges; and what stays no pay: a ceiling in Polish,
// ➤ a budget, an average, a refund, a price, a RAL colour.
eq(
  [
    p("Monteur", "Fulltime, €3000 p/m!"),
    p("Engineer", "£28 - £30 per hour"),
    p("Mechaniker", "Frühester Beginn ab sofort 17,00 - 19,00 EUR pro Stunde"),
    p("Asentaja", "Tyypillinen palkkahaitari tehtävissä on noin 13–15 €/h."),
    p(
      "Afdelingshoofd",
      "Een bruto maandsalaris tussen € 6.803 en € 8.285 (schaal 13).",
    ),
    p(
      "Adviseur",
      "Een goed salaris in lijn met jouw kennis en ervaring in een bandbreedte van € 3.900,- t/m 5.700 bruto per maand.",
    ),
    p("Analista", "RAL 33-45k"),
    p("Technieker", "18.39 € - 22.13 € per uur"),
    p("Operator", "Wynagrodzenie od 5000 do 7000 zł brutto"),
    p("Svářeč", "Mzda 30 000 až 40 000 Kč"),
  ],
  [
    [3000, 3000, "EUR", "month"],
    [28, 30, "GBP", "hour"],
    [17, 19, "EUR", "hour"],
    [13, 15, "EUR", "hour"],
    [6803, 8285, "EUR", "month"],
    [3900, 5700, "EUR", "month"],
    [33000, 45000, "EUR", "year"],
    [18.39, 22.13, "EUR", "hour"],
    [5000, 7000, "PLN", ""],
    [30000, 40000, "CZK", ""],
  ],
  "a figure with its period, Dutch compounds and t/m, RAL, ranges with their first currency, Polish and Czech ranges",
);
eq(
  [
    p(
      "Developer",
      "budżet projektu: do 145 PLN/h + VAT, w zależności od doświadczenia",
    ),
    p(
      "Eventschwester",
      "Unsere EventSchwestern verdienen derzeit im Durchschnitt etwa 200 € pro Pop-Up.",
    ),
    p("Analyst", "Rimborso spese 800€ al mese."),
    p("Verkäufer", "Unsere Tarife gibt es ab 9,99 € pro Monat."),
    p("Lackierer", "Lackierung in RAL 7016 nach Kundenwunsch."),
    p("Monteur", "Fahrtkostenzuschuss von 50 € pro Monat"),
  ],
  [null, null, null, null, null, null],
  "a budget, an average, a refund, a price, a colour and an allowance are no pay",
);
eq(
  [
    p("Developer", "Stawka: do 70 PLN/h"),
    p("Operator", "Wynagrodzenie nawet 7000 zł i tylko JEDNA ZMIANA."),
  ],
  [
    [0, 70, "PLN", "hour"],
    [0, 7000, "PLN", ""],
  ],
  "a ceiling a pay word names is its top alone (DAA-28)",
);

// ➤ The bench's next forms (9 November 2026): an hour glued to the figure, a band alone on its line, German compounds of
// ➤ Entlohnung, a currency written twice, «€70,-», the Czech «finanční ohodnocení»; a band its neighbour calls a budget is none.
eq(
  [
    p(
      "Nanny",
      "Competitive pay – £14.78ph - £17.97ph (including 12.07% holiday entitlement), based on experience and dedication.",
    ),
    p(
      "Nanny",
      "Competitive pay – £15.36ph (including 12.07% holiday entitlement)",
    ),
    p(
      "Support Engineer",
      ["Compensation", "$70,000-$80,000 USD", "Benefits"].join(
        String.fromCharCode(10),
      ),
    ),
    p(
      "LKW-Techniker",
      "Bruttomonatsentlohnung in etwa € 3.000 auf Vollzeitbasis",
    ),
    p("Technicien", "14,50 EUR (€) - 18 EUR (€) / heure"),
    p("Werkvoorbereider", "Een all-in tarief van €70,- per uur;"),
    p("Automechanik", "atraktivní finanční ohodnocení 36.500 - 42.000 Kč"),
    p(
      "Developer",
      ["Projects", "€ 2.000 - € 5.000", "per project budget"].join(
        String.fromCharCode(10),
      ),
    ),
  ],
  [
    [14.78, 17.97, "GBP", "hour"],
    [15.36, 15.36, "GBP", "hour"],
    [70000, 80000, "USD", ""],
    [3000, 3000, "EUR", ""],
    [14.5, 18, "EUR", "hour"],
    [70, 70, "EUR", "hour"],
    [36500, 42000, "CZK", ""],
    null,
  ],
  "hours glued, a band alone, compounds, a doubled currency, «,-», Czech; a project budget is none",
);

// ➤ The final bench's forms (9 November 2026): a label glued to the word before it, on-target earnings, a band alone with «DOE».
eq(
  [
    p(
      "Infrastructure Engineer",
      "Senior Infrastructure Engineer (DevOps)Location: DublinSalary: €70,000-€80,000 An established multinational in the technology industry",
    ),
    p("Account Executive", "OTE $224K-$394K"),
    p(
      "Mechanic",
      ["Salary", "£40,000 – £50,000 DOE plus benefits", "Apply now"].join(
        String.fromCharCode(10),
      ),
    ),
  ],
  [
    [70000, 80000, "EUR", ""],
    [224000, 394000, "USD", ""],
    [40000, 50000, "GBP", ""],
  ],
  "a glued label, on-target earnings, a band with DOE",
);

// ➤ A Dutch internship's pay, a Czech pay alone on its line, Czech and Polish ranges that repeat their currency, and the
// ➤ employment band of a Polish line that gives a B2B one too (9 November 2026).
const NL = String.fromCharCode(10);
eq(
  [
    p(
      "Stage",
      "Een stagevergoeding van €500 per maand bij een full time meewerk stage;",
    ),
    p("Programátor PLC", ["Náplň práce", "65.000 Kč", "Požadujeme"].join(NL)),
    p("Programátor", "Plat od 40.000 Kč do 50.000 Kč měsíčně"),
    p(
      "Programista",
      "Wynagrodzenie: UoP: 9 000 PLN – 12 500 PLN brutto | B2B: 65 PLN – 85 PLN / h.",
    ),
    p(
      "Programista",
      "Wynagrodzenie: 13 000 zł—17 000 zł (B2B)/ 11 000—15 000 zł brutto (UoP).",
    ),
  ],
  [
    [500, 500, "EUR", "month"],
    [65000, 65000, "CZK", "month"],
    [40000, 50000, "CZK", "month"],
    [9000, 12500, "PLN", ""],
    [11000, 15000, "PLN", ""],
  ],
  "an internship pay, a Czech pay alone, a repeated currency, the employment band before the B2B one",
);
eq(
  [
    p("Programátor", ["Bonus", "100 000 Kč", ""].join(NL)),
    p("Monteur", "Reiskostenvergoeding van € 0,25/km."),
  ],
  [null, null],
  "a Czech bonus and a travel allowance are no pay",
);

// ➤ Bands cut at their bottom (the disagreements with the sources' fields, 9 November 2026): a period glued to the first end,
// ➤ «USD$», and the Polish and Czech thousand written as a word.
eq(
  [
    p("Engineer", "Pay Range: $24/hr - $28/hr"),
    p("Engineer", "Salary: $38.94/hr - $47.60/hr"),
    p("Engineer", "Pay: $150,000/yr to $180,000/yr"),
    p(
      "Engineer",
      "The starting pay range for this role is between USD$90,000 - USD$100,000 per year.",
    ),
    p("Programista", "Wynagrodzenie: 6,5 - 7,5 tys. zł brutto miesięcznie"),
    p("Programista", "Wynagrodzenie: 6,5 tys. zł brutto"),
    p("Programátor", "Plat: 40 - 50 tis. Kč"),
  ],
  [
    [24, 28, "USD", "hour"],
    [38.94, 47.6, "USD", "hour"],
    [150000, 180000, "USD", "year"],
    [90000, 100000, "USD", "year"],
    [6500, 7500, "PLN", "month"],
    [6500, 6500, "PLN", ""],
    [40000, 50000, "CZK", ""],
  ],
  "a period on the first end, USD$, tys. and tis.",
);
// A run of label words one after another (DAA-01) took hours: the space between two could be read two ways.
const run = Array.from(
  { length: 60 },
  (_, i) => ["starting", "base", "gross", "annual", "monthly", "total"][i % 6],
).join(" ");
const t0 = performance.now();
eq(
  [p("", `\n${run} x`), performance.now() - t0 < 1000],
  [null, true],
  "a run of label words reads fast",
);
eq(
  p("", "Gross - annual salary: €40.000"),
  [40000, 40000, "EUR", "year"],
  "label words joined by a dash",
);
done();
