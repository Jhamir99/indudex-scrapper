// One page under several addresses (legacy builder/normalise.mjs normUrl): the known tracking
// parameters, the fragment and a trailing slash do not make another advert. Only the tracking
// parameters go, not the whole query: Lanbide's adverts are told apart only by one (IDRG=…). A
// fragment that is a route ("#/pub/vakances/4621", a single-page portal's whole address) stays.
const TRACKING =
  /^(utm_.*|gclid|fbclid|msclkid|clickid|click_id|campaign_id|source|ref)$/i;

export function advertAddress(address: string): string {
  let url: URL;
  try {
    url = new URL(address.trim());
  } catch {
    return address.trim();
  }
  // A copy of the keys: deleting while walking the live iterator skips the next key.
  for (const key of Array.from(url.searchParams.keys()))
    if (TRACKING.test(key)) url.searchParams.delete(key);
  if (!url.hash.startsWith("#/")) url.hash = "";
  return url.toString().replace(/\?$/, "").replace(/\/$/, "");
}
