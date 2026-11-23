// Legacy builder/mt/corrections.mjs (JustJans/indudex@b0cd182), word for word but for types, lint and paths.
// Fixed corrections of mistakes Firefox makes the same way every time, applied to its output when the
// title shows they are mistakes: "Lead" read as the metal, "Staff" as the personnel, "Graduate" as a
// postgraduate. Each rule: the language translated into, what the title must hold, what to replace.
const STAFF_ROLE =
  /(?<!\bof\s+(?:the\s+)?(?:technical\s+)?)\bstaff\b(?=(?:[\s/&-]+\S+){0,6}?[\s/&-]+(?:engineers?|developers?|scientists?|architects?|designers?|researchers?|programmers?|analysts?|manager|technologist)\b)/i;
// A title with "Remote" whose translation is no longer English ("fully remote within Germany Remote" left as it was).
const REMOTE_LEFT = (title: string, out: string) =>
  /\bremote\b/i.test(title) &&
  !/(?<![\p{L}])(?:the|within|from|for|with|and|of|fully|only|based|across)(?![\p{L}])/iu.test(
    out,
  );
// A Spanish or Catalan title naming the administrator and no one in charge.
const ADMINISTRATOR =
  /^(?!.*(?<![\p{L}])(?:gerente|gerent|jef[ea]s?|directora?|director[ae]s|responsables?|managers?|gestor[ae]?s?|coordinador[ae]?s?|cap)(?![\p{L}]))(?=.*(?<![\p{L}])administrador(?:a|es|as|s)?(?![\p{L}]))/iu;
