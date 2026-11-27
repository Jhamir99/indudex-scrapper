// The legacy's builder/lib/hunt-memo.ts `hunterMemo` (JustJans/indudex@ec79858), copied (career sites T003): the careers
// reader takes one as an option (the hunter's memory of what it asked); the hunter itself is source discovery's (017).
import type { Sitemap } from "./crawl.js";

// ➤ What one hunter asked already. 'known': a way in that gave adverts, or one the lists name
// ➤ (`known()`, a Set) — the company is a source already. 'none': one that gave none, or is being
// ➤ read. A sitemap read is kept as { parsed } while another page of its site may ask it again,
// ➤ the latest few only, so it is read once and still looked through for each page.
const COPIES = 40;
type Asked = "known" | "none" | { parsed: Sitemap };
export function hunterMemo(known: () => Set<string>) {
  const asked = new Map<string, Asked>(),
    copies: string[] = [];
  return {
    get: (u: string): Asked | undefined =>
      asked.get(u) ?? (known().has(u) ? "known" : undefined),
    set(u: string, v: Asked): void {
      const was = asked.get(u);
      asked.set(u, v);
      if (typeof v !== "object" || typeof was === "object") return;
      copies.push(u);
      if (copies.length > COPIES) {
        const old = copies.shift() ?? "";
        if (typeof asked.get(old) === "object") asked.set(old, "none");
      }
    },
    forget: (u: string): boolean => asked.delete(u),
  };
}
