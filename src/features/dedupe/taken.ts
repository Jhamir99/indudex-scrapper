import { jobKey } from "./role.js";

// An advert taken down (the takedowns list's, read by the publication): its employer, title as
// published, language and place, as dedupe reads them.
export interface TakenAdvert {
  readonly company: string;
  readonly title: string;
  readonly language?: string | undefined;
  readonly place: string;
}

const roleAt = (advert: TakenAdvert): string => {
  const role = jobKey(advert);
  return role ? `${role}@${advert.place}` : "";
};

// The adverts without every copy of one taken down: the same role in the same place, whatever
// source carries it. Taken down copy by copy, an intermediary's copy (Adzuna, Jooble) took its
// place (legacy builder/dedupe.mjs withoutTaken, PUB-01). An advert taken down that names no
// employer has no role, and takes no copy with it: the legacy's took every advert of its place
// that named none.
export function withoutTaken<T extends TakenAdvert>(
  adverts: readonly T[],
  taken: readonly TakenAdvert[],
): T[] {
  if (taken.length === 0) return [...adverts];
  const gone = new Set(taken.map(roleAt).filter(Boolean));
  return adverts.filter((advert) => !gone.has(roleAt(advert)));
}
