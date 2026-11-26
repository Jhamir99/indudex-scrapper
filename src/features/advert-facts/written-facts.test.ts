import { describe, expect, it } from "vitest";
import { contractKind, workingTime } from "./contract.js";
import { contractInTitle, inSentences, writtenFacts } from "./labels.js";
import { agencyWorkCode, contractAndTime } from "./written-facts.js";

// The legacy's examples (test/labels.test.mjs, test/builder.test.mjs).
const lines = (...parts: string[]) => parts.join("\n");
const facts = (title: string, description: string, source = "x") =>
  writtenFacts({ title, description, source });
const said = (text: string) => {
  const found = inSentences(text);
  return [contractKind(found.contract), workingTime(found.hours)];
};

describe("the contract and working time a text writes (publication FR-4)", () => {
  it("reads Workday's own lines, and a value that ends at the next field", () => {
    expect([
      facts(
        "Network Engineer",
        lines("Worker Type: Permanent", "Language(s) Required: English"),
      ),
      facts(
        "Field Engineer",
        lines("Time Type: Full time", "Department: Field Service"),
      ),
      facts(
        "Quality Engineer",
        lines("Worker Sub-Type: Fixed Term (Fixed Term)"),
      ),
    ]).toEqual([{ ct: "i" }, { wt: "c" }, { ct: "t" }]);
    expect(
      [
        "Employee Type: Regular",
        "Position Type: Regular",
        "Job Type: Regular Pay Type: Hourly",
      ].map((line) => facts("Engineer", `Intro.\n${line}\nMore.`).ct),
    ).toEqual(["i", "i", "i"]);
  });

  it("reads a line that is only the value, or a clear sentence; two values or a training word say nothing", () => {
    expect([
      facts(
        "Elektroniker",
        lines("Wir bieten:", "Unbefristet · Vollzeit", "30 Tage Urlaub"),
      ),
      facts(
        "Anlagenmechaniker",
        lines("Ihr Profil:", "Vollzeit (Unbefristet)"),
      ),
      facts(
        "Technicien",
        "Nous proposons un CDI à temps plein dans une équipe dynamique et bienveillante.",
      ),
      facts("Mechaniker", lines("Befristet", "Unbefristet")),
      facts("Mechaniker", lines("Ausbildung", "Wir freuen uns auf Sie")),
      facts(
        "Techniker",
        lines(
          "Wir bieten",
          "Art der Stelle: Vollzeit, Festanstellung",
          "Kontakt",
        ),
      ),
    ]).toEqual([
      { ct: "i", wt: "c" },
      { ct: "i", wt: "c" },
      { ct: "i", wt: "c" },
      {},
      {},
      { ct: "i", wt: "c" },
    ]);
  });

  it("reads a contract in a part of the title of its own", () => {
    expect(
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
    ).toEqual(["CDI", "CDI", "Contract", "Stage", "", "", "", ""]);
  });

  it("reads one kind or one working time said in a sentence", () => {
    expect(
      [
        "Nous recrutons. AUDI recrute un Mécanicien Automobile H/F, en CDI.",
        "Wir suchen ab sofort, unbefristet und in Vollzeit einen Projektleiter (m/w/d).",
        "This is a permanent, full-time position based in Leeds.",
        "Je ontvangt direct een vast contract.",
        "Poste en CDD de 6 mois à pourvoir rapidement.",
        "Contrato temporal de 6 meses.",
        "An unlimited employment contract.",
        "This is a full time position based in Malta.",
      ].map(said),
    ).toEqual([
      ["i", ""],
      ["i", "c"],
      ["i", "c"],
      ["i", ""],
      ["t6", ""],
      ["t6", ""],
      ["i", ""],
      ["", "c"],
    ]);
  });

  it("reads no chance, later step, denial, choice, perk, agency's line or hedge as the job's contract", () => {
    expect(
      [
        "Vast contract in het vooruitzicht.",
        "La possibilité d'obtenir un CDI après une période intérimaire réussie.",
        "Die Einstellung erfolgt direkt beim Kunden – keine Arbeitnehmerüberlassung.",
        "Wir bieten CDI ou CDD selon profil.",
        "Softwareentwickler (m/w/d) in Voll- und Teilzeit.",
        "Chercher le progrès permanent.",
        "Enjoy unlimited PTO and paid holidays.",
        "We offer contract hire and permanent placements.",
        "Medical, dental and vision coverage for full time employees.",
        "57",
        "Op zoek naar een nieuwe vaste job?",
      ].map(said),
    ).toEqual(Array.from({ length: 11 }, () => ["", ""]));
  });

  it("reads a temporary start with the prospect of a permanent contract as such", () => {
    expect(
      [
        lines("Benefits:", "Unlimited PTO", "Health insurance"),
        "Wir bieten in der Regel einen unbefristeten Arbeitsvertrag.",
        "Contract: 1 jaar, met uitzicht op een vast contract.",
        "Je krijgt direct uitzicht op een vast contract bij een groeiend bedrijf.",
        "Geen uitzicht op een vast contract.",
        "This is a permanent position based in London.",
      ].map((d) => facts("Monteur", d).ct ?? ""),
    ).toEqual(["", "", "to", "to", "", "i"]);
  });

  it("reads the working time a title names, not a choice of both; a line offering both says neither", () => {
    expect(
      [
        ["Elektriker (m/w/d) Vollzeit", "Wir suchen dich."],
        ["Sales Advisor (Part-time) | London", "Join us."],
        [
          "Examinierte Pflegefachkraft in Voll- u. Teilzeit (m/w/d)",
          "Wir suchen dich.",
        ],
        ["Technicien (H/F) temps plein ou partiel", "Wir suchen dich."],
        ["Full Stack Developer", "Wir suchen dich."],
        ["Elektriker", "Art der Stelle: Vollzeit, Teilzeit, Festanstellung"],
        [
          "Elektriker",
          "Type Full-time · 40 hrs/week or Part time - 20 hrs/week",
        ],
        ["Elektriker", "Vollzeit mit vielen Vorteilen"],
      ].map(([title = "", d = ""]) => facts(title, d).wt ?? ""),
    ).toEqual(["c", "p", "", "", "", "", "", "c"]);
  });
});

