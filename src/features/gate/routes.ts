// The gate's routes: where a title that names only a role goes, by the discipline or trade it
// names (legacy builder/gate.mjs, word for word). A route is [pattern, family, ESCO occupation?].
export type Route = readonly [RegExp, string, string?];

// Where a computing title goes when ESCO names nothing more precise, by the words it carries,
// first match wins; only then the catch-all (2519, which ISCO keeps for data, AI and testing).
// The third field is ESCO's occupation for every title the route takes, where there is one.
export const ICT_ROUTES: readonly Route[] = [
  [
    /(?:^|[^a-z])(?:security|securite|seguridad|sicherheit|cyber|cybersecurite|iam|soc|pentest|penetration|siem|infosec|netzwerksicherheit|informationssicherheit|firewall|firewalls)(?![a-z])/,
    "2529",
  ],
  [
    /(?:^|[^a-z])(?:sap|s 4hana|s4hana|hana|erp|dynamics|d365|salesforce|crm|servicenow|workday consultant|oracle ebs)(?![a-z])/,
    "2511",
  ],
  [
    /(?:^|[^a-z])(?:database|databases|dba|datenbank|base de datos|bases de datos|sql server|postgres|oracle dba)(?![a-z])/,
    "2521",
  ],
  [
    /(?:^|[^a-z])(?:network engineer|network administrator|netzwerk|netzwerkadministrator|redes|reseau|reseaux|cisco|ccnp|ccna)(?![a-z])/,
    "2523",
    "2523.3",
  ],
  [
    /(?:^|[^a-z])(?:it support|helpdesk|help desk|service desk|desktop support|support technician|1st level|2nd level|first line|second line|soporte|support informatique|technicien de proximite|technicienne de proximite)(?![a-z])/,
    "3512",
    "3512.1",
  ],
  [
    /(?:^|[^a-z])(?:devops|devsecops|sre|site reliability|cloud|platform engineer|kubernetes|sysadmin|system administrator|systemadministrator|systemadministratorin|linux administrator|sap basis|administrador de sistemas|administrateur systeme|(?:windows|linux|unix|vmware|citrix|azure|m365|office 365|exchange|active directory|sharepoint|teamcenter|windchill|plm|cad|jira|atlassian) administrator)(?![a-z])/,
    "2522",
  ],
  [
    /(?:^|[^a-z])(?:web developer|webentwickler|webentwicklerin|desarrollador web|developpeur web|front[ -]?end|ui developer|wordpress|shopify)(?![a-z])/,
    "2513",
    "2513.5",
  ],
  [
    /(?:^|[^a-z])(?:android|ios|mobile developer|mobile engineer|app developer|flutter|react native|swift|kotlin)(?![a-z])/,
    "2514",
    "2514.2.2",
  ],
  [
    /(?:^|[^a-z])(?:data|daten|datos|dades|analytics|analytic|machine learning|ml|ai|artificial intelligence|business intelligence|bi|power bi|tableau|llm|nlp|computer vision|qa|test automation|tester)(?![a-z])/,
    "2519",
  ],
  [
    /(?:^|[^a-z])(?:consultant|consultante|berater|beraterin|consultor|consultora|business analyst|systems analyst|functional|architect|architekt|architektin|arquitecto|arquitecta)(?![a-z])/,
    "2511",
  ],
  [
    /(?:^|[^a-z])(?:developer|desarrollador|desarrolladora|developpeur|developpeuse|entwickler|entwicklerin|ontwikkelaar|utvecklare|udvikler|utvikler|programmer|programador|programadora|programmeur|programmatore|programmatrice|sviluppatore|sviluppatrice|logiciel|logiciels|software|java|dotnet|net developer|c\+\+|python|golang|rust|scala|ruby|php|node|typescript|javascript|full stack|fullstack|backend|back end|forward deployed|embedded)(?![a-z])/,
    "2512",
    "2512.3",
  ],
];
// Where a title that names only "engineer" goes when it also names a discipline, in the
// languages of the sources; else ISCO's engineers not elsewhere classified (2149). The third
// field is the discipline's own occupation in ESCO ("mechanical engineer").
export const ENGINEER_ROUTES: readonly Route[] = [
  [
    /(?:^|[^a-z])(?:electronic|electronics|electronico|electronica|electronique|elektronik|elektronisch|elettronic[oa]|eletronic[oa]|analog|mixed signal|asic|fpga|pcb|hardware|rf|radio frequency|semiconductor|chip|vlsi|firmware|embedded)(?![a-z])/,
    "2152",
    "2152.1",
  ],
  [
    /(?:^|[^a-z])(?:telecom|telecoms|telecommunications|telecomunicaciones|telecommunication|telekommunikation|5g|lte|radio network)(?![a-z])/,
    "2153",
    "2153.1",
  ],
  [
    /(?:^|[^a-z])(?:electrical|electric|electrico|electrica|electrique|elektrotechnik|elektrotechniek|elektrotechnisch|elektro|elettric[oa]|eletric[oa]|power systems|high voltage|substation)(?![a-z])/,
    "2151",
    "2151.1",
  ],
  [
    /(?:^|[^a-z])(?:mechanical|mecanico|mecanica|mecanique|maschinenbau|werktuigbouwkunde|werktuigbouwkundig|werktuigbouwkundige|maskiningenjor|meccanic[oa]|mecanic[oa]|hvac|piping|thermal)(?![a-z])/,
    "2144",
    "2144.1",
  ],
  [
    /(?:^|[^a-z])(?:civil|structural|structures|estructuras|estructural|bridges|bridge|puentes|brucken|tiefbau|hochbau|geotechnical|geotecnico|highway|highways|carreteras|railway|railways|ferroviario|hidraulic[oa]|hydraulic)(?![a-z])/,
    "2142",
    "2142.1",
  ],
  // Naval architecture and marine engineering (ESCO's marine engineer), after the civil route so
  // an offshore structural engineer stays with the structures.
  [
    /(?:^|[^a-z])(?:mooring|moorings|naval|marine|subsea|hydrodynamic|hydrodynamics|shipbuilding|scheepsbouw|schiffbau)(?![a-z])/,
    "2144",
    "2144.1.10",
  ],
  [
    /(?:^|[^a-z])(?:chemical|quimico|quimica|chimique|chimiste|chemie|chemisch|kemi|chimic[oa])(?![a-z])/,
    "2145",
    "2145.1",
  ],
  [
    /(?:^|[^a-z])(?:environmental|medioambiental|medioambiente|ambiental|environnement|umwelt|milieu|sustainability)(?![a-z])/,
    "2143",
    "2143.1",
  ],
  [
    /(?:^|[^a-z])(?:mining|mineria|minas|metallurgy|metallurgical|metalurgia|metalurgico|bergbau)(?![a-z])/,
    "2146",
  ],
  [
    /(?:^|[^a-z])(?:industrial|production|manufacturing|fabricacion|produccion|fertigung|produktion|productie|lean)(?![a-z])/,
    "2141",
    "2141.3",
  ],
];
// The German bare "Techniker" (the state-certified technician), routed as the bare engineer is:
// by the discipline the title names, to that discipline's technicians; else ISCO's technicians
// not elsewhere classified (3119), where ESCO files the automation and service technicians. German
// only: "técnico", "technicien" and "tekniker" head jobs of every kind.
export const TECHNICIAN_WORDS =
  /(?:^|[^a-z])(?:techniker|technikerin)(?![a-z])/;
