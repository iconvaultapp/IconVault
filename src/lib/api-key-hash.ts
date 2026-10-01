/**
 * SHA-256 hex digest using WebCrypto only, so the same helper runs in the
 * browser (key creation hashes before insert), in Cloudflare Workers (key
 * verification on the edge) and in Node 18+.
 *
 * The full API key is never stored anywhere: only this hash leaves the
 * browser at creation time, and only this hash is compared on each request.
 */
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  const bytes = new Uint8Array(digest);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += (bytes[i] ?? 0).toString(16).padStart(2, "0");
  }
  return out;
}
