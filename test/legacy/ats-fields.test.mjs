// The legacy's test/ats-fields.test.mjs (JustJans/indudex@ec79858), carried whole (legacy resync T002): its imports pointed at
// this repo.
// ➤ The boards' own fields found unread or misread by the audit of 1 November 2026 (docs/research/whole-advert.md).
import { harness } from "./harness.mjs";
import {
  ATS,
  breezyText,
  csodDay,
  easycruitDetailOf,
  varbiDetailOf,
  zohoDetailOf,
  wrapBoardAdvert,
} from "./boards-shim.mjs";
import { text } from "../../src/features/career-sites/legacy/page-text.ts";
import { contractOf } from "../../src/features/advert-facts/contract.ts";

const { eq, done } = harness("ats fields");
const facts = (p) => ({
  ...contractOf({ ...p, source: "x" }),
  mode: p.mode || "",
  years: p.years ?? null,
});

const gh = ATS.greenhouse.parse(
  {
    jobs: [
      {
        id: 1,
        title: "Engineer",
        location: { name: "Berlin" },
        absolute_url: "https://boards.greenhouse.io/x/jobs/1",
        updated_at: "2026-10-29T10:00:00Z",
        first_published: "2026-10-09T11:15:40-04:00",
        content: "&lt;p&gt;Build.&lt;/p&gt;",
        metadata: [
          { name: "Employment Type", value: "Full-time" },
          { name: "Team", value: "Core" },
        ],
      },
    ],
  },
  "x",
  "Acme",
);
eq(
  [gh[0].posted, facts(gh[0]).wt],
  ["2026-10-09", "c"],
  "Greenhouse: the day first published, not the last edit; its own employment type field",
);

const bob = ATS.hibob.parse(
  {
    jobAdDetails: [
      {
        id: "a",
        title: "Technician",
        site: "Graz",
        country: "Austria",
        workspaceTypeId: "on_site",
        employmentType: "Permanent",
      },
    ],
  },
  "acme",
);
eq(
  [bob[0].mode, facts(bob[0]).ct],
  ["onsite", "i"],
  'HiBob: "on_site" is on site; its employment type',
);

const breezy = ATS.breezy.parse([
  {
    id: "1",
    name: "Analyst",
    url: "https://acme.breezy.hr/p/1",
    type: { id: "partTime", name: "Teilzeit" },
    location: {
      city: "Paris",
      is_remote: true,
      remote_details: { value: "hybrid" },
    },
    salary: "€50,000 – €75,000 / year",
  },
]);
eq(
  [breezy[0].mode, breezy[0].remote, facts(breezy[0]).wt, breezy[0].pay.min],
  ["hybrid", false, "p", "€50,000 – €75,000 / year"],
  "Breezy: a hybrid job is not remote; the type by its id; the pay as written",
);

const varbi = ATS.varbi.parse(
  "<rss><item><title>Ingenjör</title><link>https://x.varbi.com/what:job/jobID:1/</link><pubDate>Fri, 31 Oct 2026 00:00:00 +0200</pubDate><description>Text</description></item></rss>",
);
eq(
  varbi[0].posted,
  "2026-10-31",
  "Varbi: its day as written, not the day before in UTC",
);
// ➤ A Varbi vacancy's own page: the table of its contract, extent and last day (the text corpus, 1 November 2026).
const vbPage =
  '<table><tr><th scope="row" class="vth col-md-3">Anställningsform</th> <td>Tillsvidareanställning</td></tr><tr><th scope="row">Anställningens omfattning</th><td>Heltid</td></tr><tr><th>Tillträde</th><td>Enligt överenskommelse</td></tr><tr><th>Sista ansökningsdag</th><td> 2026-11-19 </td></tr></table>';
eq(
  varbiDetailOf(vbPage),
  {
    contract: "Tillsvidareanställning",
    hours: "Heltid",
    expires: "2026-11-19",
  },
  "Varbi's page: contract, extent and last day from its table",
);
eq(
  [csodDay("16.10.2026"), csodDay("10/16/2026", "en-US")],
  ["2026-10-16", "2026-10-16"],
  "Cornerstone: days with dots too",
);

const personio = ATS.personio.parse(
  "<workzag-jobs><position><id>1</id><name>Field Service Engineer</name><office>Berlin</office><yearsOfExperience>2-5</yearsOfExperience><keywords>Solar PV, Energy Storage</keywords><jobDescriptions><jobDescription><name>Job</name><value>Install.</value></jobDescription></jobDescriptions></position></workzag-jobs>",
  "acme",
);
eq(
  [personio[0].years, personio[0].description.includes("Solar PV")],
  [2, true],
  "Personio: the low end of its years band; its keywords with the text",
);

