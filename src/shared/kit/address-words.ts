// The words of a vacancy's address: its parts without numbers and codes, as one line. The gate finds a title inside it
// as it finds one inside an advert's title, so a reader asks before reading the page (job portals FR-4; the legacy's
// builder/lib/ours.ts).
export function addressWords(url: string): string {
  let path: string;
  try {
    path = decodeURIComponent(new URL(url).pathname);
  } catch {
    return "";
  }
  return path
    .split("/")
    .map((part) =>
      part
        .replace(/\.html?$/, "")
        .replace(/(?:^|-)(?:\d+|[0-9a-f]{6,})(?=-|$)/g, ""),
    )
    .filter((part) => /[a-z]/i.test(part))
    .join(" ")
    .replace(/[-_+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