export const TECHNICIAN_FAMILY = "3119";
// The technician written in one word with his task ("Projekttechniker Elektrotechnik",
// "Wartungstechniker", "Roboterservicetechniker"): the word before is set apart, as for the fitter,
// and the same routes read it. Written so, a dental, orthopaedic, sign, dent, stage, light, sound,
// media, billing, sales, rental-desk or pest-control technician is not ours, and a drying, repair,
// lift, forklift, metal or vehicle one is left to the trades' readings, as before. Only in the German
// reading, after both gates: a compound either gate reads ("Kältetechniker") keeps that answer.
export const TECHNICIAN_ELSEWHERE =
  /(?:^|[^a-z])(?:zahn|zahntechnik|dental|orthopadie|orthopadietechnik|orthopadieschuh|werbe|werbetechnik|dellen|buhnen|veranstaltungs|veranstaltung|licht|ton|film|foto|medien|abrechnungs|vertriebs|vertrieb|mietstation|mietstations|schadlings|schadlingspravention|schadlingsbekampfung|kosmetik|horgerate|augenoptik|friseur|reinigungs|reinigung|tier|textil|bekleidungs|trocknungs|trocknung|sanierungs|sanierung|reparatur|reparaturs|aufzug|aufzugs|stapler|metall|nutzfahrzeug|fahrzeug|kfz|karosserie|landmaschinen|baumaschinen)(?![a-z])/;
