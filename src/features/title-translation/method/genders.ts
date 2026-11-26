// Gender endings written into a word ("Bauleiter:in", "Technicien(ne)", "Técnico/a") taken out
// before translating: Firefox reads them as words ("Construction Manager:in", "Official/the") or
// leaves the word untranslated ("Webdesigner:in"). The word keeps its first (usually masculine) form.
// ➤ A German pair whose feminine changes the stem: an umlaut, or a final «e» dropped («Koch/Köchin», «Experte/Expertin»).
// The legacy's builder/mt/genders.ts (JustJans/indudex@ec79858), copied (legacy resync T009): only its imports and data reads
// changed. Its own comments keep their marks.
const unUmlaut = (w: string) =>
  w.toLowerCase().replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u");
const sameStem = (man: string, woman: string) =>
  [man, man.replace(/e$/, "")].some((m) => unUmlaut(m) === unUmlaut(woman));
type Rule = [RegExp, string | ((m: string, ...groups: string[]) => string)];
const replaceBy = (t: string, [re, by]: Rule) =>
  typeof by === "string" ? t.replace(re, by) : t.replace(re, by);
const RULES: Record<string, Rule[]> = {
  de: [
    [/(\p{Lu}[\p{Ll}-]+)innen\s*\/\s*\1\b/gu, "$1"], // Elektronikerinnen / Elektroniker
    [/(\p{Lu}[\p{Ll}-]+)\s*\/\s*\1innen\b/gu, "$1"], // Elektroniker / Elektronikerinnen
    [/(\p{Lu}[\p{Ll}-]+)in\s*\/\s*\1\b/gu, "$1"], // Soldatin / Soldat
    [/(\p{Lu}[\p{Ll}-]+)\s*\/\s*\1in\b/gu, "$1"], // Soldat / Soldatin
    [/(\p{Ll})(?:[:*_′’]|\/-?)inn?en\b/gu, "$1"], // Mitarbeiter:innen, *innen, /-innen
    [/(\p{Ll})(?:[:*_′’]|\/-?)in\b/gu, "$1"], // Bauleiter:in, *in, _in, /-in, /in, Architekt′in
    [/(\p{Ll})(?:[:*_′’]|\/-?)(?:Inn?en|In)(?![\p{L}\p{N}-])/gu, "$1"], // Zeichner:In, Techniker*In, Planer:Innen, Meister/In; not Vertrieb/Innen-
    [/(\p{Lu})(?:[:*_′’]|\/-?)(?:INN?EN|IN)\b/gu, "$1"], // ARCHITEKT:INNEN, ZEICHNER/-IN
    [/(\p{Ll})\((?:innen|in)\)/gu, "$1"], // Fräser(in), (innen)
    [/(\p{Ll}er)In(?:nen)?\b/gu, "$1"], // MitarbeiterIn, MitarbeiterInnen (not LinkedIn)
    [/(\p{Ll}(?:ant|ent|ekt|ist|eur))In(?:nen)?\b/gu, "$1"], // WerkstudentInnen, PraktikantIn, ArchitektInnen
    [/(\p{Ll})\s*\/\s*-?\s*in\b(?!\s+\p{Lu})/gu, "$1"], // Rundschleifer/ in; not «Elektriker / in Vollzeit»
    [/(\p{Ll}e)(?:[:*_′’]|\/-?)r(?![&\p{L}])/gu, "$1r"], // Bautechnische:r Zeichner:in; not «Finance/r&d»
    [/(\p{Ll}e)(?:[:*_′’]|\/-?)R(?![&\p{L}])/gu, "$1r"], // Staatlich Geprüfte/R; not «Finance/R&D»
    [/(?<!\p{L})(\p{L}+mann)\s*\/\s*-?\s*(?:\p{L}*frau)\b/gu, "$1"], // Kaufmann/-frau, IT-Systemkaufmann/-kauffrau
    [/(?<!\p{L})(\p{L}+)frau\s*\/\s*-?\s*\p{L}*mann\b/gu, "$1mann"], // Pflegefachfrau/-mann, Kauffrau / -mann
    [
      /(?<!\p{L})(\p{Lu}[\p{Ll}-]+)\s*\/\s*(\p{Lu}[\p{Ll}-]+)in\b/gu,
      (m, man, woman) => (sameStem(man, woman) ? man : m),
    ], // Koch/Köchin, Experte/Expertin
    [
      /\s*\((?:jedes Geschlecht|alle Geschlechter|all genders|Mensch\*?)\)/giu,
      "",
    ], // Monteur (jedes Geschlecht), (Mensch*)
  ],
  fr: [
    [/(\p{Ll})[.·](?:ne|e|euse|se|trice|rice)[.·]s\b/giu, "$1s"], // technicien.ne.s, opérateur.rice.s (before the singular rules)
    [/(\p{Ll})(?:\(e\)|·e\b|\.e\b|-e\b)/gu, "$1"], // Ingénieur(e), ingénieur·e, ingénieur.e, Ingénieur-e
    [/(ien)(?:\(ne\)|·ne\b|\.ne\b|-ne\b)/gu, "$1"], // technicien(ne), ·ne, .ne, -ne
    [/(eur)(?:\(euse\)|·euse\b|\.euse\b|\s*\(se\)|·se\b)/gu, "$1"], // soudeur(euse), soudeur (se)
    [/(teur)(?:\(trice\)|·trice\b|·rice\b|\.trice\b|\(rice\))/gu, "$1"], // opérateur(trice), ·rice
    [/(\p{Ll})(?:\.fe\b|\(fe\)|·fe\b)/gu, "$1"], // chef.fe
    [/(el)(?:\(le\)|·le\b)/gu, "$1"], // industriel(le)
    [/(\p{Ll})·s\b/gu, "$1s"], // consultant·e·s left as plural
    [/(eur)\s*\/\s*(?:euse|se)\b/giu, "$1"], // soudeur/se, soudeur/euse
    [/(teur)\s*\/\s*(?:trice|rice)(?![\p{L}])/giu, "$1"], // Conducteur/trice
    [/(eur)\s+\((?:trice|rice|euse|se)\)/giu, "$1"], // Dessinateur (trice), Soudeur (euse)
    [/(ien)\s*\/\s*(?:ienne|ne)(?![\p{L}])/giu, "$1"], // Mecanicien/ne
    [/(i?er)\s*\/\s*(?:ière|iere|ère|ere)(?![\p{L}])/giu, "$1"], // Plombier/ère, Conseiller/ère
    [/(\p{Ll})\s*\/\s*(?:e|fe|le)(?![\p{L}-])/gu, "$1"], // Ingénieur/e, Confirmé/e, Chef/fe; not «/ e-commerce»
    [/(eur|er)(?:\.|·|\()(?:se|euse|teuse)\)?(?![\p{L}])/gu, "$1"], // Développeur.se, Projeteur(teuse), Skipper.euse
    [/(teur)(?:\.|·|\()(?:rice|ice)\)?(?![\p{L}])/gu, "$1"], // Directeur.rice, Directeur.ice
    [/(i?er)(?:\.|·|\()(?:ière|iere|ère|ere)\)?(?![\p{L}])/gu, "$1"], // Carrossier(ère), Conseiller.ère, Plombier·ière
    [/(el)(?:\.|·)le(?![\p{L}])/gu, "$1"], // Fonctionnel.le
    [/(iens?)\((?:nne|nes|ne|en|n)\)/gu, "$1"], // Technicien(nne), Techniciens(ne), Electricien(en)
    [/(teur)-(?:trice|rice)(?![\p{L}])/gu, "$1"], // Dessinateur-rice, Administrateur-trice
    [/(eur)-(?:euse|se)(?![\p{L}])/gu, "$1"], // Développeur-euse
    [/\b(chef)\((?:f|fe)\)/giu, "$1"], // Chef(f)
  ],
  es: [
    [/(\p{L})\s*\/\s*(?:as|es)\b(?!\s*\d)/giu, "$1"], // Programadores/as, /AS; not «RPG/AS 400»
    [
      /(?<!\p{L})(\p{L}{2,})([aA][sS])\s*\/\s*([oO][sS])\b/gu,
      (m, stem, a, os) => stem + os,
    ], // Técnicas/os → Técnicos, TÉCNICAS/OS
    [
      /(?<!\p{L})(\p{L}{2,})([aA])\s*\/\s*([oO])\b/gu,
      (m, stem, a, o) => stem + o,
    ], // Técnica/o → Técnico, TÉCNICA /O → TÉCNICO
    [
      /(\p{L}{3})\s*\/\s*(?:a|A(?!\s+(?:Coruña|Laracha|Estrada|Guarda|Rúa|Pobra|Baña|Lama|Illa)))\b/gu,
      "$1",
    ], // Ingeniero/a, Operario/A Producción; not «Q/A» nor «Lugo/A Coruña»
    [/(\p{L})\s*\/\s*ra\b/giu, "$1"], // Pulidor/RA
    [/(\p{L})\(a\)/giu, "$1"], // Ingeniero(a), INGENIERO(A)
    [/(?<!\p{L})(\p{L}{2,}[or])-a\b/giu, "$1"], // Herrero-a, SOLDADOR-A
  ],
  it: [
    [/(\p{L})\s*\/\s*(?:trici|trice|esse|essa|a)\b/giu, "$1"], // Manutentore/trice, Manutentori/trici, Addetto/a
    [/(\p{L}i)\s*\/\s*e\b/giu, "$1"], // Addetti/e, Tecnici/e
    [
      /(?<!\p{L})(\p{L}{2,})([aA])\s*\/\s*([oO])\b/gu,
      (m, stem, a, o) => stem + o,
    ], // Addetta/o → Addetto
    [/\s*\((?:uomo\/donna|donna\/uomo)\)/giu, ""], // (uomo/donna)
  ],
  cs: [[/(\p{L})\s*\/\s*-?\s*(?:čka|ka|ice|ce)\b/giu, "$1"]], // Obráběč/ka, Soustružník/ce, Elektromechanik/čka
  sk: [[/(\p{L})\s*\/\s*-?\s*(?:čka|ka|ice|ce)\b/giu, "$1"]], // Zvárač/ka
  pl: [[/(\p{L})\s*\/\s*-?\s*(?:czka|ka|yni)\b/giu, "$1"]], // Elektromechanik/-czka
};
// ➤ Portuguese writes the marks as Spanish («Serralheiro/a», «Torneiro(a)»).
RULES.pt = RULES.es;
// ➤ Catalan as Spanish, plus its own: Operari/ària, Encarregat/ada, Oficial/la, Titulat/da, Electrònics/ques, Enginyers/eres.
// ➤ The short endings only in the word's own case: «Girona/La Bisbal» is two towns.
RULES.ca = [
  [/(\p{L})\s*\/\s*(?:ària|àries|ada|ades|eres|era|ques|res)\b/giu, "$1"],
  [/(\p{Ll})\s*\/\s*(?:la|da|na|es|as)\b/gu, "$1"],
  [/(\p{Lu})\s*\/\s*(?:LA|DA|NA|ES|AS)\b/gu, "$1"],
  ...RULES.es,
];

