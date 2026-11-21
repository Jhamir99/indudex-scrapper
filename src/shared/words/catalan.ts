// Catalan titles read in Spanish, which ESCO has and Catalan lacks (legacy builder/gate.mjs
// catalanToo, word for word but for types): the gate reads a Catalan title once more so, and
// dedupe compares «Tècnic/a de manteniment» with «Técnico/a de mantenimiento».

// What catalanToo reads of an advert: its title, its language and the languages it is read in.
export interface CatalanTitle {
  readonly title: string;
  readonly lang?: string;
  readonly hintLangs?: readonly string[];
}

// The Catalan words of the trades', technicians', engineers' and IT titles, in Spanish. Those that
// only Catalan writes so (tècnic, manteniment, fuster…) are its sign; the rest are carried along.
const CATALAN: Readonly<Record<string, string>> = {
  tècnic: "técnico",
  tècnica: "técnica",
  tècnics: "técnicos",
  tècniques: "técnicas",
  mecànic: "mecánico",
  mecànica: "mecánica",
  mecànics: "mecánicos",
  mecàniques: "mecánicas",
  enginyer: "ingeniero",
  enginyera: "ingeniera",
  enginyers: "ingenieros",
  enginyeres: "ingenieras",
  enginyeria: "ingeniería",
  manteniment: "mantenimiento",
  "instal·lador": "instalador",
  "instal·ladora": "instaladora",
  "instal·ladors": "instaladores",
  "instal·lació": "instalación",
  "instal·lacions": "instalaciones",
  "instal.lador": "instalador",
  "instal.ladora": "instaladora",
  "instal.lació": "instalación",
  "instal.lacions": "instalaciones",
  electricitat: "electricidad",
  elèctric: "eléctrico",
  elèctrica: "eléctrica",
  elèctrics: "eléctricos",
  elèctriques: "eléctricas",
  paleta: "albañil",
  paletes: "albañiles",
  fuster: "carpintero",
  fustera: "carpintera",
  fusters: "carpinteros",
  fusteria: "carpintería",
  lampista: "fontanero",
  lampistes: "fontaneros",
  lampisteria: "fontanería",
  operari: "operario",
  operària: "operaria",
  operaris: "operarios",
  muntador: "montador",
  muntadora: "montadora",
  muntadors: "montadores",
  muntatge: "montaje",
  muntatges: "montajes",
  encarregat: "encargado",
  encarregada: "encargada",
  cap: "jefe",
  obres: "obras",
  maquinària: "maquinaria",
  màquines: "máquinas",
  màquina: "máquina",
  reparació: "reparación",
  reparacions: "reparaciones",
  motlles: "moldes",
  qualitat: "calidad",
  laboratori: "laboratorio",
  fabricació: "fabricación",
  producció: "producción",
  automoció: "automoción",
  vehicles: "vehículos",
  xapista: "chapista",
  climatització: "climatización",
  calefacció: "calefacción",
  fred: "frío",
  aigua: "agua",
  xarxa: "red",
  xarxes: "redes",
  telecomunicacions: "telecomunicaciones",
  sistemes: "sistemas",
  informàtic: "informático",
  informàtica: "informática",
  informàtics: "informáticos",
  desenvolupador: "desarrollador",
  desenvolupadora: "desarrolladora",
  desenvolupament: "desarrollo",
  ciberseguretat: "ciberseguridad",
  automatització: "automatización",
  robòtica: "robótica",
  mecatrònica: "mecatrónica",
  electromecànic: "electromecánico",
  electromecànica: "electromecánica",
  electromecànics: "electromecánicos",
  electricista: "electricista",
  electricistes: "electricistas",
  soldador: "soldador",
  soldadors: "soldadores",
  serraller: "cerrajero",
  serrallers: "cerrajeros",
  manyà: "cerrajero",
  fontaner: "fontanero",
  electrònic: "electrónico",
  electrònica: "electrónica",
  delineant: "delineante",
  topògraf: "topógrafo",
  arquitecte: "arquitecto",
  arquitecta: "arquitecta",
  aparellador: "aparejador",
  ajudant: "ayudante",
  mitjà: "medio",
  mitjana: "media",
  industrials: "industriales",
  prevenció: "prevención",
  riscos: "riesgos",
  laborals: "laborales",
  assistència: "asistencia",
  servei: "servicio",
  matricer: "matricero",
  matricera: "matricera",
  planxista: "chapista",
  planxistes: "chapistas",
  motllista: "moldista",
  motllistes: "moldistas",
  canonader: "tubero",
  canonadora: "tubera",
  mecanitzador: "mecanizador",
  mecanitzadora: "mecanizadora",
  mecanitzat: "mecanizado",
  ascensors: "ascensores",
  ascensor: "ascensor",
  carrosser: "carrocero",
  carrossera: "carrocera",
  ferrer: "herrero",
  ferrera: "herrera",
  medi: "medio",
  ambient: "ambiente",
  obra: "obra",
  torner: "tornero",
  tornera: "tornera",
  quadrista: "cuadrista",
  quadristes: "cuadristas",
  plaques: "placas",
  estructures: "estructuras",
  estructura: "estructura",
  "metàl·liques": "metálicas",
  "metàl·lica": "metálica",
  "metàl·lics": "metálicos",
  "metàl·lic": "metálico",
  dissenyador: "diseñador",
  dissenyadora: "diseñadora",
  quadres: "cuadros",
  quadre: "cuadro",
  tractament: "tratamiento",
  aigües: "aguas",
  processos: "procesos",
  procés: "proceso",
  programari: "software",
  dades: "datos",
  edificació: "edificación",
  científic: "científico",
  científica: "científica",
  projectista: "proyectista",
  projectes: "proyectos",
  projecte: "proyecto",
  solars: "solares",
  fotovoltaiques: "fotovoltaicas",
  calderer: "calderero",
  calderera: "calderera",
  vidrier: "cristalero",
  vidriera: "cristalera",
  carretó: "carretilla",
  elevador: "elevadora",
  serveis: "servicios",
  socials: "sociales",
  administratiu: "administrativo",
  administratius: "administrativos",
  segona: "segunda",
  i: "y",
  amb: "con",
  per: "para",
  els: "los",
  les: "las",
  dels: "de los",
  oficial: "oficial",
  primera: "primera",
};
// Not a sign: the short words, and those another language writes the same (English "vehicles",
// Portuguese "riscos", Italian "laboratori").
const CATALAN_ONLY = new Set(
  Object.entries(CATALAN)
    .filter(
      ([ca, es]) =>
        ca !== es &&
        !/^(i|amb|per|els|les|dels|cap|fred|aigua|primera|oficial|segona|paleta|vehicles|industrials|riscos|laboratori|ambient|ascensor|elevador|ferrer)$/.test(
          ca,
        ),
    )
    .map(([ca]) => ca),
);
// A title in Catalan, read in Spanish word by word, or null when it is not Catalan or reads the same.
export function catalanToo<T extends CatalanTitle>(raw: T): T | null {
  const title = String(raw.title || "");
  const words = title
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .split(/([^\p{L}·.']+)/u);
  const catalan =
    raw.lang === "ca" ||
    (raw.hintLangs || []).includes("ca") ||
    words.some((w) =>
      CATALAN_ONLY.has(w.replace(/^[dl]'/, "").replace(/\.$/, "")),
    );
  if (!catalan) return null;
  const spanish = words
    .map((w) => {
      const elided = w.match(/^([dl])'(.+)$/);
      const word = (elided ? elided[2] : w).replace(/\.$/, "");
      const es = (Object.hasOwn(CATALAN, word) && CATALAN[word]) || word; // not «constructor» from Object's own (NOB-15)
      return elided ? `${elided[1] === "d" ? "de" : "el"} ${es}` : es;
    })
    .join("");
  return spanish !== title.toLowerCase()
    ? { ...raw, title: spanish, lang: "es", hintLangs: ["es"] }
    : null;
}
