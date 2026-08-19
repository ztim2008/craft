import type { PageModelPage, PageModelSection } from "./types";

const SITE_TYPES = new Set(["header", "footer", "html"]);

export function isSiteSectionType(type: string): boolean {
  return SITE_TYPES.has(type);
}

export function applySectionScope(pages: PageModelPage[]): PageModelPage[] {
  const counts = new Map<string, number>();
  for (const page of pages) {
    const seen = new Set<string>();
    for (const section of page.sections || []) {
      if (!section.id || seen.has(section.id)) continue;
      seen.add(section.id);
      counts.set(section.id, (counts.get(section.id) || 0) + 1);
    }
  }
  for (const page of pages) {
    for (const section of page.sections || []) {
      const pageCount = counts.get(section.id) || 1;
      section.pageCount = pageCount;
      const sharedHtml = section.type === "html" && (pageCount >= 2 || section.static);
      section.scope = section.type === "header" || section.type === "footer" || sharedHtml ? "site" : "page";
    }
  }
  return pages;
}

export function uniqueSiteSections(pages: PageModelPage[], type?: string): PageModelSection[] {
  applySectionScope(pages);
  const seen = new Set<string>();
  const out: PageModelSection[] = [];
  const ordered = pages.slice().sort((a, b) => Number(b.path === "/") - Number(a.path === "/"));
  for (const page of ordered) {
    for (const section of page.sections || []) {
      if (section.scope !== "site") continue;
      if (type && section.type !== type) continue;
      if (seen.has(section.id)) continue;
      seen.add(section.id);
      out.push(section);
    }
  }
  return out;
}
