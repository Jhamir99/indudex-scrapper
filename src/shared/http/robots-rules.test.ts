import { describe, expect, it } from "vitest";
import {
  encodePath,
  isAllowed,
  parseRobots,
  robotsPath,
  ruleMatches,
} from "./robots-rules.js";

describe("parseRobots", () => {
  it("takes the groups for everyone when none names us", () => {
    const robots = parseRobots(
      "User-agent: Googlebot\nDisallow: /\n\nUser-agent: *\nDisallow: /private\nCrawl-delay: 5\n",
    );
    expect(robots.rules).toEqual([{ allow: false, path: "/private" }]);
    expect(robots.crawlDelay).toBe(5);
  });

  it("takes only the groups that name us, by product token and any case", () => {
    const robots = parseRobots(
      "User-agent: *\nDisallow: /\n\nUser-agent: IndudexBot/1.0\nDisallow: /search\n",
    );
    expect(robots.rules).toEqual([{ allow: false, path: "/search" }]);
  });

  it("obeys rules written for the legacy crawler's name", () => {
    const robots = parseRobots("User-agent: ArgusWeb\nDisallow: /\n");
    expect(isAllowed(robots, "/jobs")).toBe(false);
  });

  it("combines several groups that apply, and keeps the longest crawl delay", () => {
    const robots = parseRobots(
      "User-agent: *\nDisallow: /a\nCrawl-delay: 2\n\nUser-agent: *\nDisallow: /b\nCrawl-delay: 10\n",
    );
    expect(robots.rules.map((r) => r.path)).toEqual(["/a", "/b"]);
    expect(robots.crawlDelay).toBe(10);
  });

  it("shares one group among consecutive user-agent lines", () => {
    const robots = parseRobots(
      "User-agent: Googlebot\nUser-agent: IndudexBot\nDisallow: /x\n",
    );
    expect(robots.rules).toEqual([{ allow: false, path: "/x" }]);
  });

  it("starts a new group after an empty Disallow", () => {
    const robots = parseRobots(
      "User-agent: *\nDisallow:\nUser-agent: BadBot\nDisallow: /\n",
    );
    expect(isAllowed(robots, "/jobs")).toBe(true);
  });

  it("reads CR, CRLF and LF line ends, comments and sitemaps", () => {
    const robots = parseRobots(
      "# hello\r\nUser-agent: * # all\rDisallow: /tmp\nSitemap: https://example.com/sitemap.xml\n",
    );
    expect(robots.rules).toEqual([{ allow: false, path: "/tmp" }]);
    expect(robots.sitemaps).toEqual(["https://example.com/sitemap.xml"]);
  });

  it("allows everything for an empty or unrelated file", () => {
    expect(isAllowed(parseRobots(""), "/anything")).toBe(true);
    expect(
      isAllowed(parseRobots("User-agent: Googlebot\nDisallow: /\n"), "/x"),
    ).toBe(true);
  });
});

describe("isAllowed", () => {
  const robots = parseRobots(
    [
      "User-agent: *",
      "Disallow: /jobs/",
      "Allow: /jobs/open",
      "Disallow: /*.pdf$",
      "Allow: /tie",
      "Disallow: /tie",
      "Disallow: /search?",
    ].join("\n"),
  );

  it.each([
    ["/", true],
    ["/jobs", true],
    ["/jobs/4711", false],
    ["/jobs/open/4711", true],
    ["/files/cv.pdf", false],
    ["/files/cv.pdf?x=1", true],
    ["/tie", true],
    ["/search?q=engineer", false],
    ["/search", true],
    ["/robots.txt", true],
  ])("%s → %s", (path, expected) => {
    expect(isAllowed(robots, path)).toBe(expected);
  });

  it("compares paths in one spelling", () => {
    const cafe = parseRobots("User-agent: *\nDisallow: /café\n");
    expect(isAllowed(cafe, "/caf%c3%a9")).toBe(false);
    expect(isAllowed(cafe, "/caf%C3%A9/menu")).toBe(false);
  });
});

describe("ruleMatches", () => {
  it("matches wildcards and the end anchor", () => {
    expect(ruleMatches("/*/apply", "/jobs/7/apply")).toBe(true);
    expect(ruleMatches("/jobs$", "/jobs")).toBe(true);
    expect(ruleMatches("/jobs$", "/jobs/")).toBe(false);
  });

  it("stays fast on a pathological rule", () => {
    const start = performance.now();
    expect(ruleMatches(`/${"*".repeat(30)}.js$`, `/${"a".repeat(2000)}`)).toBe(
      false,
    );
    expect(performance.now() - start).toBeLessThan(500);
  });
});

describe("helpers", () => {
  it("encodes paths and keeps the query", () => {
    expect(encodePath("/%7euser/%2f")).toBe("/~user/%2F");
    expect(robotsPath("https://example.com/jobs?page=2#top")).toBe(
      "/jobs?page=2",
    );
  });
});
