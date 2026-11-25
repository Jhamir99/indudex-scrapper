// The legacy's cases of a page's JobPosting block (JustJans/indudex test/shared-facts.test.mjs and
// test/whole-advert.test.mjs), cut out by line range and carried as they were; its `workingTime` check is advert-facts'
// and is left out here (job portals T003).
import { harness } from "./harness.mjs";
import {
  experienceYears,
  jobPostings,
  wholeAdvert,
} from "../../src/shared/kit/job-posting.ts";

const { eq, done } = harness("job posting");

eq(
  [
    experienceYears({ monthsOfExperience: 60 }),
    experienceYears({ monthsOfExperience: 6 }),
    experienceYears("5-7 Years"),
    experienceYears("Enige ervaring vereist"),
  ],
  [5, 0, 5, null],
  "a block's experience in months or years, none when it names no number",
);
const block = {
  "@type": "JobPosting",
  title: "Data Engineer",
  description: "<p>Build pipelines.</p>",
  qualifications: "Votre profil : 3 ans en Python",
  skills: "Python, Kafka, Airflow",
  workHours: "40 hours per week",
  experienceRequirements: { monthsOfExperience: 36 },
  hiringOrganization: { name: "Acme" },
  jobLocation: { address: { addressLocality: "Lyon", addressCountry: "FR" } },
};
const job = jobPostings(
  `<script type="application/ld+json">${JSON.stringify(block)}</script>`,
  "https://acme.example/job/1",
)[0];
eq(
  [
    job.description.includes("Kafka"),
    job.description.includes("Votre profil"),
    job.hours,
    job.years,
  ],
  [true, true, "40 hours per week", 3],
  "a block's requirements, skills, hours and experience outside its description are read",
);
// ➤ A block that gives only a summary of the advert its page shows whole (Inforca): the page's text from it, up to the
// ➤ page's own ending.
const summaryPage =
  '<html><head><script type="application/ld+json">{"@type":"JobPosting","title":"Lead Technique Linux / DevOps","description":"Dans le cadre du renforcement d’une équipe TechOps chez l’un de nos clients basé à Monaco, nous recherchons un Lead Technique Linux / DevOps expérimenté."}</script></head><body><nav>Accueil</nav><h1>Lead Technique Linux / DevOps</h1><p>Dans le cadre du renforcement d’une équipe TechOps chez l’un de nos clients basé à Monaco, nous recherchons un Lead Technique Linux / DevOps expérimenté.</p><h2>Missions</h2><ul><li>La coordination technique des activités et projets Build / Run</li><li>La participation aux phases amont des projets : cadrage technique, RFI, RFP</li></ul><h2>Profil</h2><ul><li>Bac+4 minimum en informatique ou formation équivalente</li><li>15 ans d’expérience minimum sur un poste similaire</li></ul><p>← Retour aux offres</p><p>Offres similaires</p><p>Technicien support N1</p></body></html>';
const whole = wholeAdvert(
  jobPostings(summaryPage, "https://inforca.example/offre")[0],
  summaryPage,
).description;
eq(
  [
    /Bac\+4 minimum/.test(whole),
    /15 ans d’expérience/.test(whole),
    /Retour|similaires|Technicien support/.test(whole),
  ],
  [true, true, false],
  "a summary's block takes the page's sections after it, up to the page's own ending",
);
// ➤ A page that names the advert's title but then lists other vacancies is no whole advert: the block stays.
const aList = summaryPage.replace(
  /<h1>[\s\S]*<\/body>/,
  "<h1>Lead Technique Linux / DevOps</h1><ul><li>Technicien support Monaco</li><li>Chef de projet Nice</li><li>Ingénieur réseau Menton</li><li>Administrateur systèmes Antibes</li><li>Développeur Java Cannes</li><li>Consultant SAP Grasse</li><li>Architecte cloud Nice</li></ul><p>" +
    "Toutes nos offres en Principauté et dans les Alpes-Maritimes. ".repeat(
      12,
    ) +
    "</p></body>",
);
eq(
  wholeAdvert(jobPostings(aList, "https://inforca.example/offre")[0], aList)
    .description.length < 200,
  true,
  "a list after the advert's title is not the advert: the block stays",
);
// ➤ Facts written after the block's text on its page (welcomekit, 1 November 2026), and a picture written into the page ends it.
const facts =
  '<html><head><script type="application/ld+json">{"@type":"JobPosting","title":"Data Engineer","description":"Rejoignez notre équipe data à Toulouse pour construire nos pipelines et nos modèles de données avec Spark et Airflow."}</script></head><body><h1>Data Engineer</h1><p>Rejoignez notre équipe data à Toulouse pour construire nos pipelines et nos modèles de données avec Spark et Airflow.</p><p>' +
  "Vous concevez et maintenez les flux de données de nos clients industriels. ".repeat(
    5,
  ) +
  "</p><h3>Informations complémentaires</h3><p>Type de contrat : CDI</p><p>Salaire : entre 49000€ et 60000€ / an</p><p>" +
  "A".repeat(200) +
  "</p><p>Vous êtes intéressé par cette offre ?</p></body></html>";
const factsWhole = wholeAdvert(
  jobPostings(facts, "https://5-degres.example/jobs/data")[0],
  facts,
).description;
eq(
  [
    /Type de contrat ?: ?CDI/.test(factsWhole),
    /49000/.test(factsWhole),
    /AAAA|intéressé/.test(factsWhole),
  ],
  [true, true, false],
  "the page's facts after the block's text are kept, up to a picture written into it",
);

// ➤ A cookie notice in a <dialog> after the block's text is no advert (Firecrawl drops dialogs; 19 corpus pages had one).
const cookies = summaryPage.replace(
  /<h2>Missions[\s\S]*<\/body>/,
  "<dialog open><p>Ce site utilise des cookies</p><p>" +
    "Nous plaçons des cookies analytiques et marketing pour mesurer les visites de nos pages. ".repeat(
      4,
    ) +
    "</p></dialog></body>",
);
eq(
  /cookies/.test(
    wholeAdvert(
      jobPostings(cookies, "https://inforca.example/offre")[0],
      cookies,
    ).description,
  ),
  false,
  "a cookie notice in a dialog is left out of the advert",
);

done();