// A rule: the language it corrects, when it applies (a test of the title, or of the title and the
// output), what it replaces in the output and with what.
type Replacer = (match: string, ...rest: (string | number)[]) => string;
type Rule = readonly [
  string,
  RegExp | ((title: string, out: string) => boolean),
  RegExp | string,
  string | Replacer,
];
// The legacy's table, literal and generated rows mixed: read as rules.
export const RULES = [
  // The Spanish and Catalan «Administrador» (of systems, databases, networks) as a manager («Administrador de Bases de
  // Datos DB2» came back "Database Manager DB2", and «Responsable de bases de dades» in Catalan: 19 titles, 8 November 2026).
  [
    "en",
    ADMINISTRATOR,
    /(?<![\p{L}-])Managers(?![\p{L}-])/gu,
    "Administrators",
  ],
  ["en", ADMINISTRATOR, /(?<![\p{L}-])Manager(?![\p{L}-])/gu, "Administrator"],
  [
    "en",
    ADMINISTRATOR,
    /(?<![\p{L}-])managers(?![\p{L}-])/gu,
    "administrators",
  ],
  ["en", ADMINISTRATOR, /(?<![\p{L}-])manager(?![\p{L}-])/gu, "administrator"],
  // "Operator" (of a machine) as the one who runs a business: German "Betreiber" ("Produktionsbetreiber"),
  // Dutch and French "exploitant". German and Dutch job titles say "Operator" themselves.
  ["de", /\boperators?\b/i, /Betreiber/g, "Operator"],
  ["de", /\boperators?\b/i, /betreiber/g, "operator"],
  ["nl", /\boperators?\b/i, /Exploitanten\b/g, "Operators"],
  ["nl", /\boperators?\b/i, /exploitanten\b/g, "operators"],
  ["nl", /\boperators?\b/i, /Exploitant/g, "Operator"],
  ["nl", /\boperators?\b/i, /exploitant/g, "operator"],
  // (Each replacement is written as it is: "$1" means nothing here.)
  ["fr", /\boperators?\b/i, /\bExploitants\b/g, "Opérateurs"],
  ["fr", /\boperators?\b/i, /\bexploitants\b/g, "opérateurs"],
  ["fr", /\boperators?\b/i, /\bExploitant\b/g, "Opérateur"],
  ["fr", /\boperators?\b/i, /\bexploitant\b/g, "opérateur"],
  // "Lead" (a role) as the metal.
  ["es", /\blead\b/i, /\s*\b(?:del?\s+)?plomo\b/gi, " líder"],
  ["ca", /\blead\b/i, /\s*\b(?:del?\s+)?plom\b/gi, " líder"],
  // «Dipl.» read as English: Firefox's Catalan added «(en anglès).» after it (42 published Catalan titles, most of them
  // Swiss «Dipl. Bauingenieur:in», 8 November 2026).
  [
    "ca",
    /^(?!.*(?<![\p{L}])(?:english|anglès|angles)(?![\p{L}]))/iu,
    /\s*\(en anglès\)\.?/giu,
    "",
  ],
  ["fr", /\blead\b/i, /\s*\b(?:du\s+|de\s+)?plomb\b/gi, " lead"],
  ["nl", /\blead\b/i, /\blood\b/gi, "lead"],
  ["de", /\blead\b/i, /\bBlei\b/g, "Lead"],
  // "Staff" (a level, before a role) as the personnel.
  ["es", STAFF_ROLE, /\s*\b(?:del?\s+)?personal\b/gi, " Staff"],
  ["ca", STAFF_ROLE, /\s*\b(?:del?\s+)?personal\b/gi, " Staff"],
  ["fr", STAFF_ROLE, /\s*\b(?:du\s+|de\s+)?personnel\b/gi, " Staff"],
  ["nl", STAFF_ROLE, /\s*\b(?:voor\s+het\s+)?personeel\b/gi, " Staff"],
  ["de", STAFF_ROLE, /\b(?:Personal|Mitarbeiter)\b/g, "Staff"],
  // A Spanish or Catalan grade ("Oficial de 2ª") as a rank in Dutch: "Tweederangs vakman", a second-rate
  // craftsman; "handelaar", a trader.
  [
    "nl",
    /\b(?:first|second|third)-class tradesperson\b/i,
    /\b(?:eersteklas|eersterangs|tweederangs|tweedeklas|derderangs|derdeklas)\s+/gi,
    "",
  ],
  [
    "nl",
    /\b(?:first|second|third)-class tradesperson\b/i,
    /\b(?:eerste|tweede|derde)klasser\b/gi,
    "vakman",
  ],
  ["nl", /\btradesperson\b/i, /\bhandelaar\b/gi, "vakman"],
  // "(Senior)" as the elder of a family, and in Catalan as the higher grade ("Enginyer Superior").
  ["fr", /\bsenior\b/i, /(?<![\p{L}])Aîné(e)?(?![\p{L}])/gu, "Senior"], // «Aîné» too, not only «Aînée» (TB2-01)
  ["ca", /^(?!.*\bsuperior\b)(?=.*\bsenior\b)/i, /\bSuperior\b/g, "Sènior"],
  // "Graduate" (a newly qualified starter) as a postgraduate.
  [
    "es",
    /\bgraduates?\b/i,
    /\bprograma\s+de\s+posgrado\b/gi,
    "programa para recién titulados",
  ],
  [
    "es",
    /\bgraduates?\b/i,
    /\s*\b(?:de\s+)?pos(?:t)?grado\b/gi,
    " recién titulado",
  ],
  [
    "ca",
    /\bgraduates?\b/i,
    /\bprograma\s+de\s+postgrau\b/gi,
    "programa per a recent titulats",
  ],
  ["ca", /\bgraduates?\b/i, /\s*\b(?:de\s+)?postgrau\b/gi, " recent titulat"],
  [
    "fr",
    /\bgraduates?\b/i,
    /\bprogramme\s+d'études\s+supérieures\b/gi,
    "programme jeunes diplômés",
  ],
  ["de", /\bgraduates?\b/i, /\bDiplom-\s*/g, "Graduate "],
  // "Multi-skilled" in a later part of the title, which the levels do not reach, as a calque ("Soldador
  // multicalificado", "Technicien multi-qualifié"): the word each language uses.
  ["es", /./, /\s*\bmulti-?calificad[oa]s(?![\p{L}])/giu, " polivalentes"],
  ["es", /./, /\s*\bmulti-?calificad[oa](?![\p{L}])/giu, " polivalente"],
  ["es", /./, /\s*\bmulti-?calificación(?![\p{L}])/giu, " polivalente"],
  ["es", /./, /\bpolivalentes\s+polivalentes\b/gi, "polivalentes"],
  ["es", /./, /\bpolivalente\s+polivalente\b/gi, "polivalente"],
  // Spain says "cualificado" for skilled ("Trabajador calificado" → "Trabajador cualificado"); "calificado" is graded.
  ["es", /./, /\bcalificad(?=[oa]s?(?![\p{L}]))/gu, "cualificad"],
  ["es", /./, /\bCalificad(?=[oa]s?(?![\p{L}]))/gu, "Cualificad"],
  ["es", /./, /\bCALIFICAD(?=[OA]S?(?![\p{L}]))/gu, "CUALIFICAD"],
  [
    "ca",
    /\bmulti-skilled\b/i,
    /\s*\bmulti-?qualifica(?:ts|des)(?![\p{L}])/giu,
    " polivalents",
  ],
  [
    "ca",
    /\bmulti-skilled\b/i,
    /\s*\bmulti-?qualifica(?:t|da)(?![\p{L}])/giu,
    " polivalent",
  ],
  [
    "fr",
    /\bmulti-skilled\b/i,
    /\s*\bmulti-?qualifiés(?![\p{L}])/giu,
    " polyvalents",
  ],
  [
    "fr",
    /\bmulti-skilled\b/i,
    /\s*\bmulti-?qualifiées(?![\p{L}])/giu,
    " polyvalentes",
  ],
  [
    "fr",
    /\bmulti-skilled\b/i,
    /\s*\bmulti-?qualifiée(?![\p{L}])/giu,
    " polyvalente",
  ],
  [
    "fr",
    /\bmulti-skilled\b/i,
    /\s*\bmulti-?qualifié(?![\p{L}])/giu,
    " polyvalent",
  ],
  [
    "nl",
    /\bmulti-skilled\b/i,
    /\s*\bmulti-?geschoolde?(?![\p{L}])/giu,
    " allround",
  ],
  ["de", /\bmulti-skilled\b/i, /\s*\bMulti-?Skilled\s+/giu, " Allround-"],
  // The French contracts, which Firefox copies as they are (or cuts: "[CDD 1 an]" → "[CD 1 any]").
  // Only the contract's own letters: not «CCI Lyon», «CI/CD» nor «CD-ROM» (TB2-03).
  ["es", /\bCDI\b/, /\s*\bCDI\b/g, " contrato indefinido"],
  ["ca", /\bCDI\b/, /\s*\bCDI\b/g, " contracte indefinit"],
  ["nl", /\bCDI\b/, /\s*\bCDI\b/g, " vast contract"],
  ["de", /\bCDI\b/, /\s*\bCDI\b/g, " unbefristet"],
  ["es", /\bCDD\b/, /\s*\bCDD\b/g, " contrato temporal"],
  ["ca", /\bCDD\b/, /\s*(?<![/\w])CDD?\b(?![-/])/g, " contracte temporal"],
  ["nl", /\bCDD\b/, /\s*\bCDD\b/g, " tijdelijk contract"],
  ["de", /\bCDD\b/, /\s*\bCDD\b/g, " befristet"],
  // A permanent contract as Spain and Catalonia say it, not a permanent one ("contrato permanente").
  [
    "es",
    /\bpermanent contract\b/i,
    /\s*\bcontrato permanente\b/gi,
    " contrato indefinido",
  ],
  [
    "ca",
    /\bpermanent contract\b/i,
    /\s*\bcontracte permanent\b/gi,
    " contracte indefinit",
  ],
  // "Remote" Firefox leaves in English ("Arquitecte d'identitat | Remote", "(100% Remote)"): with a capital where
  // it opens a part. Not a hashtag («#remote»), a compound ("Remote-First") or a title Firefox left in English.
  [
    "ca",
    REMOTE_LEFT,
    /(?<=(?:^|[|–:]\s*|\s-\s))(?<![#\p{L}-])Remote(?![\p{L}-])/gu,
    "En remot",
  ],
  ["ca", REMOTE_LEFT, /(?<![#\p{L}-])[Rr]emote(?![\p{L}-])/gu, "en remot"],
  [
    "es",
    REMOTE_LEFT,
    /(?<=(?:^|[|–:]\s*|\s-\s))(?<![#\p{L}-])Remote(?![\p{L}-])/gu,
    "En remoto",
  ],
  ["es", REMOTE_LEFT, /(?<![#\p{L}-])[Rr]emote(?![\p{L}-])/gu, "en remoto"],
  // "Itinerant" as Catalan "d'itineraris" (of itineraries) where nothing said the level before.
  ["ca", /\bitinerant\b/i, /\s*\bd['’]itineraris?\b/gi, " itinerant"],
  // German titles' terms of the post, which the first leg says word by word (7 November 2026): «ab sofort», to start
  // at once, as "from now on" or "now" where it ends the title or a part of it ("Sales engineer from now on"), never
  // the "Apply now" of «Jetzt bewerben»; «befristet», a fixed-term post, as a lone "limited" ("Technician - Limited"),
  // though "limited to 2 years" says it right; «unbefristet», a permanent one, as "indefinitely" or "unlimited". The
  // second leg says "immediate start", "fixed-term" and "permanent" right in every language.
  [
    "en",
    /\bab sofort\b/i,
    /(?<=[,(&]\s*)(?:from now on|as of now|now)(?=\s*(?:$|[.,;:!)\]·|–-]))/gi,
    "immediate start",
  ],
  [
    "en",
    /\bab sofort\b/i,
    /(?<=[–·|:-]\s*)(?:from now on|as of now|now)(?=\s*(?:$|[.,;:!)\]·|–-]))/gi,
    "Immediate start",
  ],
  [
    "en",
    /\bab sofort\b/i,
    /(?<!\b(?:apply|start|begin|join|hiring|us|today|right|and|wanted|needed|sought)\s*)(?<=[^\s–·|:,(&-])\s+(?:from now on|as of now|now)(?=\s*(?:$|[.,;:!)\]·|–-]))/giu,
    " – immediate start",
  ],
  [
    "en",
    /(?<!\p{L})befristet/iu,
    /(?<![\p{L}-])Limited(?![\p{L}-])(?!\s+(?:to|for|until|till|by|in|of|and|initially)\b)/gu,
    "Fixed-term",
  ],
  [
    "en",
    /(?<!\p{L})befristet/iu,
    /(?<![\p{L}-])limited(?![\p{L}-])(?!\s+(?:to|for|until|till|by|in|of|and|initially)\b)/gu,
    "fixed-term",
  ],
  [
    "en",
    /(?<!\p{L})unbefristet/iu,
    /(?<![\p{L}-])(?:Indefinitely|Indefinite|Unlimited)(?![\p{L}-])/gu,
    "Permanent",
  ],
  [
    "en",
    /(?<!\p{L})unbefristet/iu,
    /(?<![\p{L}-])(?:indefinitely|indefinite|unlimited)(?![\p{L}-])/gu,
    "permanent",
  ],
  [
    "en",
    /(?<!\p{L})unbefristet/iu,
    /(?<![\p{L}-])(?:INDEFINITELY|UNLIMITED)(?![\p{L}-])/gu,
    "PERMANENT",
  ],
  // A fitter read as a «mounter» (Polish «Monter», Czech «Montér», German «Monteur», Italian «Montatore»: 236 titles,
  // 8 November 2026), and French «dépanneur» written «(réparations)» read as «(reparations)», amends.
  [
    "en",
    /mont(?:eur|ér|er|atore|atrice|ador|adora|ażyst)/iu,
    /\bMounters\b/g,
    "Fitters",
  ],
  [
    "en",
    /mont(?:eur|ér|er|atore|atrice|ador|adora|ażyst)/iu,
    /\bMounter\b/g,
    "Fitter",
  ],
  [
    "en",
    /mont(?:eur|ér|er|atore|atrice|ador|adora|ażyst)/iu,
    /\bmounters\b/g,
    "fitters",
  ],
  [
    "en",
    /mont(?:eur|ér|er|atore|atrice|ador|adora|ażyst)/iu,
    /\bmounter\b/g,
    "fitter",
  ],
  [
    "en",
    /mont(?:eur|ér|er|atore|atrice|ador|adora|ażyst)/iu,
    /\bMOUNTERS?\b/g,
    "FITTER",
  ],
  ["en", /d[ée]panneu|r[ée]paration/iu, /\(reparations\)/g, "(repairs)"],
  ["en", /d[ée]panneu|r[ée]paration/iu, /\(Reparations\)/g, "(Repairs)"],
  // The trade of the bathroom and its pipes, German «Sanitär», Dutch «sanitair», French «sanitaire» beside a fitter or
  // the heating, is plumbing in English («Heizung, Sanitär» came back «heating, sanitary», «Sanitärinstallateur»
  // «sanitary installer»: 959 titles, 8 November 2026). Not a French «sécurité sanitaire», which is health.
  ...[
    [/\bSANITARY INSTALLERS?\b/g, "PLUMBER"],
    [/\bsanitary installers\b/g, "plumbers"],
    [/\bSanitary installers\b/g, "Plumbers"],
    [/\bsanitary installer\b/g, "plumber"],
    [/\bSanitary installer\b/g, "Plumber"],
    [/\bsanitary\b/g, "plumbing"],
    [/\bSanitary\b/g, "Plumbing"],
    [/\bSANITARY\b/g, "PLUMBING"],
  ].map(([wrong, right]) => [
    "en",
    /sanitär|sanitair(?!e)|(?=.*(?:install|plomb|chauffag|cvc|monteu|technicien))(?=.*sanitaire)/iu,
    wrong,
    right,
  ]),
  // And the plumbing Spain says: «fontanería», «fontanero», not America's «plomería» the second leg wrote at times.
  ...[
    [/\bplomería\b/g, "fontanería"],
    [/\bPlomería\b/g, "Fontanería"],
    [/\bPLOMERÍA\b/g, "FONTANERÍA"],
    [/\bplomeros\b/g, "fontaneros"],
    [/\bplomero\b/g, "fontanero"],
    [/\bPlomeros\b/g, "Fontaneros"],
    [/\bPlomero\b/g, "Fontanero"],
  ].map(([wrong, right]) => ["es", /./u, wrong, right]),
  // Dutch civil engineering's «kunstwerken» are its structures, bridges and tunnels, not artworks («Ontwerper
  // kunstwerken» came back «Designer – artworks»); «constructief» is structural («Constructive Project Leader»); a
  // «startende» worker is a junior («Starting Work planner»). 8 November 2026.
  ...[
    [/\bcivil artworks\b/g, "civil structures"],
    [/\bCivil artworks\b/g, "Civil structures"],
    [/\bCivil Artworks\b/g, "Civil Structures"],
    [/\bartworks\b/g, "civil structures"],
    [/\bArtworks\b/g, "Structures"],
    [/\bartwork\b/g, "civil structure"],
    [/\bArtwork\b/g, "Structure"],
  ].map(([wrong, right]) => ["en", /kunstwerk/iu, wrong, right]),
  ...[
    [/\bconstructive\b/g, "structural"],
    [/\bConstructive\b/g, "Structural"],
  ].map(([wrong, right]) => ["en", /constructie(?:f|ve)/iu, wrong, right]),
  ["en", /^startende?(?![\p{L}])/iu, /^Starting\s+/g, "Junior "],
  // German: a «Schrauber» is a mechanic, not a screwdriver («Schrauber gesucht!»); a «Holztechniker» a wood technician
  // («Wooden technician»); the «Jung-» of «Jungbauleiter», «Jungingenieur» a junior («Young construction manager»).
  ...[
    [/\bScrewdrivers\b/g, "Mechanics"],
    [/\bscrewdrivers\b/g, "mechanics"],
    [/\bScrewdriver\b/g, "Mechanic"],
    [/\bscrewdriver\b/g, "mechanic"],
  ].map(([wrong, right]) => [
    "en",
    /(?<![\p{L}])schrauber(?:in|innen)?(?![\p{L}])/iu,
    wrong,
    right,
  ]),
  ...[
    [/\bWooden technicians?\b/g, "Wood technician"],
    [/\bwooden technicians?\b/g, "wood technician"],
    [/\bWOODEN TECHNICIAN\b/g, "WOOD TECHNICIAN"],
  ].map(([wrong, right]) => ["en", /holztechniker/iu, wrong, right]),
  ...[
    [/\bYoung\b/g, "Junior"],
    [/\byoung\b/g, "junior"],
  ].map(([wrong, right]) => [
    "en",
    /(?<![\p{L}])jung(?:bauleiter|ingenieur|meister|techniker|monteur|projektleiter|polier|geselle)/iu,
    wrong,
    right,
  ]),
  // German «Objektplanung», the architect's or engineer's design of the building or structure, came back «Object
  // planning» (38 of 59 «Objekt» titles, 8 November 2026); an «Objektleiter» «Object ladder» or «Object manager»: the
  // site manager of building services or a building site, else the property manager.
  ...[
    [/\bObject planning\b/g, "Design planning"],
    [/\bObject Planning\b/g, "Design Planning"],
    [/\bobject planning\b/g, "design planning"],
    [/\bOBJECT PLANNING\b/g, "DESIGN PLANNING"],
  ].map(([wrong, right]) => ["en", /objektplanung/iu, wrong, right]),
  ...[
    [/\bObject and(?= [Ss]tructural)/g, "Design and"],
    [/\bobject and(?= structural)/g, "design and"],
  ].map(([wrong, right]) => ["en", /objekt-\s*und\s+tragwerk/iu, wrong, right]),
  ...[
    [/\bObject (?:ladder|leader|manager)\b/g, "Site manager"],
    [/\bobject (?:ladder|leader|manager)\b/g, "site manager"],
  ].map(([wrong, right]) => [
    "en",
    /(?=.*objektleit)(?=.*(?:hkls|shk|tga|haustechnik|gebäudetechnik|versorgungstechnik|elektro|hochbau|tiefbau|baustelle|bauleit|sanitär|heizung|lüftung|klima))/iu,
    wrong,
    right,
  ]),
  ...[
    [/\bObject (?:ladder|leader|manager)\b/g, "Property manager"],
    [/\bobject (?:ladder|leader|manager)\b/g, "property manager"],
  ].map(([wrong, right]) => [
    "en",
    /^(?!.*schiffbau).*objektleit/iu,
    wrong,
    right,
  ]),
  // French: «contrôle non destructif» is non-destructive testing, its «contrôleur» an inspector («Technicien en
  // contrôle non destructif» came back «Non-Destructive Control Technician»: 33 titles); «automatisme» is automation
  // («Chef de Projet Automatisme» came back «Automatism», «Ingénieur Automatisme» «Automotive»: 33 of 367 titles).
  ...[
    [/\bNon-Destructive Controls?\b/g, "Non-Destructive Testing"],
    [/\bNON-DESTRUCTIVE CONTROLS?\b/g, "NON-DESTRUCTIVE TESTING"],
    [/\bNon-destructive controllers\b/g, "Non-destructive testing inspectors"],
    [/\bnon-destructive controllers\b/g, "non-destructive testing inspectors"],
    [/\bNon-destructive controller\b/g, "Non-destructive testing inspector"],
    [/\bnon-destructive controller\b/g, "non-destructive testing inspector"],
    [/\bNon-destructive controls?\b/g, "Non-destructive testing"],
    [/\bnon-destructive controls?\b/g, "non-destructive testing"],
    [/\bNDC\b/g, "NDT"],
  ].map(([wrong, right]) => ["en", /non[- ]destructi/iu, wrong, right]),
  ...[
    [/\bAutomatism(?:e?s|e)?\b/g, "Automation"],
    [/\bautomatism(?:e?s|e)?\b/g, "automation"],
    [/\bAUTOMATISM(?:E?S|E)?\b/g, "AUTOMATION"],
  ].map(([wrong, right]) => ["en", /automatism/iu, wrong, right]),
  ...[
    [/\bAutomotive\b/g, "Automation"],
    [/\bautomotive\b/g, "automation"],
    [/\bAUTOMOTIVE\b/g, "AUTOMATION"],
  ].map(([wrong, right]) => [
    "en",
    /^(?!.*(?:automobile|automotive|v[ée]hicule|voiture|garage|carross|concession|\bauto\b)).*automatism/iu,
    wrong,
    right,
  ]),
  // Italian: «turni» are shifts («Manutentore elettromeccanico - 2 turni» came back «2 rounds»), «tempo indeterminato» a
  // permanent contract («Indefinite time»), a «cantiere» a (building) site unless boats are named («geometra di cantiere»
  // came back «shipyard surveyor»). 8 November 2026.
  ...[
    [/\brounds\b/g, "shifts"],
    [/\bRounds\b/g, "Shifts"],
    [/\bROUNDS\b/g, "SHIFTS"],
    [/(?<=\d\s)round\b/g, "shift"],
  ].map(([wrong, right]) => [
    "en",
    /(?<![\p{L}])turn[oi](?![\p{L}])/iu,
    wrong,
    right,
  ]),
  ...[
    [/\bIndefinite time\b/g, "Permanent contract"],
    [/\bindefinite time\b/g, "permanent contract"],
    [/\bINDEFINITE TIME\b/g, "PERMANENT CONTRACT"],
  ].map(([wrong, right]) => ["en", /indeterminat/iu, wrong, right]),
  ...[
    [/\bItinerant[ei]\b/g, "Itinerant"],
    [/\bitinerant[ei]\b/g, "itinerant"],
    [/\bITINERANT[EI]\b/g, "ITINERANT"],
  ].map(([wrong, right]) => ["en", /trasfertist/iu, wrong, right]),
  ...[
    [/\bshipyards?\b/g, "site"],
    [/\bShipyards?\b/g, "Site"],
    [/\bSHIPYARDS?\b/g, "SITE"],
  ].map(([wrong, right]) => [
    "en",
    /^(?!.*(?:naval|nautic|yacht|barc[ah]|imbarcazion|cantieristic|(?<![\p{L}])nav[ei](?![\p{L}])|shipyard)).*cantier/iu,
    wrong,
    right,
  ]),
  // Swedish «projektör», the design engineer, inside a compound the table does not name («Fiberprojektör» came back «Fiber
  // projector», «Kabelprojektör» «Cable projector», «Luftledningsprojektör» «Airline Projector»: 8 November 2026).
  [
    "en",
    /elprojektör/iu,
    /\bElectrician\s+[–-]\s+projectors?\b/g,
    "Electrical design engineer",
  ],
  ...[
    [/\bProjectors\b/g, "Design Engineers"],
    [/\bprojectors\b/g, "design engineers"],
    [/\bProjector\b/g, "Design Engineer"],
    [/\bprojector\b/g, "design engineer"],
    [/\bPROJECTORS?\b/g, "DESIGN ENGINEER"],
  ].map(([wrong, right]) => ["en", /projektör/iu, wrong, right]),
  ["en", /luftledning/iu, /\bAirline\b/g, "Overhead line"],
  // Catalan «Pràctiques» and Spanish «Prácticas» in a job title are an internship («Pràctiques en Ciberseguretat» came
  // back «Cybersecurity Practices»: 5 of 6 Catalan titles, 8 November 2026); not «bones pràctiques», good practice.
  ...[
    [/\bPractices\b/g, "Internship"],
    [/\bpractices\b/g, "internship"],
    [/\bPRACTICES\b/g, "INTERNSHIP"],
  ].map(([wrong, right]) => [
    "en",
    /^(?!.*(?:bones|buenas)\s+pr[àáa]cti).*(?<![\p{L}])pr[àáa]cti(?:ques|cas)(?![\p{L}])/iu,
    wrong,
    right,
  ]),
  // Slips found judging 60 Spanish and 60 Catalan titles of offers in Spain (9 November 2026): "Engineer" (a person) as
  // the discipline where the role opens the title («Senior Frontend Engineer - React Native» came back «Ingeniería
  // frontend sénior»; a discipline further on, «Ingeniero de Proyectos … Ingeniería Mecánica», or one named at once, «Ingeniería
  // Eléctrica», is right as it is); "Fullstack" as a
  // data structure («Fullstack .Net», «Pila completa.Net»); "Technologist" left in English; the Spanish «e» before a word
  // that does not start with an i sound («visión e tecnologías»), which is «y».
  ...[
    [
      /^Ingeniería(?![\p{L}])(?! (?:\p{L}+a|[Cc]ivil|[Ii]ndustrial|[Nn]aval|[Aa]mbiental)(?![\p{L}]))/u,
      "Ingeniero",
    ],
    [
      /^INGENIERÍA(?![\p{L}])(?! (?:\p{L}+A|CIVIL|INDUSTRIAL|NAVAL|AMBIENTAL)(?![\p{L}]))/u,
      "INGENIERO",
    ],
  ].map(([wrong, right]) => [
    "es",
    /^(?!.*engineering).*(?<![\p{L}])engineers?(?![\p{L}])/iu,
    wrong,
    right,
  ]),
  ...[
    [
      /^Enginyeria(?![\p{L}])(?! (?:\p{L}+a|[Cc]ivil|[Ii]ndustrial|[Nn]aval|[Aa]mbiental)(?![\p{L}]))/u,
      "Enginyer",
    ],
    [
      /^ENGINYERIA(?![\p{L}])(?! (?:\p{L}+A|CIVIL|INDUSTRIAL|NAVAL|AMBIENTAL)(?![\p{L}]))/u,
      "ENGINYER",
    ],
  ].map(([wrong, right]) => [
    "ca",
    /^(?!.*engineering).*(?<![\p{L}])engineers?(?![\p{L}])/iu,
    wrong,
    right,
  ]),
  ...["es", "ca"].flatMap((t) =>
    [
      [/(?<![\p{L}])Pila completa\s*/gu, "Full Stack "],
      [/(?<![\p{L}])pila completa\s*/gu, "full stack "],
    ].map(([wrong, right]) => [
      t,
      /(?<![\p{L}])full\s*[-‐‑–]?\s*stack(?![\p{L}])|フルスタック/iu,
      wrong,
      right,
    ]),
  ),
  // A Spanish «Ingeniero» opening the title that Aina gave as the discipline («INGENIERO DE PROCESOS QUÍMICOS» → «Enginyeria de
  // processos químics»: 1 of 40 judged, 9 November 2026).
  [
    "ca",
    /^(?!.*ingenier[ií]a).*(?<![\p{L}])ingenier[oa]s?(?:\/[oa]s?)?(?![\p{L}])/iu,
    /^Enginyeria(?![\p{L}])(?! (?:\p{L}+a|[Cc]ivil|[Ii]ndustrial|[Nn]aval|[Aa]mbiental)(?![\p{L}]))/u,
    "Enginyer",
  ],
  [
    "es",
    /technologist/iu,
    /(?<![\p{L}])Technologists(?![\p{L}])/gu,
    "Tecnólogos",
  ],
  [
    "es",
    /technologist/iu,
    /(?<![\p{L}])Technologist(?![\p{L}])/gu,
    "Tecnólogo",
  ],
  [
    "ca",
    /technologist/iu,
    /(?<![\p{L}])Technologists(?![\p{L}])/gu,
    "Tecnòlegs",
  ],
  ["ca", /technologist/iu, /(?<![\p{L}])Technologist(?![\p{L}])/gu, "Tecnòleg"],
  ["es", /./u, /(?<=\p{L}) e (?![iíIÍ]|[hH][iíIÍ])(?=\p{L})/gu, " y "],
  // Slips repeated across the caches (9 November 2026): "Agentic" as «agente» (159 Spanish titles: «IA agente», «flujos de
  // trabajo agentes»), "Proposal Engineer" as «Ingeniero de Propuestas» (78; Spain says «Ingeniero de ofertas»), "Red
  // Team" as «Equipo Rojo» (35 Spanish, 23 Catalan; security keeps the English name), "People Analytics" as «análisis de
  // personas» (55), "Insights" as «Perspectivas» (26).
  ...[
    [/(?<![\p{L}])IA [Aa]gente(?![\p{L}])/gu, "IA agéntica"],
    [/(?<![\p{L}])[Aa]gentes(?![\p{L}])/gu, "agénticos"],
    [/(?<![\p{L}])[Aa]gente(?![\p{L}])/gu, "agéntico"],
    [/(?<![\p{L}])agentic(?=[oa]s?(?![\p{L}]))/gu, "agéntic"],
    [/(?<![\p{L}])Agentic(?=[oa]s?(?![\p{L}]))/gu, "Agéntic"],
  ].map(([wrong, right]) => [
    "es",
    /^(?!.*(?<![\p{L}])agents?(?![\p{L}])).*(?<![\p{L}])agentic(?![\p{L}])/iu,
    wrong,
    right,
  ]),
  [
    "es",
    /(?<![\p{L}])proposals? engineer/iu,
    /(?<![\p{L}])(Ingenier[oa]s?(?:\/[oa]s?)?) de [Pp]ropuestas?(?![\p{L}])/gu,
    (m: string, who: string) => `${who} de ofertas`,
  ],
  // A proposal engineer's «propuestas» further on («Ingeniero de diseño y propuestas», «ingeniería de propuestas»).
  [
    "es",
    /(?<![\p{L}])proposals? engineer/iu,
    /(?<![\p{L}])propuestas(?![\p{L}])/gu,
    "ofertas",
  ],
  [
    "es",
    /(?<![\p{L}])proposals? engineer/iu,
    /(?<![\p{L}])Propuestas(?![\p{L}])/gu,
    "Ofertas",
  ],
  [
    "ca",
    /(?<![\p{L}])proposals? engineer/iu,
    /(?<![\p{L}])(Enginyer(?:s|a|es)?(?:\/(?:a|es))?) de propost(?:a|es)(?![\p{L}])/giu,
    (m: string, who: string) => `${who} d'ofertes`,
  ],
  [
    "es",
    /(?<![\p{L}])red team/iu,
    /\s*(?<![\p{L}])(?:del?\s+)?[Ee]quipo [Rr]ojo(?![\p{L}])/gu,
    " Red Team",
  ],
  [
    "ca",
    /(?<![\p{L}])red team/iu,
    /\s*(?<![\p{L}])(?:de\s+l['’])?[Ee]quip [Vv]ermell(?![\p{L}])/gu,
    " Red Team",
  ],
  [
    "es",
    /people analytics/iu,
    /\s*(?<![\p{L}])(?:de\s+)?[Aa]n[aá]lisis de personas(?![\p{L}])/gu,
    " People Analytics",
  ],
  [
    "es",
    /(?<![\p{L}])insights?(?![\p{L}])/iu,
    /(?<![\p{L}])Perspectivas(?![\p{L}])/gu,
    "Insights",
  ],
  // Product names Firefox translates word by word (counted on the caches, 9 November 2026): "Power Platform" as «plataforma
  // eléctrica» (71 Spanish titles, 14 Catalan), "Modern Workplace" as «lugar de trabajo moderno» (56, 20), "ServiceNow" as
  // «Servicio … ahora» (33, 44), "SuccessFactors" as «Factores de éxito» (33, 8), "Entra ID" as «Identificación de entrada»
  // (15, 4), "Workday" as «jornada laboral» (8), "Salesforce" as «fuerza de ventas» (6), "Dynamics 365" as «Dinámica 365» (4).
  [
    "es",
    /power platform/iu,
    /(?<![\p{L}])plataformas? (?:eléctricas?|de energía|de potencia|de alimentación)(?![\p{L}])/giu,
    "Power Platform",
  ],
  [
    "ca",
    /power platform/iu,
    /(?<![\p{L}])plataform(?:a|es) de potència(?![\p{L}])/giu,
    "Power Platform",
  ],
  [
    "es",
    /modern workplace/iu,
    /\s*(?<![\p{L}])(?:del |en (?:el |un )?)?lugar de trabajo (?:azul y )?moderno(?![\p{L}])/giu,
    " Modern Workplace",
  ],
  [
    "ca",
    /modern workplace/iu,
    /\s*(?<![\p{L}])(?:de l['’]|del |d['’]|de )?(?:lloc|espai|entorn) de treball modern(?![\p{L}])(?! [Ww]orkplace)/giu,
    " Modern Workplace",
  ],
  [
    "es",
    /servicenow|service now/iu,
    /(?<![\p{L}])[Ss]ervicio (?:de )?(.{0,60}?) ahora(?![\p{L}])/gu,
    (m: string, what: string) => (what ? `${what} ServiceNow` : "ServiceNow"),
  ],
  [
    "es",
    /servicenow|service now/iu,
    /(?<![\p{L}])(?:SERVICIO AHORA|[Ss]ervicio [Aa]hora)(?![\p{L}])/gu,
    "ServiceNow",
  ],
  [
    "ca",
    /servicenow|service now/iu,
    /(?<![\p{L}])[Ss]ervei ?[Aa]ra(?![\p{L}])/gu,
    "ServiceNow",
  ],
  [
    "es",
    /success ?factors/iu,
    /(?<![\p{L}])(?:los )?[Ff](?:actores|Actores) de [ÉéEe]xito de SAP(?![\p{L}])/gu,
    "SAP SuccessFactors",
  ],
  [
    "es",
    /success ?factors/iu,
    /(?<![\p{L}])(?:los )?(?:[Ff](?:actores|Actores) de [ÉéEe]xito|FACTORES DE ÉXITO)(?![\p{L}])/gu,
    "SuccessFactors",
  ],
  [
    "ca",
    /success ?factors/iu,
    /(?<![\p{L}])[Ff]actors d['’][èÈ]xit(?: de SAP| SAP)(?![\p{L}])/gu,
    "SAP SuccessFactors",
  ],
  [
    "ca",
    /success ?factors/iu,
    /(?<![\p{L}])[Ff]actors d['’][èÈ]xit(?![\p{L}])/gu,
    "SuccessFactors",
  ],
  [
    "es",
    /entra id/iu,
    /(?<![\p{L}])(?:[Ii]dentificación de entrada|[Ii]ntroducir ID|[Ee]ntrada de identificación)(?![\p{L}])/gu,
    "Entra ID",
  ],
  [
    "ca",
    /entra id/iu,
    /(?<![\p{L}])[Ii]dentificació d['’]entrada(?![\p{L}])/gu,
    "Entra ID",
  ],
  [
    "es",
    /(?<![\p{L}])workday(?![\p{L}])/iu,
    /(?<![\p{L}])(?:de )?(?:jornada laboral|[Dd]ía laboral|[Tt]rabajo de día)(?![\p{L}])/gu,
    "Workday",
  ],
  [
    "es",
    /(?<![\p{L}])workday(?![\p{L}])/iu,
    /(?<![\p{L}])integración laboral(?![\p{L}])/gu,
    "integración de Workday",
  ],
  [
    "es",
    /salesforce/iu,
    /(?<![\p{L}])(?:fuerza de ventas|Fuerza de Ventas|FUERZA DE VENTAS)(?![\p{L}])/gu,
    "Salesforce",
  ],
  [
    "es",
    /dynamics 365/iu,
    /(?<![\p{L}])(?:[Dd]inámica|DINÁMICA) 365/gu,
    "Dynamics 365",
  ],
  ["es", /guidewire/iu, /(?<![\p{L}])[Gg]u[ií]awire(?![\p{L}])/gu, "Guidewire"],
] as unknown as Rule[];

const TWICE_IN_A_ROW =
  /(?<![\p{L}\p{N}])(\p{L}{3,})(?:\s+\1)+(?![\p{L}\p{N}])/giu;
// The output corrected, given the title it translates and the language it is in.
// fired, when given, gathers the place in RULES of each rule that changed the text (test/mt-corrections-rules.test.mjs).
export function correct(
  title: string,
  out: string,
  target: string,
  fired: Set<number> | null = null,
) {
  let o = out;
  for (const [i, [t, when, wrong, right]] of RULES.entries()) {
    if (
      t !== target ||
      !(typeof when === "function" ? when(title, out) : when.test(title))
    )
      continue;
    const before = o;
    // The space the pattern took is given back, unless the word follows a slash or a bracket or opens the title
    // ("Reparatur-Betreiber" took none: "Reparatur-Operator").
    o = o.replace(wrong, (m: string, ...a: (string | number)[]) => {
      const at = Number(a[a.length - 2]);
      const r = typeof right === "function" ? right(m, ...a) : right;
      return (
        (at === 0 || /[/([]/.test(o[at - 1]) || !/^\s/.test(m) ? "" : " ") +
        r.trim() +
        (r.endsWith(" ") ? " " : "")
      );
    });
    if (fired && o !== before) fired.add(i);
  }
  // A word written twice in a row («Técnico técnico de mantenimiento», «CNC CNC», «Dissenyador Dissenyador»: 224 Spanish and
  // 100 Catalan published titles, 9 November 2026) is written once, unless the title itself repeats it («Walla Walla»).
  if (target === "es" || target === "ca")
    o = o.replace(TWICE_IN_A_ROW, (m: string, w: string) =>
      new RegExp(`(?<![\\p{L}])${w}\\s+${w}(?![\\p{L}])`, "iu").test(title)
        ? m
        : w,
    );
  // A replacement at the start leaves a space, and a capital may be due.
  o = o.replace(/\s+/g, " ").trim();
  if (o !== out.trim() && /^\p{Ll}/u.test(o) && /^\p{Lu}/u.test(out.trim()))
    o = o[0].toUpperCase() + o.slice(1);
  return o;
}
