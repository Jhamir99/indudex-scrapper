import { sameAddress } from "./advert-address.js";
import { decodeEntities } from "./entities.js";
import type { Posting } from "./layout.js";
import { pageText as text } from "./text.js";
import { DESCRIPTION_LIMIT } from "../schemas/advert.js";

// From the legacy's careers reader (builder/adapters/careers.ts), what a portal's reader needs too (job portals T004):
// a vacancy listed under several languages read once (`oneLanguage`), and the vacancy pages of hosted platforms with no
// JobPosting block (`platformPosting`). Copied; only the imports changed. The careers reader of 016 reuses them.
const DESCRIPTION = DESCRIPTION_LIMIT;
type Job = Posting;

// ➤ A vacancy a site publishes in several languages, its address differing only in a language part
// ➤ ("/de/job/…/1116413", "/en/job/…/1116413", "?lang=fr"), is read once: Rheinmetall lists its
// ➤ 1,425 vacancies in the four languages its robots.txt leaves open, and three pages in four went
// ➤ to a translation. So is one listed under two spellings of its address (sameAddress: «/jobs/1/» and
// ➤ «http://www.…/jobs/1»). The address kept is one read already, else one in the site's language, else
// ➤ the first listed.
const LANGUAGES = new Set(
  "ca eu gl de en fr it es nl pl cs sk hu ro pt pt_br pt-br zh zh_cn zh-cn lt lv et fi sv da no nn nb ru tr el bg hr sl sr uk ja ko ar".split(
    " ",
  ),
);
const LANG_QUERY = ["lang", "locale", "language", "hl"];
// ➤ A language with its country is one too ("/de-at/", "/cs-cz/", "/en_GB/"): Brunel's portal lists each vacancy under
// ➤ its German, Austrian, Swiss and Czech sites (1 November 2026).
const isLanguage = (part: string): boolean => {
  const p = part.toLowerCase();
  return (
    LANGUAGES.has(p) ||
    (/^[a-z]{2}[-_][a-z]{2}$/.test(p) && LANGUAGES.has(p.slice(0, 2)))
  );
};
function languageKey(url: string): { key: string; lang: string } {
  try {
    const u = new URL(`https://${sameAddress(url)}`);
    const lang =
      LANG_QUERY.map((q) => u.searchParams.get(q)).find(Boolean) ||
      u.pathname.split("/").find(isLanguage) ||
      "";
    for (const q of LANG_QUERY) u.searchParams.delete(q);
    return {
      key:
        u.host +
        u.pathname
          .split("/")
          .map((p) => (isLanguage(p) ? "*" : p))
          .join("/") +
        u.search,
      lang: lang.toLowerCase(),
    };
  } catch {
    return { key: url, lang: "" };
  }
}
// ➤ Between two kept the same way, a language of Europe's before one of Asia's: MetLife lists its European vacancies in
// ➤ Japanese too, whose titles the trades' gate cannot read.
const FAR_LANGUAGE = /^(?:ja|zh|ko|ar)(?:$|[-_])/;
export function oneLanguage<I extends { url: string }>(
  items: I[],
  pages: Record<string, { job?: unknown }> = {},
  lang = "",
): I[] {
  const best = new Map<string, { item: I; rank: number }>();
  for (const i of items) {
    const { key, lang: l } = languageKey(i.url);
    // ➤ Catalan, then Spanish, before the rest, the data's order of priority (LEC-19).
    const rank =
      (pages[i.url]?.job ? 8 : 0) +
      (lang && l.startsWith(lang) ? 4 : 0) +
      (/^ca/.test(l) ? 2 : /^es/.test(l) ? 1 : 0) +
      (FAR_LANGUAGE.test(l) ? 0 : 1);
    if (rank > (best.get(key)?.rank ?? -1)) best.set(key, { item: i, rank });
  }
  const keep = new Set([...best.values()].map((b) => b.item));
  return items.filter((i) => keep.has(i));
}

