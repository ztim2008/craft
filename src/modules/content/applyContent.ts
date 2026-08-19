import { applyHtmlBlocks } from "./htmlBlocks";
import { applyMenuInserts } from "./menuInserts";
import { patchHtml } from "./patchHtml";
import { applySeo } from "./applySeo";
import { applySections } from "./applySections";
import type { ContentOverlay } from "./types";
import type { SimilarGroup } from "@/modules/pageModel/types";
import { expandSimilarFields } from "@/modules/pageModel/similarWidgets";

export function applyContent(html: string, overlay: ContentOverlay, pagePath = "/", similar?: SimilarGroup[]): string {
  const fields = expandSimilarFields(overlay.fields || {}, similar || overlay.similar);
  const withSections = applySections(html, overlay.sections);
  const withMenu = applyMenuInserts(withSections, overlay.menuInserts);
  const patched = applyHtmlBlocks(patchHtml(withMenu, fields), overlay.htmlBlocks || []);
  return applySeo(patched, overlay, pagePath);
}