describe("agency work a text states (publication FR-4)", () => {
  it("is agency work whatever the field says, with the option to stay where offered; not where the text says it is none", () => {
    expect([
      agencyWorkCode(
        "i",
        "Wir suchen im Rahmen der Arbeitnehmerüberlassung einen Schlosser.",
      ),
      agencyWorkCode(
        "i",
        "Arbeitnehmerüberlassung\nmit der Chance auf Übernahme",
      ),
      agencyWorkCode(
        "i",
        "Wir bieten ausschließlich Direktvermittlungen (also keine Zeitarbeit) an. Arbeitnehmerüberlassung",
      ),
      agencyWorkCode("i", "Ein unbefristeter Vertrag."),
      agencyWorkCode(
        "a",
        "Wir suchen im Rahmen der Arbeitnehmerüberlassung einen Schlosser.",
      ),
    ]).toEqual(["e", "eo", "i", "i", "a"]);
  });

  it("gives the source's fields first, the text where they are silent", () => {
    const advert = {
      title: "Elektroniker",
      description: lines("Wir bieten:", "Unbefristet · Teilzeit"),
      source: "x",
    };
    expect(
      contractAndTime(advert, {
        contract: { kind: "temporary", months: 6 },
        workingTime: null,
      }),
    ).toEqual({
      contract: { kind: "temporary", months: 6 },
      workingTime: { kind: "part" },
    });
    expect(
      contractAndTime(advert, { contract: null, workingTime: null }),
    ).toEqual({
      contract: { kind: "permanent" },
      workingTime: { kind: "part" },
    });
  });
});
