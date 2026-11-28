import { describe, expect, it } from "vitest";
import { FakeClock } from "../../../test/fakes/clock.js";
import { botSigner, UsageError } from "../../features/crawl-core/run.js";
import { requestHeaders, signingKey } from "./bot-signature.js";
import { FetchClient, type FetchFunction } from "./fetch-client.js";

// A test key, never used anywhere else.
const KEY = "MC4CAQAwBQYDK2VwBCIEICOOp8WLKKfW7pTCTSAxfLqMAIYR0NhYcOnTCM1js6jH";

describe("Web Bot Auth (career sites T010)", () => {
  it("signs a request as the legacy's builder/lib/bot-signature.ts does, byte for byte", () => {
    const key = signingKey(KEY)!;
    // The legacy's own requestHeaders for this key, address, time and nonce (JustJans/indudex@ec79858).
    expect(key.keyid).toBe("Rg_yVAj8xT0D4REq3TROM2AJTM2gO8tjG7xfm-u6oCk");
    expect(
      requestHeaders(
        "https://philips.wd3.myworkdayjobs.com/robots.txt",
        key,
        "https://indudex.com",
        1_795_872_000_000,
        "bm9uY2U=",
      ),
    ).toEqual({
      "Signature-Agent": '"https://indudex.com"',
      "Signature-Input":
        'sig1=("@authority" "signature-agent");created=1795872000;expires=1795872060;keyid="Rg_yVAj8xT0D4REq3TROM2AJTM2gO8tjG7xfm-u6oCk";alg="ed25519";nonce="bm9uY2U=";tag="web-bot-auth"',
      Signature:
        "sig1=:b5nEiKpY1Y5MdNxFhparGeGZwgf/gywWUvvZLaXe3DQnHjusUSMkwAGK44iJ1kU/I6mLch+/5KwIlPN/8IdjBA==:",
    });
  });

  it("signs nothing without a key, and stops on a key it cannot read", () => {
    expect(botSigner({})).toBeUndefined();
    expect(botSigner({ BOT_SIGNING_KEY: "" })).toBeUndefined();
    expect(() => botSigner({ BOT_SIGNING_KEY: "not a key" })).toThrow(
      UsageError,
    );
  });

  it("signs each hop of a redirect for its own host, and leaves cookies behind on another origin", async () => {
    const calls: { url: string; headers: Record<string, string> }[] = [];
    const fetch: FetchFunction = async (url, init) => {
      calls.push({ url, headers: init.headers as Record<string, string> });
      return calls.length === 1
        ? new Response(null, {
            status: 301,
            headers: { location: "https://jobs.example.org/list" },
          })
        : new Response("ok");
    };
    const client = new FetchClient({
      clock: new FakeClock(),
      fetch,
      userAgent: "IndudexBot/test",
      sign: botSigner({ BOT_SIGNING_KEY: KEY })!,
    });
    await client.request("https://careers.example.com/jobs", {
      headers: { cookie: "session=1" },
    });
    expect(calls.map((call) => call.url)).toEqual([
      "https://careers.example.com/jobs",
      "https://jobs.example.org/list",
    ]);
    for (const call of calls)
      expect(call.headers["Signature-Agent"]).toBe('"https://indudex.com"');
    expect(calls[0]!.headers["Signature"]).not.toBe(
      calls[1]!.headers["Signature"],
    );
    expect(calls[0]!.headers["cookie"]).toBe("session=1");
    expect(calls[1]!.headers["cookie"]).toBeUndefined();
  });
});
