import { describe, expect, it } from "vitest";
import { goldenSet } from "../../../../test/pay/golden.js";
import { payOfText } from "./pay-of-text.js";

const p = (title: string, text: string) => {
  const pay = payOfText(title, text);
  return pay && [pay.min, pay.max, pay.currency, pay.period];
};

const FLAT =
  "Unser Kunde ist ein innovatives Unternehmen aus der Medizintechnik und wir suchen für ihn in München mehrere Mechatroniker (m/w/d) Das bieten wir dir als Mechatroniker an: Unbefristete Einstellung Attraktive Vergütung ab 20 € Brutto pro Stunde Weihnachts- und Urlaubsgeld Zahlreiche Mitarbeiterrabatte Einen sauberen und ergonomischen Arbeitsplatz Kostenlose Parkplätze Mitarbeiterkantine Firmen-Events";

describe("payOfText (pay FR-5)", () => {
  it("reads the title's pay, an hour's when under a hundred, never a bonus for joining", () => {
    expect([
      p("Software Engineer at AIOS — Hybrid, €60k-€120k /yr + equity", ""),
      p("Electrical Technician — £39.29/hour Outside IR35", ""),
      p("Elektrikář Na Jednu Směnu (38-42.000 Kč) - Absolventi", "text"),
      p("Elektrikář - NÁBOROVÝ PŘÍSPĚVEK 100 000 Kč!!!", "text"),
      p("Electrical Foreman $2,500 Sign on Bonus!", "text"),
      p("AI Engineer — $20M Series A startup", ""),
    ]).toEqual([
      [60000, 120000, "EUR", "year"],
      [39.29, 39.29, "GBP", "hour"],
      [38000, 42000, "CZK", ""],
      null,
      null,
      null,
    ]);
    expect(p("Werfleider startloon €21,8 + 32 verlofdagen", "")).toEqual([
      21.8,
      21.8,
      "EUR",
      "hour",
    ]);
  });

  it("reads the first labelled line that gives a pay, a word before or after the label", () => {
    expect([
      p(
        "Dessinateur",
        "Nous recherchons.\nRémunération : De 34 000 € à 50 000 € brut par an\nContrat : CDI",
      ),
      p("Electrician", "About us.\nStarting Salary £38,500 / O/T available"),
      p("Elektroniker", "Jahresgehalt: 40.000 € - 44.000 €"),
      p("Electrician", "Electrician\nRate: £240-£250 a day\nLocation: Leeds"),
      p("Techniker", "Mindestgehalt: € 3.200 brutto pro Monat"),
      p(
        "Developer",
        "Benefits.\nCompetitive salary and benefits\nSalary sacrifice scheme available",
      ),
      p("Engineer", "Salary of up to £50,000"),
      p("Electricien", "Salaire : 2500 € net / mois"),
    ]).toEqual([
      [34000, 50000, "EUR", "year"],
      [38500, 38500, "GBP", ""],
      [40000, 44000, "EUR", "year"],
      [240, 250, "GBP", "day"],
      [3200, 3200, "EUR", "month"],
      null,
      null,
      null,
    ]);
  });

  it("reads a sentence that names the pay with its figure, and a flattened text around its pay word", () => {
    expect([
      p(
        "Monteur",
        "Wat bieden wij:\nEen salaris tussen € 3.500,- en € 4.500,- bruto per maand, afhankelijk van ervaring.",
      ),
      p(
        "Technicien",
        "Rémunération entre 32 000 et 37 000€ brut par an, selon profil.",
      ),
      p("Monteur", "Wir zahlen einen Stundenlohn von 17,50 € brutto."),
      p(
        "Techniker",
        "Wir bieten ein attraktives Gehalt sowie einen Bonus von 5.000 €.",
      ),
      p("Mechatroniker", FLAT),
      p(
        "Mechatroniker",
        FLAT.replace("Weihnachts- und Urlaubsgeld", "ein Bonus von 500 €"),
      ),
      p("Helfer", "Mindestlohn 12,82 € wird gezahlt"),
      p("Buchhalter", "Erfahrung in der Lohnbuchhaltung und Gehaltsabrechnung"),
    ]).toEqual([
      [3500, 4500, "EUR", "month"],
      [32000, 37000, "EUR", "year"],
      [17.5, 17.5, "EUR", "hour"],
      null,
      [20, 20, "EUR", "hour"],
      null,
      null,
      null,
    ]);
  });

  it("reads a gross figure and a figure with its period, never a benefit, a price or a statistic", () => {
    expect([
      p(
        "Wirtschaftsinformatiker",
        "Hitzendorf 270 Vollzeit € 3.300 brutto / Monat Jetzt bewerben",
      ),
      p("Engineer", "Employment Agreement: 3.400 - 5.000 EUR gross"),
      p(
        "Engineer",
        "€1,200 Gross (paid in 2 instalments) - to support relocation and initial rent costs",
      ),
      p("Monteur", "Fulltime, €3000 p/m!"),
      p("Engineer", "£28 - £30 per hour"),
      p("Verkäufer", "Unsere Tarife gibt es ab 9,99 € pro Monat."),
      p("Monteur", "Reiskostenvergoeding van € 0,25/km."),
      p(
        "Environmental Engineers",
        "Salary : The median annual wage for environmental engineers is $96,820.",
      ),
    ]).toEqual([
      [3300, 3300, "EUR", "month"],
      [3400, 5000, "EUR", ""],
      null,
      [3000, 3000, "EUR", "month"],
      [28, 30, "GBP", "hour"],
      null,
      null,
      null,
    ]);
  });

  it("reads RAL, a band or a Czech pay alone on its line, and the employment band beside a B2B one", () => {
    expect([
      p("Analista", "RAL 33-45k"),
      p("Lackierer", "Lackierung in RAL 7016 nach Kundenwunsch."),
      p(
        "Programátor PLC",
        ["Náplň práce", "65.000 Kč", "Požadujeme"].join("\n"),
      ),
      p("Programátor", ["Bonus", "100 000 Kč", ""].join("\n")),
      p(
        "Programista",
        "Wynagrodzenie: UoP: 9 000 PLN – 12 500 PLN brutto | B2B: 65 PLN – 85 PLN / h.",
      ),
      p(
        "Programista",
        "Wynagrodzenie: 13 000 zł—17 000 zł (B2B)/ 11 000—15 000 zł brutto (UoP).",
      ),
    ]).toEqual([
      [33000, 45000, "EUR", "year"],
      null,
      [65000, 65000, "CZK", "month"],
      null,
      [9000, 12500, "PLN", ""],
      [11000, 15000, "PLN", ""],
    ]);
  });

  it("reads every title and text of the legacy's golden set the same", async () => {
    const { cases } = await goldenSet("text");
    const texts = cases.filter((c) => c.fn === "payOfText");
    expect(texts.length).toBeGreaterThan(1500);
    const differ = texts.filter(
      (c) =>
        JSON.stringify(
          payOfText(String(c.args[0] ?? ""), String(c.args[1] ?? "")),
        ) !== JSON.stringify(c.result),
    );
    expect(differ.map((c) => [c.args, c.result])).toEqual([]);
  });

  it("reads a long text with no pay quickly", () => {
    const text = `${"Wir suchen Verstärkung für unser Team in der Produktion und Montage. ".repeat(1400)}${" ".repeat(5000)}Gehalt nach Vereinbarung`;
    const started = performance.now();
    expect(payOfText("Monteur", text)).toBeNull();
    expect(performance.now() - started).toBeLessThan(50);
  });
});
