import { applyHtmlBlocks } from "./htmlBlocks";
import { patchHtml } from "./patchHtml";
import { applySeo } from "./applySeo";
import { applySections } from "./applySections";
import type { ContentOverlay } from "./types";

export function applyContent(html: string, overlay: ContentOverlay, pagePath = "/"): string {
  const withSections = applySections(html, overlay.sections);
  const patched = applyHtmlBlocks(patchHtml(withSections, overlay.fields || {}), overlay.htmlBlocks || []);
  return applySeo(patched, overlay, pagePath);
}
