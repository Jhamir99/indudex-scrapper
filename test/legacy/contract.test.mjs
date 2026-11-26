// The legacy's test/contract.test.mjs (JustJans/indudex@ec79858), carried whole (legacy resync T002-T003): its imports pointed at
// this repo, the site's cases left out.
// ➤ The contract and working time read from the sources' own fields (docs/research/contract-type.md).
import { harness } from "./harness.mjs";
import {
  contractKind,
  workingTime,
  contractOf,
} from "../../src/features/advert-facts/contract.ts";

const { eq, done } = harness("contract");

// ➤ The values the sources write, measured on 30 October 2026.
eq(
  [
    "Contracte laboral indefinit",
    "Contracte laboral temporal (6 mesos)",
    "Contracte mercantil (només ofertes)",
  ].map((v) => contractKind(v)),
  ["i", "t6", "a"],
  "Feina Activa: permanent, six months' temporary, a commercial contract",
);
eq(
  [
    "Vaste job",
    'Interim met optie "vast werk"',
    "Tijdelijke job (met optie vast)",
    "Tijdelijke job (niet via uitzendkantoren)",
    "Interim Job (uitsluitend voor uitzendkantoren)",
    "Vaste job bij het uitzendkantoor",
    "Zelfstandige activiteit",
    "Overeenkomst alternerende opleiding",
    "Flexijob",
    "Dienstenchequebaan",
  ].map((v) => contractKind(v)),
  ["i", "eo", "to", "t", "e", "i", "a", "p", "t", ""],
  'VDAB: "not via agencies" is no agency work, a permanent contract with an agency is permanent',
);
eq(
  [
    "Durée indéterminée",
    "Intérimaire avec option sur durée indéterminée",
    "Intérimaire",
    "Durée déterminée",
    "Flexi-Jobs",
    "Contrat collaboration indépendant",
    "Salarié statutaire",
    "Journalier (occasionnel ou saisonnier)",
  ].map((v) => contractKind(v)),
  ["i", "eo", "e", "t", "t", "a", "i", "t"],
  "Le Forem",
);
eq(
  [
    "CDI",
    "CDI Intérimaire",
    "Intérim",
    "CDD",
    "Saisonnier",
    "Profession libérale",
    "Franchise",
  ].map((v) => contractKind(v)),
  ["i", "i", "e", "t", "t", "a", "a"],
  "France Travail: «CDI Intérimaire» is a permanent contract with the agency",
);
eq(
  [
    "Unbefristete Direktanstellung, keine Zeitarbeit",
    "CDI, pas d'intérim",
    "Keine Arbeitnehmerüberlassung",
  ].map((v) => contractKind(v)),
  ["i", "i", ""],
  "Agency work ruled out names no kind",
);
eq(
  [
    contractKind("contract", { source: "adzuna" }),
    contractKind("contract", { source: "ashby" }),
    contractKind("permanent", { source: "adzuna" }),
  ],
  ["t", "a", "i"],
  "Adzuna's contract is not permanent; an applicant-tracking system's is the freelancer's",
);
eq(
  [
    "Vanlig anställning · 6 månader eller längre",
    "Vanlig anställning · Tills vidare",
    "Behovsanställning",
  ].map((v) => contractKind(v)),
  ["", "i", "t"],
  "JobTech: an ordinary employment of six months or more names no kind",
);
eq(
  [
    "Jornada completa",
    "Jornada intensiva",
    "Jornada parcial (20 hores - jornada setmanal)",
    "Jornada parcial (1 hores - jornada setmanal)",
    "Jornada parcial (5 hores - jornada diaria)",
    "Temps plein",
    "Non renseigné",
    "full-or-part-time",
    "Teilzeit (20h)",
    "Beperkte tewerkstelling <13 uren/week",
  ].map(workingTime),
  ["c", "", "p20", "p", "p25", "c", "", "", "p20", "p13"],
  'the hours: none for intensiva, "full or part" or a slip of one hour, a day times five',
);

