import { applyHtmlBlocks } from "./htmlBlocks";
import { patchHtml } from "./patchHtml";
import type { ContentOverlay } from "./types";

export function applyContent(html: string, overlay: ContentOverlay): string {
  return applyHtmlBlocks(patchHtml(html, overlay.fields || {}), overlay.htmlBlocks || []);
}
