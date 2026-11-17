import { load } from "cheerio";
import type {
  AdapterContext,
  AdvertDraft,
  SourceAdapter,
} from "../crawl-core/ports.js";
import type { Licence } from "../../shared/schemas/source.js";
import { parseDay } from "../../shared/kit/dates.js";
import { fromCapitals, pageText, plainText } from "../../shared/kit/text.js";
import { withoutContacts } from "./contacts.js";
import { checkWholePass, publicFeed } from "./family.js";

// MyPortal, the job-portal platform Emilia-Romagna's "Lavoro per Te" and Trento's job portal
// run: their public search, no sign-in. The search lives in a server session (the form's address
// carries it, and the cookies the search page sets route each request to the server that holds
// it): the empty search its page sends, then its list a hundred at a time. Each offer comes with its title, employer, place, text and the day it
// was updated; a contact in the text is not kept. An offer gone from a whole pass is closed.
const PAGE = 100;
// About 600 (Emilia) and 750 (Trento) offers today; the cap only stops a list that never ends.
const LIST_PAGES = 50;
const GRID = "vacancyResultsForm:vacancyResultsDataGrid";

export interface MyPortalSite {
  readonly id: string;
  readonly base: string;
  readonly licence: Licence;
}

export const searchPage = (base: string) =>
  `${base}/offerte-lavoro/vacancy/cerca?ref=home`;

export interface SearchForm {
  // The form's address, with the session in it.
  readonly action: string;
  readonly viewState: string;
  // The id of the button that runs the search.
  readonly command: string;
}

export function parseSearchForm(html: string): SearchForm | undefined {
  const $ = load(html);
  const action = $("form#searchForm").attr("action");
  const viewState = $('input[name="javax.faces.ViewState"]').first().val();
  const command =
    /PrimeFaces\.ab\(\{s:"(searchForm:[^"]+)",f:"searchForm",p:"searchForm",u:"vacancyResultsForm/.exec(
      html,
    )?.[1];
  if (!action || typeof viewState !== "string" || !viewState || !command)
    return undefined;
  return { action, viewState, command };
}

// An answer to the search or to a page of its list: a JSF partial response whose updates carry
// the offers' HTML; the search's also says how many there are (`rowCount`).
export function parseResults(
  xml: string,
  site: Pick<MyPortalSite, "id" | "base">,
): { readonly total: number | undefined; readonly drafts: AdvertDraft[] } {
  const rowCount = /rowCount:(\d+)/.exec(xml)?.[1];
  const html = [...xml.matchAll(/<!\[CDATA\[([\s\S]*?)\]\]>/g)]
    .map((update) => update[1])
    .join("");
  const $ = load(html);
  const drafts = $(".job-item")
    .toArray()
    .flatMap((element): AdvertDraft[] => {
      const card = $(element);
      const sourceId = /^job-(\d+)$/.exec(card.attr("id") ?? "")?.[1];
      const link = card.find("a.job-link").first();
      const href = link.attr("href");
      // Its titles come in capitals, sometimes with the town after an underscore
      // ("…SOCIO-SANITARIO_PARMA").
      const title = fromCapitals(
        plainText(link.html() ?? "").replace(/_/g, " "),
      )
        .replace(/\s+/g, " ")
        .trim();
      if (!sourceId || !href || !title) return [];
      // "Roma (RM)": the town, then its province.
      const place = plainText(card.find(".job-location").html() ?? "").replace(
        /^-\s*/,
        "",
      );
      const town = place.replace(/\s*\([^)]*\)\s*$/, "").trim();
      const qualification = plainText(
        card.find(".job-istat span").eq(1).html() ?? "",
      );
      const tags = card
        .find(".job-tag")
        .toArray()
        .map((tag) => plainText($(tag).html() ?? ""))
        .filter((tag) => tag && tag !== place);
      const facts = [
        qualification && `Qualifica ISTAT: ${fromCapitals(qualification)}`,
        ...tags.map(fromCapitals),
      ]
        .filter(Boolean)
        .join(" · ");
      // Trento's portal leaves its text's box open, so the boxes after it sit inside it.
      const text = card.find(".job-description").first().clone();
      text.children("div").remove();
      const draft: AdvertDraft = {
        source: site.id,
        sourceId,
        title,
        company: plainText(card.find(".company-name").html() ?? ""),
        location: [place, "Italia"].filter(Boolean).join(", "),
        country: "it",
        city: town,
        remote: false,
        // The session in a link is the reader's, not the offer's.
        url: new URL(href.replace(/;jsessionid=[^?#]*/i, ""), site.base).href,
        description: [withoutContacts(pageText(text.html() ?? "")), facts]
          .filter(Boolean)
          .join("\n"),
        occupationCodes: {},
        language: "it",
      };
      const updated = parseDay(card.find("time.timeago").attr("datetime"));
      if (updated) draft.posted = updated;
      return [draft];
    });
  return { total: rowCount ? Number(rowCount) : undefined, drafts };
}

// The cookies an answer set, as a request sends them back: names and values only.
export const sessionCookie = (cookies: readonly string[] = []) =>
  cookies
    .map((cookie) => cookie.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ");

export function myPortalSite(site: MyPortalSite): SourceAdapter {
  async function* read(context: AdapterContext): AsyncIterable<AdvertDraft> {
    const opened = await context.http.request(searchPage(site.base));
    const form = parseSearchForm(opened.body);
    if (!form) throw new Error("the search page has changed");
    const cookie = sessionCookie(opened.cookies);
    const post = async (fields: Record<string, string>) =>
      (
        await context.http.request(new URL(form.action, site.base).href, {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            "faces-request": "partial/ajax",
            "x-requested-with": "XMLHttpRequest",
            ...(cookie ? { cookie } : {}),
          },
          body: new URLSearchParams({
            "javax.faces.partial.ajax": "true",
            ...fields,
            "javax.faces.ViewState": form.viewState,
          }).toString(),
        })
      ).body;

    const found = parseResults(
      await post({
        "javax.faces.source": form.command,
        "javax.faces.partial.execute": "searchForm",
        "javax.faces.partial.render": "vacancyResultsForm:vacancyResultsGroup",
        [form.command]: form.command,
        searchForm: "searchForm",
        "searchForm:keywordInput": "",
      }),
      site,
    );
    const total = found.total ?? 0;
    const listed = new Map(
      found.drafts.map((draft) => [draft.sourceId, draft]),
    );
    // None past a page that brings nothing new: a page served again would be asked for without end.
    for (
      let first = 0, page = 0;
      first < total && page < LIST_PAGES;
      first += PAGE, page++
    ) {
      const { drafts } = parseResults(
        await post({
          "javax.faces.source": GRID,
          "javax.faces.partial.execute": GRID,
          "javax.faces.partial.render": GRID,
          "javax.faces.behavior.event": "page",
          "javax.faces.partial.event": "page",
          [`${GRID}_pagination`]: "true",
          [`${GRID}_first`]: String(first),
          [`${GRID}_rows`]: String(PAGE),
          vacancyResultsForm: "vacancyResultsForm",
        }),
        site,
      );
      const before = listed.size;
      for (const draft of drafts) listed.set(draft.sourceId, draft);
      if (listed.size === before) break;
    }
    checkWholePass(listed.size, total, "offers");
    yield* listed.values();
  }

  return publicFeed({
    definition: {
      id: site.id,
      kind: "feed",
      licence: site.licence,
      needsCredentials: false,
      credentialVariables: [],
    },
    read,
  });
}
