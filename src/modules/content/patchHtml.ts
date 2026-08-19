import type { FieldPatch } from "@/modules/content/types";

const TAGS = "div|p|h1|h2|h3|h4|h5|span|a|button|li|label";

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

    if (patch.href != null && patch.href !== "") {
      next = next.replace(openClose, (full, open: string, tag: string, _q: string, inner: string, close: string) => {
        return `${setAttr(open, "href", patch.href || "")}${inner}${close}`;
      });
    }

    if (patch.value != null) {
      const img = next.match(selfClose);
      if (img) {
        next = next.replace(selfClose, (_full, tag: string, attrs: string, _q: string, end: string) => {
          return `<${tag}${setAttr(" " + attrs, "src", patch.value).replace(/^\s/, " ")}${end.startsWith("/") ? "/>" : ">"}`;
        });
      } else {
        next = next.replace(openClose, (_full, open: string, _tag: string, _q: string, inner: string, close: string) => {
          const hasChild = /<[a-z][\s\S]*?>/i.test(inner);
          if (hasChild) {
            const replaced = inner.replace(/>([^<]*)</, `>${escapeHtml(patch.value)}<`);
            if (replaced !== inner) return `${open}${replaced}${close}`;
          }
          return `${open}${escapeHtml(patch.value)}${close}`;
        });
      }
    }
  }
  return next;
}
