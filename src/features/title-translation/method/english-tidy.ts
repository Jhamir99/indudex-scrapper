// The legacy's builder/mt/english-tidy.ts (JustJans/indudex@ec79858), copied (legacy resync T009): only its imports and data reads
// changed. Its own comments keep their marks.
import { translationData } from "../data.js";
// The English between the two legs, made easier for the second: (1) a dash after the job when the English
// keeps it in front of its field ("Maintenance technician – automatic closures"), so the next model does not
// take the last noun as the head; (2) capitals that only come from Title Case lowered ("Work planner –
// foundation technology"), so ordinary words are not read as names.
import { TRADES } from "./trades.js";
import { PERSON_JOB_EN } from "./method-tables.js";
const LEX = translationData<Record<string, [number, number]>>("case-en.json");
// ➤ Words after which the field is not a field: links, levels, places, gender markers.
const NOT_FIELD =
  /^(?:in|at|for|of|with|and|or|andor|into|the|to|as|from|on|by|near|via|m|f|d|w|x|h|senior|junior|lead|principal|i|ii|iii|iv|full|part|\d.*)$/i;
export function jobDashEn(t: string): string {
  if (/\s[–-]\s|:\s/.test(t.split(/[|(]/)[0]) && !/^\S+\s[–-]\s/.test(t)) {
    // ➤ Already a dash after the job part: nothing to add.
    const head = t
      .split(/\s[–-]\s|:\s/)[0]
      .trim()
      .split(/\s+/);
    if (PERSON_JOB_EN.test(head[head.length - 1])) return t;
  }
  const words = t.split(" ");
  for (let i = 0; i < words.length - 1; i++) {
    if (
      !PERSON_JOB_EN.test(words[i]) &&
      !PERSON_JOB_EN.test(String(words[i].split("-").pop()))
    )
      continue;
    // ➤ A job word in capitals is a name or part of a company ("ALLIANCE EXPERTS NORD OUEST").
    if (words[i].length > 3 && words[i] === words[i].toUpperCase()) continue;
    const next = words[i + 1];
    // ➤ Two jobs in a row ("Draughtsman designer", "Operator Programmer"): the dash would split the job.
    if (PERSON_JOB_EN.test(next.replace(/[^\p{L}]/gu, ""))) continue;
    // ➤ A gender marker is not a field ("planner m/f/d", "Technician (gn)").
    if (/^\(?(?:[mfwdhxj](?:[/|][mfwdhxj])+|gn)\)?$/i.test(next)) return t;
    // ➤ A job ending its part ("Software tester / Employee quality assurance"): the next part may need the dash.
    if (/^[/|]$/.test(next)) continue;
    if (
      !/^[\p{L}.]/u.test(next) ||
      NOT_FIELD.test(next.replace(/[^\p{L}\d]/gu, ""))
    )
      return t;
    // ➤ A field of one acronym or product ("Engineer IAM", "Welder MAG") reads well without it.
    const field = words
      .slice(i + 1)
      .join(" ")
      .split(/\s[–|-]\s|[|(,]/)[0]
      .trim()
      .split(/\s+/);
    if (
      field.length === 1 &&
      (field[0] === field[0].toUpperCase() || /[.\d]/.test(field[0]))
    )
      return t;
    // ➤ Nor a field that ends in a job: the first was a word of it ("Developer Relations Engineer", "Driver Software
    // ➤ Engineer").
    if (PERSON_JOB_EN.test(field[field.length - 1].replace(/[^\p{L}]/gu, "")))
      continue;
    // ➤ Nor a field all in capitals, a name ("… EXPERTS NORD OUEST").
    if (field.length > 1 && field.every((w: string) => w === w.toUpperCase()))
      return t;
    // ➤ Nor a lone participle, which belongs to the job ("Water and soil technician contaminated").
    if (field.length === 1 && /^\p{Ll}+ed$/u.test(field[0])) return t;
    if (i > 0 && /^(?:of|for)$/i.test(words[i - 1])) return t;
    return [...words.slice(0, i + 1), "–", ...words.slice(i + 1)].join(" ");
  }
  return t;
}
// ➤ How English titles write a word: in lowercase at least one time in twenty ("Assembly", "Technician"), or as a
// ➤ name, nearly always with its capital ("Java" 10 against 398). A word they never wrote is neither.
const writtenLower = (word: string): boolean => {
  const c = LEX[word.toLowerCase()];
  return Boolean(c) && c[0] >= 3 && c[0] >= c[1] / 20;
};
const writtenAsName = (word: string): boolean =>
  Boolean(LEX[word.toLowerCase()]) && !writtenLower(word);
// ➤ A title's first letter lowered to follow a word put in front ("Senior project manager"), unless its first word
// ➤ is a name: one the source title writes too ("Senior Java-ontwikkelaar"), or in English one English titles
// ➤ write with its capital ("Senior Java developer", "Junior Microsoft Dynamics consultant").
// ➤ The first words of the table's English trades, never names: titles open on them, so the lexicon mostly saw them
// ➤ with a capital («Experienced Plumber», «Junior Industrial maintenance technician»).
const TRADE_OPENERS = new Set(
  TRADES.map((e) => e.en.split(" ")[0]).filter((w) => /^\p{Ll}/u.test(w)),
);
export function lowerOpening(t: string, source = "", english = false): string {
  const first = t.match(/^\p{L}+/u)?.[0] || "";
  const name =
    !(english && TRADE_OPENERS.has(first.toLowerCase())) &&
    ((first &&
      new RegExp(`(?<![\\p{L}])${first}(?![\\p{L}])`, "u").test(source)) ||
      (english && writtenAsName(first)));
  return /^\p{Lu}\p{Ll}/u.test(t) && !name
    ? t[0].toLowerCase() + t.slice(1)
    : t;
}
export function sentenceCaseEn(t: string): string {
  let first = true;
  return t.replace(/[\p{L}][\p{L}'’-]*/gu, (w: string) => {
    if (first) {
      first = false;
      return w;
    }
    if (
      w.length < 2 ||
      w === w.toUpperCase() ||
      w.slice(1) !== w.slice(1).toLowerCase()
    )
      return w;
    return writtenLower(w) ? w.toLowerCase() : w;
  });
}
// ➤ The first leg's English made ready for the second: the levels it said in front off (passed on beside it, so the
// ➤ second leg says them its own way), "TIG-Welder" apart from its acronym, "wanted" out (the second leg reads it as
// ➤ loved: "querido", "volia"), then the dash after the job ('dash'), the Title Case capitals ('case') or both.
export function tidyEnglish(
  titles: string[],
  levels: string[] = [],
  mode = "dash",
): string[] {
  return titles.map((t, i) => {
    const lv = levels[i] || "";
    // ➤ After an emoji or a sign opening the title too («🔧 Senior Mechanic»): left there, the level was said twice.
    const lead = t.match(/^[^\p{L}\p{N}]*/u)?.[0] ?? "";
    if (lv && t.startsWith(lv + " ", lead.length))
      t =
        lead +
        t
          .slice(lead.length + lv.length + 1)
          .replace(/^\p{Ll}(?!\p{Ll}*\p{Lu})/u, (c: string) => c.toUpperCase());
    // ➤ Not a prefix in capitals («CO-Founder», «PRE-Sales»), and «wanted» only as a board writes it, opening the title
    // ➤ before a sign, closing it, or after the trade before a comma, «in» or a dash («Welders sought, Hamburg»): «Most wanted
    // ➤ welder» and «Wanted Poster Designer» keep it (TB2-05).
    t = t
      .replace(
        /\b(?!(?:CO|PRE|RE|NON|SUB|MULTI|SEMI|POST|ANTI|EX|PRO|INTER)-)(\p{Lu}{2,5})-(?=\p{Lu}\p{Ll})/gu,
        "$1 ",
      )
      .replace(/^(?:wanted|sought)\s*[:!–-]\s*/iu, "")
      .replace(/\s+(?:wanted|sought)\s*[!.]?$/iu, "")
      .replace(
        /(?<=\p{L})\s+(?:wanted|sought)(?=\s*,|\s+in\s|\s+[–-]\s)/giu,
        "",
      )
      .replace(/\s+([!.,])(?=\s|$)/g, "$1");
    if (mode !== "case") t = jobDashEn(t);
    if (mode !== "dash") t = sentenceCaseEn(t);
    return t;
  });
}
