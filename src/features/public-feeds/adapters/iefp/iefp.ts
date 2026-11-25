import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { pageText, plainText } from "../../../../shared/kit/text.js";
import {
  checkWholePass,
  publicFeed,
  withDetailPages,
} from "../../../crawl-core/feed-family.js";
import { stated } from "../../stated.js";

// Portugal: IEFP, the public employment service, read through its own search on IEFPonline. Its
// robots.txt is absent and its terms name no bots and ask no leave. The search answers a hundred
// offers a page (title, town, way of working); an offer's own page adds its text, read once and
// kept. The search keeps its session in its form's address (";jsessionid=…"), which is all a
// page needs (the legacy also sent the cookies back). An offer gone from a whole pass is closed.
const BASE = "https://iefponline.iefp.pt";
export const SEARCH = `${BASE}/IEFP/pesquisas/search.do?cat=ofertaEmprego`;
const PAGE = 100;
// Own pages read a pass (the legacy read 600 of the offers its gate took).
export const DETAILS_A_PASS = 300;

export const offerUrl = (id: string) =>
  `${BASE}/IEFP/pesquisas/detalheOfertas2.do?idOferta=${id}`;
export const pageBody = (position: number) =>
  `action=5&cat=ofertaEmprego&resultsPerPage=${PAGE}&len=${PAGE}&pos=${position}&currentPage=${position / PAGE + 1}`;

const WORK_MODES: Record<string, AdvertDraft["workMode"]> = {
  presencial: "onsite",
  misto: "hybrid",
  teletrabalho: "remote",
};

// IEFP titles its offers with the name of their occupation in the Portuguese classification
// (CPP/2010), which keeps ISCO-08's codes digit for digit; ESCO's Portuguese titles do not spell
// these group names. The groups of our scope, by the name IEFP writes, lower case (legacy).
const CPP_ISCO: Record<string, string> = {
  "mecânico e reparador de veículos automóveis": "7231",
  "mecânico e reparador, de máquinas agrícolas e industriais": "7233",
  "instalador de ar condicionado e de sistemas de refrigeração": "7127",
  "outros técnicos e inspetores de mecânica": "3115",
  "regulador e operador de máquinas-ferramentas de comando numérico computorizado para trabalhar metais":
    "7223",
  "regulador e operador de máquinas-ferramentas convencionais para trabalhar metais":
    "7223",
  "desenhadores e técnicos afins": "3118",
  "encarregado da construção": "3123",
  "outro preparador e montador de estruturas metálicas": "7214",
  "técnico de eletricidade": "3113",
  "técnico de eletrónica": "3114",
  "outros técnicos das ciências físicas e de engenharia, ne": "3119",
  "outros técnicos de controlo de processos industriais": "3139",
  "técnico de operação de instalações de produção de energia": "3131",
  "técnico de operação de instalações de tratamento de água": "3132",
  "técnico de controlo de instalações da indústria química": "3133",
  "técnico das ciências físicas": "3111",
  "técnico da metalurgia de base e da indústria extrativa": "3117",
  "técnico em redes e sistemas de computadores": "3513",
  "outros especialistas em engenharia (exceto eletrotecnologia)": "2149",
  "instalador e reparador, de tecnologias de informação e comunicação": "7422",
  "instalador de sistemas solares fotovoltaicos": "7411",
  "instalador e reparador de linhas elétricas": "7413",
  "mecânico e reparador de equipamentos eletrónicos": "7421",
  "montador de tubagens": "7126",
  "outros encarregados da indústria transformadora": "3122",
  "encarregados das indústrias metalúrgicas de base e fabrico de produtos metálicos":
    "3122",
  "técnico de emissões de televisão": "3521",
  "técnico de gravação audiovisual": "3521",
};

// The search page: its form's address (with the session) and how many offers it counts.
export function parseSearchPage(html: string): {
  readonly action?: string;
  readonly total: number;
} {
  const action =
    /<form name="pesquisaForm" method="POST" action="([^"]+)"/.exec(html)?.[1];
  return {
    ...(action ? { action } : {}),
    total: Number(/name="resultCount" value="(\d+)"/.exec(html)?.[1]) || 0,
  };
}

// «SALVATERRA DE MAGOS» → «Salvaterra de Magos».
const townName = (text: string) =>
  text
    .toLowerCase()
    .replace(
      /(^|[\s-])(\p{L})/gu,
      (_, gap: string, letter: string) => gap + letter.toUpperCase(),
    )
    .replace(/ (D[aeo]s?|E) /g, (word) => word.toLowerCase());

