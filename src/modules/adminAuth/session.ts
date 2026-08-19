const COOKIE = "craft_admin";

function encoder() {
  return new TextEncoder();
}

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder().encode(data));
  return toHex(sig);
}

function b64urlEncode(json: string): string {
  const bytes = encoder().encode(json);
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecode(value: string): string {
  const pad = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = pad + "=".repeat((4 - (pad.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export async function createSessionToken(email: string): Promise<string> {
  const secret = process.env.ADMIN_SESSION_SECRET || "";
  const exp = Date.now() + 14 * 24 * 60 * 60 * 1000;
  const payload = b64urlEncode(JSON.stringify({ email, exp }));
  const sig = await hmacHex(secret, payload);
  return `${payload}.${sig}`;
}

export async function readSessionEmail(token: string | undefined | null): Promise<string | null> {
  if (!token || !process.env.ADMIN_SESSION_SECRET) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = await hmacHex(process.env.ADMIN_SESSION_SECRET, payload);
  const a = encoder().encode(sig);
  const b = encoder().encode(expected);
  if (a.length !== b.length) return null;
  let ok = 0;
  for (let i = 0; i < a.length; i += 1) ok |= a[i] ^ b[i];
  if (ok !== 0) return null;
  try {
    const data = JSON.parse(b64urlDecode(payload)) as {
      email?: string;
      exp?: number;
    };
    if (!data.email || !data.exp || data.exp < Date.now()) return null;
    return data.email;
  } catch {
    return null;
  }
}

export function sessionCookieName(): string {
  return COOKIE;
}

export function sessionCookie(token: string): string {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${14 * 24 * 60 * 60}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
