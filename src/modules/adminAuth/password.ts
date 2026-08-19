import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function hashPassword(password: string, saltHex?: string): string {
  const salt = saltHex ? fromHex(saltHex) : randomBytes(16);
  const key = scryptSync(password, salt, 32);
  return `scrypt:${toHex(salt)}:${toHex(key)}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, keyHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !keyHex) return false;
  const actual = hashPassword(password, saltHex);
  const a = Buffer.from(actual);
  const b = Buffer.from(`scrypt:${saltHex}:${keyHex}`);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
