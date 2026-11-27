// Copied from Argus (https://github.com/JustJans/argus), server-bot/scan.mjs at v1.11.0, MIT licence, © JustJans: only
// the board parsers the legacy's builder/adapters/boards.ts calls (career sites T002). Its own comments keep their marks.
// Typed loosely: JavaScript as Argus wrote it, its answers as each platform sends them.

// ➤ Each portal answers in its own format; these "translators" turn each response into one
// ➤ common shape: title, link, company, location — and the advert text.

// ➤ THE ADVERT TEXT COMES ACROSS TOO. Without it fetchOfferDescription has nothing to hand
// ➤ back and the years, the degree and the body-language screens run against an empty body
// ➤ — every offer from these boards would walk straight through, unread. All three send
// ➤ the text along with the list, so reading it costs no extra request. Greenhouse only
// ➤ includes it when the URL asks for it, which is done in greenhouseUrlWithContent below.
export function parseGreenhouse(json: any, name?: any): any[] {
  // ➤ Tolerant like every other parser here: a degraded feed is a quiet board,
  // ➤ not a crash dressed up as one.
  return (Array.isArray(json?.jobs) ? json.jobs : [])
    .filter(Boolean)
    .map((j: any) => ({
      title: j.title || "",
      url: j.absolute_url || "",
      company: name,
      location: j.location?.name || "",
      // ➤ Greenhouse sends the advert with its markup ESCAPED ("&lt;p&gt;"), so the tag stripper
      // ➤ would see no tags: the tag names leak in as words and the sentences run together,
      // ➤ exactly where the requirement lines live.
      description: unescapeEntities(j.content || ""),
    }));
}

// ➤ Turns "&lt;p&gt;5+ years&lt;/p&gt;" back into real markup so the tag stripper can do
// ➤ its job. Only the five that matter; the rest is handled once the text is stripped.
export function unescapeEntities(text: unknown): string {
  return String(text || "")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/gi, "&");
}
export function parseAshby(json: any, name?: any): any[] {
  return (Array.isArray(json?.jobs) ? json.jobs : [])
    .filter(Boolean)
    .map((j: any) => ({
      title: j.title || "",
      url: j.jobUrl || "",
      company: name,
      location: j.location || "",
      description: j.descriptionHtml || j.descriptionPlain || "",
    }));
}
export function parseLever(json: any, name?: any): any[] {
  if (!Array.isArray(json)) return [];
  return json.map((j) => ({
    title: j.text || "",
    url: j.hostedUrl || "",
    company: name,
    location: j.categories?.location || "",
    // ➤ Lever splits the advert: `description` is the intro blurb and the requirements live in
    // ➤ `lists` ("What We Require", "Qualifications"). Reading only the intro meant "5+ years
    // ➤ required" never reached the years and degree screens.
    description: leverText(j),
  }));
}

// ➤ The whole Lever advert as one string: intro, every list, the closing section. Exported
// ➤ to be tested — the requirements are what decides whether an offer is realistic for
// ➤ you.
export function leverText(j: any): string {
  const lists = (j?.lists || []).map(
    (l: any) => `${l?.text || ""}. ${l?.content || ""}`,
  );
  return [
    j?.descriptionPlain || j?.description || "",
    ...lists,
    j?.additionalPlain || j?.additional || "",
  ]
    .filter(Boolean)
    .join(" ");
}

// ➤ Greenhouse leaves the advert text out unless the URL asks for it. The flag is added
// ➤ here, not in portals.yml, so it cannot be forgotten when a board is added; re-adding
// ➤ it is a no-op.
// ➤ SmartRecruiters gives the title and the place but NOT the advert: that needs one
// ➤ more call per offer, which fetchOfferDescription makes only for the survivors.
export function parseSmartRecruiters(json: any, name?: any): any[] {
  return (json?.content || []).map((j: any) => {
    const l = j.location || {};
    // ➤ Their "fullLocation" repeats the country ("Poland, REMOTE, Poland"): joined here, no repeats.
    const parts = [
      l.city,
      l.region,
      l.country && String(l.country).toUpperCase(),
    ]
      .filter(Boolean)
      .filter(
        (v, i, a) =>
          a.findIndex(
            (x) => String(x).toLowerCase() === String(v).toLowerCase(),
          ) === i,
      );
    const slug = j.company?.identifier;
    return {
      title: j.name || "",
      url:
        slug && j.id ? `https://jobs.smartrecruiters.com/${slug}/${j.id}` : "",
      company: name,
      location: l.remote && !l.city ? "Remote" : parts.join(", "),
      _sr: { slug, id: j.id },
    };
  });
}
