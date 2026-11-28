// The legacy's builder/lib/bot-signature.ts (JustJans/indudex@ec79858), copied (career sites T010): Web Bot Auth, each
// request signed with the bot's Ed25519 key so a CDN (Cloudflare, in front of Workday) tells IndudexBot from anyone
// borrowing its name. Only its imports changed: the directory's path, which the legacy read from its site's settings,
// is written here. The key lives only in .env, as BOT_SIGNING_KEY; the website publishes its public half at
// KEY_DIRECTORY (`directoryWorker`). Its own comments keep their marks.
// ➤ Web Bot Auth (docs/research/bot-signature.md): IndudexBot signs each request with an Ed25519 key (HTTP Message
// ➤ Signatures, RFC 9421), so a CDN can tell it from anyone borrowing its name; the public key is published at
// ➤ /.well-known/http-message-signatures-directory. The private key lives only in builder/.env, as BOT_SIGNING_KEY.
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomBytes,
  sign,
  type KeyObject,
  webcrypto,
} from "node:crypto";

// Node's own types give the JWK under webcrypto.
type JsonWebKey = webcrypto.JsonWebKey;

// The legacy's app/lib/site.ts: where the website publishes the key.
export const KEY_DIRECTORY = ".well-known/http-message-signatures-directory";

export const DIRECTORY_PATH = KEY_DIRECTORY;
const DIRECTORY_TYPE = "application/http-message-signatures-directory+json";
// ➤ Cloudflare asks for about a minute on a request. The directory's proof must be dated when it is sent (Cloudflare
// ➤ turned one dated at publication down as signature_stale): signed ahead for every half minute of four days.
const REQUEST_LIFE_S = 60;
const PROOF_STEP_S = 30;
const PROOF_SPAN_S = 4 * 86_400;
const PROOF_LIFE_S = 300;

// ➤ The key's name in every signature: its JWK SHA-256 thumbprint (RFC 7638, RFC 8037 A.3).
type Jwk = Pick<JsonWebKey, "kty" | "crv" | "x">;
export type SigningKey = { privateKey: KeyObject; jwk: Jwk; keyid: string };

export const thumbprint = ({ crv, kty, x }: Jwk): string =>
  createHash("sha256")
    .update(JSON.stringify({ crv, kty, x }))
    .digest("base64url");

// ➤ A new private key, as BOT_SIGNING_KEY holds it: PKCS#8 DER in base64, one line.
export const newKey = (): string =>
  generateKeyPairSync("ed25519")
    .privateKey.export({ format: "der", type: "pkcs8" })
    .toString("base64");

// ➤ The key BOT_SIGNING_KEY holds, with its public half and its name; null without one (tests, a laptop).
// ➤ builder/.env with the key's line: an empty line copied from .env.example, quoted or not, takes it; else it goes at the
// ➤ end. A second key beside an empty one was never read, and its public half would have been published (HEA-17).
const EMPTY_KEY = /^[ \t]*BOT_SIGNING_KEY[ \t]*=[ \t]*(?:""|'')?[ \t]*$/m;
export const withKeyLine = (env: string, line: string): string =>
  EMPTY_KEY.test(env)
    ? env.replace(EMPTY_KEY, line)
    : `${env}${env && !env.endsWith("\n") ? "\n" : ""}${line}\n`;

export function signingKey(
  pkcs8 = process.env.BOT_SIGNING_KEY,
): SigningKey | null {
  if (!pkcs8) return null;
  const privateKey = createPrivateKey({
    key: Buffer.from(pkcs8, "base64"),
    format: "der",
    type: "pkcs8",
  });
  const { kty, crv, x } = createPublicKey(privateKey).export({ format: "jwk" });
  const jwk = { kty, crv, x };
  return { privateKey, jwk, keyid: thumbprint(jwk) };
}

