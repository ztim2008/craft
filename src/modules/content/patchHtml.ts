import type { FieldPatch } from "@/modules/content/types";
import { resolveLinkAction } from "@/modules/content/linkAction";

const TAGS = "div|p|h1|h2|h3|h4|h5|h6|span|a|button|li|label|nav|header|ul";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function removeAttr(openTag: string, name: string): string {
  return openTag.replace(new RegExp(`\\s${name}(\\s*=\\s*(["'])[\\s\\S]*?\\2)?`, "i"), "");
}

function applyLinkOpen(open: string, tag: string, close: string, patch: FieldPatch): { open: string; close: string } {
  const action = resolveLinkAction(patch);
  if (!action.apply) return { open, close };
  let nextOpen = open;
  let nextClose = close;
  if (action.href && tag.toLowerCase() === "button") {
    nextOpen = nextOpen.replace(/^<button\b/i, "<a");
    nextClose = nextClose.replace(/^<\/button>/i, "</a>");
  }
  if (action.href) nextOpen = setAttr(nextOpen, "href", action.href);
  if (action.target) nextOpen = setAttr(nextOpen, "target", action.target);
  else nextOpen = removeAttr(nextOpen, "target");
  if (action.rel) nextOpen = setAttr(nextOpen, "rel", action.rel);
  else nextOpen = removeAttr(nextOpen, "rel");
  if (action.download) nextOpen = setAttr(nextOpen, "download", "");
  else nextOpen = removeAttr(nextOpen, "download");
  return { open: nextOpen, close: nextClose };
}

function setAttr(openTag: string, name: string, value: string): string {
  const quoted = `${name}="${escapeHtml(value)}"`;
  const re = new RegExp(`(\\s${name}\\s*=\\s*)(["'])[\\s\\S]*?\\2`, "i");
  if (re.test(openTag)) {
    return openTag.replace(re, `$1"${escapeHtml(value)}"`);
  }
  return openTag.replace(/(\s*\/?>)$/, ` ${quoted}$1`);
}

export function patchHtml(html: string, patches: Record<string, FieldPatch>): string {
  let next = html;
  for (const [nodeId, patch] of Object.entries(patches)) {
    if (!nodeId.startsWith("n-")) continue;
    const id = escapeRegex(nodeId);
    const openClose = new RegExp(
      `(<(${TAGS})\\b[^>]*\\bid=(["'])${id}\\3[^>]*>)([\\s\\S]*?)(</\\2>)`,
      "i",
    );
    const selfClose = new RegExp(`<(img)\\b([^>]*\\bid=(["'])${id}\\3[^>]*)(/?>)`, "i");

    next = next.replace(openClose, (_full, open: string, tag: string, _q: string, inner: string, close: string) => {
      const linked = applyLinkOpen(open, tag, close, patch);
      return `${linked.open}${inner}${linked.close}`;
    });

    if (patch.value != null) {
      const img = next.match(selfClose);
      if (img) {
        next = next.replace(selfClose, (_full, tag: string, attrs: string, _q: string, end: string) => {
          return `<${tag}${setAttr(" " + attrs, "src", patch.value).replace(/^\s/, " ")}${end.startsWith("/") ? "/>" : ">"}`;
        });
      } else {
        next = next.replace(openClose, (_full, open: string, _tag: string, _q: string, inner: string, close: string) => {
          if (patch.innerHtml) return `${open}${patch.value}${close}`;
          const hasChild = /<[a-z][\s\S]*?>/i.test(inner);
          if (hasChild) return `${open}${inner}${close}`;
          return `${open}${escapeHtml(patch.value)}${close}`;
        });
      }
    }
  }
  return next;
}