export const compoundTechnician = (title: string): string => {
  const apart = title.replace(
    /([a-z])(techniker(?:in|innen)?)(?![a-z])/g,
    "$1 $2",
  );
  return apart === title
    ? title
    : `${apart} ${apart.replace(/([a-z]{3,})s (techniker)/g, "$1 $2")}`;
};
export const TECHNICIAN_ROUTES: readonly Route[] = [
  [
    /(?:^|[^a-z])(?:elektronik|elektronisch|hardware|leiterplatten|embedded|firmware)(?![a-z])/,
    "3114",
  ],
  [
    /(?:^|[^a-z])(?:telekommunikation|nachrichtentechnik|fernmeldetechnik|tk|mobilfunk|glasfaser)(?![a-z])/,
    "3522",
  ],
  [
    /(?:^|[^a-z])(?:elektrotechnik|elektrotechnisch|elektro|elektrik|energietechnik|schaltanlagen|msr)(?![a-z])/,
    "3113",
  ],
  [
    /(?:^|[^a-z])(?:hochbau|tiefbau|bautechnik|bau|vermessung|vermessungstechnik|stra(?:ss|ß)enbau|gebaudetechnik|haustechnik|versorgungstechnik|tga|hkls|hls|heizung|heizungstechnik|luftung|luftungstechnik|klima|klimatechnik|sanitar)(?![a-z])/,
    "3112",
  ],
  [
    /(?:^|[^a-z])(?:maschinenbau|konstruktion|mechanik|mechatronik|fertigung|produktion|instandhaltung|kfz|fahrzeugtechnik)(?![a-z])/,
    "3115",
  ],
  [
    /(?:^|[^a-z])(?:chemie|chemietechnik|verfahrenstechnik|kunststofftechnik)(?![a-z])/,
    "3116",
  ],
  [/(?:^|[^a-z])(?:labor)(?![a-z])/, "3111"],
  [
    /(?:^|[^a-z])(?:bergbau|huttenwesen|metallurgie|gie(?:ss|ß)erei)(?![a-z])/,
    "3117",
  ],
];
// The German bare "Planer", by the discipline the title names, as the indexes file the planners
// who name one (Elektroplaner 3113, Haustechnikplaner and Anlagenplaner 3118, Bauplaner 3112,
// Arbeitsplaner 3119); one that names none, or plans supplies, staff, media or events, stays out.
export const PLANNER_WORDS = /(?:^|[^a-z])(?:planer|planerin)(?![a-z])/;
export const PLANNER_OUT =
  /(?:^|[^a-z])(?:gebietsleiter|supply chain|logistik|einsatz|dienst|personal|media|event|reise|finanz|hochzeit|garten|kuchen|tour|termin|marketing)(?![a-z])/;
export const PLANNER_ROUTES: readonly Route[] = [
  [
    /(?:^|[^a-z])(?:e-planer|elektrotechnik|elektrotechnisch|elektro|licht|msr|gebaudeautomation|leittechnik|sicherungstechnik|energie|energieinfrastruktur|strom|netzplanung|mittelspannung|hochspannung|niederspannung|photovoltaik|pv)(?![a-z])/,
    "3113",
  ],
  [
    /(?:^|[^a-z])(?:tga|fmcs|gebaudetechnik|haustechnik|versorgungstechnik|hkls|hls|shk|heizung|sanitar|luftung|klima|kalte|warmepumpe|warmepumpen|anlagen|anlagenbau|maschinen|schiffbau|inbetriebnahme)(?![a-z])/,
    "3118",
  ],
  [
    /(?:^|[^a-z])(?:bau|hochbau|tiefbau|bauprojekte|infrastruktur|verkehrsanlagen|verkehrsstationen|bahn|gleis|leitungen|leitungsbau|querungen|stra(?:ss|ß)en|stra(?:ss|ß)enbau|kanal|wasserbau|hoai)(?![a-z])/,
    "3112",
  ],
  [
    /(?:^|[^a-z])(?:arbeitsvorbereitung|fertigung|produktion|produktionsplanung)(?![a-z])/,
    "3119",
  ],
];
// The German bare "Meister", by the trade the title names, as the indexes file the masters who
// name one: building services and construction (Heizungsbauermeister, Tiefbaumeister) with the
// construction supervisors (3123), electrical, industrial and workshop masters
// (Elektroinstallateurmeister) with the manufacturing supervisors (3122); a master of another
// craft, or of none named, stays out.
export const MASTER_WORDS = /(?:^|[^a-z])(?:meister|meisterin)(?![a-z])/;
export const MASTER_OUT =
  /(?:^|[^a-z])(?:praxisdozent|horakustik|augenoptik|veranstaltungstechnik|buhne|friseur|backer|konditor|fleischer|koch|zahntechnik|orthopadie|kosmetik|fotograf|floristik|garten|landschaftsbau|gebaudereinigung|reinigung)(?![a-z])/;
