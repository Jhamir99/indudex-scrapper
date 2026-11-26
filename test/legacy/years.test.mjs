// The legacy's test/years.test.mjs (JustJans/indudex@ec79858), carried whole (legacy resync T002-T003): its imports pointed at
// this repo.
// ➤ The years an advert asks for (builder/years.ts): the cases the owner found and those read on the store's sample
// ➤ (docs/research/years-asked.md).
import { harness } from "./harness.mjs";
import {
  yearsAsked,
  yearsRange,
} from "../../src/features/advert-facts/years.ts";

const { eq, done } = harness("years");
const NL = String.fromCharCode(10);
const read = (cases) =>
  cases.map(([title, lines]) => yearsAsked(title, lines.join(NL)));

eq(
  read([
    [
      "QA Engineer",
      [
        "What We Are Looking For",
        "3+ years in QA and test automation. You have built suites.",
      ],
    ],
    [
      "Software Engineer",
      [
        "Our ideal candidate has:",
        "3+ years of successful history in software engineering positions,",
      ],
    ],
    [
      "Ingénieur DevOps",
      ["Entre 7 et 12 ans d'expérience sur des fonctions similaires."],
    ],
    [
      "Électricien",
      [
        "Expérience significative dans le domaine de l'électricité (minimum 5 ans)",
      ],
    ],
    [
      "Full Stack",
      [
        "About us: we have 25 years of experience.",
        "3+ years of backend experience with Python",
        "Our team is great",
      ],
    ],
  ]),
  [3, 3, 7, 5, 3],
  'what the owner found: years with no "experience" word, a French range, a minimum far from its word, a list without full stops',
);

eq(
  read([
    ["Ingegnere", ["Requisiti: almeno 3 anni di esperienza nel ruolo"]],
    ["Inżynier", ["Wymagania: minimum 2 lata doświadczenia w automatyce"]],
    ["Ingenjör", ["Du har minst 3 års erfarenhet av PLC"]],
    ["Engenheiro", ["Experiência mínima de 4 anos em manutenção"]],
    ["Analista", ["tra 3 e 5 anni di esperienza"]],
    ["Vânzător", ["Experiență medie - între 3 și 5 ani"]],
  ]),
  [3, 2, 3, 4, 3, 3],
  "Italian, Polish, Swedish, Portuguese and Romanian, ranges by their low end",
);

eq(
  read([
    [
      "Project Manager",
      [
        "Minimum Qualifications Required:",
        "7–10 years in heavy industrial construction, with at least 3–5 years directly managing field operations",
      ],
    ],
    [
      "Key Account Manager",
      ["Skills: 2+ yrs. of experience in Distribution sales"],
    ],
    [
      "Design Engineer",
      ["Requirements", "7+ years designing and developing medical devices"],
    ],
    ["Operations", ["Experience", "6 – 10 years in logistics."]],
    [
      "Director",
      [
        "What we are looking for:",
        "8+ years of product management experience, including 3+ years managing PMs",
      ],
    ],
    [
      "Legal Counsel",
      ["About You", "Have 3-8 years of PQE on a corporate team"],
    ],
    [
      "Principal Engineer",
      [
        "Master's in Computer Science with at least 10 years of industry experience.",
      ],
    ],
    [
      "Nutzfahrzeugverkäufer",
      [
        "Ausbildung: kaufmännische Ausbildung oder technische Ausbildung Berufserfahrung: mind. 3-5 Jahre Sprachen: deutsch",
      ],
    ],
    [
      "Técnico SSI",
      [
        "Vous avez une expérience d’au moins de 2 ans dans le domaine de la Sécurité Incendie",
      ],
    ],
    [
      "Operador",
      [
        "Requisitos:",
        "- Brevete A3C (opcional A4).",
        "- 3 años operando camión fábrica en el sector",
      ],
    ],
    [
      "Buyer",
      ["8 years minimum Purchasing, Supply Chain, or Engineering experience"],
    ],
  ]),
  [7, 2, 7, 6, 8, 3, 10, 3, 2, 3, 8],
  "a heading over its line, an abbreviation, a total and what it includes, «al menos de», gerunds",
);

