// The legacy's own pacing as its readers ask it (builder/lib/robots-rules.ts `crawlGapMs`, builder/lib/sleep.ts): here
// crawl-core's polite client paces every request (per host, server and provider, a robots.txt's Crawl-delay first), so
// a reader's own wait would only add to it.
export const crawlGapMs = (..._args: unknown[]): number => 0;
export const sleep = (_ms: number): Promise<void> => Promise.resolve();