// ➤ Whole adverts.
eq(
  contractOf({
    source: "francetravail",
    description: "Descriptif du poste: ... · CDD, Temps partiel",
  }),
  { ct: "t", wt: "p" },
  "France Travail's last part",
);
eq(
  contractOf({
    source: "francetravail",
    description: "Vos missions · votre profil",
  }),
  {},
  "a description without the contract part says nothing",
);
eq(
  contractOf({
    source: "vdab",
    description: "Vaste job · Ervaring: niet van belang · Dagwerk",
  }),
  { ct: "i" },
  "VDAB's first part",
);
eq(
  contractOf({
    source: "forem",
    description: "Conduite d'équipement · Intérimaire · Temps plein",
  }),
  { ct: "e", wt: "c" },
  "Le Forem's parts",
);
eq(
  contractOf({ source: "careers", employmentType: ["FULL_TIME", "TEMPORARY"] }),
  { ct: "t", wt: "c" },
  "a JobPosting naming both",
);
eq(
  contractOf({ source: "careers", employmentType: "FULL_TIME" }),
  { wt: "c" },
  "FULL_TIME states the hours, never the contract",
);
eq(
  contractOf({ source: "careers", employmentType: ["Permanent", "Vollzeit"] }),
  { ct: "i", wt: "c" },
  "a site's own words in the JobPosting",
);
eq(
  contractOf({
    source: "feinaactiva",
    contract: "Contracte laboral temporal (3 mesos)",
    hours: "Jornada completa",
  }),
  { ct: "t3", wt: "c" },
  "an adapter's fields",
);
eq(
  [
    contractOf({
      source: "clm",
      description: "Jornada: parcial\nContrato: indefinido",
    }),
    contractOf({
      source: "escoladeltreball",
      description: "Descripció\nContracte: En pràctiques",
    }),
    contractOf({ source: "gencat", description: "Tècnic/a" }),
  ],
  [{ ct: "i", wt: "p" }, { ct: "p" }, { ct: "t" }],
  "Castilla-La Mancha's and Escola del Treball's lines, the Generalitat's temporary posts",
);
eq(
  [
    contractOf({
      source: "sae",
      description:
        "Se ofrece contrato temporal · Contrato: Laboral fijo discontinuo · Jornada: Parcial mañana",
    }),
    contractOf({ source: "sae", description: "Texto · Contrato: Interinidad" }),
  ],
  [{ ct: "i", wt: "p" }, { ct: "t" }],
  "Andalucía's last parts, not the words of its text",
);

// The site's cases (its app/lib/contract.ts: the card's words, the temporary filter) are the web's, left out here.

// ➤ A temporary contract with the prospect of a permanent one, its contract's word between; hours a week as a range.
eq(
  [
    contractKind(
      "Een tijdelijk contract met uitzicht op een vast dienstverband",
    ),
    workingTime("32 - 40 uur per week"),
    workingTime("20 - 24 Stunden pro Woche"),
  ],
  ["to", "c", "p"],
  "a temporary contract with a prospect; a range of hours a week, full or part time",
);

// ➤ The same prospect in Spanish, Catalan, French, German, Italian and English; a contract of so many months; a substitution;
// ➤ Spain's «contrato estable», as a source's field writes them. A choice of kinds stays none.
eq(
  [
    "Contrato temporal de 6 meses con posibilidad de pasar a indefinido",
    "Contracte temporal amb possibilitat de passar a indefinit",
    "CDD de 6 mois, possibilité de CDI",
    "CDD évolutif en CDI",
    "Befristeter Vertrag mit Aussicht auf Entfristung",
    "Contratto a tempo determinato con possibilità di trasformazione a tempo indeterminato",
    "A 6 month fixed term contract with the possibility of becoming permanent",
    "Temp to perm",
    "Contrato de 3 meses",
    "contracte de 6 mesos",
    "Contrato de sustitución por baja maternal",
    "Contratación estable",
    "Contrato indefinido o temporal",
  ].map((v) => contractKind(v)),
  ["to", "to", "to", "to", "to", "to", "to", "to", "t3", "t6", "t", "i", ""],
  "a fixed term with the prospect of a permanent contract in six languages; months alone; a substitution; «estable»",
);
eq(
  ["Jornada sencera", "Mitja jornada"].map(workingTime),
  ["c", "p"],
  "Catalan full and part time",
);
// ➤ The prospect from the stance's words of a chance and a later step, so in every language that has them (the free-label
// ➤ bench, 17 November 2026).
eq(
  [
    "Visstidsanställning med möjlighet till tillsvidareanställning",
    "Konsultuppdrag på heltid som kan övergå i en tillsvidareanställning efter sex månader",
    "Tidsbegrænset stilling med mulighed for fastansættelse",
    "Midlertidig stilling med mulighet for fast ansettelse",
    "Määräaikainen työsuhde, mahdollisuus vakituiseen",
  ].map((v) => contractKind(v)),
  ["to", "to", "to", "to", "to"],
  "a fixed term with the prospect of a permanent contract in Swedish, Danish, Norwegian and Finnish",
);

// ➤ "Regular" as the whole value: a permanent employee (PerkinElmer, Boeing, IKEA); a word of a sentence says nothing.
eq(
  [
    contractOf({ source: "careers", employmentType: ["Regular"] }),
    contractOf({ source: "careers", employmentType: "Regular Full-Time" }),
    contractKind("Regular travel to customer sites"),
  ],
  [{ ct: "i" }, { ct: "i", wt: "c" }, ""],
  '"Regular" alone is permanent, not inside a sentence',
);
// ➤ A range of hours a week joined and opened by words, or with no week when both ends pass a day's 24 hours; a day's
// ➤ hours are none («8 bis 10 Stunden», «9 to 5»).
eq(
  [
    "zwischen 30 und 35 Stunden pro Woche",
    "de 30 a 35 horas semanales",
    "36 tot 40 uur per week;",
    "36 tot 40 uur",
    "20 à 25 heures par semaine",
    "8 bis 10 Stunden",
    "9 to 5",
  ].map(workingTime),
  ["c", "c", "c", "c", "p", "", ""],
  "a range of hours a week in words",
);
// ➤ A list value that is a name of JavaScript's own («constructor») is no JobPosting value: it crashed the reader.
eq(
  contractOf({ employmentType: ["constructor", "FULL_TIME"] }),
  { wt: "c" },
  "a value named like an object property",
);
done();
