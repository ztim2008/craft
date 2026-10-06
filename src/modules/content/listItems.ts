/**
 * Collection / List Item engine — portable patch.cjs twin for Craft job export.
 * Verified on Soap goods; same API for future gallery/features/…
 */
import { createRequire } from "node:module";
import type { ListItemLayout } from "./types";

const require = createRequire(import.meta.url);
const portable = require("../export/portable/patch.cjs") as {
  applyListItems: (html: string, bag: Record<string, ListItemLayout> | null | undefined) => string;
};

export function applyListItems(
  html: string,
  bag: Record<string, ListItemLayout> | null | undefined,
): string {
  return portable.applyListItems(html, bag || null);
}
