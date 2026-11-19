// Each language's words for what the readers look for (years, months, days, hours, numbers,
// minimums, gross and net pay), one table per language, read by every reader: a word added to a
// table reaches them all. From the legacy's builder/words/*.mjs. A word ending in «*» is a stem:
// any letters may follow it.

export interface WordTable {
  readonly year?: readonly string[];
  readonly month?: readonly string[];
  readonly week?: readonly string[];
  readonly day?: readonly string[];
  readonly hour?: readonly string[];
  readonly numbers?: Readonly<Record<string, number>>;
  readonly atLeast?: readonly string[];
  readonly moreThan?: readonly string[];
  readonly lessThan?: readonly string[];
  readonly experience?: readonly string[];
  readonly gross?: readonly string[];
  readonly net?: readonly string[];
}

export const TABLES = {
  // English.
  en: {
    year: ["year", "years", "yr", "yrs"],
    month: ["month", "months"],
    week: ["week", "weeks"],
    day: ["day", "days"],
    hour: ["hour", "hours", "hr", "hrs", "h"],
    numbers: {
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5,
      six: 6,
      seven: 7,
      eight: 8,
      nine: 9,
      ten: 10,
      twelve: 12,
      fifteen: 15,
    },
    atLeast: [
      "at least",
      "a minimum of",
      "minimum of",
      "minimum",
      "min.",
      "min",
    ],
    moreThan: ["more than", "over"],
    lessThan: ["less than", "fewer than", "under"],
    experience: ["experien*"],
    gross: ["gross"],
  },
  // Spanish.
  es: {
    year: ["año", "años"],
    month: ["mes", "meses"],
    week: ["semana", "semanas"],
    day: ["día", "días"],
    hour: ["hora", "horas"],
    numbers: {
      uno: 1,
      una: 1,
      dos: 2,
      tres: 3,
      cuatro: 4,
      cinco: 5,
      seis: 6,
      siete: 7,
      ocho: 8,
      nueve: 9,
      diez: 10,
    },
    atLeast: ["mínimo de", "mínimo", "al menos"],
    moreThan: ["más de"],
    lessThan: ["menos de"],
    experience: ["experien*"],
    gross: ["bruto"],
    net: ["neto", "netos", "neta", "netas"],
  },
  // Catalan.
  ca: {
    year: ["anys"],
    month: ["mes", "mesos"],
    week: ["setmana", "setmanes"],
    day: ["dia", "dies"],
    hour: ["hora", "hores"],
    numbers: {
      un: 1,
      dos: 2,
      tres: 3,
      quatre: 4,
      cinc: 5,
      sis: 6,
      vuit: 8,
      nou: 9,
      deu: 10,
    },
    moreThan: ["més de"],
    experience: ["experièn*"],
    gross: ["brut", "bruto"],
    net: ["nets"],
  },
  // French.
  fr: {
    year: ["an", "ans", "année", "années"],
    month: ["mois"],
    week: ["semaine", "semaines"],
    day: ["jour", "jours", "jr", "jrs", "j"],
    hour: ["heure", "heures", "h"],
    numbers: {
      un: 1,
      une: 1,
      deux: 2,
      trois: 3,
      quatre: 4,
      cinq: 5,
      sept: 7,
      huit: 8,
      neuf: 9,
      dix: 10,
    },
    atLeast: ["au moins", "minimum"],
    moreThan: ["plus de"],
    lessThan: ["moins de"],
    experience: ["expérien*"],
    gross: ["brut"],
    net: ["nets", "nette"],
  },
  // German.
  de: {
    year: ["jahr", "jahre", "jahren"],
    month: ["monat", "monate", "monaten"],
    week: ["woche", "wochen"],
    day: ["tag", "tage", "tagen"],
    hour: ["stunde", "stunden", "std"],
    numbers: {
      ein: 1,
      eine: 1,
      einen: 1,
      eins: 1,
      zwei: 2,
      drei: 3,
      vier: 4,
      fünf: 5,
      funf: 5,
      sechs: 6,
      sieben: 7,
      acht: 8,
      neun: 9,
      zehn: 10,
    },
    atLeast: ["mindestens"],
    moreThan: ["mehr als", "über"],
    lessThan: ["weniger als"],
    experience: ["erfahrung*"],
    gross: ["brutto"],
    net: ["netto*"],
  },
  // Dutch.
  nl: {
    year: ["jaar", "jaren"],
    month: ["maand", "maanden"],
    week: ["week", "weken"],
    day: ["dag", "dagen"],
    hour: ["uur", "uren"],
    numbers: {
      één: 1,
      een: 1,
      twee: 2,
      drie: 3,
      vier: 4,
      vijf: 5,
      zes: 6,
      zeven: 7,
      acht: 8,
      negen: 9,
      tien: 10,
    },
    atLeast: ["minstens", "minimaal", "ten minste"],
    moreThan: ["meer dan", "ruim"],
    lessThan: ["minder dan"],
    experience: ["ervaring*"],
    gross: ["bruto"],
    net: ["netto*"],
  },
  // Italian.
  it: {
    year: ["anno", "anni"],
    month: ["mese", "mesi"],
    week: ["settimana", "settimane"],
    day: ["giorno", "giorni"],
    hour: ["ora", "ore"],
    numbers: { uno: 1, due: 2, tre: 3, quattro: 4, cinque: 5 },
    atLeast: ["almeno"],
    moreThan: ["oltre"],
    lessThan: ["meno di"],
    experience: ["esperienz*"],
    gross: ["lordo"],
    net: ["netto*", "netta", "netti"],
  },
  // Portuguese.
  pt: {
    year: ["ano", "anos"],
    week: ["semana", "semanas"],
    day: ["dia", "dias"],
    hour: ["hora", "horas"],
    atLeast: ["pelo menos"],
    experience: ["experiênc*"],
    gross: ["bruto"],
    net: ["neto", "netos", "neta", "netas"],
  },
  // Polish.
  pl: {
    year: ["rok", "roku", "lat", "lata"],
    week: ["tygodniu"],
    day: ["dni"],
    atLeast: ["co najmniej", "przynajmniej", "minimalne"],
    lessThan: ["mniej niż"],
    experience: ["doświadczen*"],
    gross: ["brutto"],
    net: ["netto*"],
  },
  // Swedish.
  sv: {
    year: ["år", "års"],
    month: ["månad", "månader"],
    week: ["vecka", "veckan"],
    day: ["dag", "dagar"],
    hour: ["timme", "timmar"],
    atLeast: ["minst"],
    lessThan: ["mindre än"],
    experience: ["erfarenhet*"],
  },
  // Danish.
  da: {
    year: ["år"],
    week: ["uge", "ugen"],
    day: ["dag", "dage"],
    atLeast: ["mindst"],
    experience: ["erfaring*"],
  },
  // Norwegian.
  no: {
    year: ["år"],
    week: ["uke", "uken"],
    day: ["dag", "dager"],
    atLeast: ["minst"],
    experience: ["erfaring*"],
    net: ["nett"],
  },
  // Czech.
  cs: {
    year: ["rok", "roky", "roku", "let"],
    atLeast: ["minimálně", "nejméně", "aspoň"],
    lessThan: ["méně než"],
    experience: ["zkušenost*", "praxe", "praxi", "praxí"],
    gross: ["hrub*"],
  },
  // Slovak.
  sk: {
    year: ["rok", "roky", "rokov", "roku"],
    atLeast: ["minimálne", "najmenej", "aspoň"],
    experience: ["skúsenost*", "prax"],
    gross: ["hrub*"],
  },
  // Finnish.
  fi: {
    year: ["vuosi", "vuoden", "vuotta"],
    atLeast: ["vähintään"],
    experience: ["kokemus*"],
    net: ["netto*"],
  },
  // Hungarian.
  hu: {
    year: ["év", "évnyi", "évet"],
    atLeast: ["legalább"],
    experience: ["tapasztalat*"],
    gross: ["bruttó"],
  },
  // Romanian, in both spellings of its comma letters («ț», «ţ»).
  ro: {
    year: ["an", "ani"],
    atLeast: ["minim", "cel puțin", "cel putin"],
    lessThan: ["mai puțin de", "mai putin de"],
    experience: ["experienț*", "experienţ*"],
    gross: ["brut"],
  },
  // Croatian.
  hr: {
    year: ["godin*"],
    atLeast: ["najmanje", "minimalno"],
    experience: ["iskustv*"],
  },
  // Lithuanian.
  lt: { year: ["metų", "metai"], experience: ["patirt*"] },
  // Latvian.
  lv: { year: ["gadu", "gadi", "gadiem"], experience: ["pieredz*"] },
} as const satisfies Record<string, WordTable>;
