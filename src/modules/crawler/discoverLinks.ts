import { isSameOrigin } from "@/modules/security/urlGuard";
import type { DiscoveredLink } from "./types";

export function discoverLinks(pageUrl: string, hrefs: string[]): DiscoveredLink[] {
  const seen = new Set<string>();
  const links: DiscoveredLink[] = [];

  for (const href of hrefs) {
    if (!href || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      continue;
    }
    let absolute: URL;
    try {
      absolute = new URL(href, pageUrl);
    } catch {
      continue;
    }
    if (absolute.protocol !== "http:" && absolute.protocol !== "https:") continue;
    absolute.hash = "";
    const normalized = absolute.toString();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    links.push({
      url: normalized,
      kind: isSameOrigin(pageUrl, normalized) ? "same-origin" : "external",
    });
  }

  return links;
}
