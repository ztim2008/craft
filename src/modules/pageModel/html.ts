export function attr(source: string, name: string): string {
  const double = source.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i"));
  if (double?.[1] != null) return double[1];
  const single = source.match(new RegExp(`${name}\\s*=\\s*'([^']*)'`, "i"));
  return single?.[1] ?? "";
}

export function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function looksLikePhone(value: string): boolean {
  const compact = value.replace(/[^\d+]/g, "");
  if (compact.length < 10 || compact.length > 16) return false;
  return /^\+?\d[\d\s()+\-]{8,}$/.test(value.trim());
}