export const MASTER_ROUTES: readonly Route[] = [
  [
    /(?:^|[^a-z])(?:shk|hls|hkls|heizung|sanitar|luftung|klima|kalte|kaltetechnik|installateur|bau|hochbau|tiefbau|stra(?:ss|ß)enbau|maurer|beton|betonbau|zimmermann|zimmerer|rohrnetz|rohrleitungsbau|kanal|gewerk|lackiererei|lackierer|oberflachenbeschichtung)(?![a-z])/,
    "3123",
  ],
  [
    /(?:^|[^a-z])(?:elektro|elektrotechnik|elektrisch|elektrische|elektrowerkstatt|industrie|produktion|fertigung|instandhaltung|werkstatt|metall|mechanik|mechatronik|umbaugruppe|montage|schlosserei|zerspanung|cnc)(?![a-z])/,
    "3122",
  ],
];
// The German bare "Monteur", in the trades' gate: by the trade the title names, else industrial
// mechanics (7233), as the catalogue files the Dutch bare "monteur". A fitter of windows, doors,
// kitchens, furniture, stands, drywall, scaffolds, roofs or fronts works in a trade the site
// leaves out. German only.
export const FITTER_WORDS =
  /(?:^|[^a-z])(?:monteur|monteurin|monteure)(?![a-z])/;
export const FITTER_FAMILY = "7233";
// The fitter written in one word with what he fits or his rank ("Obermonteur Elektrotechnik",
// "Heizungsmonteur", "Fachmonteure"): the word before is set apart, and its joining "s" taken off
// too, so the routes below read it as they read "Monteur Heizung". "Obermonteur" alone was the
// commonest German title the gate left out with a trade of ours in it (about 180 a day).
export const compoundFitter = (title: string): string => {
  const apart = title.replace(
    /([a-z])(monteur(?:in|innen|e)?)(?![a-z])/g,
    "$1 $2",
  );
  return apart === title
    ? title
    : `${apart} ${apart.replace(/([a-z]{3,})s (monteur)/g, "$1 $2")}`;
};
export const FITTER_ELSEWHERE =
  /(?:^|[^a-z])(?:fenster|turen|tore|tor|kuchen|mobel|messebau|trockenbau|gerust|gerustbau|dach|dachdecker|fassade|fassaden|bodenbelag|boden|parkett|fliesen|glas|rollladen|sonnenschutz|zaun|zaune|moebel|innenausbau|holzbau|schreiner|tischler|zimmerer|zimmermann|veranda|facade|cuisine|cuisines|kuchenmontage|mobeln|mobelmontage|uberdachung|uberdachungen|terrassenuberdachung|terrassenuberdachungen|terrassendacher|sommergarten|isolierer|plakatanschlager|werbeanlagen|auslieferung|auslieferungsfahrer|objekteinrichtungen|wohnmobile|decken|decke|storen|isolier|ausstellungs|ausstellung|hausraumer)(?![a-z])/;