eq(
  read([
    ["Bezorger", ["- 18 jaar - €11,33"]],
    [
      "Werkzeugmechaniker",
      ["1 Jahr Statistik-Cookies helfen Webseiten-Besitzern"],
    ],
    ["Engineer", ["3+ years of experience preferred"]],
    ["Engineer", ["We have been in business for 30 years."]],
    ["Ajutor bucătar", ["Experiență puțină - mai puțin de 3 ani"]],
    ["Engineer", ["An engineer with an eye for detail. Let us know."]],
    [
      "Brand Ambassador",
      ["18 years old minimum", "High School diploma/GED required"],
    ],
    [
      "Smart Meter Engineer",
      [
        "A customer first mindset",
        "Valid MOCoPA certification held within the last 2 years (evidence required)",
      ],
    ],
    [
      "Duales Studium",
      [
        "Studieninhalte",
        "Die Studiendauer beträgt drei Jahre und gliedert sich in sechs Theorie- und Praxisphasen.",
      ],
    ],
    ["Accountant", ["Less than 2 years’ experience in accounting"]],
    [
      "DevSecOps",
      [
        "A few numbers that speak for themselves:",
        "4 years on the market — a stable, profitable company",
      ],
    ],
  ]),
  [null, null, null, null, null, null, null, null, null, null, null],
  "no years: an age, a cookie, a wish, a boast, a ceiling, a recent certificate, a course length",
);

// ➤ «1 Jahr», «5 à 7 ans minimum», a Czech minimum, and an aside that softens something else; the soft word alone still softens.
eq(
  read([
    ["Gießer", ["Mindestens 1 Jahr Berufserfahrung in der Gießerei"]],
    [
      "Architecte",
      [
        "- Expérience confirmée en architecture de solutions (5 à 7 ans minimum).",
      ],
    ],
    [
      "Technik kvality",
      ["Zkušenosti na pozici v kvalitě v automotive minimálně 3 roky"],
    ],
    [
      "Process Engineer",
      [
        "Minimum 3 years of experience in production processes (preferably in the electronics manufacturing sector),",
      ],
    ],
    [
      "Mechanical Engineer",
      [
        "BS in Mechanical Engineering (MS preferred) with 10+ years of mechanical engineering experience",
      ],
    ],
    [
      "Sales Manager",
      ["6+ years of sales experience.", "2+ years managing a team (preferred)"],
    ],
  ]),
  [1, 5, 3, 3, 10, 6],
  "the German singular, a French range with its minimum after, a Czech minimum, and soft asides",
);
eq(
  read([
    ["Elektriker", ["Anforderungen: Mindestens zwei Jahre Berufserfahrung"]],
    ["Engineer", ["More than three years of professional experience in IT"]],
    ["Technicien", ["Au moins deux ans d’expérience"]],
    [
      "Monteur",
      ["Mit über 15 Jahren Erfahrung bieten wir unseren Kunden Full-Service."],
    ],
    [
      "Entwickler",
      ["Mit mehr als 5 Jahren Erfahrung bringst du dein Wissen ein."],
    ],
    ["Analyst", ["One to three years of relevant professional experience."]],
    ["Analyst", ["Etwa drei bis fünf Jahre Erfahrung in Product Analytics."]],
  ]),
  [2, 3, 2, null, 5, 1, 3],
  "years in words, «more than» as the least, and a company’s own years that speak to no candidate",
);
// ➤ The forms the free-label bench found missed (9 November 2026): a wish after the years that speaks of something else, the
// ➤ Slovak «prax», the Polish adjective; a wish on the years themselves stays a wish.
eq(
  read([
    [
      "Lead Engineer",
      [
        "Minimum 5 years of professional engineering experience, ideally within the automotive industry.",
      ],
    ],
    [
      "Coordinator",
      [
        "Experience: 2–5 years in a project coordination or service admin role, preferably within the low voltage or IT industry.",
      ],
    ],
    ["Konstruktér", ["Prax: aspoň 2 roky"]],
    ["Inżynier", ["Posiadasz co najmniej 3 letnie doświadczenie."]],
    [
      "Konstrukteur",
      ["Minimum 3 Jahre Berufserfahrung, gerne im Maschinenbau."],
    ],
    ["Developer", ["Experience with Python, ideally 3 years."]],
    ["Planner", ["Experience Required: 2–5 years (preferred)"]],
  ]),
  [5, 2, 2, 3, 3, null, null],
  "a wish after the years about something else, Slovak and Polish forms; a wish on the years stays one",
);
// ➤ The slips found judging 45 published cards (9 November 2026): «over» is «more than»; a company's own years in Spanish; a
// ➤ wish about where the experience was made, with no comma; a wish on more years after the least asked.
eq(
  read([
    [
      "Data Engineer",
      [
        "Over 5 years of professional experience in Data Engineering, Analytics Engineering, or similar data-focused roles.",
      ],
    ],
    [
      "Técnico de Mantenimiento",
      [
        "Con más de 10 años de experiencia, nuestra actividad se centra en hoteles, apartamentos y residencias.",
      ],
    ],
    [
      "Técnico",
      [
        "Con más de 3 años de experiencia en mantenimiento industrial, buscamos tu talento.",
      ],
    ],
    [
      "Cost Leader",
      [
        "* Must have a minimum of 3 years of experience preferably in Cost management teams",
      ],
    ],
    ["Engineer", ["At least 5 years of experience, preferably 7."]],
  ]),
  [5, null, 3, 3, 5],
  "over as more than, a company boast in Spanish, a wish about the field, a wish on more years",
);
// ➤ The largest figure an advert asks is its demand; not one it says it does not ask, nor one in lieu of a degree (9 November 2026).
eq(
  read([
    [
      "Senior Account Executive",
      [
        "10+ years of professional experience.",
        "3+ years of B2B enterprise software or SaaS sales experience.",
      ],
    ],
    [
      "Staff Product Designer",
      [
        "7+ years of product design experience.",
        "We do not expect anyone to have ten years of experience with tools that are only beginning to emerge.",
      ],
    ],
    [
      "Triage Engineer",
      [
        "2+ years of professional experience working on safety critical systems.",
        "Bachelor's degree in Engineering or equivalent, or 4 years of relevant experience.",
      ],
    ],
    [
      "QA Manager",
      [
        "5+ years of experience in software quality assurance.",
        "3 years of experience with Selenium.",
      ],
    ],
  ]),
  [10, 7, 2, 5],
  "the largest figure asked; not one denied nor one in lieu of a degree",
);
eq(
  [
    "3+ years of experience in QA. 5+ years of experience in software.",
    "Minimum 5 years of experience.",
  ].map((t) => yearsRange("QA", t)),
  [
    { most: 5, least: 3 },
    { most: 5, least: 5 },
  ],
  "the fewest years asked beside the most, for the filter (decision 15)",
);

