import { describe, expect, it } from "vitest";
import { pageText, plainText } from "./text.js";
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