export const FITTER_ROUTES: readonly Route[] = [
  [
    /(?:^|[^a-z])(?:kfz|reifen|reifenservice|pneu|fahrzeug|fahrzeuge|nutzfahrzeuge|lkw|pkw|schnellservice)(?![a-z])/,
    "7231",
  ],
  [
    /(?:^|[^a-z])(?:kalte|kaltetechnik|klima|klimatechnik|klimaanlagen|luftung|luftungstechnik|luftungsbau|lufttechnik|rlt|warmepumpe|warmepumpen)(?![a-z])/,
    "7127",
  ],
  [
    /(?:^|[^a-z])(?:shk|hkls|hlks|hls|hlk|sanitar|heizung|heizungsbau|heizungstechnik|gas|wasser|rohrleitungsbau|rohrleitung|sprinkler|sprinkleranlagen|trinkwasser|trinkwasserversorgung|chauffage|sanitaire|haustechnik|gebaudetechnik|versorgungstechnik)(?![a-z])/,
    "7126",
  ],
  [
    /(?:^|[^a-z])(?:fernmelde|fernmeldetechnik|telekommunikation|glasfaser|lwl|mobilfunk|netzwerk|breitband|richtfunk|telekommunikationsbau|glasfaserausbau|mobilfunksysteme)(?![a-z])/,
    "7422",
  ],
  [
    /(?:^|[^a-z])(?:kabel|kabelbau|kabelmontage|kabelmontagen|kabelzug|kabelanlagen|freileitung|freileitungen|hochspannung|mittelspannung|netzbau|leitungsbau)(?![a-z])/,
    "7413",
  ],
  [
    /(?:^|[^a-z])(?:elektro|elektrotechnik|elektroinstallation|elektrik|schaltanlagen|schaltanlagenbau|schaltschrank|schaltschrankbau|blitzschutz|photovoltaik|photovoltaique|pv|solar|solaire|e mobilitat|ladesaulen|ladeinfrastruktur|gebaudeautomation|msr|emsr|photovoltaiques|stra(?:ss|ß)enbeleuchtung)(?![a-z])/,
    "7411",
  ],
  [/(?:^|[^a-z])(?:stahlbau|metallbau|stahl)(?![a-z])/, "7214"],
];
// French: the technician, the mechanic and the fitter, which the indexes name only with a
// speciality ("technicien de maintenance", "mécanicien poids lourds"), and the setter, machinist and
// fitter ("régleur", "usineur", "ajusteur"). The main occupations take the technicians of a
// technical discipline, the trades the rest; a technician that names no discipline stays out
// ("technicien de surface" is a cleaner), a mechanic or fitter goes to industrial mechanics.
export const FR_TECHNICIAN =
  /(?:^|[^a-z])(?:technicien|technicienne|techniciens|techniciennes)(?![a-z])/;
export const FR_SKILLED =
  /(?:^|[^a-z])(?:mecanicien|mecanicienne|mecaniciens|mecaniciennes|monteur|monteuse|monteurs|regleur|regleuse|regleurs|usineur|usineuse|usineurs|ajusteur|ajusteuse|ajusteurs)(?![a-z])/;
export const FR_OUT =
  /(?:^|[^a-z])(?:surface|medical|medicale|medicales|medicaux|clinique|cliniques|in vivo|funeraire|pharmacie|cosmetique|esthetique|velo|velos|cycle|cycles|veranda|verandas|facade|facades|cuisine|cuisines|meuble|meubles|menuiserie|menuiseries|agencement|stand|stands|echafaudage|echafaudages|couverture|isolation|plaquiste|placo|store|stores|fermetures|ide|infirmier|infirmiere|biologie|biologique|biologiques|microbiologie)(?![a-z])/;
