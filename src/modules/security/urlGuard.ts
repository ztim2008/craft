import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata",
]);

export class UrlGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UrlGuardError";
  }
}

export function isPrivateOrReservedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    const parts = ip.split(".").map((n) => Number(n));
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    return false;
  }
  if (version === 6) {
    const normalized = ip.toLowerCase();
    if (normalized === "::" || normalized === "::1") return true;
    if (normalized.startsWith("fe80:")) return true;
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
    if (normalized.startsWith("::ffff:")) {
      return isPrivateOrReservedIp(normalized.slice("::ffff:".length));
    }
    return false;
  }
  return true;
}

export function parsePublicHttpUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new UrlGuardError("Некорректный URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UrlGuardError("Разрешены только http и https");
  }
  if (url.username || url.password) {
    throw new UrlGuardError("URL с логином/паролем не принимаются");
  }

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host) {
    throw new UrlGuardError("Пустой hostname");
  }
  if (BLOCKED_HOSTS.has(host) || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new UrlGuardError("Локальные адреса запрещены");
  }
  if (host.endsWith(".internal") || host.endsWith(".corp")) {
    throw new UrlGuardError("Внутренние адреса запрещены");
  }

  if (isIP(host) && isPrivateOrReservedIp(host)) {
    throw new UrlGuardError("Частные и служебные IP запрещены");
  }

  return url;
}

export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  const url = parsePublicHttpUrl(raw);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) {
    return url;
  }

  let records: { address: string; family: number }[];
  try {
    records = await lookup(host, { all: true });
  } catch {
    throw new UrlGuardError("Не удалось разрешить DNS имени");
  }
  if (!records.length) {
    throw new UrlGuardError("DNS не вернул адресов");
  }
  for (const record of records) {
    if (isPrivateOrReservedIp(record.address)) {
      throw new UrlGuardError("Домен указывает на частный адрес (SSRF)");
    }
  }
  return url;
}

export function isSameOrigin(a: string, b: string): boolean {
  try {
    const left = new URL(a);
    const right = new URL(b);
    return left.protocol === right.protocol && left.host === right.host;
  } catch {
    return false;
  }
}
