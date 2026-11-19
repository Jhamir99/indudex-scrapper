// Towns an advert's text gives, for a place that names no town (FR-6). Each is only a candidate:
// placing tries it against the map in the advert's country, so a word that is no town of the
// country counts for nothing.

// The form each country writes its postcodes in.
const POSTCODE: Readonly<Record<string, string>> = {
  de: String.raw`(?:D-)?\d{5}`,
  fr: String.raw`\d{5}`,
  es: String.raw`\d{5}`,
  it: String.raw`\d{5}`,
  fi: String.raw`\d{5}`,
  at: String.raw`(?:A-)?\d{4}`,
  ch: String.raw`(?:CH-)?\d{4}`,
  be: String.raw`(?:B-)?\d{4}`,
  dk: String.raw`(?:DK-)?\d{4}`,
  no: String.raw`\d{4}`,
  lu: String.raw`(?:L-)?\d{4}`,
  nl: String.raw`\d{4} ?[A-Z]{2}`,
  pl: String.raw`\d{2}-\d{3}`,
  pt: String.raw`\d{4}-\d{3}`,
  cz: String.raw`\d{3} ?\d{2}`,
  sk: String.raw`\d{3} ?\d{2}`,
  se: String.raw`\d{3} ?\d{2}`,
};

// Each linking word whole («del» is not «de» and an «l»), the Catalan, Spanish and Portuguese ones
// too, and «d'» and «l'» glued to the next name; a lower-case word after a hyphen («Vila-seca»).
// «08100 Mollet del Vallès» was Mollet de Peralada (NO1-02).
const LINKING = String.raw`(?:an|am|im|in|bei|beim|b\.|ob|unter|auf|vor|vorm|zum|zur|der|die|den|dels|del|de|els|el|la|las|los|les|le|sur|sous|en|di|aan|op|nad|pod|i|y|do|da|dos|das)(?![\p{L}.])`;
const NAME_WORD = String.raw`(?:[dl]['’])?\p{Lu}[\p{L}'’.]*`;
// A Catalan town's article, as the map writes it («la Garriga», «l'Escala», «els Hostalets de Pierola»).
const ARTICLE = String.raw`(?:(?:el|els|la|les)\s+(?=\p{Lu}))?`;
// A saint's word alone is no town («Sant Cugat» is not «Sant»).
const SAINT =
  /^(?:Sant|San|Santa|Santo|Saint|Sainte|St\.?|Ste\.?|Sankt|São|Sao)$/u;
const ENDS_LINKING = new RegExp(String.raw`(?:[ -]${LINKING})+$`, "u");
const POSTCODE_TOWN = new Map(
  Object.entries(POSTCODE).map(([country, code]) => [
    country,
    new RegExp(
      String.raw`(?<![\p{L}\d-])${code}\s+(${ARTICLE}${NAME_WORD}(?:-\p{Ll}+(?![\p{L}'’]))?(?:[ -](?:${NAME_WORD}|${LINKING}))*)`,
      "gu",
    ),
  ]),
);

// The towns a text writes with their postcode («63456 Hanau», «64-100 Leszno», «D-84579
// Unterneukirchen», «2511 CV Den Haag»), in the country's postcode form: the capitalised words
// after the code, up to the line's next mark, and the first of them alone («Bernau b. Berlin»).
// Three at most, in the order written. The legacy's readers found 50 of 193 employers' sites
// with a country and no town on the card (6 November 2026).
export function postalTowns(text: string, country: string): string[] {
  const pattern = POSTCODE_TOWN.get(country);
  if (!pattern) return [];
  const out: string[] = [];
  for (const match of text.matchAll(pattern)) {
    const whole = (match[1] ?? "")
      .replace(/[\s.-]+$/u, "")
      .replace(ENDS_LINKING, "");
    const first =
      whole.replace(/^(?:el|els|la|les)\s+/iu, "").split(/[ -]/)[0] ?? "";
    for (const town of [whole, SAINT.test(first) ? "" : first])
      if (town && !out.includes(town)) out.push(town);
    if (out.length >= 3) break;
  }
  return out.slice(0, 3);
}

// The labels of a line that gives the job's own place, and those that may give an employer's
// site: an agency's or a client's job takes only the first («Einsatzort»), not «Standort», which
// may be the agency's branch (a town the text gave was missing on 13 % of the German offers the
// legacy's readers read, 1 November 2026).
const JOB_PLACE =
  "arbeitsort|einsatzort|dienstort|arbeitsplatz|work location|job location|place of work|lieu de travail|lugar de trabajo|centro de trabajo|werklocatie|standplaats|luogo di lavoro|sede di lavoro|miejsce pracy";
const SITE_PLACE =
  "standort|location|ort|ubicación|ubicacion|localización|localizacion|lieu|localisation|locatie|plaats|sede";
const placeLine = (labels: string) =>
  new RegExp(String.raw`^[\s•·*–-]*(?:${labels})\s*:\s*(.{2,60})$`, "gimu");
const JOB_LINE = placeLine(JOB_PLACE);
const ANY_LINE = placeLine(`${JOB_PLACE}|${SITE_PLACE}`);

// A Czech or Slovak board's caption with its town after it, in a text read flat, with no colon
// («Lokalita Jihlava a další Úvazek Plný úvazek»: 1,156 published offers with no town, 8 November
// 2026). Not the country («Lokalita Česká republika» was the village of Česká).
const CAPTION =
  /(?<![\p{L}])(?:Lokalita|Místo výkonu práce|Miesto výkonu práce|Místo pracoviště|Pracoviště)\s*:?\s+(?!(?:Česká|Slovenská)\s+republika|Slovensko(?![\p{L}]))(\p{Lu}[\p{L}-]*(?:\s+(?:(?:nad|pod|na|u|v|ve)\s+)?\p{Lu}[\p{L}-]*){0,3})/gu;

// The town a labelled line gives («Arbeitsort: Lüdenscheid», "Job location: Leeds", «Lieu de
// travail : Lyon», «Lugar de trabajo: Getafe»): the label's first words. Else a caption's words up
// to four, then each shorter run («Ústí nad Labem», «Ústí»).
export function labelledTowns(text: string, agency: boolean): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(agency ? JOB_LINE : ANY_LINE)) {
    const first = ((match[1] ?? "").split(/[,;(|/]|\s[-–]\s/)[0] ?? "")
      .replace(/^\d{4,5}\s+/u, "")
      .trim();
    if (first && !out.includes(first)) out.push(first);
    if (out.length >= 2) break;
  }
  if (out.length) return out;
  for (const match of text.matchAll(CAPTION)) {
    const words = (match[1] ?? "").split(/\s+/);
    for (let count = words.length; count > 0; count--) {
      const run = words.slice(0, count).join(" ");
      if (!/\s(?:nad|pod|na|u|v|ve)$/u.test(run) && !out.includes(run))
        out.push(run);
    }
    if (out.length >= 4) break;
  }
  return out;
}

// A text that places staff with a client («unser Kunde», "our client"): its address is the
// agency's own office (Personal Sigma's Muotathal for a job anywhere in German-speaking
// Switzerland, 6 November 2026), so it is read as an agency's.
export const FOR_A_CLIENT =
  /\b(?:unser(?:e[mnrs]?)? kunden?|unseres kunden|our client|our customer|notre client|nos clients|nuestro cliente|onze (?:klant|opdrachtgever)|il nostro cliente|naszego klienta|nasz klient|personaldienstleist\w*|personalvermittl\w*|arbeitnehmer(?:ü|ue)berlassung|zeitarbeit|uitzendbureau|interim)\b/i;
