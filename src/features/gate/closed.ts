import { fold } from "../../shared/kit/fold.js";

// An advert whose own page says it is closed (closed adverts FR-1, FR-2): «Ta oferta jest już nieaktualna», «Deze
// vacature is niet meer actief», «Ovaj oglas nije aktivan», "This vacancy is no longer available". Google asks that a
// job filled before its end day be removed (the legacy's docs/research/closed-offers.md). The legacy's builder/closed.ts,
// its patterns extracted as they are: read near the top of the text, where such notices sit (further down a page may
// list other, closed adverts), folded (no accents, lower case; ł and ø stay as they are).
const CLOSED = new RegExp(
  [
    "ta oferta jest juz nieaktualna",
    "oferta wygas[lł]a",
    "og[lł]oszenie (jest )?nieaktualne",
    "deze vacature is (niet meer (actief|beschikbaar|open)|gesloten|verlopen|vervuld)",
    "diese stelle ist (leider )?(nicht mehr (verfugbar|aktiv|ausgeschrieben)|bereits besetzt)",
    "die stelle wurde (bereits )?besetzt",
    "stellenanzeige ist nicht mehr (aktiv|verfugbar)",
    "this (job|position|vacancy|role|posting|job posting) (is no longer (available|open|active|accepting applications)|has (been filled|expired|closed))",
    "(we are|we['’]re|employer is|company is) no longer accepting applications(?! (by|via|through|per|at|on) )",
    "esta oferta (ya no esta (disponible|activa)|ha caducado|ha finalizado)",
    "oferta caducada",
    "aquesta oferta ja no esta (disponible|activa)",
    "cette offre (n['’]est plus (disponible|active|en ligne)|a expire|est expiree)",
    "offre expiree",
    "questa offerta non e piu (disponibile|attiva)",
    "annuncio scaduto",
    "offerta scaduta",
    "esta vaga (ja nao esta disponivel|foi encerrada|esta encerrada)",
    "ovaj oglas (nije aktivan|je istekao)",
    "tato nabidka (jiz|uz) neni (aktivni|aktualni)",
    "annonsen ar inte langre aktiv",
    "tjansten ar tillsatt",
    "stillingen er (besat|besatt|ikke lenger ledig)",
    "annoncen er udl[oø]bet",
    "annonsen er utl[oø]pt",
  ].join("|"),
);

// Some sites keep a filled advert up and say so in its title («De vacature " Lasser " is intussen niet meer
// beschikbaar.», «Technische/r Zeichner/in – bereits besetzt»: 25 published offers, 8 November 2026).
const CLOSED_TITLE =
  /niet meer beschikbaar|bereits besetzt|nicht mehr (?:vorhanden|verfugbar|aktiv)|oferta cerrada|no longer available|position filled|n['’]est plus disponible|offre pourvue|vacature (?:is )?(?:gesloten|vervuld)/;

const READ = 2000;

export const saysClosed = (advert: {
  readonly title?: string;
  readonly description?: string;
}): boolean =>
  CLOSED.test(fold((advert.description ?? "").slice(0, READ))) ||
  CLOSED_TITLE.test(fold(advert.title ?? ""));
