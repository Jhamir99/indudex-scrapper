import { writtenDay as day } from "../../shared/kit/dates.js";
import { decodeEntities } from "../../shared/kit/entities.js";
import { guessPosting, type Posting } from "../../shared/kit/layout.js";
import { pageText as boardText } from "../../shared/kit/text.js";

// The portals with a reader of their own, from the legacy's builder/adapters/portals.ts, copied (job portals T006): the
// facts some show beside their block (PAGE_FACTS) and the pages some lay out with no JobPosting block (PAGE_LAYOUTS).
// Only the imports changed; their comments keep their marks.
export type PortalJob = Partial<Posting>;

// ➤ The facts some portals show beside their block, outside it: Free-Work's «Le poste» box, an icon before each line
// ➤ («45k-55k €⁄an, 450-580 €⁄j», «2 à 5 ans d’expérience», «Télétravail partiel»). Written into the advert's text with the
// ➤ label each one stands for, so the pay, the years and the mode are read as from a labelled line (the text corpus,
// ➤ 1 November 2026: 10 of 25 pages had years only there). A portal with such facts reads its pages again once (version 4).
export const PAGE_FACTS: Record<string, (html: unknown) => string[]> = {
  "www.free-work.com": (html) =>
    [
      ...String(html || "").matchAll(
        /class="w-full text-sm line-clamp-2"[^>]*>([^<]{2,120})</g,
      ),
    ]
      .map((m) => clean(m[1]).replace(/⁄/g, "/"))
      .flatMap((line) =>
        /ans d.exp[ée]rience/i.test(line)
          ? [`Expérience : ${line}`]
          : /€|k€|\bk\b/i.test(line) && /\d/.test(line)
            ? [`Rémunération : ${line}`]
            : /t[ée]l[ée]travail/i.test(line)
              ? [
                  `Télétravail : ${line.replace(/^t[ée]l[ée]travail\s*/i, "") || "oui"}`,
                ]
              : [],
      ),
  // ➤ myjob.ch's sidebar under the title: the place, then the kind and the share of a week («Festanstellung 100%»), found on
  // ➤ 22 of 25 corpus pages and in none of their texts.
  "www.myjob.ch": (html) => {
    const info =
      String(html || "").match(
        /class="vacancy-details-sidebar__info"[^>]*>([\s\S]{0,800}?)<\/ul>/,
      )?.[1] || "";
    return [...info.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)]
      .map((m) =>
        clean(m[1].replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " ")),
      )
      .flatMap((line) => {
        const kind = line.match(
          /^(Festanstellung|Befristet|Praktikum|Lehrstelle|Freelance)(?![\p{L}])/iu,
        )?.[1];
        const share = line.match(/(\d{1,3}(?:\s*-\s*\d{1,3})?)\s*%/)?.[1];
        return [
          ...(kind ? [`Anstellungsart : ${kind}`] : []),
          ...(share ? [`Pensum : ${share.replace(/\s+/g, "")}%`] : []),
        ];
      });
  },
};

// ➤ Portals with no JobPosting block but a layout of their own, read by it. Werken bij de Overheid
// ➤ (the Dutch government's vacancies, CC0): the title in its heading, the employer in the link
// ➤ under it, the place first among the header's items, the text in its article sections; the day
// ➤ as the layout reader reads it.
const clean = (t: string | undefined): string =>
  decodeEntities(t || "")
    .replace(/\s+/g, " ")
    .trim();
export const PAGE_LAYOUTS: Record<
  string,
  (html: unknown, url: string) => PortalJob | null