// ➤ The vacancy pages of hosted platforms that carry no JobPosting block, read by their own
// ➤ layout. Factorial (builder/tools/platforms.ts): the title in the page's heading, then the
// ➤ way of working and the place in brackets ("Mixto (CABA, Buenos Aires, Argentina)"). CATS
// ➤ (catsone.com, agencies' careers pages): the title in the heading, the place first in its tags
// ➤ (<ul class="job-tags"><li>Heidelberg, BW</li>).
// ➤ A Softy page's data, as far as it is read.
type Softy = {
  offer?: {
    title?: string;
    locations?: { city?: string; country?: string }[];
    description_html?: string;
    searched_profile_html?: string;
  };
  company?: { social_reason?: string };
};
const FACTORIAL_MODES: Record<string, string> = {
  remoto: "remote",
  remote: "remote",
  mixto: "hybrid",
  hybrid: "hybrid",
  híbrido: "hybrid",
  presencial: "onsite",
  "on-site": "onsite",
  onsite: "onsite",
};
// ➤ A Softy careers site (French employers): on softy.pro, or on the employer's domain with Softy's
// ➤ files (sc.softy.pro) or the templates its page data names ("templates/main/offers").
export function isSofty(url: string, html: unknown = ""): boolean {
  try {
    if (new URL(url).hostname.endsWith(".softy.pro")) return true;
  } catch {
    return false;
  }
  return /\/\/sc\.softy\.pro\/|"component":"templates\\?\/main\\?\/offers?"/.test(
    String(html || ""),
  );
}
export function platformPosting(html: unknown, url: string): Job | null {
  let host;
  try {
    host = new URL(url).hostname;
  } catch {
    return null;
  }
  const s = String(html || "");
  const cats = host.endsWith(".catsone.com");
  const talentsoft = host.endsWith(".talent-soft.com");
  const bizneo = s.includes("assets.bizneo.com");
  // ➤ Softy: the offer, its place and its texts in the page's data (Inertia's <script data-page="app">), no block.
  if (isSofty(url, s)) {
    let data: Softy | undefined;
    try {
      data = (
        JSON.parse(
          (s.match(/<script[^>]*data-page="app"[^>]*>([\s\S]*?)<\/script>/) ||
            [])[1] ?? "",
        ) as {
          props?: Softy;
        }
      ).props;
    } catch {
      return null;
    }
    const o = data?.offer,
      at = o?.locations?.[0] || {};
    if (!o?.title) return null;
    return {
      title: String(o.title).trim(),
      company: String(data?.company?.social_reason || "").trim(),
      location: [at.city, at.country].filter(Boolean).join(", "),
      country: "",
      url,
      description: text(
        [o.description_html, o.searched_profile_html]
          .filter(Boolean)
          .join("\n"),
      ).slice(0, DESCRIPTION),
      posted: "",
      expires: "",
      remote: false,
      mode: "",
      modeTag: "",
      pay: null,
    };
  }
  if (!host.endsWith(".factorialhr.com") && !cats && !talentsoft && !bizneo)
    return null;
  const title = decodeEntities(
    (s.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]?.replace(
      /<[^>]+>/g,
      " ",
    ) || "",
  )
    .replace(/\s+/g, " ")
    .trim();
  if (!title) return null;
  // ➤ Bizneo on the employer's own domain (jobs.izertis.com, jobs.experienceis.com): no JobPosting
  // ➤ block, each field a box named in its title attribute (<div title="Ubicación">…<span>Madrid</span>).
  if (bizneo) {
    const field = (names: string): string =>
      [
        ...(
          s.match(
            new RegExp(
              `title="(?:${names})"[^>]*>[\\s\\S]*?<div[^>]*>([\\s\\S]*?)</div>`,
              "i",
            ),
          )?.[1] || ""
        ).matchAll(/<span[^>]*>([^<]*)<\/span>/g),
      ]
        .map((m) => decodeEntities(m[1]).trim())
        .filter(Boolean)
        .join(" / ");
    const mode =
      FACTORIAL_MODES[
        field("Modalidad de trabajo|Modalitat de treball|Work modality")
          .toLowerCase()
          .split(/[\s/]+/)
          .find((w) => FACTORIAL_MODES[w]) ?? ""
      ] || "";
    const body = s.replace(
      /<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi,
      " ",
    );
    return {
      title,
      company: "",
      location: field("Ubicación|Ubicació|Location|Localização"),
      country: "",
      url,
      description: text(body.slice(body.search(/<h1[^>]*>/i))).slice(
        0,
        DESCRIPTION,
      ),
      posted: "",
      expires: "",
      remote: mode === "remote",
      mode,
      modeTag: "",
      pay: null,
    };
  }
  // ➤ Talentsoft: the offer's details in one block, each field's name and value in elements of their
  // ➤ own ("Localisation | France, Nouvelle Aquitaine, 33 - Mérignac"), no colon between them.
  if (talentsoft) {
    const body = s.replace(
      /<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi,
      " ",
    );
    const at = body.indexOf("contenu-ficheoffre"),
      from = at < 0 ? 0 : body.indexOf(">", at) + 1;
    const fields = decodeEntities(body.slice(from).replace(/<[^>]+>/g, " | "))
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .replace(/(?:\|\s*)+/g, "| ");
    const field = (names: string): string =>
      (fields.match(
        new RegExp(`\\|\\s*(?:${names})\\s*\\|\\s*([^|]{2,160}?)\\s*\\|`, "i"),
      ) || [])[1] || "";
    const place = field(
      "Localisation du poste|Localisation|Location|Lieu de travail|Arbeitsort|Ubicación",
    );
    // ➤ The employer and the first day it was shown, where the site names them (Choisir le service
    // ➤ public: "Organisme de rattachement", "Date de début de diffusion | 08/10/2026").
    const company = field(
      "Organisme de rattachement|Entité de rattachement|Employeur",
    ).trim();
    const shown = field(
      "Date de début de diffusion|Date de parution|Date de publication",
    ).match(/(\d{2})\/(\d{2})\/(\d{4})/);
    return {
      title,
      company,
      location: place,
      country: "",
      url,
      description: text(body.slice(from)).slice(0, DESCRIPTION),
      posted: shown ? `${shown[3]}-${shown[2]}-${shown[1]}` : "",
      expires: "",
      remote: false,
      mode: "",
      modeTag: "",
      pay: null,
    };
  }
  if (cats) {
    const place = decodeEntities(
      (s.match(/<ul class="job-tags">\s*<li>([^<]*)<\/li>/i) || [])[1] || "",
    ).trim();
    const body = s.replace(
      /<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi,
      " ",
    );
    const start = body.search(/<h1[^>]*>/i);
    return {
      title,
      company: "",
      location: place,
      country: "",
      url,
      description: text(body.slice(start)).slice(0, DESCRIPTION),
      posted: "",
      expires: "",
      remote: /\bremote\b/i.test(place),
      mode: "",
      modeTag: "",
      pay: null,
    };
  }
  const m = s.match(
    /<span class='inline-block align-middle mr-2 ml-2'>\s*([^<(]*?)\s*\(([^)<]+)\)\s*<\/span>/i,
  );
  const mode =
    FACTORIAL_MODES[
      String(m?.[1] || "")
        .trim()
        .toLowerCase()
    ] || "";
  const body = s.replace(
    /<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi,
    " ",
  );
  const start = body.search(/<h1[^>]*>/i);
  return {
    title,
    company: "",
    location: decodeEntities(m?.[2] || "").trim(),
    country: "",
    url,
    description: text(body.slice(start)).slice(0, DESCRIPTION),
    posted: "",
    expires: "",
    remote: mode === "remote",
    mode,
    modeTag: "",
    pay: null,
  };
}
