// The legacy's cases of the layout reader, `oneLanguage` and `platformPosting` (JustJans/indudex test/builder.test.mjs and
// test/hunt-platforms.test.mjs), cut out by line range and carried as they were, imports pointed at this repo (job
// portals T004).
import { harness } from "./harness.mjs";
import {
  guessPosting,
  isList,
  listPostings,
  tldCountry,
} from "../../src/shared/kit/layout.ts";
import {
  oneLanguage,
  platformPosting,
} from "../../src/shared/kit/vacancy-page.ts";

const { eq, done } = harness("layout");
{
  const fact = platformPosting(
    "<h1 class='x'>Ingeniero de procesos</h1><span class='inline-block align-middle mr-2 ml-2'>Mixto\n(Barcelona, Cataluña, España)\n</span><p>Funciones</p>",
    "https://acme.factorialhr.com/job_posting/ingeniero-de-procesos-1",
  );
  eq(
    [fact.title, fact.location, fact.mode],
    ["Ingeniero de procesos", "Barcelona, Cataluña, España", "hybrid"],
    "Factorial: the heading, the place in brackets, the way of working",
  );
  const ts = platformPosting(
    '<h1 class="ts-offer-page__title">Acheteur Pièces Primaires F/H</h1><div id="contenu-ficheoffre" data-class="x"><h3>Informations générales</h3><p>Négocier</p><h3>Localisation</h3><p>France, Nouvelle Aquitaine, 33 - M&#233;rignac</p><h3>Type de contrat</h3><p>CDI</p></div>',
    "https://dassault-aviation-cand.talent-soft.com/Pages/Offre/detailoffre.aspx?idOffre=15690&idOrigine=502",
  );
  eq(
    [
      ts.title,
      ts.location,
      ts.description.startsWith("Informations générales"),
    ],
    [
      "Acheteur Pièces Primaires F/H",
      "France, Nouvelle Aquitaine, 33 - Mérignac",
      true,
    ],
    "Talentsoft: the title and the place from the field named Localisation",
  );
  const csp = platformPosting(
    '<h1>ATC - Architecte projet réseaux</h1><div id="contenu-ficheoffre"><h3>Organisme de rattachement</h3><p>Commissariat au Numérique de Défense (CND)&nbsp;&nbsp;</p><h3>Date de début de diffusion</h3><p>09/10/2026</p><h3>Localisation du poste</h3><p>Europe, France, Île-de-France, Paris (75)</p></div>',
    "https://place-ep-recrute.talent-soft.com/offre-de-emploi/emploi-atc-architecte-projet-reseaux_2116783.aspx",
  );
  eq(
    [csp.company, csp.posted, csp.location],
    [
      "Commissariat au Numérique de Défense (CND)",
      "2026-10-09",
      "Europe, France, Île-de-France, Paris (75)",
    ],
    "Talentsoft at Choisir le service public: the employer, the first day shown, the place of the post",
  );
  const cats = platformPosting(
    '<h1>Information Security Consultant (m/w/d)</h1><ul class="job-tags"><li>Heidelberg, BW</li><li>Information Technology</li></ul><div>Ihre Aufgaben</div>',
    "https://antal.catsone.com/careers/7875-Antal/jobs/16639189-Information-Security-Consultant/",
  );
  eq(
    [cats.title, cats.location],
    ["Information Security Consultant (m/w/d)", "Heidelberg, BW"],
    "CATS: the heading's title and the place first in its tags",
  );
  const bz = platformPosting(
    '<link href="https://assets.bizneo.com/assets/site.css"><h1 class="text-[28px]"> Backend Developer | Java &amp; Banca. Remoto </h1><div title="Ubicaci\u00f3n" class="flex"><i class="huge-icon"></i><div class="flex flex-wrap"><span class="font-bold text-xl">Madrid</span></div></div><div title="Modalidad de trabajo" class="flex"><i></i><div class="flex"><span class="font-bold text-xl">Teletrabajo/Remoto</span></div></div><p>Funciones</p>',
    "https://jobs.experienceis.com/jobs/backend-developer-java-banca-remoto",
  );
  eq(
    [bz.title, bz.location, bz.mode, bz.remote],
    ["Backend Developer | Java & Banca. Remoto", "Madrid", "remote", true],
    "Bizneo on the employer's own domain: the heading's title, the place and the way of working from their boxes",
  );
  eq(
    platformPosting("<h1>Anything</h1>", "https://www.example.com/job/1"),
    null,
    "only the platforms it knows",
  );
}
{
  const now = Date.parse("2026-10-08");
  const page = (h1, body, extra = "") =>
    `<html><head><title>${h1} | Acme</title><meta property="og:site_name" content="Acme GmbH">${extra}</head><body><nav>Menü</nav><h1>${h1}</h1><p>${body}</p></body></html>`;
  const v = guessPosting(
    page(
      "Elektroniker (m/w/d)",
      "Standort: München. Jetzt bewerben!",
      '<meta property="article:published_time" content="2026-09-30">',
    ),
    "https://jobs.acme.de/stellenangebote/elektroniker-m-w-d-123",
    now,
  );
  eq(
    [v.title, v.company, v.location, v.posted],
    ["Elektroniker (m/w/d)", "Acme GmbH", "München", "2026-09-30"],
    "a vacancy page without JobPosting: title, company, place, day",
  );
  eq(
    guessPosting(
      page("Werkzeugmechaniker (Ingolstadt)", "Bewerben Sie sich"),
      "https://acme.de/job/werkzeugmechaniker",
      now,
    ).location,
    "Ingolstadt",
    "the place in brackets after the title",
  );
  eq(
    [
      "Job",
      "Stelle - Acme",
      "Job Vacancy",
      "Job in West Yorkshire",
      "Amsterdam, North Holland",
    ].map(
      (tail) =>
        guessPosting(
          `<html><head><title>Welder ${tail} | Acme</title></head><body><h1>Welder</h1><p>Apply now</p></body></html>`,
          "https://acme.de/jobs/welder-1",
          now,
        ).location,
    ),
    ["", "", "", "West Yorkshire", "Amsterdam, North Holland"],
    "a word for the vacancy after the title in the page title is no place («Job», «Stelle»: careers, 20 November 2026)",
  );
  eq(
    [
      [
        "Agrar-Stellenmarkt: Stellenangebote Schweiz Agraringenieur(in)",
        "https://www.proplanta.de/agrar-stellenmarkt/jobs-region-schweiz-agraringenieur-in_a1198502924.html",
      ],
      [
        "Vacatures Procestechnoloog",
        "https://www.nationaleberoepengids.nl/vacatures/procestechnoloog",
      ],
      [
        "Vacatures Senior business analist",
        "https://werken.belastingdienst.nl/vacatures/senior-business-analist-e12512",
      ],
    ].map(
      ([h1, url]) =>
        guessPosting(
          `<html><head><title>${h1}</title></head><body><h1>${h1}</h1><p>Solliciteer nu. Jetzt bewerben</p></body></html>`,
          url,
          now,
        )?.title ?? null,
    ),
    [null, null, "Senior business analist"],
    "a listing's heading is a list, or at a vacancy's numbered address the vacancy's title after the word (23 November 2026)",
  );
  const listed = guessPosting(
    "<html><head><title>Quality Inspector Jobs | Workcircle</title></head><body><h1>Quality Inspector Jobs</h1><p>Location: Cheltenham I am looking for an experienced Quality Inspector to join a growing manufacturer. Apply now</p></body></html>",
    "https://www.workcircle.co.uk/job/quality-inspector-1",
    now,
  );
  eq(
    [listed.title, listed.location],
    ["Quality Inspector", "Cheltenham"],
    "a heading in the words of a listing («Quality Inspector Jobs») is the vacancy, and a labelled place ends where a sentence begins («I am looking…»: Workcircle, 21 November 2026)",
  );
  const riga = guessPosting(
    '<html><head><title>Ritošā sastāva ATSLĒDZNIEKS | Rīga</title></head><body><h1>Ritošā sastāva ATSLĒDZNIEKS</h1><div class="field-vacancy-place-wrapper"> Darba vieta: Rīgas pašvaldības sabiedrība ar ierobežotu atbildību &quot;Rīgas satiksme&quot; </div><div class="field-vacancy-place-wrapper"> Atrašanās vieta: <div class="vacancy__vacancy-place">Vestienas iela 35, Rīga</div></div><p>Par rezultātiem informēsim kandidātus.</p><h3>Pretendentiem jāpiesakās līdz <time datetime="2026-11-30T12:00:00Z">30.11.2026.</time></h3></body></html>',
    "https://www.riga.lv/lv/vakance/ritosa-sastava-atsledznieks-34",
    now,
  );
  eq(
    [riga.location, riga.posted, riga.expires],
    ["Vestienas iela 35, Rīga", "", "2026-11-30"],
    "riga.lv: the company labelled «Darba vieta» is no place, and the day to apply by closes the advert",
  );
  eq(
    guessPosting(
      page("Machiniste (H/F)", "Postuler"),
      "https://acme.lu/offres-d-emploi/machiniste",
      now,
    ).location,
    "",
    "a gender mark in brackets is not a place",
  );
  eq(
    [
      guessPosting(
        '<html><body><div class="job-profile__hero-pretitle h3 fw-light">Italy, Bolzano</div><h1 class="job-profile__hero-title">Plant Layout Engineer - Renewable Gas AD</h1><p>Full-time</p><a>Apply now</a></body></html>',
        "https://kanadevia-inova.com/careers/jobs/744000150960239",
        now,
      ).location,
      guessPosting(
        '<html><body><div class="col-12"><b>Wählen Sie Ihr Land/Ihre Region: </b><select id="euInventoryCountry"><option>Aland Islands</option><option>Albania</option><option>Algeria</option></select></div><h1>Technical Content Curator</h1> <div><em>India</em></div><h2>Job Summary</h2><a>Apply</a></body></html>',
        "https://www.edmundoptics.de/company/careers/asia-jobs/technical-content-curator",
        now,
      ).location,
      guessPosting(
        '<html><body><div class="kicker">Engineering</div><h1>Process Engineer</h1><div>Full-time</div><a>Apply</a></body></html>',
        "https://x.com/careers/jobs/7",
        now,
      ).location,
    ],
    ["Italy, Bolzano", "India", ""],
    "a place written alone beside the heading, not a word that names no country, nor a form's list of countries",
  );
  eq(
    [
      guessPosting(
        '<html><body><h1>Elektriker (m/w/d)</h1><div class="facts"><span class="ai ai-location pe-2"></span> Münster </div><p>Jetzt bewerben</p></body></html>',
        "https://x.de/job/1",
        now,
      ).location,
      guessPosting(
        '<html><body><h1>Monteur (m/w/d)</h1><p class="location"> Arbeitsort: Bamberg, Weiden </p><p class="type"> Unbefristet Vollzeit </p><a>Bewerben</a></body></html>',
        "https://x.de/job/2",
        now,
      ).location,
    ],
    ["Münster", "Bamberg, Weiden"],
    "a place after a pin icon, and a label whose value ends with its box (Umantis)",
  );
  eq(
    [
      guessPosting(
        "<html><body><h1>Technicus Stations</h1><div><span>Locatie</span></div><div><span>Hoogeveen</span></div><div>Contracttype</div><div>Vast</div><a>Solliciteer nu</a></body></html>",
        "https://x.nl/vacatures/1",
        now,
      ).location,
      guessPosting(
        '<html><body><h1>Systems engineer</h1><span><svg id="map-marker" viewBox="0 0 24 24"><path d="M12,2z"></path></svg> <span>Deventer, Amsterdam</span> </span><span class="x">HBO</span><a>Solliciteer</a></body></html>',
        "https://x.com/career/vacancies/2",
        now,
      ).location,
      guessPosting(
        "<html><body><h1>Sales Trainee</h1><div>Location</div><div>Working Hours</div><div>Full time</div><a>Apply</a></body></html>",
        "https://x.ie/vacancies/3",
        now,
      ).location,
    ],
    ["Hoogeveen", "Deventer, Amsterdam", ""],
    "a label alone in its box with the place in the next, a pin drawn as an <svg>, and an empty field that leaves the next label",
  );
  eq(
    [
      guessPosting(
        page("24 IT Techniker Jobs St. Pölten", "bewerben"),
        "https://x.at/jobs/it-techniker/st-poelten",
        now,
      ),
      guessPosting(
        page("Opening of the new plant", "apply"),
        "https://x.com/news/opening",
        now,
      ),
      guessPosting(
        page(
          "Médico/a",
          "Inscribirse",
          '<meta property="article:published_time" content="2015-04-27">',
        ),
        "https://x.es/oferta-empleo/medico-a/",
        now,
      ),
      guessPosting(
        page("Unsere Produkte", "Kontakt"),
        "https://x.de/produkte/",
        now,
      ),
      guessPosting(
        page("Verification Required", "Please wait"),
        "https://x.de/job/elektroniker-123",
        now,
      ),
      guessPosting(
        page("Acme GmbH", "Jetzt bewerben"),
        "https://x.de/job/elektroniker-124",
        now,
      ),
    ],
    [null, null, null, null, null, null],
    "a counted summary, a news article, a stale page, a page with no vacancy signs, an anti-bot page and a page titled only with the site name are not vacancies",
  );
  eq(
    [
      guessPosting(
        page("Ingenieur*in Tiefbau", "Ihre Aufgaben: Planung von Straßen."),
        "https://stadt.de/stellen/ingenieur-tiefbau-12",
        now,
      )?.title,
      guessPosting(
        page("Plakatierer/in - Oberösterreich", "Kontaktaufnahme per E-Mail"),
        "https://epa.at/karriere/offene-stellen/plakatiererin-oo/",
        now,
      )?.title,
      guessPosting(
        page("Medewerker Technische Dienst", "Solliciteer direct"),
        "https://figi.nl/werkenbij/medewerker-td",
        now,
      )?.title,
    ],
    [
      "Ingenieur*in Tiefbau",
      "Plakatierer/in - Oberösterreich",
      "Medewerker Technische Dienst",
    ],
    "the German gender forms (*in, /in) count as a mark, and /werkenbij/ as a vacancy path",
  );
  eq(
    [
      guessPosting(
        page("Job offers at [achelos]", "Open job offers. Apply"),
        "https://www.achelos.de/en/career/job-offers/",
        now,
      ),
      guessPosting(
        page("Offene Stellenangebote bei achelos", "Jetzt bewerben"),
        "https://www.achelos.de/de/karriere/offene-stellenangebote/",
        now,
      ),
    ],
    [null, null],
    'a list titled "Job offers at …" is not a vacancy',
  );
  const raw = (h1, head, body) =>
    `<html><head><title>${head}</title></head><body><h1>${h1}</h1><p>${body}</p></body></html>`;
  eq(
    guessPosting(
      raw(
        "Senior Manager, Employee Relations",
        "Senior Manager, Employee Relations, Bolt | CV.ee",
        "Kandideeri",
      ),
      "https://www.cv.ee/et/vacancy/1667123/bolt/senior-manager",
      now,
    ).company,
    "Bolt",
    "the employer between the title and the site name in <title>",
  );
  eq(
    guessPosting(
      raw("Analista Técnico/a", "Analista Técnico/a - Plexus Tech", "Detalles"),
      "https://www.plexus.es/ofertas-empleo/analista-tecnico-a/",
      now,
    )?.company,
    "Plexus Tech",
    "a Spanish gender mark and a vacancy folder make a vacancy; the site after the title is the company",
  );
  eq(
    guessPosting(
      raw(
        "Senior Project Manager",
        "Senior Project Manager - Ramboll",
        "Apply",
      ) + '<script>{"location":"Hamburg","country":"Germany"}</script>',
      "https://www.ramboll.com/careers/d16e23f4",
      now,
    ).location,
    "Hamburg, Germany",
    "the place kept in the data a script draws from",
  );
  eq(
    guessPosting(
      raw(
        "OFERTA – Programador de autómatas",
        "OFERTA – Programador de autómatas - ILDEFE",
        "Inscríbete",
      ),
      "https://ildefe.es/ofertas-de-empleo/oferta-programador/",
      now,
    ).title,
    "Programador de autómatas",
    "a job-offer lead goes from the title",
  );
  eq(
    [
      guessPosting(
        raw(
          "Chief Data Officer",
          "Chief Data Officer London",
          "Company: Our client is a large-scale financial services organisation. Apply",
        ),
        "https://www.harnham.com/job/e1-chief-data-officer-london/",
        now,
      ),
    ].map((g) => [g.location, g.company]),
    [["London", ""]],
    "the place after the title in <title>; a sentence after an employer label is no name",
  );
  eq(
    [
      isList("https://acme.de/karriere/", [
        "https://acme.de/karriere/a-1",
        "https://acme.de/karriere/b-2",
        "https://acme.de/karriere/c-3",
      ]),
      isList("https://acme.de/jobs/a-1", [
        "https://acme.de/jobs/b-2",
        "https://acme.de/jobs/c-3",
        "https://acme.de/jobs/d-4",
      ]),
    ],
    [true, false],
    "a page with vacancies below its address is their list; one with similar jobs beside it is not",
  );
  eq(
    [
      "https://www.gorh.lu/x",
      "https://jobs.acme.co.uk/x",
      "https://acme.com/x",
      "https://acme.eu/x",
    ].map(tldCountry),
    ["lu", "gb", "", ""],
    "the country a domain names",
  );
  eq(
    [
      guessPosting(
        raw(
          "Send this job offer to a friend",
          "AGC Glass Europe - Send this job offer to a friend",
          "Send",
        ),
        "https://agc.gestmax.fr/vacancy/send/id/1719",
        now,
      ),
      guessPosting(
        raw(
          "MANAGER ONDERHOUD COATER",
          "MANAGER ONDERHOUD COATER test",
          "Apply",
        ),
        "https://agc.gestmax.fr/1717/1/manager-onderhoud-coater",
        now,
      )?.title,
      guessPosting(
        raw(
          "MANAGER ONDERHOUD COATER",
          "MANAGER ONDERHOUD COATER test",
          "Apply",
        ),
        "https://agc.gestmax.fr/1717/1/manager-onderhoud-coater",
        now,
        { known: true },
      )?.title,
    ],
    [null, undefined, "MANAGER ONDERHOUD COATER"],
    "a pop-up page is no vacancy; an address of the source's vacancy shape counts as a sign",
  );
  eq(
    guessPosting(
      raw(
        "Software Engineer (Data Delivery Team)",
        "Software Engineer (Data Delivery Team) | CV.ee",
        "Apply now",
      ),
      "https://www.cv.ee/et/vacancy/1/x/software-engineer",
      now,
    ).location,
    "",
    "a team in brackets is not a place",
  );
  eq(
    guessPosting(
      raw(
        "Customer Care Specialist",
        "Customer Care Specialist | Approach People",
        "Location: ideally near Gerbershausen 🎯 The Role You will play a central part. Apply",
      ),
      "https://www.approachpeople.com/job/customer-care",
      now,
    ).location,
    "ideally near Gerbershausen",
    "a place label whose value runs on into the text is cut",
  );
  const lp = (html, url = "https://acme.de/karriere/") =>
    listPostings(html, url);
  eq(
    lp(
      '<h4 class="job"><a href="/files/bauing.pdf">Bauingenieure (m/w/d)</a></h4><p>Standort: Tübingen. Ihre Aufgaben…</p><h4 class="job"><a href="/files/polier.pdf">Polier (m/w/d)</a></h4><p>Bauleitung</p>',
    ).map((a) => [a.title, a.url, a.location]),
    [
      ["Bauingenieure (m/w/d)", "https://acme.de/files/bauing.pdf", "Tübingen"],
      ["Polier (m/w/d)", "https://acme.de/files/polier.pdf", ""],
    ],
    "a page listing its vacancies as marked headings, each linking a PDF: one advert each, its place from the text below",
  );
  eq(
    lp(
      "<h3>SHK-Monteur (m/w/d) für Wärmepumpen</h3><p>IHRE AUFGABEN: Installation</p><h3>Elektriker (m/w/d)</h3><p>Montage</p>",
    ).map((a) => a.url),
    [
      "https://acme.de/karriere/#shk-monteur-m-w-d-fur-warmepumpen",
      "https://acme.de/karriere/#elektriker-m-w-d",
    ],
    "with no link, the page address and an anchor of the title",
  );
  eq(
    lp(
      '<ul><li><a href="/karriere/elektriker">Elektriker (m/w/d)</a></li><li><a href="/karriere/monteur">Monteur (m/w/d)</a></li></ul>',
    ),
    [],
    "titles that lead to pages of their own are left to the page-by-page reader",
  );
  eq(
    lp(
      '<h3 class="a">Kolleg:innen gesucht</h3><h3 class="a">Hausmeister (d/m/w) – mehr anzeigen</h3><h3 class="a">Wir suchen Dich als Mechatroniker (m/w/d) für unser Team.</h3><h3 class="a">(m/w/d)</h3><h3 class="a">Koch m/w/d</h3>',
    ).map((a) => a.title),
    ["Hausmeister (d/m/w)", "Koch m/w/d"],
    "no plural, sentence or lone mark; the words of a more link cut",
  );
  eq(
    lp(
      "<p>Wir sind ein Familienbetrieb (m/w/d) seit 1950</p><span>Elektroniker (m/w/d)</span>",
    ),
    [],
    "a single title that is no heading is no list",
  );
}
{
  const urls = [
    "https://x.example/de/de/job/52/ingenieur",
    "https://x.example/de/en/job/52/ingenieur",
    "https://x.example/at/de/job/52/ingenieur",
    "https://x.example/jobs/7?lang=fr",
    "https://x.example/jobs/7?lang=de",
    "https://x.example/it/job/9",
    "https://x.example/jobs/it/10",
  ];
  eq(
    oneLanguage(urls.map((url) => ({ url }))).map((i) => i.url),
    [urls[0], urls[2], urls[3], urls[5], urls[6]],
    'a vacancy in two languages is listed once; a country part ("/at/") or a lone language part is no twin',
  );
  eq(
    oneLanguage(
      urls.slice(0, 2).map((url) => ({ url })),
      { [urls[1]]: { job: {} } },
      "de",
    ).map((i) => i.url),
    [urls[1]],
    "the twin read already wins over the site's language",
  );
  const byQuery = [
    "https://x.example/stelle?id=1&lang=de",
    "https://x.example/stelle?id=2&lang=de",
    "https://x.example/stelle?id=1&lang=en",
  ];
  eq(
    oneLanguage(byQuery.map((url) => ({ url }))).map((i) => i.url),
    byQuery.slice(0, 2),
    "vacancies told apart by their query alone stay two; only the language in it goes",
  );
  const locales = [
    "https://www.brunel.net/de-de/jobs/kaltetechniker-pr-301655",
    "https://www.brunel.net/de-at/jobs/kaltetechniker-pr-301655",
    "https://www.brunel.net/de-ch/jobs/kaltetechniker-pr-301655",
    "https://www.brunel.net/cs-cz/jobs/kaltetechniker-pr-301655",
    "https://www.brunel.net/de-de/jobs/bauingenieur-pr-303757",
  ];
  eq(
    oneLanguage(locales.map((url) => ({ url }))).map((i) => i.url),
    [locales[0], locales[4]],
    "a language with its country is a language part: one vacancy under four of a portal's sites is read once",
  );
  const metlife = [
    "https://www.metlifecareers.com/ja_JP/ml/JobDetail/Lead-Big-Data-Engineer/21038",
    "https://www.metlifecareers.com/en_US/ml/JobDetail/Lead-Big-Data-Engineer/21038",
  ];
  eq(
    oneLanguage(
      metlife.map((url) => ({ url })),
      { [metlife[0]]: { job: {} }, [metlife[1]]: { job: {} } },
    ).map((i) => i.url),
    [metlife[1]],
    "between twins read alike, Europe's language before Asia's",
  );
  const spellings = [
    "https://365werk.example/vacatures/alkmaar",
    "https://365werk.example/vacatures/alkmaar/",
    "http://www.365werk.example/vacatures/alkmaar?utm_source=li",
    "https://365werk.example/vacatures/alkmaar/index.html",
    "https://365werk.example/vacatures/almere",
  ];
  eq(
    oneLanguage(
      spellings.map((url) => ({ url })),
      { [spellings[2]]: { job: {} } },
    ).map((i) => i.url),
    [spellings[2], spellings[4]],
    "one vacancy under four spellings of its address is read once, at the spelling read already",
  );
}
const data = {
  component: "templates/main/offer",
  props: {
    company: {
      name: "ens-lyon",
      social_reason: "Ecole Normale Supérieure de Lyon",
    },
    offer: {
      softy_id: 224990,
      title: "Technicien de maintenance - H/F",
      locations: [{ city: "Lyon 7e", zip_code: "69007", country: "France" }],
      description_html:
        "<p>Au sein de la direction du patrimoine&nbsp;: maintenance des b&acirc;timents.</p>",
      searched_profile_html: "<p>BTS MS</p>",
      updated_at: "2026-10-16 10:55:26",
    },
  },
};
const offer = platformPosting(
  `<h1 class="text-3xl font-semibold">Technicien de maintenance - H/F</h1><script data-page="app" type="application/json">${JSON.stringify(data)}</script>`,
  "https://ens-lyon.softy.pro/offers/224990",
);
eq(
  [
    offer?.title,
    offer?.company,
    offer?.location,
    /patrimoine: maintenance des bâtiments\.\s+BTS MS/.test(
      offer?.description || "",
    ),
    offer?.posted,
  ],
  [
    "Technicien de maintenance - H/F",
    "Ecole Normale Supérieure de Lyon",
    "Lyon 7e, France",
    true,
    "",
  ],
  "a Softy offer: its title, employer, place and texts from the page's data; no day, since it says only when it was last changed",
);
// ➤ The real pages escape their slashes ("templates\/main\/offer").
const onOwnDomain = `<script data-page="app" type="application/json">${JSON.stringify(data).replace(/\//g, "\\/")}</script>`;
eq(
  [
    platformPosting(
      onOwnDomain,
      "https://carriere.globe-groupe.example/offers/1",
    )?.title,
    platformPosting(
      onOwnDomain.replace('offer"', 'news"'),
      "https://www.laravel-shop.example/news/1",
    ),
  ],
  ["Technicien de maintenance - H/F", null],
  "a Softy site on the employer's own domain, known by its page's component; another site's page data is not read",
);
eq(
  platformPosting("<h1>Nos offres</h1>", "https://ens-lyon.softy.pro/offers"),
  null,
  "a Softy page with no offer in its data is no vacancy",
);

done();
