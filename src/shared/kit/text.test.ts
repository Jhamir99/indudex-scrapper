import { describe, expect, it } from "vitest";
import {
  fromCapitals,
  pageText,
  plainText,
  sentenceCase,
  titleCase,
} from "./text.js";
import { DESCRIPTION_LIMIT } from "../schemas/advert.js";

describe("pageText", () => {
  it("decodes named and numeric entities", () => {
    expect(
      pageText("Ingeni&eacute;r &amp; Techniker &#8211; Wien&nbsp;&euro;"),
    ).toBe("Ingeniér & Techniker – Wien €");
  });

  it("strips tags and keeps a line break per block", () => {
    const html =
      "<h2>Aufgaben</h2><ul><li>Planung</li><li>Wartung</li></ul><p>Erste Zeile<br>zweite <b>Zeile</b></p>";
    expect(pageText(html)).toBe(
      "Aufgaben\nPlanung\nWartung\nErste Zeile\nzweite Zeile",
    );
  });

  it("leaves out scripts and styles", () => {
    expect(pageText("a<script>alert(1)</script>b<style>p{}</style>c")).toBe(
      "abc",
    );
  });

  it("reads a description sent as escaped HTML", () => {
    expect(pageText("&lt;p&gt;Erste&lt;/p&gt;&lt;p&gt;Zweite&lt;/p&gt;")).toBe(
      "Erste\nZweite",
    );
  });

  it("keeps a lone angle bracket that is not a tag", () => {
    expect(pageText("Teams &lt; 50 people")).toBe("Teams < 50 people");
  });

  it("caps the text at the description limit", () => {
    const text = pageText(`<p>${"x".repeat(DESCRIPTION_LIMIT + 500)}</p>`);
    expect(text).toHaveLength(DESCRIPTION_LIMIT);
    expect(pageText("<p>abcdef</p>", 3)).toBe("abc");
  });
});

describe("plainText", () => {
  it("puts the text on one line", () => {
    expect(plainText("<p>Systemtechniker</p><p>(m/w/d)</p>")).toBe(
      "Systemtechniker (m/w/d)",
    );
  });
});

describe("fromCapitals", () => {
  it("writes a line in capitals as a sentence and keeps any other", () => {
    expect(fromCapitals("ADDETTO ALLA CONTABILITÀ")).toBe(
      "Addetto alla contabilità",
    );
    expect(fromCapitals("Receptionist per Camping")).toBe(
      "Receptionist per Camping",
    );
  });
});

describe("titleCase", () => {
  it("gives each word, also after a hyphen or an apostrophe, a capital", () => {
    expect(titleCase("SINT-NIKLAAS")).toBe("Sint-Niklaas");
    expect(titleCase("mons")).toBe("Mons");
    expect(titleCase("LA LOUVIÈRE")).toBe("La Louvière");
    expect(titleCase("")).toBe("");
  });
});

describe("sentenceCase", () => {
  it("writes capitals as a sentence and keeps acronyms and words with no vowel", () => {
    expect(sentenceCase("TECNICO PLC SIEMENS")).toBe("Tecnico PLC siemens");
    expect(sentenceCase("OPERARIO CNC I+D")).toBe("Operario CNC I+D");
    expect(sentenceCase("TÉCNICOS EN FRÍO INDUSTRIAL")).toBe(
      "Técnicos en frío industrial",
    );
    expect(sentenceCase("")).toBe("");
  });

  it("keeps the acronyms when a line in capitals is turned into a sentence", () => {
    expect(fromCapitals("INGENIERO SCADA")).toBe("Ingeniero SCADA");
    expect(fromCapitals("Ingeniero de MES")).toBe("Ingeniero de MES");
  });
});