// ➤ A list run together, as one job board lays out its facts (19 November 2026): the years' item ends at the next label,
// ➤ so a wish in another item does not soften them; a wish in their own still does.
eq(
  read([
    [
      "Conseiller",
      [
        "Expérience: Vente automobile: 2 ans (Requis) Permis/certification: Permis B (Requis) Niveau d'étude souhaité Bac +2",
      ],
    ],
    [
      "Machinist",
      [
        "Experience: CNC: 3 years (required) Licence/Certification: Driving Licence (preferred) Work Location: In person",
      ],
    ],
    [
      "Schweißer",
      [
        "Erfahrung: Schweißen: 3 Jahre (Erforderlich) Führerschein: Klasse B (Wünschenswert)",
      ],
    ],
    [
      "Soldador",
      [
        "Experiencia: soldadura: 2 años (Obligatorio) Idiomas: inglés (Deseable)",
      ],
    ],
    [
      "Technician",
      ["Experience: dealership: 2 years (preferred) Work Location: In person"],
    ],
  ]),
  [2, 3, 3, 2, null],
  "a list run together: a wish in the next item does not soften the years",
);
// ➤ A long run with no comma after the years and their experience word: the wish reader looked back over all of it at
// ➤ every space, and a picture of 94 KB in an advert held the publication for hours (17 November 2026).
{
  const t0 = performance.now();
  const years = yearsAsked(
    "SEO",
    `You have 3 years of SEO experience ${"iVBOR w0K ".repeat(2000)}ideally in agencies`,
  );
  eq(
    [years, performance.now() - t0 < 1000],
    [3, true],
    "a long run after the years is read in linear time",
  );
}
done();