> = {
  "www.werkenbijdeoverheid.nl": (html, url) => {
    const s = String(html || "");
    const title = clean(
      (s.match(/class="job-header__header"[^>]*>([^<]+)/) || [])[1],
    );
    if (!title) return null;
    const at = s.indexOf(">", s.indexOf("job-header__items")) + 1;
    const items =
      at > 0
        ? s
            .slice(at, at + 3000)
            .replace(/<(script|svg)[\s\S]*?<\/\1>/gi, " ")
            .split(/<[^>]+>/)
            .map(clean)
        : [];
    const base: PortalJob =
      guessPosting(html, url, Date.now(), { known: true }) || {};
    const from = s.indexOf('class="s-article-content"'),
      to = s.indexOf("job-contact-person", from);
    const body =
      from < 0
        ? base.description || ""
        : clean(
            s
              .slice(from, to > from ? to : from + 20000)
              .replace(/<(script|style|svg)[\s\S]*?<\/\1>/gi, " ")
              .replace(/<[^>]+>/g, " ")
              .replace(/^[^>]*>/, ""),
          );
    return {
      ...base,
      title,
      company: clean(
        (s.match(/class="job-header__title__link"[^>]*>([^<]+)/) || [])[1],
      ),
      location: items.find((t) => /\p{L}{2}/u.test(t)) || "",
      country: "nl",
      description: body,
    };
  },
  // ➤ The CNRS's job portal: each field under a small heading ("Lieu de Travail": "92190 MEUDON"), the
  // ➤ missions as the text, the CNRS as the employer.
  "emploi.cnrs.fr": (html, url) => {
    const s = String(html || "");
    const title = clean((s.match(/<h1>([^<]+)<\/h1>/) || [])[1]);
    if (!title) return null;
    const town = clean(
      (s.match(/>Lieu de Travail<\/h3>\s*<p>([^<]+)/i) || [])[1],
    )
      .replace(/^\d{5}\s+/, "")
      .toLowerCase()
      .replace(/(^|[\s'-])\p{L}/gu, (c) => c.toUpperCase());
    const from = s.indexOf("Les Missions</h3>"),
      to = s.indexOf("<h2>Votre Profil", from);
    const text =
      from < 0
        ? ""
        : clean(
            s
              .slice(from + 17, to > from ? to : from + 5000)
              .replace(/<[^>]+>/g, " "),
          );
    return {
      ...(guessPosting(html, url, Date.now(), { known: true }) || {}),
      title,
      company: "CNRS",
      location: town,
      country: "fr",
      description: text,
    };
  },
  // ➤ Ago (a Belgian temping agency; its pages carry a WebSite block, no JobPosting): the title in its job_title, the place
  // ➤ beside the pin («Oevel, BE»), the contract and the hours beside the contract icons («Vaste job», «Dag - Voltijds»), the
  // ➤ day it went online, the text from its first section to the apply button. Read before by its meta description, its
  // ➤ 2,018 cards held one line (the offers' diary, 1 November 2026).
  "www.ago.jobs": (html, url) => {
    const s = String(html || "");
    const title = clean(
      (s.match(/itemprop="job_title">([^<]+)<\/span><\/h2>/) || [])[1],
    );
    if (!title) return null;
    const place = s.match(
      /icon-pin"><\/i>([^<]*)<span itemprop="job_region">([^<]*)<\/span>/,
    );
    const kinds = [...s.matchAll(/icon-contract"><\/i>\s*([^<]+)</g)]
      .map((m) => clean(m[1]))
      .filter(Boolean);
    const from = s.indexOf('<div class="job-detail-subtitle'),
      to = s.indexOf('<p id="apply-now"', from);
    return {
      ...(guessPosting(html, url, Date.now(), { known: true }) || {}),
      title,
      company: "",
      location: place ? clean(`${place[1]} ${place[2]}`) : "",
      country: "be",
      contract: kinds[0] || "",
      hours: kinds[1] || "",
      posted: day(
        (s.match(/Online sinds\s+(\d{1,2}\s+\p{L}{3,9}\.?\s+\d{4})/u) ||
          [])[1] || "",
      ),
      description:
        from < 0 ? "" : boardText(s.slice(from, to > from ? to : from + 30000)),
    };
  },
  // ➤ job.sk (Slovakia, employers post there themselves): the title in its heading and the employer in the subheading
  // ➤ under it, each fact under a small head («Miesto práce», «Zmluvný vzťah», «Typ úväzku»), the text from «Náplň práce»
  // ➤ to the contact block, which is never copied. Read as an employer's careers site before, its 774 cards named job.sk
  // ➤ as their employer (the offers' diary, 1 November 2026).
  "www.job.sk": (html, url) => {
    const s = String(html || "");
    const title = clean((s.match(/<h1 class="stn">([^<]+)<\/h1>/) || [])[1]);
    if (!title) return null;
    const fact = (head: string): string =>
      clean(
        (
          (s.match(
            new RegExp(
              `class="sIHead">${head}</div>\\s*<div class="jiText">([\\s\\S]*?)</div>`,
            ),
          ) || [])[1] || ""
        ).replace(/<[^>]+>/g, " "),
      );
    const from = s.indexOf('class="sIHead">Náplň práce'),
      to = s.indexOf('class="sIHead">Kontakt', from);
    return {
      ...(guessPosting(html, url, Date.now(), { known: true }) || {}),
      title,
      company: clean(
        (s.match(/<\/h1>\s*<h3 class="stn[^"]*">([^<]+)<\/h3>/) || [])[1],
      ),
      location: fact("Miesto práce"),
      country: "",
      contract: fact("Zmluvný vzťah"),
      hours: fact("Typ úväzku"),
      description:
        from < 0
          ? ""
          : boardText(
              s
                .slice(from, to > from ? to : from + 30000)
                .replace(/^[^>]*>/, ""),
            ),
    };
  },
};