const zoho = ATS.zoho.parse(
  '<input type="hidden" value="[{&#34;Posting_Title&#34;:&#34;Engineer&#34;,&#34;id&#34;:&#34;1&#34;,&#34;Publish&#34;:true,&#34;Work_Experience&#34;:&#34;3 - 5 Years&#34;,&#34;Salary&#34;:&#34;50000&#34;,&#34;Currency&#34;:&#34;EUR&#34;},{&#34;Posting_Title&#34;:&#34;Junior&#34;,&#34;id&#34;:&#34;2&#34;,&#34;Publish&#34;:true,&#34;Work_Experience&#34;:&#34;Keine&#34;}]" id="jobs">',
  "acme.eu",
);
eq(
  [zoho[0].years, zoho[0].pay.min, zoho[1].years],
  [3, 50000, 0],
  "Zoho Recruit: the experience it asks and its pay; none is none",
);
const zohoJobs =
  '<input type="hidden" value="[{&#34;Posting_Title&#34;:&#34;Engineer&#34;,&#34;id&#34;:&#34;1&#34;,&#34;Publish&#34;:true}]" id="jobs">';
eq(
  [
    ATS.zoho.parse(
      '<meta property="og:site_name" content="MADIFF Polska">' + zohoJobs,
      "madiffpl.com",
    )[0].company,
    ATS.zoho.parse(
      '<meta property="og:site_name" content="Zoho Recruit">' + zohoJobs,
      "acme.eu",
    )[0].company,
    ATS.zoho.parse(zohoJobs, "acme.eu")[0].company,
  ],
  ["MADIFF Polska", "", ""],
  "Zoho Recruit: the company is the name the careers page gives itself, never Zoho's, and none when it gives none",
);
const ghNamed = ATS.greenhouse.parse(
  {
    jobs: [
      {
        id: 1,
        title: "Engineer",
        location: { name: "London" },
        absolute_url: "https://job-boards.greenhouse.io/x/jobs/1",
        company_name: "Prolific Academic Ltd",
      },
    ],
  },
  "prolificacademicltd",
);
const rcNamed = ATS.recruitee.parse({
  offers: [
    {
      id: 5,
      title: "Engineer",
      city: "Hamburg",
      careers_url: "https://jobsger.recruitee.com/o/e",
      company_name: "ILF Consulting Engineers Germany GmbH",
    },
  ],
});
eq(
  [
    ghNamed[0].company,
    rcNamed[0].company,
    wrapBoardAdvert(
      "recruitee",
      { name: "Jobsger", recruitee: "jobsger", found: true },
      rcNamed[0],
    ).company,
    wrapBoardAdvert(
      "recruitee",
      { name: "ILF", recruitee: "jobsger" },
      rcNamed[0],
    ).company,
  ],
  [
    "Prolific Academic Ltd",
    "ILF Consulting Engineers Germany GmbH",
    "ILF Consulting Engineers Germany GmbH",
    "ILF",
  ],
  "Greenhouse and Recruitee name the employer: a board the scout found shows it, a board listed by hand keeps its name",
);
const srNamed = ATS.smartrecruiters.parse(
  {
    content: [
      {
        id: "7",
        name: "Engineer",
        location: { city: "Paris", country: "fr" },
        company: { identifier: "ALTEN", name: "ALTEN" },
      },
      {
        id: "8",
        name: "Engineer",
        location: { city: "Lyon", country: "fr" },
        company: { identifier: "Acme1" },
      },
    ],
  },
  "alten",
);
eq(
  srNamed.map((p) => p.company),
  ["ALTEN", ""],
  "SmartRecruiters: each posting names its employer, or none",
);

const dv = ATS.dvinci.parse([
  {
    id: 1,
    position: "Elektriker",
    jobPublicationURL: "https://x.dvinci-hr.com/jobs/1",
    jobOpening: {
      contractPeriod: { internalName: "LIMITED" },
      workingTimes: [{ internalName: "MARGINAL_EMPLOYMENT" }],
      salary: {
        currency: "EUR",
        value: { minValue: 16.81, maxValue: 16.81, unitText: "HOUR" },
      },
    },
  },
]);
eq(
  [facts(dv[0]).ct, facts(dv[0]).wt, dv[0].pay.period],
  ["t", "p", "HOUR"],
  "d.vinci: its own codes for the contract and the hours, and its pay's unit",
);