// ➤ One signature: the signature base of RFC 9421 §2.5 (one line per covered component, then its parameters) signed.
type Params = { created: number; expires: number; nonce?: string; tag: string };
function signed(
  key: SigningKey,
  components: [string, string][],
  { created, expires, nonce, tag }: Params,
) {
  const input = `(${components.map(([name]) => name).join(" ")});created=${created};expires=${expires};keyid="${key.keyid}";alg="ed25519"${nonce ? `;nonce="${nonce}"` : ""};tag="${tag}"`;
  const base = [
    ...components.map(([name, value]) => `${name}: ${value}`),
    `"@signature-params": ${input}`,
  ].join("\n");
  return {
    input,
    value: `:${sign(null, Buffer.from(base), key.privateKey).toString("base64")}:`,
  };
}

// ➤ The headers that sign a request to `url` for `agent` (the site that publishes the key). Signature-Agent goes as a
// ➤ bare string, the form Cloudflare reads; the IETF draft's dictionary form it does not (yet).
export function requestHeaders(
  url: string,
  key: SigningKey,
  agent: string,
  now = Date.now(),
  nonce = randomBytes(32).toString("base64"),
): Record<string, string> {
  const created = Math.floor(now / 1000),
    agentField = `"${agent}"`;
  const { input, value } = signed(
    key,
    [
      ['"@authority"', new URL(url).host],
      ['"signature-agent"', agentField],
    ],
    { created, expires: created + REQUEST_LIFE_S, nonce, tag: "web-bot-auth" },
  );
  return {
    "Signature-Agent": agentField,
    "Signature-Input": `sig1=${input}`,
    Signature: `sig1=${value}`,
  };
}

// ➤ The Pages Function that answers at the directory's address alone (its _routes.json): the key, with the proof of the
// ➤ current half minute. The constants it reads are written above it by directoryWorker.
const WORKER = `export default {
  fetch(request, env) {
    if (new URL(request.url).pathname !== PATH) return env.ASSETS.fetch(request);
    const i = Math.min(Math.max(Math.floor((Date.now() / 1000 - START) / STEP), 0), COUNT - 1);
    const created = START + i * STEP;
    return new Response(BODY, {
      headers: {
        'Content-Type': TYPE,
        'Cache-Control': 'public, max-age=' + STEP,
        'Signature-Input': 'binding0=' + HEAD + 'created=' + created + ';expires=' + (created + LIFE) + TAIL,
        Signature: 'binding0=' + PROOFS.slice(i * WIDTH, (i + 1) * WIDTH),
      },
    });
  },
};
`;
export const DIRECTORY_ROUTES = {
  version: 1,
  include: [`/${DIRECTORY_PATH}`],
  exclude: [],
};

// ➤ The directory at `authority` as a Pages Function (_worker.js), its proofs signed here from `now` on, so the private
// ➤ key never leaves the server. No Content-Digest: Pages compresses the answer, and a digest is of the bytes as sent.
export function directoryWorker(
  key: SigningKey,
  authority: string,
  now = Date.now(),
): string {
  const start = Math.floor(now / 1000 / PROOF_STEP_S) * PROOF_STEP_S;
  const proofs = Array.from({ length: PROOF_SPAN_S / PROOF_STEP_S }, (_, i) => {
    const created = start + i * PROOF_STEP_S;
    const tag = "http-message-signatures-directory";
    return signed(key, [['"@authority";req', authority]], {
      created,
      expires: created + PROOF_LIFE_S,
      tag,
    });
  });
  const [head, tail] = proofs[0].input.split(
    `created=${start};expires=${start + PROOF_LIFE_S}`,
  );
  const constants = {
    PATH: `/${DIRECTORY_PATH}`,
    TYPE: DIRECTORY_TYPE,
    BODY: JSON.stringify({ keys: [{ ...key.jwk, kid: key.keyid }] }),
    HEAD: head,
    TAIL: tail,
    START: start,
    STEP: PROOF_STEP_S,
    LIFE: PROOF_LIFE_S,
    COUNT: proofs.length,
    WIDTH: proofs[0].value.length,
    PROOFS: proofs.map((p) => p.value).join(""),
  };
  const lines = Object.entries(constants).map(
    ([name, value]) => `const ${name} = ${JSON.stringify(value)};`,
  );
  return `${lines.join("\n")}\n${WORKER}`;
}
