// The legacy's builder/lib/sitemap-text.ts: a sitemap as text, also when it comes as a gzipped file (sitemap.xml.gz),
// unpacked to 50 MB at most, the most sitemaps.org lets one weigh. Asked through the pass's polite client.
import { gunzipSync } from "node:zlib";
import { HttpFailure } from "../../../shared/http/http-failure.js";
import type { GetOptions } from "./http.js";
import { passTools } from "./pass.js";

const PAGE_MAX = 50 * 1024 * 1024;

export async function sitemapText(
  url: string,
  options?: GetOptions,
): Promise<string> {
  const answer = await passTools()
    .http.request(url, {
      binary: true,
      ...(options?.timeoutMs ? { timeoutMs: options.timeoutMs } : {}),
      ...(options?.headers ? { headers: options.headers } : {}),
    })
    .catch((error: unknown) => {
      // An error answer says «404 for <address>», as the legacy's did.
      if (error instanceof HttpFailure && error.status)
        error.message = `${error.status} for ${url}`;
      throw error;
    });
  const bytes = Buffer.from(answer.bytes ?? new Uint8Array());
  if (bytes.length > PAGE_MAX)
    throw new Error(`more than ${PAGE_MAX} bytes for ${url}`);
  return bytes[0] === 0x1f && bytes[1] === 0x8b
    ? gunzipSync(bytes, { maxOutputLength: PAGE_MAX }).toString("utf8")
    : bytes.toString("utf8");
}
