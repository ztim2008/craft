import type { FieldPatch } from "@/modules/content/types";
import type { PageModelPage, PageModelSection, SimilarGroup } from "./types";

export function sectionFingerprint(section: PageModelSection): string {
  const customClass = String(section.customClass || "").trim();
  if (!customClass) return "";
  const sig = (section.fields || []).map((field) => field.type).join(",");
  return `${customClass}::${sig}`;
}

export function applySimilarWidgets(pages: PageModelPage[]): SimilarGroup[] {
  const buckets = new Map<string, { pagePath: string; section: PageModelSection }[]>();
  for (const page of pages) {
    for (const section of page.sections || []) {
      const key = sectionFingerprint(section);
      if (!key) continue;
      const list = buckets.get(key) || [];
      list.push({ pagePath: page.path, section });
      buckets.set(key, list);
    }
  }
  const groups: SimilarGroup[] = [];
  for (const [key, members] of buckets) {
    if (members.length < 2) continue;
    const ordered = members.slice().sort((a, b) => Number(b.pagePath === "/") - Number(a.pagePath === "/"));
    const fieldCount = (ordered[0].section.fields || []).length;
    const slots: string[][] = [];
    for (let i = 0; i < fieldCount; i += 1) {
      slots.push(ordered.map((item) => item.section.fields[i]?.nodeId).filter(Boolean) as string[]);
    }
    const customClass = ordered[0].section.customClass || "";
    groups.push({
      key,
      label: `Виджет .${customClass}`,
      customClass,
      slots,
      sectionIds: [...new Set(ordered.map((item) => item.section.id))],
    });
    for (const item of ordered) {
      item.section.similarKey = key;
      item.section.scope = "site";
      item.section.pageCount = ordered.length;
    }
  }
  return groups;
}

export function expandSimilarFields(
  fields: Record<string, FieldPatch> | undefined,
  groups: SimilarGroup[] | undefined,
): Record<string, FieldPatch> {
  const source = fields || {};
  if (!groups?.length) return source;
  const out: Record<string, FieldPatch> = { ...source };
  for (const group of groups) {
    for (const slot of group.slots || []) {
      const fromId = slot.find((id) => source[id]);
      if (!fromId) continue;
      const patch = source[fromId];
      for (const id of slot) {
        if (!out[id]) out[id] = patch;
      }
    }
  }
  return out;
}