const hive = ATS.hirehive.parse({
  items: [
    {
      id: "j",
      title: "Mechanic",
      hosted_url: "https://x.hirehive.com/j",
      type: { type: "FullTime" },
      compensation_tiers: [
        { type: "none" },
        {
          type: "range",
          min_value: 50000,
          max_value: 69000,
          currency_code: "EUR",
          interval: "year",
        },
      ],
    },
  ],
});
eq(
  [facts(hive[0]).wt, hive[0].pay.max],
  ["c", 69000],
  "HireHive: its type and its first pay band with figures",
);

const pro = ATS.prospective.parse({
  jobs: [
    {
      id: 1,
      title: "Elektroniker",
      links: { directlink: "https://x.ch/1" },
      szas: {
        sza_employment_type: "Festanstellung",
        "sza_pensum.min": 80,
        "sza_pensum.max": 100,
      },
    },
    {
      id: 2,
      title: "Lernende",
      links: { directlink: "https://x.ch/2" },
      szas: {
        sza_employment_type: "Lernende",
        "sza_pensum.min": 100,
        "sza_pensum.max": 100,
      },
    },
  ],
});
eq(
  [
    facts(pro[0]).ct,
    facts(pro[0]).wt ?? "",
    facts(pro[1]).ct,
    facts(pro[1]).wt,
  ],
  ["i", "", "p", "c"],
  "prospective.ch: its employment type; 100 % workload full time, 80-100 % neither",
);

const easy = ATS.easycruit.parse(
  '<VacancyList><Vacancy id="7" date_start="2026-10-01" date_end="2026-12-31"><Version><Title>Monteur</Title></Version><VacancyURL>https://x.easycruit.com/7</VacancyURL><ApplicationDeadline>2026-11-15</ApplicationDeadline><Item type="duration" id="permanent"/><Item type="extent" id="fulltime"/></Vacancy></VacancyList>',
);
eq(
  [easy[0].expires, facts(easy[0]).ct, facts(easy[0]).wt],
  ["2026-11-15", "i", "c"],
  "EasyCruit: the day applications close; its duration and extent",
);

// ➤ A Zoho vacancy's own page: its record in a script, read as JavaScript reads the string (the offers' diary, 1 November 2026).
const zohoPage =
  "<script>var jobs = JSON.parse('[{\\x22Salary\\x22:null,\\x22id\\x22:\\x22690853\\x22,\\x22Job_Description\\x22:\\x22<span id=\\\\\\x22spandesc\\\\\\x22><p>We need a video editor.</p><p>3+ years with Premiere</p></span>\\x22,\\x22Date_Opened\\x22:\\x222026-10-21\\x22,\\x22Job_Type\\x22:\\x22Full time\\x22}]');</script>";
eq(
  zohoDetailOf(zohoPage, "690853"),
  {
    description: text(
      "<span><p>We need a video editor.</p><p>3+ years with Premiere</p></span>",
    ),
    posted: "2026-10-21",
    employmentType: ["Full time"],
  },
  "Zoho: a vacancy's page gives its text, its day and its type",
);
eq(
  [zohoDetailOf(zohoPage, "1"), zohoDetailOf("<p>no script</p>", "690853")],
  [{}, {}],
  "another vacancy, or a page without the record, gives nothing",
);

// ➤ A Breezy job's page: its whole text in the description block before the apply buttons (the diary's live check).
eq(
  [
    breezyText(
      '<div class="description"><p><strong>Senior Engineer</strong></p><ul><li>5+ years with React</li></ul></div><div class="apply-container"><a>Apply</a></div>',
    ),
    breezyText("<p>no block</p>"),
  ],
  [
    text(
      "<p><strong>Senior Engineer</strong></p><ul><li>5+ years with React</li></ul>",
    ),
    "",
  ],
  "Breezy: a job page's text, and nothing without the block",
);

// ➤ An EasyCruit vacancy's own page: its text and its last day, which the XML list leaves out (the text corpus, 1 November 2026).
const ecPage =
  '<div class="jd-appetizer"><h1>Team Manager</h1></div><div class="jd-description"><p>Vil du lede softwareutviklere?</p><h3>Ønskede kvalifikasjoner</h3><ul><li>Høyere utdanning innen datateknologi</li></ul></div><div class="bottom-buttons">Søk her</div><div class="jd-deadline"><h3>Søknadsfrist:</h3><p>08.11.2026</p></div>';
eq(
  easycruitDetailOf(ecPage),
  {
    description:
      "Vil du lede softwareutviklere?\n Ønskede kvalifikasjoner\n Høyere utdanning innen datateknologi",
    expires: "2026-11-08",
  },
  "EasyCruit's page: the advert's text and its last day",
);
done();