// ➤ French titles with both genders written in full keep the first ("Technicien / Technicienne de
// ➤ maintenance", "Dessinateur projeteur industriel / Dessinatrice projeteuse industrielle"): Firefox
// ➤ mixes the two ("Technician / Maintenance Technician", "Driver / Site manager").
const plain = (w: string) =>
  w.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
type Feminine = (m: string, f: string) => boolean;
function feminineOf(m: string, f: string): boolean {
  if (m.includes("-") || f.includes("-")) {
    const a = m.split("-"),
      b = f.split("-");
    return a.length === b.length && a.every((x, i) => feminineOf(x, b[i]));
  }
  m = plain(m);
  f = plain(f);
  if (!m || f === m) return !!m;
  const forms = m.endsWith("teur")
    ? [m.slice(0, -4) + "trice", m.slice(0, -4) + "teuse", m + "e"]
    : m.endsWith("eur")
      ? [m.slice(0, -3) + "euse", m.slice(0, -3) + "rice", m + "e"]
      : m.endsWith("ien") || m.endsWith("on")
        ? [m + "ne"]
        : m.endsWith("er")
          ? [m.slice(0, -2) + "ere"]
          : m.endsWith("el")
            ? [m + "le"]
            : m.endsWith("f")
              ? [m + "fe", m.slice(0, -1) + "ve"]
              : m.endsWith("x")
                ? [m.slice(0, -1) + "se"]
                : [m + "e"];
  return forms.includes(f);
}
// ➤ The same in Spanish and Catalan ("Torner/tornera", "Técnico/Técnica", "Operaris/operàries", "Jefe/Jefa").
function feminineOfEs(m: string, f: string): boolean {
  m = plain(m);
  f = plain(f);
  // ➤ Words of three letters or more, letters only: not "E/E System Architect", "5G / 5G NTN".
  if (!/^\p{L}{3,}$/u.test(m) || !/^\p{L}{3,}$/u.test(f)) return false;
  if (f === m) return true;
  const forms = [m + "a", m + "es"];
  if (m.endsWith("o") || m.endsWith("e")) forms.push(m.slice(0, -1) + "a");
  if (m.endsWith("os") || m.endsWith("es")) forms.push(m.slice(0, -2) + "as");
  if (m.endsWith("s")) forms.push(m.slice(0, -1) + "es");
  return forms.includes(f);
}
// ➤ And in Italian ("Manutentore/manutentrice", "Addetto/addetta", "Addetti/addette", "Carrozziere/carrozziera").
function feminineOfIt(m: string, f: string): boolean {
  m = plain(m);
  f = plain(f);
  if (!/^\p{L}{3,}$/u.test(m) || !/^\p{L}{3,}$/u.test(f)) return false;
  if (f === m) return true;
  const forms: string[] = [];
  if (m.endsWith("tore")) forms.push(m.slice(0, -4) + "trice");
  if (m.endsWith("tori")) forms.push(m.slice(0, -4) + "trici");
  if (m.endsWith("o") || m.endsWith("e")) forms.push(m.slice(0, -1) + "a");
  if (m.endsWith("i")) forms.push(m.slice(0, -1) + "e");
  return forms.includes(f);
}
// ➤ Both genders of one job said in full: the first kept, the words after the second too.
function oneGenderFr(title: string, fem: Feminine = feminineOf): string {
  const parts = title.split(/\s*\/\s*/),
    slashes = title.match(/\s*\/\s*/g) || [];
  let out = parts[0];
  for (let i = 1; i < parts.length; i++) {
    const left = out.split(/\s+/),
      right = parts[i].split(/\s+/);
    let k = Math.min(4, left.length, right.length);
    while (
      k > 0 &&
      !right.slice(0, k).every((w, n) => fem(left[left.length - k + n], w))
    )
      k--;
    if (k > 0) {
      out = [out, ...right.slice(k)].join(" ");
      continue;
    }
    // ➤ The feminine first ("Electromécanicienne / Electromécanicien"): the masculine kept.
    let r = Math.min(4, left.length, right.length);
    while (
      r > 0 &&
      !right.slice(0, r).every((w, n) => fem(w, left[left.length - r + n]))
    )
      r--;
    out =
      r > 0
        ? [...left.slice(0, left.length - r), ...right].join(" ")
        : out + slashes[i - 1] + parts[i];
  }
  return out;
}

