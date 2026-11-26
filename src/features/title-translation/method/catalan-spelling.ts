// Catalan's apostrophes and contractions on a translated title: «d'» only before a vowel, «a el» → «al», «de els» →
// «dels», «del examen» → «de l'examen», «el enginyer» → «l'enginyer». Before a semivowel («el iogurt»), the word «i» or
// «o», and an «h» (English words keep theirs: «de hardware») nothing changes; nor a capital «El» inside the title, a
// name's («Fyrstads El», «El Escorial»).
// ➤ A Catalan word whose «h» is silent, so it takes the apostrophe («d'hidràulica», «l'hospital»); English words keep
// ➤ theirs sounded («de hardware», «el hosting»), so only these stems count.
// The legacy's builder/mt/catalan-spelling.ts (JustJans/indudex@ec79858), copied (legacy resync T009): only its imports and data reads
// changed. Its own comments keep their marks.
const SILENT_H =
  "[hH](?:idr|igi|ospital(?!ity)|ostal|otel|abit|àbit|armon|ort|orari|erb|istò|istor|ivern|omolog|umit|umà|uman(?:a|es|s|itat)?(?![\\p{L}])|elic|ipot|emo|abil|isend)"; // not «Hospitality», «Human Capital»
const VOWEL_WORD = `(?=[aeoàèéíòóúAEOÀÈÉÍÒÓÚ]\\p{L}|[iuIU][^\\s\\p{P}\\p{N}aeiouàèéíòóúAEIOUÀÈÉÍÒÓÚ]|${SILENT_H})`;
const JOIN: Record<string, Record<string, string>> = {
  a: { el: "al", els: "als" },
  de: { el: "del", els: "dels" },
  per: { el: "pel", els: "pels" },
};
const APART: Record<string, string> = {
  del: "de l'",
  al: "a l'",
  pel: "per l'",
};
const cap = (like: string, word: string) =>
  like[0] !== like[0].toLowerCase()
    ? word[0].toUpperCase() + word.slice(1)
    : word;
export function catalanSpelling(text: unknown): string {
  let t = String(text || "");
  // ➤ «d'el» and «d'els», which an older reading wrote for «de el», are «de el» first («Electricista d'el sector»).
  t = t.replace(/(?<![\p{L}'’])([Dd])['’](els?)(?![\p{L}'’])/gu, "$1e $2");
  // ➤ «d'» before a small consonant is «de» («Mecànic d'taller»); not before a capital, a letter said with a vowel
  // ➤ («d'R+D», «d'SGSI», «d'FP») or a name.
  t = t.replace(
    /(?<![\p{L}'’])([Dd])['’](?=[bcdfgjklmnpqrstvwxzç])/gu,
    (m, d: string) => `${d}e `,
  );
  // ➤ «el» before a vowel is «l'», after «a», «de» and «per» too («de el enginyer» → «de l'enginyer»).
  t = t.replace(
    new RegExp(`(?:^El|(?<![\\p{L}'’])el)\\s+${VOWEL_WORD}`, "gu"),
    (m) => (m[0] === "E" ? "L'" : "l'"),
  );
  // ➤ «a», «de», «per» before «el» and «els» are one word («per a el nostre» → «per al nostre», «de els» → «dels»).
  t = t.replace(
    /(?:^(A|De|Per)|(?<![\p{L}'’])(a|de|per))\s+(els?)(?![\p{L}'’])/gu,
    (m, first: string | undefined, w: string, el: string) =>
      cap(first || w, JOIN[(first || w).toLowerCase()][el]),
  );
  // ➤ «la» before a, e, o or a stressed í, ú is «l'» («de la empresa» → «de l'empresa»); not before an unstressed i, u
  // ➤ («la indústria», «la universitat»), nor a name with «H» («la Honda»).
  t = t.replace(
    new RegExp(
      `(?:^La|(?<![\\p{L}'’])la)\\s+(?=[aeoàèéòóíúAEOÀÈÉÒÓÍÚ]|h[aeoàèéòóú])`,
      "gu",
    ),
    (m) => (m[0] === "L" ? "L'" : "l'"),
  );
  // ➤ «de» before a silent «h» is «d'» («Tècnic de hidràulica» → «Tècnic d'hidràulica»).
  t = t.replace(
    new RegExp(`(?<![\\p{L}'’])([Dd])e\\s+(?=${SILENT_H})`, "gu"),
    "$1'",
  );
  // ➤ And «del», «al», «pel» before a vowel are «de l'», «a l'», «per l'» («del examen» → «de l'examen»).
  t = t.replace(
    new RegExp(
      `(?:^(Del|Al|Pel)|(?<![\\p{L}'’])(del|al|pel))\\s+${VOWEL_WORD}`,
      "gu",
    ),
    (m, first: string | undefined, w: string) =>
      cap(first || w, APART[(first || w).toLowerCase()]),
  );
  return t;
}

// ➤ «de» before a vowel is «d'» («Control de qualitat de obra civil»: the table's names come in after Firefox's «de»), but
// ➤ not before a semivowel followed by a vowel («de iode») nor a town's article («de El Vendrell»); an acronym said
// ➤ with a vowel takes it («d'IA», «d'iOS», «d'IoT»).
export const apostrophes = (text: unknown): string =>
  String(text || "").replace(
    /(?<![\p{L}'’])([Dd])e (?!Els?(?![\p{L}]))([aeiouàèéíòóú])(\p{L}?)/giu,
    (m, d: string, v: string, next: string) =>
      /^[iu]$/.test(v) && /^[aeiouàèéíòóú]$/.test(next)
        ? m
        : d + "'" + v + next,
  );

// ➤ A spelling step run on a text with the towns it names out of reach: their names are kept as written («Torrejón de
// ➤ Ardoz», «Mairena del Aljarafe», «El Ejido» did not become «Torrejón d'Ardoz» or «L'Ejido»: TB2-10). A town's first
// ➤ two letters stay in sight, so the «de» before it still takes its apostrophe («d'Alcalá de Henares»).
const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
export function besideTowns(
  text: unknown,
  towns: string[],
  step: (t: string) => string,
): string {
  let t = String(text || "");
  const kept: [string, string][] = [];
  for (const town of towns
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)) {
    // ➤ One letter of «Elche» or «Elda», which two would show as the article «El».
    const head = town.match(/^El(?!s?\s)(?=\p{L})/u)
        ? "E"
        : town.match(/^\p{L}{1,2}/u)?.[0] || "",
      mark = String.fromCharCode(0xe100 + kept.length);
    const next = t.replace(
      new RegExp(`(^|[^\\p{L}\\p{N}·])${esc(town)}(?![\\p{L}\\p{N}·])`, "gu"),
      (m, before) => before + head + mark,
    );
    if (next !== t) {
      kept.push([mark, town.slice(head.length)]);
      t = next;
    }
  }
  return kept.reduce(
    (out, [mark, rest]) => out.split(mark).join(rest),
    step(t),
  );
}
