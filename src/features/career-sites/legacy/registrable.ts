// The legacy's builder/lib/registrable.ts: the name a host is registered under, by the whole Public Suffix List as
// browsers read it ("www.reed.co.uk" is reed.co.uk, "jobs.trust.nhs.uk" trust.nhs.uk). The legacy read the list's file
// itself; `tldts` reads the same list (its private section included, as the legacy's rules did). A host that is a
// suffix itself is answered whole.
import { getDomain } from "tldts";

export function registrable(host: unknown): string {
  const name = String(host || "")
    .toLowerCase()
    .replace(/\.$/, "");
  return getDomain(name, { allowPrivateDomains: true }) ?? name;
}
