import { fold } from "../../shared/kit/fold.js";
import { NOTHING } from "../../shared/storage/title-caches.js";
import type { WantedTitle } from "./translate.js";

// The translator's queue, worked out apart from the run that uses it (legacy builder/mt/queue.mjs, word for word but
// for types), so a test can hold it (TRA-10): which titles are set aside, how the titles are grouped and handed out,
// a chunk the engine fails on done again in halves, and which titles leave the queue.

// Norwegian is "nb" to Firefox's models.
const MODEL_LANG: Readonly<Record<string, string>> = { no: "nb" };

// The chunk a run never ended: one title alone is set aside for good; several go last, one at a time.
export function afterUnended(
  unended: readonly string[],
  setAside: ReadonlySet<string>,
) {
  const stuck =
    unended.length === 1 && !setAside.has(unended[0] ?? "")
      ? (unended[0] ?? null)
      : null;
  return {
    setAside: stuck ? new Set([...setAside, stuck]) : new Set(setAside),
    stuck,
    goLast: new Set(unended.length > 1 ? unended : []),
  };
}

export type QueuedTitle = WantedTitle & { readonly rank: number };
export interface Group {
  readonly src: string;
  readonly into: string[];
  readonly items: QueuedTitle[];
  at: number;
  readonly size: number;
}

// Each title grouped by its language and the languages it lacks, each group in the queue's order. A language with
// no model into English waits for one (counted in noModel); a title going last is a group of its own, one a chunk.
export function groupQueue(
  queue: readonly WantedTitle[],
  models: ReadonlySet<string>,
  {
    goLast = new Set<string>(),
    size = 400,
  }: { goLast?: ReadonlySet<string>; size?: number } = {},
): { groups: Map<string, Group>; noModel: number } {
  const groups = new Map<string, Group>();
  let noModel = 0;
  queue.forEach((w, rank) => {
    const src = MODEL_LANG[w.lang] || w.lang;
    if (src !== "en" && !models.has(`${src}-en`)) {
      noModel++;
      return;
    }
    const into = w.into
      .filter((t) => t !== src && (t === "en" || models.has(`en-${t}`)))
      .toSorted();
    if (!into.length) return;
    const alone = goLast.has(w.t),
      key = `${src}|${into.join(",")}${alone ? "|alone" : ""}`;
    let group = groups.get(key);
    if (!group)
      groups.set(
        key,
        (group = { src, into, items: [], at: 0, size: alone ? 1 : size }),
      );
    group.items.push({ ...w, rank: alone ? queue.length + rank : rank });
  });
  return { groups, noModel };
}

// The first title still waiting in the queue and, with it, the next ones of its group, up to the group's size: the
// most offered go first whatever their group, and the calls are as many as when each group was done whole.
export function nextChunk(
  groups: ReadonlyMap<string, Group>,
): { g: Group; chunk: QueuedTitle[] } | null {
  let first: Group | null = null;
  for (const g of groups.values()) {
    const next = g.items[g.at];
    if (
      next &&
      (!first || next.rank < (first.items[first.at]?.rank ?? Infinity))
    )
      first = g;
  }
  if (!first) return null;
  const chunk = first.items.slice(first.at, first.at + first.size);
  first.at += chunk.length;
  return { g: first, chunk };
}

export type Translations = Record<string, string[]>;

// A chunk the engine fails on is done again in halves, down to single titles (what fails is a batch, not a title); a
// title it fails on alone gets no translation this time. translate(items) answers { language: [translations] }.
export async function inHalves<T>(
  translate: (items: readonly T[]) => Promise<Translations>,
  items: readonly T[],
  into: readonly string[],
  onFail: (error: unknown, items: readonly T[]) => void = () => undefined,
): Promise<Translations> {
  try {
    return await translate(items);
  } catch (error) {
    onFail(error, items);
    if (items.length === 1) return {};
    const mid = Math.ceil(items.length / 2);
    const a = await inHalves(translate, items.slice(0, mid), into, onFail),
      b = await inHalves(translate, items.slice(mid), into, onFail);
    return Object.fromEntries(
      into.map((l) => [
        l,
        [
          ...(a[l] || Array<string>(mid).fill("")),
          ...(b[l] || Array<string>(items.length - mid).fill("")),
        ],
      ]),
    );
  }
}

// What a chunk's answer gives: the pairs for each cache (a translation that is the title again is NOTHING), the
// titles answered in every language they lacked, which leave the queue, and how many were not.
export function answersOf(
  list: readonly string[],
  out: Translations,
  into: readonly string[],
) {
  const found: Record<string, [string, string][]> = {};
  for (const lang of into)
    found[lang] = list.flatMap((t, i): [string, string][] => {
      const tr = String(out[lang]?.[i] || "").trim();
      return tr ? [[t, fold(tr) === fold(t) ? NOTHING : tr]] : [];
    });
  const answered = list.filter((_, i) =>
    into.every((l) => String(out[l]?.[i] || "").trim()),
  );
  return { found, answered, unanswered: list.length - answered.length };
}
