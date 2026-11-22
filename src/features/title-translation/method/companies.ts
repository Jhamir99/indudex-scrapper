// Legacy builder/mt/companies.ts (JustJans/indudex@b0cd182), word for word but for lint and paths.
// The offer's company where its title names it ("Kfz-Mechatroniker bei Auto Röhr", "Hulp monteur – De Groot
// Elektrotechniek"): kept in every language as the title writes it, like the town. A company field that holds a
// job or a field instead ("Servicetechniker", "Aufzugstechnik") is no name: the titles of many other companies
// hold the same words, or it is the whole title.

// Legal forms closing the company field, left out to find the name in the title.
// After a space or a comma: «Lufthansa» is no «Lufthan» with an «SA» (TB2-07).
const LEGAL =
  /[\s,]+(?:gmbh\s*&\s*co\.?\s*kg|gmbh|mbh|ag|kg|ohg|se|gbr|e\.\s?k\.|e\.\s?v\.|s\.?\s?l\.?\s?u\.?|s\.?\s?l\.?|s\.?\s?a\.?\s?u\.?|s\.?\s?a\.?|sas|sasu|sarl|s\.?à\s?r\.?l\.?|b\.?\s?v\.?|n\.?\s?v\.?|bvba|vzw|ltd\.?|limited|inc\.?|llc|s\.?p\.?a\.?|s\.?r\.?l\.?|& co\.?|cie)\s*$/iu;
// Those the title writes right after the name, kept with it ("Wien Energie GmbH", "GOB Software & Systeme GmbH & Co. KG").
const FORM = String.raw`(?:GmbH\s*&\s*Co\.?\s*KG(?:aA)?|GmbH|mbH|AG|KG|OHG|SE|GbR|e\.\s?K\.|e\.\s?V\.|S\.?L\.?U\.?|S\.L\.|SL|S\.A\.U\.|S\.A\.|SA|SAS|SASU|SARL|B\.V\.|BV|N\.V\.|NV|BVBA|VZW|Ltd\.?|Inc\.?|LLC|S\.p\.A\.|S\.r\.l\.)`;
// As the forms are written, capitals and all: «Roca se necesita» is no «Roca SE» (TB2-08).
const FORM_AFTER = new RegExp(
  String.raw`^(?:,?\s+` + FORM + String.raw`(?![\p{L}\p{N}]))+`,
  "u",
);
// Words the titles of this many other companies hold are a job or a field, not a name (measured on the 1,920
// companies named in their own titles: the jobs put in the field in 5 or more, the real names in 0 to 3).
export const COMMON = 5;

// Each letter without its accent and in small letters, one for one, so a place in the folded text is the
// same place in the text; a hyphen as a space (the English given to the second leg writes "TV Insight" for
// "TV-Insight").
const fold = (t: string) =>
  [...t]
    .map((c) => {
      if (c === "-") return " ";
      const d = c.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
      return d.length === 1 ? d : c;
    })
    .join("");
const glued = (c: string | undefined) => /[\p{L}\p{N}]/u.test(c || "");
const letters = (t: string) => (t.match(/[\p{L}\p{N}]/gu) || []).length;

export const companyCore = (field: unknown): string => {
  let x = String(field || "")
    .replace(/\s+/g, " ")
    .trim();
  for (let i = 0; i < 3; i++) x = x.replace(LEGAL, "").trim();
  return x;
};

// Where the folded name stands in the text as words of its own: [start, end], or null.
function findFolded(text: string, name: string): [number, number] | null {
  const ft = fold(text),
    fn = fold(name);
  if (!fn) return null;
  for (let i = ft.indexOf(fn); i >= 0; i = ft.indexOf(fn, i + 1))
    if (!glued(ft[i - 1]) && !glued(ft[i + fn.length]))
      return [i, i + fn.length];
  // With a dash put between its words by a step on the way ("ALLIANCE EXPERTS – NORD OUEST").
  const re = new RegExp(
    fn
      .split(" ")
      .filter(Boolean)
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("\\s+(?:[–|]\\s+)?"),
    "gu",
  );
  for (const m of ft.matchAll(re))
    if (!glued(ft[m.index - 1]) && !glued(ft[m.index + m[0].length]))
      return [m.index, m.index + m[0].length];
  return null;
}

// The part of the title that names the company, as written, with the legal form after it; '' when the title
// does not name it or the field holds no name. others: how many other companies' titles hold the name's words.
export function companySpan(
  title: unknown,
  company: unknown,
  others = 0,
): string {
  const core = companyCore(company),
    t = String(title || "");
  if (core.length < 3 || others >= COMMON) return "";
  const at = findFolded(t, core);
  if (!at) return "";
  const legal = t.slice(at[1]).match(FORM_AFTER);
  const span = t.slice(at[0], at[1] + (legal ? legal[0].length : 0));
  return letters(span) >= 0.8 * letters(t) ? "" : span;
}

// The name written back as the title writes it where the text has it in other capitals or accents.
export function companyBack(text: unknown, span: string): string {
  const t = String(text || "");
  if (!span || t.includes(span)) return t;
  const at = findFolded(t, span);
  return at ? t.slice(0, at[0]) + span + t.slice(at[1]) : t;
}

// The name taken out of the text for a mark that no step touches, and the text with the name back.
export const MARK = "\uE000";
export function hideCompany(text: unknown, span: string): string {
  const t = String(text || "");
  if (!span) return t;
  if (t.includes(span)) return t.split(span).join(MARK);
  const at = findFolded(t, span);
  return at ? t.slice(0, at[0]) + MARK + t.slice(at[1]) : t;
}
export const showCompany = (text: string, span: string): string =>
  span ? String(text).split(MARK).join(span) : text;
