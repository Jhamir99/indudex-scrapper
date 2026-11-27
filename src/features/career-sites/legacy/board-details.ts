// The legacy's builder/readers.ts `withDetails` (JustJans/indudex@ec79858), copied (career sites T004): only its imports
// changed. Its own comments keep their marks.
import { ATS, type BoardAdvert } from "./boards.js";
import type { Failure } from "./http.js";
import { titleIsOurs } from "./ours.js";
import type { RawOffer } from "./raw-offer.js";

// ➤ A board whose list leaves out each vacancy's text and facts (Workday) has them asked once per vacancy, a second
// ➤ apart on its host, and kept by address from pass to pass: those not yet asked, as many as the pass has time for
// ➤ (DETAILS_A_PASS at most), so a board of thousands is complete in days.
// ➤ Only a vacancy whose title is of our trades is asked: the others never reach the site. A vacancy that answers
// ➤ 4xx is marked asked and not asked again; one that does not answer is tried next pass.
const DETAILS_A_PASS = 200;
const DETAIL_FIELDS: (keyof BoardAdvert)[] = [
  "description",
  "modeTag",
  "hours",
  "mode",
  "remote",
  "expires",
  "posted",
  "country",
  "contract",
  "employmentType",
  "pay",
  "years",
  "languages",
];
// ➤ A board that asks a vacancy's page only for what its list leaves out (`needsDetail`) neither asks nor marks one whose
// ➤ list says it all, so a later rule can still ask it; `detailVersion` has the vacancies marked under an older rule looked
// ➤ at again once, what their page gave kept.
export async function withDetails<A extends BoardAdvert>(
  ats: string,
  adverts: A[],
  previous: RawOffer[],
  {
    until = Infinity,
    most = DETAILS_A_PASS,
    gapMs = 1000,
    ours = (p: BoardAdvert) => titleIsOurs(p.title, p.country ?? ""),
  } = {},
): Promise<A[]> {
  const { detail, needsDetail, detailVersion = 1 } = ATS[ats] || {};
  if (!detail) return adverts;
  const old = new Map(previous.map((p) => [p.url, p]));
  let asked = 0;
  for (const p of adverts) {
    const o = old.get(p.url);
    if (o?.detailed)
      for (const k of DETAIL_FIELDS)
        if (o[k] && !p[k]) Object.assign(p, { [k]: o[k] });
    const needed = needsDetail ? needsDetail(p) : !o?.detailed;
    if (o?.detailed && (o.detailed >= detailVersion || !needed)) {
      p.detailed = o.detailed;
      continue;
    }
    if (!needed || asked >= most || Date.now() >= until || !ours(p)) continue;
    asked++;
    try {
      Object.assign(p, await detail(p, { gapMs, tries: 1, timeoutMs: 15000 }), {
        detailed: detailVersion,
      });
    } catch (e) {
      const err = e as Failure,
        status = err.status ?? 0;
      if (status === 429 || err.postponed || err.wall) break;
      if (status >= 400 && status < 500) p.detailed = detailVersion;
    }
  }
  return adverts;
}