export function parseCards(html: string): AdvertDraft[] {
  return [
    ...html.matchAll(/id="ofertacard_(\d+)"([\s\S]*?)<\/article>/g),
  ].flatMap(([, id = "", card = ""]): AdvertDraft[] => {
    const title = plainText(
      /<div class="d-flex align-items-center"[^>]*>\s*<strong>([\s\S]*?)<\/strong>/.exec(
        card,
      )?.[1] ?? "",
    ).replace(/\s*\((?:M\/F|F\/M)\)\s*$/i, "");
    if (!title) return [];
    const place = plainText(
      /Localiza\S*\s+e\s+Hor\S*<\/div>\s*<div><strong>([\s\S]*?)<\/strong>/.exec(
        card,
      )?.[1] ?? "",
    )
      .split("|")[0]
      ?.trim();
    const way = plainText(
      /Forma de presta\S* de trabalho<\/div>\s*<div><strong>([\s\S]*?)<\/strong>/.exec(
        card,
      )?.[1] ?? "",
    ).toLowerCase();
    const town = place ? townName(place) : "";
    const workMode = WORK_MODES[way];
    const isco = CPP_ISCO[title.toLowerCase()];
    const draft: AdvertDraft = {
      source: "iefp",
      sourceId: id,
      title,
      company: "",
      location: [town, "Portugal"].filter(Boolean).join(", "),
      country: "pt",
      city: town,
      remote: workMode === "remote",
      url: offerUrl(id),
      description: "",
      occupationCodes: isco ? { isco } : {},
      language: "pt",
    };
    if (workMode) draft.workMode = workMode;
    return [draft];
  });
}

// A field of the offer's page («Tipo de contrato: Termo incerto», «Regime de trabalho: A tempo
// completo»), which all 1,352 published IEFP cards of the legacy lacked (1 November 2026).
const fieldOf = (html: string, label: string): string =>
  plainText(
    new RegExp(
      `text-uppercase">${label}</div>\\s*<div><strong>\\s*([^<]*)`,
    ).exec(html)?.[1] ?? "",
  );

// An offer's own page: its profile and the conditions written after it (contract, hours, pay),
// and the contract and working time in fields of their own.
export function withPage(draft: AdvertDraft, html: string): AdvertDraft {
  const page = html.replace(
    /<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi,
    " ",
  );
  const from = page.search(/Descri\S*\s+do\s+Perfil/);
  if (from < 0) return draft;
  const to = page.indexOf("Candidate-se a esta oferta", from);
  const text = pageText(
    page.slice(from, to > from ? to : from + 20_000),
  ).replace(/^Descri\S*\s+do\s+Perfil\s*/, "");
  if (!text) return draft;
  return {
    ...draft,
    description: text,
    ...stated({
      contract: fieldOf(html, "Tipo de contrato"),
      hours: fieldOf(html, "Regime de trabalho"),
    }),
  };
}

const withKnown = (draft: AdvertDraft, known: AdvertDraft): AdvertDraft => ({
  ...draft,
  description: known.description,
  ...(known.contract ? { contract: known.contract } : {}),
  ...(known.hours ? { hours: known.hours } : {}),
});

async function* readIefp(context: AdapterContext): AsyncIterable<AdvertDraft> {
  const { action, total } = parseSearchPage(
    (await context.http.request(SEARCH)).body,
  );
  if (!action || !total)
    throw new Error("the search page holds no form or count");
  const listed = new Map<string, AdvertDraft>();
  // A page is turned as its own script turns it: the form sent with action 5 and the position.
  for (let position = 0; position < total; position += PAGE) {
    const cards = parseCards(
      (
        await context.http.request(BASE + action, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: pageBody(position),
        })
      ).body,
    );
    const before = listed.size;
    for (const draft of cards) listed.set(draft.sourceId, draft);
    // A page that brings nothing new is the search starting over: the count decides below.
    if (listed.size === before) break;
  }
  checkWholePass(listed.size, total, "offers");
  yield* withDetailPages(listed.values(), context, {
    most: DETAILS_A_PASS,
    read: withPage,
    keep: withKnown,
  });
}

export const iefp = publicFeed({
  definition: {
    id: "iefp",
    kind: "feed",
    licence: {
      name: "IEFPonline, Instituto do Emprego e Formação Profissional",
      short: "IEFP",
      url: "https://iefponline.iefp.pt/",
      licence:
        "Public employment service offers, read as its own search shows them; each offer links to IEFPonline",
      credit: "via IEFP",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  read: readIefp,
});
