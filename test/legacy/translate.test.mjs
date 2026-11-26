// The legacy's test/translate.test.mjs (JustJans/indudex@ec79858), carried whole (legacy resync T009): its imports pointed at
// this repo, the site's cases (app/lib/i18n.ts) left out.
// ➤ Titles in the site's languages from the translator's caches (builder/translate.ts): each title once, in the
// ➤ language its letters say when they say another than its country's; a source that asks for its titles to be left
// ➤ as written keeps them and says their language; and the titles the caches lack written down for the translator,
// ➤ with the town and company the method reads beside them, Spain's first.
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { harness } from "./harness.mjs";
import {
  applyTitles,
  wantedTitles,
  loadCache,
  saveCache,
  loadUntranslated,
  loadRedo,
  languageOf,
  NOTHING,
} from "./translate-shim.mjs";
import {
  apostrophes,
  besideTowns,
  catalanSpelling,
} from "../../src/features/title-translation/method/catalan-spelling.ts";

const { ok, eq, done } = harness("translate");

const recs = () => [
  {
    t: "Elektriker",
    l: "Berlin, Deutschland",
    cc: "de",
    ci: "Berlin",
    c: "Acme",
    s: "careers",
  },
  {
    t: "Elektriker",
    l: "Köln, Deutschland",
    cc: "de",
    ci: "Köln",
    c: "Acme",
    s: "stepstone",
  },
  {
    t: "Elektriker",
    l: "Köln, Deutschland",
    cc: "de",
    ci: "Köln",
    c: "Beta AG",
    s: "careers",
  },
  {
    t: "Electricista",
    l: "Madrid, España",
    cc: "es",
    ci: "Madrid",
    c: "Gamma SL",
    s: "sne",
  },
  { t: "Senior Software Engineer", l: "", cc: "xx", c: "Delta", s: "careers" },
  {
    t: "Muntador/a en fusteria metàl·lica i alumini",
    l: "Barcelona, España",
    tl: "es",
    cc: "es",
    ci: "Barcelona",
    c: "Epsilon",
    s: "careers",
  },
  {
    t: "Acme Elektriker gesucht",
    l: "Bonn, Deutschland",
    cc: "de",
    c: "Zeta",
    s: "careers",
  },
];

// ➤ The language each title is written in.
eq(
  recs().map(languageOf),
  ["de", "de", "de", "es", "en", "ca", "de"],
  "the country says it, a Catalan title on a Spanish offer is Catalan, an English title of no country is English",
);

// ➤ A place that names no country: the offer's country says it (83,320 published offers had no language on 31 October 2026).
eq(
  [
    { t: "Explosionsschutz-Ingenieur", l: "München", cc: "de" },
    { t: "HVAC Engineer for RoRo Pax", l: "", cc: "ro" },
    { t: "Chargé de projets industriels", l: "Lausanne", cc: "ch" },
    { t: "Project Engineer", l: "", cc: "xx" },
  ].map(languageOf),
  ["de", "ro", "fr", "en"],
  "the offer's country when the place names none, French on a Swiss offer, English with no country",
);

// ➤ The cache applied: a translation where the title is in another language; NOTHING shows the title as written.
let rs = recs();
const es = new Map([
  ["Elektriker", "Electricista"],
  ["Senior Software Engineer", "Ingeniero de software sénior"],
  ["Electricista", "Electricista"],
  ["Acme Elektriker gesucht", NOTHING],
]);
let t = applyTitles(rs, {
  target: "es",
  cache: es,
  untranslated: new Set(["sne"]),
});
eq(
  [rs[0].ts, rs[1].ts, rs[4].ts, rs[6].ts, rs[3].ts],
  [
    "Electricista",
    "Electricista",
    "Ingeniero de software sénior",
    undefined,
    undefined,
  ],
  "each record of a title gets its translation; a Spanish title none in Spanish",
);
eq(t.translated, 4, "four records translated");

// ➤ A title written in Catalan is its own Catalan title: the Catalan page shows it as written, not its Spanish
// ➤ translation, with no original to switch to (the cards show one only for a title that differs from it).
rs = recs();
applyTitles(rs, {
  target: "es",
  cache: new Map([[rs[5].t, "Montador/a en carpintería metálica y aluminio"]]),
});
applyTitles(rs, { target: "ca", cache: new Map() });
// The site's reading of the Catalan title (its app/lib/i18n.ts) is the web's: the cache's part of the case stays.
eq(
  [rs[5].ts, rs[0].tc],
  ["Montador/a en carpintería metálica y aluminio", undefined],
  "the Catalan title keeps its Spanish translation for the Spanish page; a German one with no Catalan gets none",
);

