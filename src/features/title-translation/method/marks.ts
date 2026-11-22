// Legacy builder/mt/marks.ts (JustJans/indudex@b0cd182), word for word but for lint and paths.
// The gender marks of a Spanish or Catalan title given back to its translation into the other («Ingeniero/a de procesos» →
// «Enginyer/a de processos», «Tècnic/a de manteniment» → «Técnico/a de mantenimiento»). The method takes them out before
// Firefox, which reads them as words (builder/mt/genders.ts), and wrote the translation in the masculine: of Spain's 4,864
// published titles with a mark, 3,005 lost it in Catalan, while the older translations kept it (8 November 2026).
// A mark goes on the words of a person each part of the title opens with, up to its first link word: the trade and the
// words that agree with it («Enginyer/a tècnic/a de camins»), not those of its field («Técnico/a de mantenimiento
// eléctrico»). Only the words Spain's titles mark, as they mark them; the others are left as Firefox wrote them.

// Each word in the masculine and the mark Spain's titles write after it (published titles and translations of 8 November
// 2026, the forms written twice or more).
const SPANISH = {
  a: "ingeniero técnico tecnico arquitecto mecánico mecanico consultor jefe desarrollador programador electromecánico electromecanico encargado eléctrico electrico operario administrador supervisor montador diseñador informático informatico instalador director inspector topógrafo topografo coordinador operador aparejador fontanero modelador experto electrónico electronico calderero gestor especializado tornero carpintero pintor fresador ajustador auditor tubero carrocero agrónomo agronomo adjunto administrativo reparador titulado investigador decorador funcionario planificador geotécnico geotecnico interino mecatrónico mecatronico integrador asesor editor herrero aeronáutico aeronautico enólogo enologo plegador graduado científico cientifico energético energetico robótico robotico empapelador conductor microinformático troquelador certificador cableador geólogo geologo químico quimico biomédico biomedico redactor implantador orientador tutor doctor delegado abogado enfermero ferroviario oficial",
};
const CATALAN = {
  a: "tècnic tecnic enginyer mecànic mecanic arquitecte geotècnic desenvolupador consultor electromecànic elèctric informàtic programador administrador soldador supervisor muntador dissenyador coordinador director electrònic aparellador expert gestor topògraf oficial científic inspector calderer agrònom fontaner químic auditor operador avaluador lingüístic modelador instal·lador fresador mecatrònic planificador assessor aeronàutic geofísic decorador ajustador investigador monitor biomèdic gerent energètic microinformàtic tornejador pintor carrosser torner nàutic aprenent hidràulic electroòptic redactor tutor orientador adjunt dependent perruquer conseller cofundador fundador vicepresident bioinformàtic tecnològic",
  ària: "operari becari propietari",
  ada: "encarregat diplomat titulat especialitzat associat graduat delegat",
  va: "administratiu facultatiu executiu",
  òloga: "geòleg ambientòleg",
};
const SPANISH_TOO = { a: "soldador montador" };
const tableOf = (groups: Record<string, string>) => {
  const m = new Map<string, string>();
  for (const [mark, words] of Object.entries(groups))
    for (const w of words.split(" ")) m.set(w, mark);
  return m;
};
const MARK: Record<string, Map<string, string>> = {
  es: tableOf({ a: `${SPANISH.a} ${SPANISH_TOO.a}` }),
  ca: tableOf(CATALAN),
};

// A mark written in a title: «/a», «/as», «/ària», «/ada», «(a)»…
export const MARKED =
  /(?<![\p{L}])\p{L}{2,}\s*\/\s*(?:a|as|es|ària|aria|ada|da|va|iva|ra|la|ques|òloga)(?![\p{L}])|\p{L}\(a\)/iu;
// Where a part's person ends: a link word, a bracket, a comma or a colon.
const LINK =
  /\s(?:de|del|d[’']|en|per|para|con|amb|a|al|als|i|y|e|o|u|sobre|sector|zona|área|area|àrea)(?=\s|[’'])|[(,:;·]|\sd[’']/iu;

// The translation with the marks its title wrote, in `lang` ('es' or 'ca'), on the words each part opens with.
export function withMarks(text: string, lang: string): string {
  const table = MARK[lang];
  if (!table) return text;
  // Each part apart: those a dash, a bar or a comma sets off, and two trades joined by «or» («Arquitecte/a tècnic/a o
  // Enginyer/a tècnic/a», «Delineante, arquitecto/a técnico/a o arquitecto/a»).
  return String(text)
    .split(/(\s[-–—|/]\s|\s[ou]\s|\s*,\s*)/)
    .map((part, i) => {
      if (i % 2) return part;
      const cut = part.search(LINK);
      const head = cut < 0 ? part : part.slice(0, cut),
        rest = cut < 0 ? "" : part.slice(cut);
      // A part that opens with no word of a person names none («Sector Químic», «Obra Civil»).
      const first = head.match(/\p{L}[\p{L}·]*/u)?.[0] || "";
      if (!table.has(first.toLowerCase())) return part;
      const marked = head.replace(
        /(?<![\p{L}/·'’-])(\p{L}[\p{L}·]*)(?![\p{L}/·'’-])/gu,
        (w) => {
          const mark = table.get(w.toLowerCase());
          if (!mark) return w;
          const suffix =
            mark === "ària" && w.toLowerCase().endsWith("i") ? "ària" : mark;
          return `${w}/${w === w.toUpperCase() && w.length > 1 ? suffix.toUpperCase() : suffix}`;
        },
      );
      return marked + rest;
    })
    .join("");
}
