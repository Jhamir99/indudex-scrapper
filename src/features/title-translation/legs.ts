// Legacy builder/mt/legs.ts (JustJans/indudex@ec79858, legacy resync T009), word for word but for types, lint and paths.
// A title through the method (builder/mt/method.mjs) and Firefox's models (builder/mt/engine.mjs). Every direction
// goes through English, the only language Firefox's models pair with: the first leg into English, the English made
// ready for the second (english-tidy.ts), the second leg into each language of the site. Each leg asks Firefox up to
// five times: the title as the method wrote it, its dash version where it differs, the title without the trades
// written in (and its dash version), and the titles that lost a name again with that name behind a stand-in.
import {
  beforeStep,
  chooseStep,
  tradesStep,
  namesStep,
  afterStep,
  polishStep,
  NAMES,
} from "./method/method.js";
import { tidyEnglish } from "./method/english-tidy.js";
import { type EngineSettings, translate } from "./engine.js";
import {
  type AinaJob,
  type AinaTranslator,
  ainaHere,
  aina,
  catalan,
  writtenInSpanish,
  keptWords,
} from "./aina.js";
import { companySpan } from "./method/companies.js";
import { contractsNamed, namesContract } from "./method/contracts.js";
import { correct } from "./method/corrections.js";
import { spellings } from "./method/method-tables.js";
import { calmTitle, shouting } from "../../shared/kit/calm-titles.js";
import { placesIn } from "./method/places.js";

const differs = (a: readonly string[], b: readonly string[]) =>
  a.some((x, i) => x !== b[i]);

// The engine's settings, or a translate of its own and an Aina of its own or none (tests).
export interface Engine extends EngineSettings {
  readonly translate?: (
    pair: string,
    texts: readonly string[],
    engine: Engine,
  ) => Promise<string[]>;
  readonly aina?: AinaTranslator | null;
}

// What a leg reads beside each title.
export interface Beside {
  readonly cities?: readonly string[];
  readonly firms?: readonly string[];
  readonly levels?: readonly string[];
  readonly sources?: readonly string[];
}

// One leg ("de-en", "en-es") over a list of titles. Beside each: its offer's town (cities), its company with how
// many other companies' titles hold its words (firms, "company<TAB>count"), and in the second leg the levels the
// first took out and the title it came from (sources). `engine`: the engine's settings, or a translate of its own
// (tests). Answers the translations and the levels each said.
export async function leg(
  pair: string,
  titles: readonly string[],
  { cities = [], firms = [], levels = [], sources = [] }: Beside = {},
  engine: Engine = {},
) {
  const ff = (texts: readonly string[]) =>
    engine.translate
      ? engine.translate(pair, texts, engine)
      : translate(pair, texts, engine);
  const b = beforeStep(pair, [...titles], {
    cities: [...cities],
    levels: [...levels],
    sources: [...sources],
    firms: [...firms],
  });
  let text = b.text,
    raw = await ff(text);
  if (differs(b.dash, text))
    ({ text, raw } = chooseStep(text, b.dash, raw, await ff(b.dash)));
  if (differs(b.bare, b.dash) || differs(b.bare, text)) {
    const bareRaw = await ff(b.bare);
    const bareDashRaw = differs(b.bare, b.bareDash)
      ? await ff(b.bareDash)
      : null;
    ({ text, raw } = tradesStep(text, raw, b.info, {
      dash: b.dash,
      bare: b.bare,
      bareDash: b.bareDash,
      bareRaw,
      bareDashRaw,
    }));
  }
  const names = namesStep(pair, text, raw, b.info);
  const raw2 = names.again.length
    ? await ff(names.again.map((a) => a.text))
    : [];
  return afterStep(pair, [...titles], names.raw, b.info, raw2, names.again);
}

// Titles of one language into the site's languages. English titles go straight to the second leg; the others
// through the first, whose English (polished) is the site's English. `into`: the languages wanted, the source's
// own left out. Answers { lang: translations } in the order of the titles.
export async function translateTitles(
  source: string,
  titles: readonly string[],
  {
    cities = [],
    firms = [],
    into = ["en", "es", "ca", "fr", "nl", "de"],
  }: {
    cities?: readonly string[];
    firms?: readonly string[];
    into?: readonly string[];
  } = {},
  engine: Engine = {},
): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  const targets = into.filter((t) => t !== source && t !== "en");
  if (source === "en") {
    const named = titles.map((t) => contractsNamed(t, false));
    for (const t of targets)
      out[t] = (await leg(`en-${t}`, named, { cities, firms }, engine)).out;
    return out;
  }
  const first = await leg(`${source}-en`, titles, { cities, firms }, engine);
  const named = first.out.map((o) => contractsNamed(o, source === "fr"));
  if (into.includes("en")) out["en"] = polishStep(`${source}-en`, named);
  const english = tidyEnglish(named, first.levels, "dash");
  for (const t of targets)
    out[t] = (
      await leg(
        `en-${t}`,
        english,
        { cities, firms, levels: first.levels, sources: titles },
        engine,
      )
    ).out;
  if (source === "es" && out["ca"])
    fromSpanish(titles, first.out, out["ca"], { cities, firms }, engine);
  return out;
}

// Catalan straight from Spanish, with Aina's model (builder/mt/aina.mjs), for each title written in Spanish whose Catalan
// comes back whole; the rest keep the route through English, and all of them when the model is not on this machine or
// its worker fails. `engine.aina`: a translator of its own (tests), or null for none.
function fromSpanish(
  titles: readonly string[],
  english: readonly string[],
  ca: string[],
  { cities = [], firms = [] }: Beside,
  engine: Engine,
) {
  const translator =
    engine.aina !== undefined ? engine.aina : ainaHere() ? aina : null;
  if (!translator) return;
  const jobs: (AinaJob & { i: number })[] = [];
  titles.forEach((title, i) => {
    if (
      !title ||
      namesContract(title) ||
      !writtenInSpanish(title, english[i] || "")
    )
      return;
    const text = shouting(title) ? calmTitle(title, spellings) : title;
    const [company, others] = String(firms[i] || "").split("\t");
    jobs.push({
      i,
      text,
      keep: [
        companySpan(text, company || "", Number(others) || 0),
        ...NAMES.filter((n) => text.includes(n)),
      ],
      towns: [...placesIn(text), cities[i]].filter((town): town is string =>
        Boolean(town),
      ),
      words: keptWords(text),
      route: ca[i] || "",
    });
  });
  if (!jobs.length) return;
  let outs;
  try {
    outs = catalan(jobs, translator);
  } catch (e) {
    console.error(
      `Aina: ${(e as Error).message}; the route through English kept`,
    );
    return;
  }
  jobs.forEach((j, k) => {
    const out = outs[k];
    if (out !== null && out !== undefined) ca[j.i] = correct(j.text, out, "ca");
  });
}
