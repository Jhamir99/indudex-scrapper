import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { plainText, titleCase } from "../../../../shared/kit/text.js";
import { withoutContacts } from "../../contacts.js";
import { publicFeed } from "../../family.js";

// Spain: the Sistema Nacional de Empleo's offers (sistemanacionalempleo.es, run by the SEPE), the
// only open door for several regions' public employment services. Each region's offers come as
// one PDF, a link with no form; each offer has its own page there. robots.txt sets no rule. Its
// legal notice allows copying "siempre que se citen la fuente y la fecha en la que se ha realizado
// la copia, no se manipulen ni alteren los contenidos y no se utilice directamente con fines
// comerciales" (read by the legacy on 15 October 2026): Indudex is free, with no adverts and no
// accounts, and each offer names the source and the day it was copied. Regions read through their
// own service (Andalusia, Cantabria, Castilla-La Mancha, Catalonia, Madrid, Murcia, the Basque
// Country) are left out, so an offer is not shown twice.
const BASE = "https://www.sistemanacionalempleo.es";

// The regions read here, by the SNE's code, with the name an advert's place carries.
export const REGIONS: Readonly<Record<string, string>> = {
  "02": "Aragón",
  "03": "Asturias",
  "04": "Illes Balears",
  "05": "Canarias",
  "07": "Castilla y León",
  "10": "Comunitat Valenciana",
  "11": "Extremadura",
  "12": "Galicia",
  "15": "Navarra",
  "17": "La Rioja",
  "18": "Ceuta",
  "19": "Melilla",
};
export const listUrl = (region: string) =>
  `${BASE}/SNE_ListadoOfertasDifusionWEB/consultarOfertasFrm.do?modo=verPDF&filtroCA=${region}&CA=${region}`;
export const offerUrl = (code: string) =>
  `${BASE}/OfertaDifusionWEB/detalleOferta.do?modo=inicio&id=${code}`;

// A piece of the PDF's text, a line of it, an offer's lines while read, and the offer read.
export interface Piece {
  readonly page: number;
  readonly x: number;
  readonly y: number;
  readonly str: string;
}
interface Line {
  readonly at: number;
  readonly right: boolean;
  readonly text: string;
}
interface Block {
  start: number;
  lines: string[];
  code?: string;
  post?: string[];
  town?: string;
  province?: string;
  posted?: string;
  office?: string;
}
export interface Offer {
  readonly code: string;
  readonly title: string;
  readonly town: string;
  readonly province: string;
  readonly posted: string;
  readonly office: string;
  readonly text: string;
}

// The PDF's two columns: the post, place, number, day and office on the left; the text on the
// right.
const RIGHT_COLUMN = 240;
// An offer's text starts a point or two above its title's first line.
const ABOVE = 6;
// Lines of one block are ten or eleven points apart.
const LINE = 14;
// A page's lines in `at`: page × PAGE, then from the top down (a page is under a thousand points
// high).
const PAGE = 10_000;

const dayOf = (text: string) => {
  const match = /(\d{2})\/(\d{2})\/(\d{4})/.exec(text);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
};

// The post as the PDF writes it, capitals included: the legal notice asks that the content not
// be altered.
const asWritten = (text: string) => text.replace(/\s+/g, " ").trim();

