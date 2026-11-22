// Legacy builder/mt/english-tidy.ts (JustJans/indudex@b0cd182), word for word but for types, lint and paths.
// The English between the two legs, made easier for the second: (1) a dash after the job when the English
// keeps it in front of its field ("Maintenance technician – automatic closures"), so the next model does not
// take the last noun as the head; (2) capitals that only come from Title Case lowered ("Work planner –
// foundation technology"), so ordinary words are not read as names.
import { translationData } from "../data.js";
const LEX = translationData<Record<string, [number, number]>>("case-en.json");
const JOB =
  /^(?:engineer|technician|agent|mechanic|fitter|electrician|manager|supervisor|planner|analyst|developer|architect|operator|worker|employee|specialist|consultant|designer|draughtsman|draftsman|welder|installer|programmer|coordinator|inspector|foreman|assistant|director|officer|administrator|scientist|estimator|surveyor|buyer|controller|advisor|adviser|expert|tester|trainee|apprentice|electromechanic|machinist|plumber|carpenter|joiner|painter|driver|preparer|setter|draughtsperson|tradesperson|craftsman|repairer|assembler|rigger|scaffolder|bricklayer|roofer|turner|miller|leader)s?$/i;
// Words after which the field is not a field: links, levels, places, gender markers.
const NOT_FIELD =
  /^(?:in|at|for|of|with|and|or|andor|into|the|to|as|from|on|by|near|via|m|f|d|w|x|h|senior|junior|lead|principal|i|ii|iii|iv|full|part|\d.*)$/i;
export function jobDashEn(t: string): string {
  if (/\s[–-]\s|:\s/.test(t.split(/[|(]/)[0]) && !/^\S+\s[–-]\s/.test(t)) {
    // Already a dash after the job part: nothing to add.
    const head = t
      .split(/\s[–-]\s|:\s/)[0]
      .trim()
      .split(/\s+/);
    if (JOB.test(head[head.length - 1])) return t;
  }
  const words = t.split(" ");
  for (let i = 0; i < words.length - 1; i++) {
    if (!JOB.test(words[i]) && !JOB.test(String(words[i].split("-").pop())))
      continue;
    // A job word in capitals is a name or part of a company ("ALLIANCE EXPERTS NORD OUEST").
    if (words[i].length > 3 && words[i] === words[i].toUpperCase()) continue;
    const next = words[i + 1];
    // Two jobs in a row ("Draughtsman designer", "Operator Programmer"): the dash would split the job.
    if (JOB.test(next.replace(/[^\p{L}]/gu, ""))) continue;
    // A gender marker is not a field ("planner m/f/d", "Technician (gn)").
    if (/^\(?(?:[mfwdhxj](?:[/|][mfwdhxj])+|gn)\)?$/i.test(next)) return t;
    // A job ending its part ("Software tester / Employee quality assurance"): the next part may need the dash.
    if (/^[/|]$/.test(next)) continue;
    if (
      !/^[\p{L}.]/u.test(next) ||
      NOT_FIELD.test(next.replace(/[^\p{L}\d]/gu, ""))
    )
      return t;
    // A field of one acronym or product ("Engineer IAM", "Welder MAG") reads well without it.
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
    // Nor a field all in capitals, a name ("… EXPERTS NORD OUEST").
    if (field.length > 1 && field.every((w: string) => w === w.toUpperCase()))
      return t;
    // Nor a lone participle, which belongs to the job ("Water and soil technician contaminated").
    if (field.length === 1 && /^\p{Ll}+ed$/u.test(field[0])) return t;
    if (i > 0 && /^(?:of|for)$/i.test(words[i - 1])) return t;
    return [...words.slice(0, i + 1), "–", ...words.slice(i + 1)].join(" ");
  }
  return t;
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
    const c = LEX[w.toLowerCase()];
    // Lowered only where English titles write it in lowercase at least one time in twenty ("Assembly",
    // "Technician"), not a name seen lowercase by chance ("Java" 10 against 398).
    return c && c[0] >= 3 && c[0] >= c[1] / 20 ? w.toLowerCase() : w;
  });
}
// The first leg's English made ready for the second: the levels it said in front off (passed on beside it, so the
// second leg says them its own way), "TIG-Welder" apart from its acronym, "wanted" out (the second leg reads it as
// loved: "querido", "volia"), then the dash after the job ('dash'), the Title Case capitals ('case') or both.
export function tidyEnglish(
  titles: string[],
  levels: string[] = [],
  mode = "dash",
): string[] {
  return titles.map((t, i) => {
    const lv = levels[i] || "";
    if (lv && t.startsWith(lv + " "))
      t = t
        .slice(lv.length + 1)
        .replace(/^\p{Ll}(?!\p{Ll}*\p{Lu})/u, (c: string) => c.toUpperCase());
    // Not a prefix in capitals («CO-Founder», «PRE-Sales»), and «wanted» only as a board writes it, opening the title
    // before a sign, closing it, or after the trade before a comma, «in» or a dash («Welders sought, Hamburg»): «Most wanted
    // welder» and «Wanted Poster Designer» keep it (TB2-05).
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
