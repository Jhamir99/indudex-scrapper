import type { AdvertDraft } from "../../../crawl-core/ports.js";
import { parseDay } from "../../../../shared/kit/dates.js";
import { plainText } from "../../../../shared/kit/text.js";
import { publicFeed } from "../../family.js";

// Austria: the vacancies public bodies publish on data.gv.at under the Freedom of Information Act
// (datasets tagged "IFG-Stellenausschreibungen", CC BY 4.0): today Carinthia's Land, whose own site
// closes itself to every robot but two search engines, so only the catalogue is read and each
// advert links to the body's page for a person to open. Any body that publishes the same way comes
// in by itself.
export const SEARCH = `https://www.data.gv.at/api/hub/search/search?filter=dataset&limit=100&facets=${encodeURIComponent(
  JSON.stringify({ keywords: ["ifg-stellenausschreibungen"] }),
)}`;

interface Dataset {
  readonly id?: string;
  readonly title?: { readonly de?: string };
  readonly description?: { readonly de?: string; readonly en?: string };
  readonly publisher?: { readonly name?: string };
  readonly distributions?: readonly {
    readonly access_url?: string | readonly string[];
  }[];
  readonly issued?: string;
  readonly modified?: string;
}

export function parseIfg(json: string): AdvertDraft[] {
  const results =
    (JSON.parse(json) as { result?: { results?: (Dataset | null)[] } } | null)
      ?.result?.results ?? [];
  return results.flatMap((dataset): AdvertDraft[] => {
    // "Abteilung 8 - Umwelt … / Leiter:in": the unit, then the post.
    const text = plainText(
      dataset?.description?.de ?? dataset?.description?.en ?? "",
    );
    const cut = text.lastIndexOf(" / ");
    const post = cut > 0 ? text.slice(cut + 3).trim() : "";
    const unit = cut > 0 ? text.slice(0, cut).trim() : text;
    const publisher = plainText(dataset?.publisher?.name ?? "");
    // "Land Kärnten, Arnulfplatz 1, 9020 Klagenfurt am Wörthersee": the body, and its town.
    const body = publisher.split(",")[0]?.trim() ?? "";
    const town = /\d{4}\s+([^,]+)$/.exec(publisher)?.[1]?.trim() ?? "";
    const url = (dataset?.distributions ?? [])
      .flatMap((distribution) => distribution.access_url ?? [])
      .find((link) => link.startsWith("https://"));
    const title = post || plainText(dataset?.title?.de ?? "");
    if (!dataset?.id || !title || !url) return [];
    const draft: AdvertDraft = {
      source: "ifgat",
      sourceId: dataset.id,
      title,
      company: [body, unit].filter(Boolean).join(", "),
      location: [town, "Österreich"].filter(Boolean).join(", "),
      country: "at",
      city: town,
      remote: false,
      url,
      description: text,
      occupationCodes: {},
      language: "de",
    };
    const posted = parseDay(dataset.issued ?? dataset.modified);
    if (posted) draft.posted = posted;
    return [draft];
  });
}

export const ifgat = publicFeed({
  definition: {
    id: "ifgat",
    kind: "feed",
    licence: {
      name: "data.gv.at, IFG-Stellenausschreibungen",
      short: "data.gv.at",
      url: "https://www.data.gv.at/",
      licence:
        "CC BY 4.0: vacancies Austrian public bodies publish as open data; each links to the body's page",
      credit: "Quelle: data.gv.at (CC BY 4.0)",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  pages: [SEARCH],
  request: { headers: { accept: "application/json" } },
  parse: parseIfg,
});