// An offer's text: the markup the PDF shows as words removed (tags first, then the entities they
// leave and the quotes), then no contact.
const cleanText = (text: string) =>
  withoutContacts(
    plainText(
      text.replace(/target="_blank"?/gi, " ").replace(/<[^>]*>/g, " "),
    ).replace(/"/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();

// The PDF's text pieces as lines in reading order, page by page and top to bottom, each column
// apart. `at` orders lines across pages (see PAGE).
export function linesOf(pieces: readonly Piece[]): Line[] {
  const lines = new Map<
    string,
    {
      page: number;
      y: number;
      right: boolean;
      parts: [number, string][];
    }
  >();
  for (const piece of pieces) {
    const right = piece.x >= RIGHT_COLUMN;
    const key = `${piece.page}|${Math.round(piece.y)}|${right ? 1 : 0}`;
    let line = lines.get(key);
    if (!line) {
      line = { page: piece.page, y: Math.round(piece.y), right, parts: [] };
      lines.set(key, line);
    }
    line.parts.push([piece.x, piece.str]);
  }
  return [...lines.values()]
    .map((line) => ({
      at: line.page * PAGE + (PAGE / 2 - line.y),
      right: line.right,
      text: line.parts
        .toSorted((a, b) => a[0] - b[0])
        .map((part) => part[1])
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    }))
    .filter((line) => line.text)
    .toSorted((a, b) => a.at - b.at);
}

const pageOf = (at: number | undefined) => Math.floor(Number(at) / PAGE);

// The offers of one region's PDF: on the left, each offer's post (one line or more), "Town
// ( PROVINCE )", "Oferta: <number>", its day and "Oficina: <office>"; its text is what the right
// column holds from just above its post to just above the next one's, across pages. The place is
// the line just before the number, so a post with brackets ("INDUSTRIAL (H/M)") is not taken for
// one.
export function parseOffers(pieces: readonly Piece[]): Offer[] {
  const lines = linesOf(pieces);
  const blocks: Block[] = [];
  let current: Block | undefined;
  let office: Block | undefined;
  let lastAt = 0;
  const left = lines.filter(
    (line) =>
      !line.right &&
      !/^OFERTAS DE EMPLEO EN DIFUSI/i.test(line.text) &&
      !/^Ofertas en difusi[oó]n a fecha/i.test(line.text) &&
      !/^Sector Profesional:/i.test(line.text),
  );
  for (const [i, line] of left.entries()) {
    // An office's name in two lines ("ZARAGOZA-COMPROMISO DE" / "CASPE") goes on a line right
    // below, or at the top of the next page when the office ends one; the next offer's post
    // starts well below.
    const nextGap = i + 1 < left.length ? left[i + 1]!.at - line.at : Infinity;
    const overPage =
      pageOf(line.at) === pageOf(lastAt) + 1 &&
      pageOf(left[i - 1]?.at) === pageOf(lastAt) &&
      nextGap > 3 * LINE;
    if (office && (line.at - lastAt <= LINE || overPage)) {
      office.office += ` ${line.text}`;
      lastAt = line.at;
      continue;
    }
    office = undefined;
    const number = /^Oferta:\s*(\d{6,})/.exec(line.text);
    const named = /^Oficina:\s*(.*)$/.exec(line.text);
    if (number && current && !current.code && current.lines.length >= 2) {
      const place = /^(.*?)\s*(?:\(\s*([^()]*?)\s*\))?$/.exec(
        current.lines.pop() ?? "",
      );
      // A long town name breaks before its province: "San Vicente del Raspeig/Sant Vicent del" /
      // "( ALICANTE )".
      const town =
        (place?.[1] ?? "").trim() ||
        (current.lines.length >= 2 ? (current.lines.pop() ?? "") : "");
      Object.assign(current, {
        code: number[1],
        post: current.lines,
        town,
        province: (place?.[2] ?? "").trim(),
      });
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(line.text) && current?.code) {
      current.posted = dayOf(line.text);
    } else if (named && current?.code) {
      current.office = (named[1] ?? "").trim();
      blocks.push(current);
      office = current;
      lastAt = line.at;
      current = undefined;
    } else if (current?.code) {
      // A post's line after a number with no office line yet: the office was missing, the next
      // offer starts.
      blocks.push(current);
      current = { start: line.at, lines: [line.text] };
    } else {
      current ??= { start: line.at, lines: [] };
      current.lines.push(line.text);
    }
  }
  if (current?.code) blocks.push(current);

  const text = lines.filter(
    (line) => line.right && !/^P[aá]gina \d+ de \d+$/i.test(line.text),
  );
  return blocks.map((block, i) => {
    const from = block.start - ABOVE;
    const to = i + 1 < blocks.length ? blocks[i + 1]!.start - ABOVE : Infinity;
    return {
      code: block.code ?? "",
      title: asWritten((block.post ?? []).join(" ")),
      town: block.town ?? "",
      province: block.province ?? "",
      posted: block.posted ?? "",
      office: block.office ?? "",
      text: cleanText(
        text
          .filter((line) => line.at >= from && line.at < to)
          .map((line) => line.text)
          .join(" "),
      ),
    };
  });
}

// The advert of an offer, with the source and the day of the copy its legal notice asks for.
export function toDraft(
  offer: Offer,
  region: string,
  copied: string,
): AdvertDraft | undefined {
  if (!offer.code || !offer.title) return undefined;
  const regionName = REGIONS[region] ?? "";
  const town = offer.town;
  const province = titleCase(offer.province);
  const draft: AdvertDraft = {
    source: "sne",
    sourceId: offer.code,
    title: offer.title,
    company: "",
    // The province and the region are often one name ("La Rioja", "La Rioja").
    location: [town, province, regionName, "España"]
      .filter(
        (part, i, parts) =>
          part &&
          parts.findIndex((p) => p.toLowerCase() === part.toLowerCase()) === i,
      )
      .join(", "),
    country: "es",
    city: (town.split("/")[0] ?? "").trim(),
    remote: false,
    url: offerUrl(offer.code),
    description: [
      offer.text,
      `Fuente: Sistema Nacional de Empleo (SEPE), copia del ${copied}.`,
    ]
      .filter(Boolean)
      .join(" "),
    occupationCodes: {},
    // Balearic, Valencian and Galician offers may be in their own language: the processor reads
    // the language from the words.
    language: "es",
  };
  if (offer.posted) draft.posted = offer.posted;
  return draft;
}

// The text pieces of a PDF, with pdf.js's own reader.
export async function pdfPieces(bytes: Uint8Array): Promise<Piece[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({
    data: bytes,
    verbosity: 0,
    disableFontFace: true,
  });
  try {
    const document = await task.promise;
    const pieces: Piece[] = [];
    for (let number = 1; number <= document.numPages; number++) {
      const content = await (await document.getPage(number)).getTextContent();
      for (const item of content.items) {
        if ("str" in item && item.str.trim())
          pieces.push({
            page: number,
            x: item.transform[4],
            y: item.transform[5],
            str: item.str,
          });
      }
    }
    return pieces;
  } finally {
    await task.destroy();
  }
}

async function* readSne(context: AdapterContext): AsyncIterable<AdvertDraft> {
  const failed: string[] = [];
  let read = 0;
  for (const [region, name] of Object.entries(REGIONS)) {
    let drafts: AdvertDraft[] | undefined;
    try {
      const answer = await context.http.request(listUrl(region), {
        binary: true,
      });
      const type = answer.headers["content-type"] ?? "";
      if (!answer.bytes || !/pdf/i.test(type))
        throw new Error(`no PDF (${type || "no content type"})`);
      drafts = parseOffers(await pdfPieces(answer.bytes)).flatMap((offer) => {
        const draft = toDraft(offer, region, context.today);
        return draft ? [draft] : [];
      });
    } catch (error) {
      context.log(
        `${name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (!drafts) {
      // A region whose PDF did not come keeps the offers it had, until a pass reads it again.
      failed.push(name);
      yield* context.previous.filter((draft) =>
        draft.location.endsWith(`${name}, España`),
      );
      continue;
    }
    read += 1;
    context.log(`${name}: ${drafts.length} offers`);
    yield* drafts;
  }
  if (read === 0) throw new Error(`no region read (${failed.join(", ")})`);
}

export const sne = publicFeed({
  definition: {
    id: "sne",
    kind: "feed",
    licence: {
      name: "Sistema Nacional de Empleo, ofertas en difusión",
      short: "SNE",
      url: "https://www.sistemanacionalempleo.es/HomeSne/avisoLegal.html",
      licence:
        "Copying allowed citing the source and the day of the copy, unaltered and not directly for commercial ends (SEPE legal notice); each offer links to the SNE",
      credit: "Fuente: Sistema Nacional de Empleo (SEPE)",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  read: readSne,
});
