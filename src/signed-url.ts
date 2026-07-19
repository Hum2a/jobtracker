/** HMAC-signed short-lived download tokens (default 15 minutes). */

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return toHex(sig);
}

export async function createDownloadToken(
  secret: string,
  documentId: number,
  ttlSeconds = 900
): Promise<{ token: string; expires: number }> {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${documentId}.${expires}`;
  const sig = await hmac(secret, payload);
  return { token: `${payload}.${sig}`, expires };
}

export async function verifyDownloadToken(
  secret: string,
  token: string
): Promise<{ documentId: number } | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [idStr, expStr, sig] = parts;
  const documentId = Number(idStr);
  const expires = Number(expStr);
  if (!Number.isInteger(documentId) || !Number.isFinite(expires)) return null;
  if (Math.floor(Date.now() / 1000) > expires) return null;
  const expected = await hmac(secret, `${documentId}.${expires}`);
  if (expected.length !== sig.length) return null;
  const a = new TextEncoder().encode(expected);
  const b = new TextEncoder().encode(sig);
  if (a.byteLength !== b.byteLength) return null;
  let ok = 0;
  for (let i = 0; i < a.byteLength; i++) ok |= a[i]! ^ b[i]!;
  if (ok !== 0) return null;
  return { documentId };
}
