import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { parseSitemap, sitemapText } from "./sitemap.js";

describe("sitemapText (job portals FR-3)", () => {
  const xml =
    "<urlset><url><loc>https://x.example/jobs/1</loc><lastmod>2026-11-20</lastmod></url></urlset>";

  it("reads a sitemap as it came, or unpacks a gzipped file", () => {
    expect(sitemapText(new TextEncoder().encode(xml))).toBe(xml);
    expect(sitemapText(gzipSync(xml))).toBe(xml);
    expect(parseSitemap(sitemapText(gzipSync(xml))).items).toEqual([
      { url: "https://x.example/jobs/1", lastmod: "2026-11-20" },
    ]);
  });
});
