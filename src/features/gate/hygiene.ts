import { fold } from "../../shared/kit/fold.js";

// Hygiene: titles that are no advert of a job in the vertical, whatever their family (legacy
// builder/gate.mjs, word for word but for types).

// Title terms that mean "not the job you think": a sales role that names a product, a
// recruiter hiring engineers, an internship, a labourer or a trade's helper ("Ayudante de
// electricista", as the German "Elektrohelfer"). In the sources' languages, kept
// short; the visitor has vetoes of their own in the profile code.
const HYGIENE =
  /(?:^|[^a-z0-9])(?:sales|vendedora?|venedora?|comercial|saljare|forsaljare|verkoper|vendeur|vendeuse|verkaufer|verkauferin|account manager|recruiter|talent acquisition|internship|apprenticeship|intern|praktikum|stagiaire|stage\b|becario|becaria|practicas|apprentice|apprenti|azubi|trainee|leerling|lehrling|lehrstelle|lehre (?:zum|zur|als)|schulerpraktikum|aprendiz|aprendiza|larling|lærling|bbl|auszubildende[nr]?|ausbildungsplatz|ausbildungsstelle|ausbildungsstellen|zusatzausbildung|lernende|lernender|lernenden|werksstudent|werksstudentin|duales studium|dualem studium|dualer student|duale studentin|dhbw|thesis|masterarbeit|masterarbeiten|bachelorarbeit|bachelorarbeiten|abschlussarbeit|abschlussarbeiten|diplomarbeit|aushilfe|examensarbete|exjobb|afstudeeropdracht|afstudeerstage|tfm|tfg|peon|peones|peona|prodejce|prodavac|prodavacka|pardavejas|pardaveja|pardevejs|pardeveja|praktikant|praktikantka|praktikantas|praktikante|offre pourvue|poste pourvu|alternance|alternant|alternante|apprentie|en apprentissage|apprentissage (?:de|du|des|d)|contrat d.apprentissage|apprendista|apprendistato|tirocinio|tirocinante|stagista|stazista|stazuotojas|delnik|delnice|ai trainer|ai training|ai tutor|data collector|data labeling|data labelling|annotator|survey (?:panelist|assistant|taker|participant|respondent)|(?:paid|online) surveys?|study participant|task based|freelance rater|working student|werkstudent|werkstudentin|studentische hilfskraft|stud\. hilfskraft|student assistant|student research assistant|hilfsassistent|hilfsassistentin|schulerpraktikant|schulerpraktikantin|ausbildung|berufsausbildung|store ?#? ?[0-9]+|store manager|store associate|retail assistant|retail associate|shop assistant|barista|cashier|crew member|[a-z]*helfer|[a-z]*helferin|hilfsarbeiter|hilfsarbeiterin|hilfsmonteur|hilfsmonteurin|hilfsmonteure|hilfsschlosser|hilfselektriker|hilfskraft|hilfskrafte|helper|helpers|labourer|labourers|laborer|laborers|general operative|hulpmonteur|hulpkracht|aide monteur|aide-monteur|aide monteuse|aide-monteuse|manoeuvre|manœuvre|manovale|manovali|(?:ayudant[ae]s?|ajudant(?:a|s|es)?|auxiliar(?:s|es)?)(?:\/[a-z]+)?[ -]+(?:de |del |d'|d’)?(?:electricistas?|electricidad|electricitat|electromecanic[oa]?s?|fontaner[oa]s?|fontaneria|lampistas?|soldador(?:a|es|as|s)?|soldadura|mecanic[oa]?s?|chapistas?|cerrajer[oa]s?|cerrajeria|frigoristas?|instal(?:[.·]l)?ador(?:a|es|as|s)?|montador(?:a|es|as)?|muntador(?:a|s|es)?)|machine operator|production operator|quality control operator|qc operator|assembly operator|packing operator|forklift|(?:operador(?:a|es|as)?[ -])?grabador(?:a|es|as)? de datos)(?![a-z0-9])/;
// Titles of pages that are no advert at all: a listing that counts its adverts ("1.188 Elektronikerin …
// Jobs & Stellenangebote", "Jobs als Bauzeichner: 3.504 Stellenangebote", "Schlosser-Stellenanzeigen in
// Northeim"), a job-ad template ("Cloud Architect*in Stellenanzeigen Vorlage"), a shop's workwear of the
// brand JOB ("Job Zunfthose IKARUS") or a site's background task ('Job "app:crm360:contact:create"'). On
// 24 October they were 2,193 of the 781,941 published offers, from 16 sites the careers hunt found, and
// nothing else there matched.
// And a search page for one kind of job near one town ("Design Engineer jobs near Trafford",
// /job/search/…?locationName=Trafford): 2,072 of the published offers on 27 October 2026, one site's
// categories times its towns. And a Nordic search page's «Ledige jobs som geograf/geolog i Bornholm», «Lediga jobb som …
// i …»: 540 of jobsearch.dk's published on 1 November 2026, its occupations times its places, untranslated for the
// Faroese ones (the owner); a vacancy its own title says is filled («(INGEVULD)», "POSITION FILLED", «Stelle besetzt»,
// «BESAT -»: 109 that day); and elempleo.com's «Ofertas de Empleo Ingeniero industrial en Madrid», 89 that day; and
// valmedi.de's «Jobs Informatiker in Baden-Württemberg | valmedi», a page of four, 400 published on 8 November 2026.
const NOT_ADVERT =
  /(?:^|[^a-z0-9])(?:stellenanzeigen? vorlage|jobs? (?:&|und) stellenangebote$|[a-z-]*stellenanzeigen (?:in|fur) [a-z])|: \d[\d.]* stellenangebote$|-jobbeschreibung$| jobs near [a-z][^()|]*$|^ledige (?:jobs?|stillinger) (?:som|i|inden for|indenfor|innen) |^lediga jobb (?:som|i|inom) |^ofertas de empleo [a-z][^,:]* en [a-z][^,]*$|^(?:jobs|stellenangebote) [a-z][^,:|(]* (?:in|im) [a-z][^,(|]*(?: \| [a-z][^|]*)?$|\bingevuld\b|\bposition (?:filled|closed)\b|\bstelle besetzt\b|\bstilling besat\b|^besat\b|\bposte pourvu\b|\bvacature vervuld\b|zunft(?:hose|shorts|weste)|latzhose|bundhose|hosentrager|arbeitsjacke|koppelschloss|klempner-kittel|^jobs? "app[:_]/;
// An advert's application form kept as an advert of its own: Umantis's «Teamleiter … (m/w/d) - Bewerbung» at
// /Application/CheckLogin, the advert's title over the form's fields, each beside its advert (138 published on 1 November
// 2026). Both are needed: Taleez's and an embedded Greenhouse board's advert pages are at /apply/ too.
const FORM_TITLE =
  /\s[-–|]\s(?:bewerbung|application|candidature|postuler|apply|solicitud|sollicitatie)$/;
const FORM_URL = /\/application\/|checklogin/i;

export function hygieneReason(advert: {
  readonly title: string;
  readonly url?: string;
}): string | null {
  const title = fold(advert.title);
  if (NOT_ADVERT.test(title))
    return "title is a listing page, a job-ad template, a product or a site task, not an advert";
  if (FORM_TITLE.test(title) && FORM_URL.test(advert.url ?? ""))
    return "an advert's application form, not the advert";
  return HYGIENE.test(title)
    ? "title names a sales, recruiting, trainee, labourer, retail, operative or gig role"
    : null;
}
