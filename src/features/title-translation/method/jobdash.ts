// Legacy builder/mt/jobdash.mjs (JustJans/indudex@b0cd182), word for word but for types, lint and paths.
import { jobDashFr } from "./jobdash-fr.js";
// German and Dutch titles name the job first and its field after, with nothing between
// ("Entwicklungsingenieur Maschinensicherheit"). In English that becomes a stack of nouns whose last
// noun reads as the head ("Development Engineer Machine Safety"), and the second leg translates the
// field as the job. A dash after the job keeps them apart: "Entwicklungsingenieur – Maschinensicherheit".
const STOP: Readonly<Record<string, ReadonlySet<string>>> = {
  de: new Set(
    "in im am an bei für mit als und oder zur zum der die das des dem den ab auf aus von vom nach bis gesucht ist sind wir of for at with and or the to as".split(
      " ",
    ),
  ),
  nl: new Set(
    "in bij voor met als en of de het een van op te naar aan per gezocht wij for at with and or the to as".split(
      " ",
    ),
  ),
};
const LEVEL =
  /^(?:senior|junior|medior|lead|leitende[rn]?|erste[rn]?|eerste|allround|all-round)$/i;
const AGENT: Readonly<Record<string, RegExp>> = {
  de: /(?:er|eur|ist|iker|ant|ent|or|mann|frau|kraft|meister|ingenieur|architekt|manager|berater|spezialist)$/iu,
  nl: /(?:er|eur|ist|ant|ent|or|man|medewerker|adviseur|specialist|technicus|monteur|leider|beheerder|inkoper|ontwikkelaar|engineer|manager|consultant|tekenaar|planner)$/iu,
};
export function jobDash(title: string, lang: string) {
  if (lang === "fr") return jobDashFr(title);
  if (!AGENT[lang]) return title;
  // Each part of a title of several jobs ("Softwaretester / Mitarbeiter Qualitätssicherung").
  const bits = title.split(/(\s+\/\s+|\s*\|\s*)/u);
  return bits.map((b, k: number) => (k % 2 ? b : dashOne(b, lang))).join("");
}
function dashOne(title: string, lang: string) {
  // "Leiter Elektrowerkstatt" is the head of a workshop: the word alone reads as a conductor
  // or a ladder ("Stellvertretender Leiter – Werkzeugbau" → "Deputy ladder").
  if (lang === "de" && /^(?:\S+\s+)?Leiter(?:in)?\s/.test(title)) return title;
  const m = title.match(/^(\S+)(?:\s+(\S+))?(?:\s+(\S+))?/u);
  if (!m) return title;
  // The job: the first word, or the second after a level ("Senior Monteur").
  const [w1, w2, w3] = [m[1], m[2], m[3]];
  let job, next;
  // A German adjective ending in -er is not a job but goes with it, like a level: "Regionaler Monteur".
  const adjective =
    lang === "de" &&
    /(?:isch|lich|al|il|iv|ell|är|end|ig|bar|erst|zweit|dritt)er$/i.test(w1);
  if ((LEVEL.test(w1) || adjective) && w2) {
    job = `${w1} ${w2}`;
    next = w3;
    if (STOP[lang].has(w2.toLowerCase()) || !AGENT[lang].test(w2)) return title;
  } else {
    job = w1;
    next = w2;
    if (!AGENT[lang].test(w1)) return title;
  }
  // "en/of", "und/oder" read as their first word.
  if (
    !next ||
    !/^\p{L}/u.test(next) ||
    STOP[lang].has(next.toLowerCase().split("/")[0])
  )
    return title;
  // Nor before a gender mark ("m/w/d"), nor between two jobs ("Fachkraft Diagnosetechniker").
  if (
    /^[mwdfhxv]\/[mwdfhxv]/i.test(next) ||
    AGENT[lang].test(next.replace(/[^\p{L}]+$/u, ""))
  )
    return title;
  // Words written in capitals, acronyms and the like are left as they are.
  if (job === job.toUpperCase()) return title;
  return job + " – " + title.slice(job.length).trimStart();
}
