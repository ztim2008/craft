const hits = new Map<string, number[]>();

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

export function allowRate(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const prev = (hits.get(key) || []).filter((ts) => now - ts < windowMs);
  if (prev.length >= limit) {
    hits.set(key, prev);
    return false;
  }
  prev.push(now);
  hits.set(key, prev);
  return true;
}