export const FR_TECHNICIAN_ROUTES: readonly Route[] = [
  [
    /(?:^|[^a-z])(?:electronique|electroniques|electronicien|hyperfrequence|hyperfrequences)(?![a-z])/,
    "3114",
  ],
  [
    /(?:^|[^a-z])(?:telecom|telecoms|telecommunication|telecommunications|radiocommunication|radiocommunications)(?![a-z])/,
    "3522",
  ],
  [
    /(?:^|[^a-z])(?:electrotechnique|electrotechnicien|instrumentation|controle commande|mesures electriques|automatisme|automatismes|automaticien)(?![a-z])/,
    "3113",
  ],
  [
    /(?:^|[^a-z])(?:bureau d etudes|etudes|projeteur|conception|cao|dao)(?![a-z])/,
    "3118",
  ],
  [
    /(?:^|[^a-z])(?:btp|batiment|genie civil|travaux|chantier|topographe|topographie|geometre|voirie|ouvrages d art|vrd)(?![a-z])/,
    "3112",
  ],
  [/(?:^|[^a-z])(?:laboratoire|labo|essais)(?![a-z])/, "3111"],
  [
    /(?:^|[^a-z])(?:assainissement|eau potable|traitement des eaux|station d epuration)(?![a-z])/,
    "3132",
  ],
  [
    /(?:^|[^a-z])(?:methodes|industrialisation|qualite|process|procedes|production)(?![a-z])/,
    "3119",
  ],
];
export const FR_TRADE_ROUTES: readonly Route[] = [
  [
    /(?:^|[^a-z])(?:automobile|automobiles|auto|vehicule|vehicules|voiture|voitures|vl|vul|garage|diagnostic|rapide|camion|camions|poids lourds|pl|bus|autocar|autocars|camping car|camping cars|vehicules de loisirs|moto|motos)(?![a-z])/,
    "7231",
  ],
  [
    /(?:^|[^a-z])(?:aeronautique|avion|avions|aeronef|aeronefs|helicoptere|helicopteres|aviation|cellule)(?![a-z])/,
    "7232",
  ],
  [
    /(?:^|[^a-z])(?:usinage|usineur|usineuse|fraisage|fraiseur|tournage|tourneur|commande numerique|cn|cnc|regleur|regleuse)(?![a-z])/,
    "7223",
  ],
  [
    /(?:^|[^a-z])(?:climatisation|climatique|cvc|froid|frigorifique|frigoriste|chauffage|chauffagiste|thermique|thermie|pompe a chaleur|pompes a chaleur|pac|ventilation)(?![a-z])/,
    "7127",
  ],
  [
    /(?:^|[^a-z])(?:plomberie|plombier|sanitaire|sanitaires|fluides|tuyauterie|tuyauteur)(?![a-z])/,
    "7126",
  ],
  [
    /(?:^|[^a-z])(?:alarme|alarmes|videosurveillance|videoprotection|video protection|controle d acces|courants faibles|cfa|fibre|fibre optique|ftth|telephonie)(?![a-z])/,
    "7422",
  ],
  [
    /(?:^|[^a-z])(?:electricite|electrique|electricien|cfo|courants forts|photovoltaique|photovoltaiques|eclairage|bornes de recharge|irve)(?![a-z])/,
    "7411",
  ],
  [
    /(?:^|[^a-z])(?:maintenance|sav|apres vente|depannage|depanneur|itinerant|itinerante|levage|ascensoriste|ascenseur|ascenseurs|chariot|chariots|elevateur|elevateurs|machines|electromecanique|electromecanicien|engins|agricole|agricoles|horticole|travaux publics|tp|industriel|industrielle|mecanique)(?![a-z])/,
    "7233",
  ],
];
export const FR_SKILLED_FAMILY = "7233";
// A technician of maintenance or after-sales, or one the title names beside a trade, is the trades'
// to file, as "technicien de maintenance" is.
export const FR_TRADE_TECHNICIAN =
  /(?:^|[^a-z])(?:maintenance|entretien|sav|apres vente|depannage|depanneur|plombier|plomberie|sanitaire|chauffagiste|chauffage|climatisation|cvc|electricien|electromecanicien|frigoriste|tuyauteur|soudeur|cordiste|monteur|mecanicien)(?![a-z])/;
// Flemish: the bare technician and mechanic ("Technieker", "Mechanieker", "Mecanicien"), in
// Belgium's adverts the upkeep of machines, vehicles and buildings: by the trade the title names,
// else industrial mechanics (7233), as the Dutch bare "monteur".
export const NL_SKILLED =
  /(?:^|[^a-z])(?:technieker|techniekers|mechanieker|mechaniekers|mecanicien|mecaniciens)(?![a-z])/;
export const NL_OUT =
  /(?:^|[^a-z])(?:schoonmaak|medisch|medische|keuken|keukens|meubel|meubels|evenement|evenementen|podium|theater|pest control|ongedierte|ongediertebestrijding)(?![a-z])/;
// A Dutch «machinist» drives a crane, a digger or an aerial platform (machinist rupskraan, minigraver, hoogwerker,
// «Allround machinist»), outside the vertical: ESCO's ship's engineer and the English machinist took 1,355 of them
// (8 November 2026). Not the CNC machinist nor the ship's one.
export const NL_MACHINE_DRIVER =
  /^(?!.*(?:cnc|draaier|draaibank|frezer|freesbank|scheep|schip|binnenvaart|zeevaart|veerboot|ferry|koopvaardij|sleepvaart|bulkvaart|tankvaart|passagiersvaart|baggervaart|offshore|vaartuig|marine|werktuigkundig)).*(?:^|[^a-z])[a-z]*machinist(?:en)?(?![a-z])/;