// ➤ A source that asks for its titles to be left as written: no translation, its title's language said instead.
rs = recs();
t = applyTitles(rs, {
  target: "en",
  cache: new Map([["Electricista", "Electrician"]]),
  untranslated: new Set(["sne"]),
});
eq(
  [rs[3].te, rs[3].nt, t.kept],
  [undefined, "es", 1],
  "the SNE offer keeps its Spanish title on the English site, marked as Spanish",
);

// ➤ What the caches lack, each title once, with the languages it lacks and what the method reads beside it.
rs = recs();
const caches = {
  en: new Map([["Elektriker", "Electrician"]]),
  es: new Map([["Elektriker", "Electricista"]]),
  ca: new Map(),
  fr: new Map(),
  nl: new Map(),
  de: new Map(),
};
const wanted = wantedTitles(rs, caches, { untranslated: new Set(["sne"]) });
const elektriker = wanted.find((w) => w.t === "Elektriker");
eq(
  [
    elektriker.lang,
    elektriker.into.sort().join(","),
    elektriker.n,
    elektriker.ci,
    elektriker.c,
  ],
  ["de", "ca,fr,nl", 3, "Köln", "Acme"],
  "Elektriker lacks Catalan, French and Dutch; its commonest town and company",
);
eq(
  elektriker.others,
  1,
  "one other company's title holds every word of Acme's name (Zeta's 'Acme Elektriker gesucht')",
);
ok(
  !wanted.some((w) => w.t === "Electricista"),
  "the SNE title is not translated at all",
);
eq(wanted[0].cc, "es", "Spain's offers first");
ok(
  !wanted.find((w) => w.t === "Senior Software Engineer").into.includes("en"),
  "an English title lacks no English",
);

// ➤ A title to translate anew: asked for in every language while its old translations still show, after the others.
const again = wantedTitles(recs(), caches, {
  untranslated: new Set(["sne"]),
  redo: new Set(["Elektriker"]),
});
const anew = again.find((w) => w.t === "Elektriker");
eq(
  [anew.into.sort().join(","), anew.redo, again[again.length - 1].t],
  ["ca,en,es,fr,nl", 1, "Elektriker"],
  "Elektriker asked for again in every language, after the titles no cache holds",
);

// ➤ A title only a coming language lacks (Romanian, say) waits for those a language of the site lacks, however many
// ➤ its offers.
const site = Object.fromEntries(
  ["en", "es", "ca", "fr", "nl", "it", "pl"].map((l) => [
    l,
    new Map([["Elektriker", "x"]]),
  ]),
);
const queue = wantedTitles(
  recs(),
  { ...site, de: new Map() },
  { untranslated: new Set(["sne"]), coming: ["ro"] },
);
eq(
  [
    queue.find((w) => w.t === "Elektriker").into.join(","),
    queue[queue.length - 1].t,
  ],
  ["ro", "Elektriker"],
  "Elektriker, three offers, lacking only Romanian, comes after the titles of one offer the site lacks",
);

// ➤ The caches and the list of sources on disk.
const dir = join(tmpdir(), `translate-test-${process.pid}`);
mkdirSync(dir, { recursive: true });
saveCache(join(dir, "titles-es.json"), es);
eq(
  loadCache(join(dir, "titles-es.json")).get("Elektriker"),
  "Electricista",
  "a cache saved is read back",
);
eq(loadCache(join(dir, "none.json")).size, 0, "no cache yet: an empty one");
writeFileSync(
  join(dir, "untranslated.yml"),
  "sources:\n  sne: «no se alteren»\n  adzuna: «You will not translate»\n",
);
eq(
  [...loadUntranslated(join(dir, "untranslated.yml"))].sort(),
  ["adzuna", "sne"],
  "the sources that ask it, by name",
);
writeFileSync(join(dir, "mt-redo.json"), JSON.stringify(["Elektriker"]));
eq(
  [
    [...loadRedo(join(dir, "mt-redo.json"))],
    loadRedo(join(dir, "none.json")).size,
  ],
  [["Elektriker"], 0],
  "the titles to translate anew, none without the list",
);
rmSync(dir, { recursive: true, force: true });

