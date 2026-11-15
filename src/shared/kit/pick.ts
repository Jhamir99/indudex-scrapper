import { XMLParser } from "fast-xml-parser";

// Values stay strings ("0123" is an id, not a number); attributes are kept under "@name";
// CDATA is read as the element's text.
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
});

export function parseXml(xml: string): unknown {
  return parser.parse(xml);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// Every value at a dotted path ("rss.channel.item"), in parsed XML or JSON alike. A step that
// meets a list walks into each item, so one element and many come back the same way: as a list.
export function pickAll(source: unknown, path: string): unknown[] {
  let current: unknown[] = [source];
  for (const key of path.split(".")) {
    current = current
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter(isRecord)
      .map((record) => record[key])
      .filter((value) => value !== undefined && value !== null);
  }
  return current.flatMap((value) => (Array.isArray(value) ? value : [value]));
}

// The first value at a path as text, or "" when it is missing. An element with attributes
// keeps its text under "#text".
export function pickText(source: unknown, path: string): string {
  const [value] = pickAll(source, path);
  if (isRecord(value)) return textOf(value["#text"]);
  return textOf(value);
}

function textOf(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return "";
}