export const NL_TRADE_ROUTES: readonly Route[] = [
  [
    /(?:^|[^a-z])(?:vrachtwagen|vrachtwagens|auto|autos|auto s|bus|bussen|bedrijfswagen|bedrijfswagens|oplegger|opleggers|truck|trucks|diagnose|automotive|personenwagens|carrosserie|garage|garages)(?![a-z])/,
    "7231",
  ],
  [/(?:^|[^a-z])(?:vliegtuig|vliegtuigen|luchtvaart)(?![a-z])/, "7232"],
  [
    /(?:^|[^a-z])(?:hvac|koeling|koeltechniek|airco|aircos|airco s|warmtepomp|warmtepompen|ventilatie|verwarming|cv|brander|branders)(?![a-z])/,
    "7127",
  ],
  [
    /(?:^|[^a-z])(?:sanitair|sanitaire|sprinkler|sprinklers|loodgieter|waterontharder|waterontharders|zwembad|zwembaden)(?![a-z])/,
    "7126",
  ],
  [
    /(?:^|[^a-z])(?:elektriciteit|elektricien|sterkstroom|laadpalen|laadpaal|zonnepanelen|beveiliging|toegangsbeveiliging|alarm|alarmen|alarminstallaties|alarmcentrale|alarmcentrales|branddetectie)(?![a-z])/,
    "7411",
  ],
  [
    /(?:^|[^a-z])(?:elektro|electro|elektromechanica|elektromechanisch|elektromechanische|e&i)(?![a-z])/,
    "7412",
  ],
  [/(?:^|[^a-z])(?:cnc|draaien|frezen|verspaning)(?![a-z])/, "7223"],
];
export const NL_SKILLED_FAMILY = "7233";
// Spanish: the bare mechanic ("Mecánico/a", "Mecánico/a oficial de primera Scania"), which the
// indexes name only with a speciality. Only as the title's first word, or as the mechanic-fitter
// ("mecánico ajustador", which ESCO files among the electrical fitters): after another word ("Diseñador
// mecánico", "Montaje mecánico") it says mechanical. By the trade the title names, else vehicles,
// what a bare mechanic is in Spain's adverts. A railway coupler ("de acoples y maniobras") is not one.
export const ES_MECHANIC =
  /^(?:oficial (?:de )?(?:(?:[123][aªº]?|primera|segunda|tercera) ?)?)?mecanicos?(?![a-z])|(?:^|[^a-z])mecanicos?[ -]ajustador(?:es)?(?![a-z])/;
export const ES_OUT =
  /(?:^|[^a-z])(?:acoples|maniobras|dental|dentales|bicicleta|bicicletas)(?![a-z])/;
export const ES_TRADE_ROUTES: readonly Route[] = [
  [
    /(?:^|[^a-z])(?:electrico|electricos|electrica|electricas|electricista|electricistas|electromecanico|electromecanicos)(?![a-z])/,
    "7412",
  ],
  [
    /(?:^|[^a-z])(?:automocion|automovil|automoviles|vehiculo|vehiculos|turismo|turismos|camion|camiones|pesados|autobus|autobuses|moto|motos|motocicletas|concesionario|taller|scania|neumaticos)(?![a-z])/,
    "7231",
  ],
  [
    /(?:^|[^a-z])(?:aeronautico|aeronautica|avion|aviones|aeronaves|helicopteros)(?![a-z])/,
    "7232",
  ],
  [/(?:^|[^a-z])(?:moldes|matriceria|troqueles)(?![a-z])/, "7222"],
  [
    /(?:^|[^a-z])(?:mecanizado|cnc|torno|tornero|fresadora|fresador)(?![a-z])/,
    "7223",
  ],
  [
    /(?:^|[^a-z])(?:climatizacion|frio|frigorista|refrigeracion|calefaccion)(?![a-z])/,
    "7127",
  ],
  [
    /(?:^|[^a-z])(?:mantenimiento|industrial|industriales|maquinaria|maquina|maquinas|montaje|montajes|montador|montacargas|carretillas|elevadores|elevacion|ascensores|agricola|jardineria|hosteleria|bombas|hidraulica|hidraulicas|hidraulico|hidraulicos|electrogenos|compresores|depuradora|ptar|edar|planta|plantas|ajustador|ajustadores|ajustadora)(?![a-z])/,
    "7233",
  ],
];
export const ES_MECHANIC_FAMILY = "7231";
// Spanish: the technician or designer named by a discipline ("Técnico/a automatista", "Técnico CAD-BIM",
// "Diseñador eléctrico"), read last, when no reading took the title, as the bare German "Techniker" is.
// One of sales, prevention, staff, care, graphics or fashion is not one of ours.
export const ES_TECHNICIAN =
  /^(?:tecnico|tecnica|tecnicos|tecnicas|disenador|disenadora|disenadores)(?![a-z])/;
