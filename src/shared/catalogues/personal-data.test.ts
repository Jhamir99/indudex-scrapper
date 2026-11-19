import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { CATALOGUE_DIRECTORY } from "./read-catalogue.js";

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}/i;
// A number in international form, or one a word says is a phone. Bare runs of digits are not
// enough: sources put reference numbers in titles ("ref. 04 2026 003422", "req_123456789").
const PHONE = new RegExp(
  String.raw`(?<![\p{L}\p{N}])\+\d{1,3}(?:[ .-]?\(?\d\)?){7,12}(?![\p{N}])` +
    String.raw`|\b(?:tel|t[ée]l[ée]phone|phone|telefon[o]?|tel[ée]fono|m[óo]vil|mobile?|handy|whatsapp|llamar|call)\b[.:]?\s*\+?\d(?:[ .-]?\d){7,12}`,
  "iu",
);

function stringsOf(value: unknown, into: string[] = []): string[] {
  if (typeof value === "string") into.push(value);
  else if (Array.isArray(value)) for (const item of value) stringsOf(item, into);
  else if (value && typeof value === "object")
    for (const [key, item] of Object.entries(value)) {
      into.push(key);
      stringsOf(item, into);
    }
  return into;
}

async function catalogueFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, {
    recursive: true,
    withFileTypes: true,
  });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => join(entry.parentPath, entry.name));
}

describe("no personal data in the catalogues (FR-9)", () => {
  it("finds an e-mail address", () => {
    expect(EMAIL.test("Electrician, write to jobs.hr@example.com")).toBe(true);
    expect(EMAIL.test("application technical lead @marshtech")).toBe(false);
  });

  it("finds a phone number in international form or named as one", () => {
    expect(PHONE.test("Soldador, +34 612 345 678")).toBe(true);
    expect(PHONE.test("Elektriker (m/w/d) +49 (0)30 1234567")).toBe(true);
    expect(PHONE.test("Fontanero, tel. 612 345 678")).toBe(true);
    expect(PHONE.test("Installateur – WhatsApp 0612345678")).toBe(true);
  });

  it.each([
    "oficial 1ª climatizacion (ref. 04 2026 003422)",
    "mechanic ii – public works – j01590 - 01200",
    "req_123456789 機構設計工程師",
    "oferta 2026/1234-567: se necesita mecanico industrial",
    "projektleiter brückenbau | 85.000-105.000€ + firmenwagen",
    "dual student mechanical engineering starting 01.09.2027 1",
    "http://data.europa.eu/esco/occupation/e12f34fb-5678-4321-8765-b123df45678a",
  ])("lets a reference number through: %s", (text) => {
    expect(PHONE.test(text)).toBe(false);
  });

  it("holds no e-mail address and no phone number in any string, keys included", async () => {
    const found: string[] = [];
    for (const file of await catalogueFiles(CATALOGUE_DIRECTORY)) {
      const data: unknown = JSON.parse(await readFile(file, "utf8"));
      for (const text of stringsOf(data))
        if (EMAIL.test(text) || PHONE.test(text))
          found.push(`${relative(CATALOGUE_DIRECTORY, file)}: ${text}`);
    }
    expect(found).toEqual([]);
  });
});