// ➤ A Spanish offer's title in English only is English, and gets the Spanish title its cache holds; one that mixes in
// ➤ Spanish words stays Spanish (8 November 2026: 6,694 of Spain's published offers showed an English title on the Spanish page).
const spanishOffers = [
  "Manufacturing Engineer",
  "Senior Civil Engineer",
  "Desarrollador/a Power BI",
  "Java Full-Stack Developer – Java, Spring Boot y React",
  "Director Comercial",
].map((t) => ({
  t,
  l: "Madrid, España",
  cc: "es",
  ci: "Madrid",
  c: "Acme",
  s: "careers",
}));
eq(
  spanishOffers.map(languageOf),
  ["en", "en", "es", "es", "es"],
  "English only, or Spanish with English words",
);
applyTitles(spanishOffers, {
  target: "es",
  cache: new Map([
    ["Manufacturing Engineer", "Ingeniero de fabricación"],
    ["Desarrollador/a Power BI", "Desarrollador/a Power BI"],
  ]),
});
eq(
  spanishOffers.map((r) => r.ts || ""),
  ["Ingeniero de fabricación", "", "", "", ""],
  "the Spanish title of an English one",
);

// ➤ The offer's own town as its title writes it, where a translation renamed it (8 November 2026: 593 Spanish and 553 Catalan
// ➤ titles, among others); not a link word read as a town («Java Oder JavaScript»), nor a town the title writes otherwise.
const townOffers = [
  {
    t: "Bauingenieur/ Kalkulation Berlin Ingenieurbau",
    cc: "de",
    ci: "Berlin",
    l: "Berlin",
  },
  {
    t: "Business Analyst Assurance - Services Financiers - Lyon",
    cc: "fr",
    ci: "Lyon",
    l: "Lyon",
  },
  {
    t: "Monteur (m/w/d) Frankfurt am Main",
    cc: "de",
    ci: "Frankfurt am Main",
    l: "Frankfurt am Main",
  },
  {
    t: "Softwareentwickler (Java Oder JavaScript)",
    cc: "de",
    ci: "Oder",
    l: "Frankfurt (Oder)",
  },
];
applyTitles(townOffers, {
  target: "ca",
  cache: new Map([
    [
      townOffers[0].t,
      "Enginyer civil / càlcul Berlín, enginyeria d'estructures",
    ],
    [townOffers[1].t, "Business Analyst Assurance - Serveis financers - Lió"],
    [townOffers[2].t, "Muntador Fráncfort del Meno"],
    [townOffers[3].t, "Desenvolupador de programari (Java o JavaScript)"],
  ]),
});
eq(
  townOffers.map((r) => r.tc),
  [
    "Enginyer civil / càlcul Berlin, enginyeria d'estructures",
    "Business Analyst Assurance - Serveis financers - Lyon",
    "Muntador Frankfurt am Main",
    "Desenvolupador de programari (Java o JavaScript)",
  ],
  "the offer's own town written back",
);

// ➤ Catalan spelling leaves a town's name as written, and an older cache's respelled town is written back once (TB2-10).
const spainTowns = [
  "Torrejón de Ardoz",
  "Mairena del Aljarafe",
  "Corvera de Asturias",
  "El Ejido",
].map((ci) => ({
  t:
    ci === "El Ejido"
      ? "El Ejido: técnico de mantenimiento"
      : `Operario en ${ci}`,
  cc: "es",
  ci,
  l: ci,
  c: "Acme",
  s: "careers",
}));
applyTitles(spainTowns, {
  target: "ca",
  cache: new Map([
    [spainTowns[0].t, "Operari a Torrejón d'Ardoz"],
    [spainTowns[1].t, "Operari a Mairena de l'Aljarafe"],
    [spainTowns[2].t, "Operari a Corvera d'Asturias"],
    [spainTowns[3].t, "L'Ejido: tècnic de manteniment"],
  ]),
});
eq(
  spainTowns.map((r) => r.tc),
  [
    "Operari a Torrejón de Ardoz",
    "Operari a Mairena del Aljarafe",
    "Operari a Corvera de Asturias",
    "El Ejido: tècnic de manteniment",
  ],
  "the towns as written, once",
);
const spelled = (t, towns) =>
  besideTowns(t, towns, (x) => apostrophes(catalanSpelling(x)));
eq(
  [
    spelled("Operari a Torrejón de Ardoz", ["Torrejón de Ardoz"]),
    spelled("El Ejido: tècnic de manteniment", ["El Ejido"]),
    spelled("Operari de Alcalá de Henares", ["Alcalá de Henares"]),
    spelled("Tècnic de obra a Vic", ["Vic"]),
  ],
  [
    "Operari a Torrejón de Ardoz",
    "El Ejido: tècnic de manteniment",
    "Operari d'Alcalá de Henares",
    "Tècnic d'obra a Vic",
  ],
  "the spelling around a town, not in it: the «de» before it still takes its apostrophe",
);

// The English page's capitals (its app/lib/i18n.ts, WEB-07) are the web's, left out here.

done();