export const ES_TECHNICIAN_OUT =
  /(?:^|[^a-z])(?:comercial|comerciales|ventas|prl|prevencion|riesgos|rrhh|recursos humanos|administracion|administrativo|administrativa|nominas|contable|contabilidad|laboral|compras|logistica|logistico|marketing|juridico|fiscal|financiero|seguros|subvenciones|formacion|empleo|social|sociales|igualdad|cultura|deportes|turismo|jardineria|sanitario|farmacia|clinico|clinica|clinic|biomedic|biomedico|microbiologia|hse|seguridad y salud|aprovisionamiento|aprovisionamientos|limpieza|grafico|grafica|moda|interiores|producto|web|ux|ui|joyas|calzado|textil)(?![a-z])/;
export const ES_TECHNICIAN_ROUTES: readonly Route[] = [
  [
    /(?:^|[^a-z])(?:electronica|electronico|electronicos|smd|pcb|hardware|radiofrecuencia|avionica|compatibilidad electromagnetica|emc)(?![a-z])/,
    "3114",
  ],
  [
    /(?:^|[^a-z])(?:telecomunicaciones|telecomunicacion|teleco)(?![a-z])/,
    "3522",
  ],
  [
    /(?:^|[^a-z])(?:electrico|electrica|electricos|electricas|electricidad|baja tension|media tension|alta tension|automatizacion|automatista|automatismos|plc|scada|programacion industrial|instrumentacion|eplan|robotica|mecatronico|mecatronica|electromedicina|fotovoltaica|fotovoltaico|subestaciones|o&m)(?![a-z])/,
    "3113",
  ],
  [
    /(?:^|[^a-z])(?:cad|bim|delineacion|piping|tuberias|3d|oficina tecnica)(?![a-z])/,
    "3118",
  ],
  [
    /(?:^|[^a-z])(?:obra|obras|obra civil|construccion|edificacion|topografia|topografo|carreteras)(?![a-z])/,
    "3112",
  ],
  [
    /(?:^|[^a-z])(?:mecanico|mecanica|mecanicos|maquinaria|mecanizado|cnc|utillajes)(?![a-z])/,
    "3115",
  ],
  [/(?:^|[^a-z])(?:laboratorio|ensayos)(?![a-z])/, "3111"],
  [
    /(?:^|[^a-z])(?:i\+d|i\+d\+i|industrializacion|metrologia)(?![a-z])/,
    "3119",
  ],
];
// Spanish: the bare supervisor ("Supervisor/a de obra", "Supervisor/a Eléctrico/a - Proyectos
// Industriales"), which the indexes name only for a few works: as the title's first word, by the work
// the title names, as the English "Mechanical Supervisor" and "Electrical Supervisor" are read. A
// supervisor of cleaning, security, sales or a warehouse is not one of ours, whatever works it serves.
export const ES_SUPERVISOR =
  /^(?:supervisor|supervisora|supervisores|supervisoras)(?![a-z])/;
export const ES_SUPERVISOR_OUT =
  /(?:^|[^a-z])(?:limpieza|higiene|seguridad|vigilancia|ventas|comercial|tienda|almacen|logistica|reparto|hosteleria|restaurante|sala|caja|teleoperadores)(?![a-z])/;
export const ES_SUPERVISOR_ROUTES: readonly Route[] = [
  [
    /(?:^|[^a-z])(?:mecanico|mecanica|mecanicos|montaje|montajes|produccion|fabricacion|taller|planta|mantenimiento)(?![a-z])/,
    "3122",
  ],
  [
    /(?:^|[^a-z])(?:obra|obras|construccion|civil|infraestructura|infraestructuras|instalacion|instalaciones|electrico|electrica|electricos|fotovoltaico|fotovoltaica|fotovoltaicos|solar|eolico|eolica|calorifugado|tuberias|piping|canalizaciones|urbanizacion)(?![a-z])/,
    "3123",
  ],
];

// The first route whose pattern the title matches and whose family the compiled gate holds.
export function route(
  routes: readonly Route[],
  title: string,
  known: ReadonlySet<string>,
): string | null {
  for (const [pattern, id] of routes)
    if (pattern.test(title) && known.has(id)) return id;
  return null;
}
