// robots.txt rules as RFC 9309 has them (https://www.rfc-editor.org/rfc/rfc9309): what may be read,
// how fast, where the sitemaps are. Pure. Ported from the legacy builder/lib/robots-rules.ts.

export interface RobotsRule {
  readonly allow: boolean;
  readonly path: string;
}

export interface Robots {
  readonly rules: readonly RobotsRule[];
  // Seconds; 0 when none is given.
  readonly crawlDelay: number;
  readonly sitemaps: readonly string[];
}

// The product tokens that name us. "argusweb" was the legacy crawler's name until October 2026:
// a site that wrote rules for it meant them for us.
export const BOT_NAMES = ["indudexbot", "indudex", "argusweb"];

// What a site with no usable robots.txt (none, or a 4xx) allows: everything (RFC 9309 2.3.1.3).
export const ALLOW_ALL: Robots = { rules: [], crawlDelay: 0, sitemaps: [] };

interface Group {
  agents: string[];
  rules: RobotsRule[];
  crawlDelay: number;
  closed: boolean;
}

// The groups that name us, else the groups for everyone, all combined when there are several;
// the longest crawl delay they give; the sitemaps.
export function parseRobots(
  text: string,
  botNames: readonly string[] = BOT_NAMES,
): Robots {
  const groups: Group[] = [];
  const sitemaps: string[] = [];
  let current: Group | undefined;
  // Lines end in LF, CRLF or a lone CR (2.2).
  for (const raw of text.split(/\r\n|\r|\n/)) {
    const match = raw
      .replace(/#.*/, "")
      .trim()
      .match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!match) continue;
    const key = match[1]!.toLowerCase();
    const value = match[2]!.trim();

    if (key === "sitemap") {
      if (value) sitemaps.push(value.split(/\s/)[0]!);
    } else if (key === "user-agent") {
      // A user-agent line after a rule line starts a new group, an empty "Disallow:" included (2.2.1):
      // otherwise "User-agent: * / Disallow:" took the next group's rules for everyone.
      if (!current || current.closed) {
        current = { agents: [], rules: [], crawlDelay: 0, closed: false };
        groups.push(current);
      }
      // "IndudexBot/1.0" names us by its product token (2.2.1).
      current.agents.push(
        value === "*"
          ? "*"
          : (value.toLowerCase().match(/^[a-z_-]+/)?.[0] ?? ""),
      );
    } else if (current && (key === "allow" || key === "disallow")) {
      current.closed = true;
      if (value) current.rules.push({ allow: key === "allow", path: value });
    } else if (current && key === "crawl-delay") {
      current.closed = true;
      const seconds = Number(value);
      current.crawlDelay =
        Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
    }
  }

  const named = groups.filter((g) =>
    g.agents.some((a) => botNames.includes(a)),
  );
  const ours = named.length
    ? named
    : groups.filter((g) => g.agents.includes("*"));
  return {
    rules: ours.flatMap((g) => g.rules),
    crawlDelay: Math.max(0, ...ours.map((g) => g.crawlDelay)),
    sitemaps,
  };
}

// May this path (with its query) be read? The longest matching rule decides; between an Allow
// and a Disallow as long, the Allow (2.2.2). robots.txt itself may always be read.
export function isAllowed(robots: Robots, path: string): boolean {
  const target = encodePath(path || "/");
  if (target === "/robots.txt") return true;
  let best: RobotsRule | undefined;
  for (const rule of robots.rules) {
    if (!ruleMatches(encodePath(rule.path), target)) continue;
    if (
      !best ||
      rule.path.length > best.path.length ||
      (rule.path.length === best.path.length && rule.allow)
    )
      best = rule;
  }
  return !best || best.allow;
}

// Does a rule match the start of a path? "*" is any run of characters and a final "$" the end;
// the rest is itself (2.2.3). The positions the path can have reached are carried along the rule,
// as Google's matcher does: a rule turned into a regular expression ("/*********************.js$",
// met on a real site) backtracked for hours in the legacy.
export function ruleMatches(rule: string, path: string): boolean {
  let positions = [0];
  for (let index = 0; index < rule.length; index++) {
    const character = rule[index];
    if (character === "$" && index === rule.length - 1)
      return positions.includes(path.length);
    if (character === "*") {
      const from = positions[0]!;
      positions = Array.from(
        { length: path.length - from + 1 },
        (_, k) => from + k,
      );
      continue;
    }
    positions = positions
      .filter((position) => path[position] === character)
      .map((position) => position + 1);
    if (!positions.length) return false;
  }
  return true;
}

// One spelling for paths and rules (2.2.2): non-ASCII percent-encoded, every %xx in capitals,
// unreserved characters as themselves ("/caf%C3%A9", "/café" and "/caf%c3%a9" are one).
export function encodePath(path: string): string {
  return path
    .replace(/[^\p{ASCII}]+/gu, (characters) => encodeURIComponent(characters))
    .replace(/%([0-9a-f]{2})/gi, (_, hex: string) => {
      const character = String.fromCharCode(Number.parseInt(hex, 16));
      return /[A-Za-z0-9._~-]/.test(character)
        ? character
        : `%${hex.toUpperCase()}`;
    });
}

// The part of an address the rules are matched against.
export function robotsPath(url: string): string {
  const parsed = new URL(url);
  return parsed.pathname + parsed.search;
}