// ➤ The same marks in a French title in capitals ("TECHNICIEN(NE)", "INGENIEUR.E", "CHEF.FE", "SOUDEUR (SE)"):
// ➤ read in small letters by the rules and written back in capitals. Firefox read them as words ("Technician
// ➤ (none)", "Mechanic(no)", "Turner(e)") or left the word as it was ("Technicien.ne After-sales").
const CAPS_MARK =
  /(?<![\p{L}])\p{Lu}{2,}(?:\s?[(·./-]\s?(?:E|NE|NNE|NES|EN|N|EUSE|TEUSE|SE|TRICE|RICE|ICE|FE|F|LE|IÈRE|IERE|ÈRE|ERE|S)\)?(?![\p{L}]))+/gu;
function capsMarksFr(t: string): string {
  return t.replace(CAPS_MARK, (run) => {
    const small = run.toLowerCase();
    let fixed = small;
    for (const rule of RULES.fr) fixed = replaceBy(fixed, rule);
    return fixed === small ? run : fixed.toUpperCase();
  });
}

export function withoutGenders(title: string, lang: string): string {
  let t = title;
  if (lang === "fr") t = capsMarksFr(oneGenderFr(t));
  if (lang === "es" || lang === "ca" || lang === "pt")
    t = oneGenderFr(t, feminineOfEs);
  // ➤ Italian joins them with a slash or with «e» («Manutentore e manutentrice meccanico»).
  if (lang === "it")
    t = oneGenderFr(t, feminineOfIt).replace(
      /(\p{L}{3,})\s+e\s+(\p{L}{3,})/gu,
      (m, a: string, b: string) => (feminineOfIt(a, b) ? a : m),
    );
  for (const rule of RULES[lang] || []) t = replaceBy(t, rule);
  return t.replace(/\s+/g, " ").trim();
}
